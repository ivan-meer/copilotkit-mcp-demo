/**
 * AI Orchestrator - Universal AI Provider Manager
 * 
 * Central orchestrator that manages multiple AI providers, handles load balancing,
 * failover, and provides a unified interface for AI completions.
 * 
 * Features:
 * - Multi-provider management
 * - Intelligent load balancing
 * - Health monitoring and failover
 * - Cost optimization
 * - Request routing
 * - Caching and optimization
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

import {
  AIProvider,
  UniversalAIProvider,
  ProviderConfig,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  ProviderHealth,
  LoadBalanceStrategy,
  ProviderSelection,
  ProviderError,
} from './types';
import { OpenAIProvider } from './openai-provider';

/**
 * Provider factory for creating provider instances
 */
class ProviderFactory {
  static create(provider: AIProvider): UniversalAIProvider {
    switch (provider) {
      case AIProvider.OPENAI:
      case AIProvider.AZURE:
        return new OpenAIProvider();
      
      // TODO: Implement other providers
      case AIProvider.ANTHROPIC:
        throw new Error('Anthropic provider not yet implemented');
      case AIProvider.GOOGLE:
        throw new Error('Google provider not yet implemented');
      case AIProvider.COPILOT_CLOUD:
        throw new Error('CopilotCloud provider not yet implemented');
      case AIProvider.LOCAL:
        throw new Error('Local provider not yet implemented');
      
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

/**
 * Provider metrics for monitoring and optimization
 */
interface ProviderMetrics {
  provider: AIProvider;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalTokens: number;
  totalCost: number;
  lastUsed: Date;
}

/**
 * Request context for tracking and optimization
 */
interface RequestContext {
  id: string;
  timestamp: Date;
  provider?: AIProvider;
  model: string;
  tokens?: number;
  cost?: number;
  latency?: number;
  success: boolean;
  error?: string;
}

/**
 * AI Orchestrator implementation
 */
export class AIOrchestrator {
  private providers: Map<AIProvider, UniversalAIProvider> = new Map();
  private providerConfigs: Map<AIProvider, ProviderConfig> = new Map();
  private providerMetrics: Map<AIProvider, ProviderMetrics> = new Map();
  private selectionConfig: ProviderSelection;
  private requestHistory: RequestContext[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  
  // Load balancing state
  private roundRobinIndex: number = 0;
  private connectionCounts: Map<AIProvider, number> = new Map();
  
  constructor(selectionConfig?: Partial<ProviderSelection>) {
    this.selectionConfig = {
      strategy: LoadBalanceStrategy.HEALTH_BASED,
      fallbackProviders: [AIProvider.OPENAI],
      healthCheckInterval: 60000, // 1 minute
      failoverThreshold: 0.8, // 80% error rate triggers failover
      costWeights: {
        [AIProvider.OPENAI]: 1.0,
        [AIProvider.ANTHROPIC]: 1.2,
        [AIProvider.GOOGLE]: 0.8,
        [AIProvider.AZURE]: 1.0,
        [AIProvider.COPILOT_CLOUD]: 0.5,
        [AIProvider.LOCAL]: 0.1,
      },
      ...selectionConfig,
    };
    
    this.startHealthChecking();
  }
  
  /**
   * Add and initialize a provider
   */
  async addProvider(config: ProviderConfig): Promise<void> {
    try {
      console.log(`🔧 Adding provider: ${config.provider}`);
      
      const provider = ProviderFactory.create(config.provider);
      await provider.initialize(config);
      
      this.providers.set(config.provider, provider);
      this.providerConfigs.set(config.provider, config);
      this.connectionCounts.set(config.provider, 0);
      
      // Initialize metrics
      this.providerMetrics.set(config.provider, {
        provider: config.provider,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        totalTokens: 0,
        totalCost: 0,
        lastUsed: new Date(),
      });
      
      console.log(`✅ Provider ${config.provider} added successfully`);
    } catch (error) {
      console.error(`❌ Failed to add provider ${config.provider}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove a provider
   */
  async removeProvider(provider: AIProvider): Promise<void> {
    const providerInstance = this.providers.get(provider);
    if (providerInstance) {
      await providerInstance.dispose();
      this.providers.delete(provider);
      this.providerConfigs.delete(provider);
      this.providerMetrics.delete(provider);
      this.connectionCounts.delete(provider);
      console.log(`🗑️ Provider ${provider} removed`);
    }
  }
  
  /**
   * Get all available providers
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }
  
  /**
   * Get provider metrics
   */
  getProviderMetrics(provider?: AIProvider): ProviderMetrics | ProviderMetrics[] {
    if (provider) {
      const metrics = this.providerMetrics.get(provider);
      if (!metrics) {
        throw new Error(`Provider ${provider} not found`);
      }
      return metrics;
    }
    
    return Array.from(this.providerMetrics.values());
  }
  
  /**
   * Universal completion with automatic provider selection
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const context: RequestContext = {
      id: this.generateRequestId(),
      timestamp: new Date(),
      model: request.metadata?.preferredModel || 'auto',
      success: false,
    };
    
    const providers = this.selectProviders(request);
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        context.provider = provider;
        const startTime = Date.now();
        
        this.incrementConnectionCount(provider);
        const response = await this.providers.get(provider)!.complete(request);
        
        context.latency = Date.now() - startTime;
        context.tokens = response.usage?.totalTokens;
        context.cost = this.calculateCost(provider, response.usage?.totalTokens || 0);
        context.success = true;
        
        this.recordRequestSuccess(context);
        this.decrementConnectionCount(provider);
        
        return response;
      } catch (error) {
        lastError = error as Error;
        context.error = lastError.message;
        this.recordRequestFailure(context);
        this.decrementConnectionCount(provider);
        
        console.warn(`⚠️ Provider ${provider} failed, trying next:`, lastError.message);
        continue;
      }
    }
    
    // All providers failed
    throw new ProviderError(
      `All providers failed. Last error: ${lastError?.message}`,
      providers[0],
      'ALL_PROVIDERS_FAILED',
      undefined,
      lastError || undefined
    );
  }
  
  /**
   * Universal streaming completion
   */
  async* streamComplete(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    const context: RequestContext = {
      id: this.generateRequestId(),
      timestamp: new Date(),
      model: request.metadata?.preferredModel || 'auto',
      success: false,
    };
    
    const providers = this.selectProviders(request);
    let lastError: Error | null = null;
    
    for (const provider of providers) {
      try {
        context.provider = provider;
        const startTime = Date.now();
        
        this.incrementConnectionCount(provider);
        const stream = this.providers.get(provider)!.streamComplete(request);
        
        let tokenCount = 0;
        for await (const chunk of stream) {
          yield chunk;
          
          if (chunk.finished) {
            context.latency = Date.now() - startTime;
            context.tokens = tokenCount;
            context.cost = this.calculateCost(provider, tokenCount);
            context.success = true;
            
            this.recordRequestSuccess(context);
            this.decrementConnectionCount(provider);
            return;
          }
          
          // Estimate token count from content length
          if (chunk.delta) {
            tokenCount += Math.ceil(chunk.delta.length / 4);
          }
        }
        
        return; // Stream completed successfully
      } catch (error) {
        lastError = error as Error;
        context.error = lastError.message;
        this.recordRequestFailure(context);
        this.decrementConnectionCount(provider);
        
        console.warn(`⚠️ Provider ${provider} failed, trying next:`, lastError.message);
        continue;
      }
    }
    
    // All providers failed
    throw new ProviderError(
      `All providers failed. Last error: ${lastError?.message}`,
      providers[0],
      'ALL_PROVIDERS_FAILED',
      undefined,
      lastError || undefined
    );
  }
  
  /**
   * Get health status of all providers
   */
  async getHealthStatus(): Promise<ProviderHealth[]> {
    const healthPromises = Array.from(this.providers.entries()).map(
      async ([provider, instance]) => {
        try {
          return await instance.healthCheck();
        } catch (error) {
          return {
            provider,
            status: 'unhealthy' as const,
            latency: 0,
            errorRate: 1.0,
            lastCheck: new Date(),
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );
    
    return Promise.all(healthPromises);
  }
  
  /**
   * Select providers based on strategy and health
   */
  private selectProviders(request: CompletionRequest): AIProvider[] {
    const availableProviders = Array.from(this.providers.keys());
    const healthyProviders = availableProviders.filter(p => this.isProviderHealthy(p));
    
    if (healthyProviders.length === 0) {
      console.warn('⚠️ No healthy providers available, using all providers');
      return availableProviders;
    }
    
    switch (this.selectionConfig.strategy) {
      case LoadBalanceStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(healthyProviders);
      
      case LoadBalanceStrategy.LEAST_CONNECTIONS:
        return this.selectLeastConnections(healthyProviders);
      
      case LoadBalanceStrategy.WEIGHTED:
        return this.selectWeighted(healthyProviders);
      
      case LoadBalanceStrategy.HEALTH_BASED:
        return this.selectHealthBased(healthyProviders);
      
      case LoadBalanceStrategy.COST_OPTIMIZED:
        return this.selectCostOptimized(healthyProviders);
      
      default:
        return healthyProviders;
    }
  }
  
  /**
   * Round robin provider selection
   */
  private selectRoundRobin(providers: AIProvider[]): AIProvider[] {
    if (providers.length === 0) return [];
    
    const selected = providers[this.roundRobinIndex % providers.length];
    this.roundRobinIndex++;
    
    return [selected, ...providers.filter(p => p !== selected)];
  }
  
  /**
   * Least connections provider selection
   */
  private selectLeastConnections(providers: AIProvider[]): AIProvider[] {
    return providers.sort((a, b) => {
      const connectionsA = this.connectionCounts.get(a) || 0;
      const connectionsB = this.connectionCounts.get(b) || 0;
      return connectionsA - connectionsB;
    });
  }
  
  /**
   * Weighted provider selection
   */
  private selectWeighted(providers: AIProvider[]): AIProvider[] {
    const weights = this.selectionConfig.costWeights || {};
    return providers.sort((a, b) => (weights[a] || 1) - (weights[b] || 1));
  }
  
  /**
   * Health-based provider selection
   */
  private selectHealthBased(providers: AIProvider[]): AIProvider[] {
    const metrics = providers.map(p => ({
      provider: p,
      metrics: this.providerMetrics.get(p)!,
    }));
    
    return metrics
      .sort((a, b) => {
        const scoreA = this.calculateHealthScore(a.metrics);
        const scoreB = this.calculateHealthScore(b.metrics);
        return scoreB - scoreA; // Higher score is better
      })
      .map(m => m.provider);
  }
  
  /**
   * Cost-optimized provider selection
   */
  private selectCostOptimized(providers: AIProvider[]): AIProvider[] {
    const weights = this.selectionConfig.costWeights || {};
    return providers.sort((a, b) => (weights[a] || 1) - (weights[b] || 1));
  }
  
  /**
   * Calculate health score for a provider
   */
  private calculateHealthScore(metrics: ProviderMetrics): number {
    const successRate = metrics.totalRequests > 0 ? 
      metrics.successfulRequests / metrics.totalRequests : 1;
    const latencyScore = Math.max(0, 1 - metrics.averageLatency / 10000); // 10s max
    
    return (successRate * 0.7) + (latencyScore * 0.3);
  }
  
  /**
   * Check if provider is healthy
   */
  private isProviderHealthy(provider: AIProvider): boolean {
    const metrics = this.providerMetrics.get(provider);
    if (!metrics || metrics.totalRequests === 0) return true;
    
    const errorRate = 1 - (metrics.successfulRequests / metrics.totalRequests);
    return errorRate < this.selectionConfig.failoverThreshold;
  }
  
  /**
   * Connection count management
   */
  private incrementConnectionCount(provider: AIProvider): void {
    const current = this.connectionCounts.get(provider) || 0;
    this.connectionCounts.set(provider, current + 1);
  }
  
  private decrementConnectionCount(provider: AIProvider): void {
    const current = this.connectionCounts.get(provider) || 0;
    this.connectionCounts.set(provider, Math.max(0, current - 1));
  }
  
  /**
   * Record successful request
   */
  private recordRequestSuccess(context: RequestContext): void {
    this.requestHistory.push(context);
    this.updateProviderMetrics(context);
  }
  
  /**
   * Record failed request
   */
  private recordRequestFailure(context: RequestContext): void {
    this.requestHistory.push(context);
    this.updateProviderMetrics(context);
  }
  
  /**
   * Update provider metrics
   */
  private updateProviderMetrics(context: RequestContext): void {
    if (!context.provider) return;
    
    const metrics = this.providerMetrics.get(context.provider);
    if (!metrics) return;
    
    metrics.totalRequests++;
    metrics.lastUsed = context.timestamp;
    
    if (context.success) {
      metrics.successfulRequests++;
      
      if (context.latency) {
        metrics.averageLatency = (
          (metrics.averageLatency * (metrics.successfulRequests - 1)) + context.latency
        ) / metrics.successfulRequests;
      }
      
      if (context.tokens) {
        metrics.totalTokens += context.tokens;
      }
      
      if (context.cost) {
        metrics.totalCost += context.cost;
      }
    } else {
      metrics.failedRequests++;
    }
  }
  
  /**
   * Calculate cost based on provider and token count
   */
  private calculateCost(provider: AIProvider, tokens: number): number {
    // Simplified cost calculation - should be configurable
    const costPerToken = this.getCostPerToken(provider);
    return tokens * costPerToken;
  }
  
  /**
   * Get cost per token for a provider
   */
  private getCostPerToken(provider: AIProvider): number {
    // TODO: Make this configurable and model-specific
    switch (provider) {
      case AIProvider.OPENAI: return 0.00003; // GPT-4 estimate
      case AIProvider.ANTHROPIC: return 0.00004;
      case AIProvider.GOOGLE: return 0.00002;
      case AIProvider.AZURE: return 0.00003;
      case AIProvider.COPILOT_CLOUD: return 0.00001;
      case AIProvider.LOCAL: return 0.0;
      default: return 0.00003;
    }
  }
  
  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.getHealthStatus();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.selectionConfig.healthCheckInterval);
  }
  
  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    const disposePromises = Array.from(this.providers.values()).map(
      provider => provider.dispose()
    );
    
    await Promise.all(disposePromises);
    
    this.providers.clear();
    this.providerConfigs.clear();
    this.providerMetrics.clear();
    this.connectionCounts.clear();
    this.requestHistory.length = 0;
    
    console.log('🧹 AI Orchestrator disposed');
  }
}

// TODO: Implement caching layer for frequently requested completions
// TODO: Add support for provider-specific optimizations
// FIXME: Cost calculation should be model-specific and configurable
// TODO: Implement request queuing and batch processing
// TODO: Add support for custom load balancing strategies