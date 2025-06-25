/**
 * Base AI Provider Implementation
 * 
 * Abstract base class that provides common functionality for all AI providers.
 * Handles rate limiting, retry logic, health checking, and error handling.
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
  ProviderError,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderAuthenticationError,
  ProviderConfigSchema,
} from './types';

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerMinute?: number;
  enabled: boolean;
}

/**
 * Circuit breaker states
 */
enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  enabled: boolean;
}

/**
 * Request tracking for rate limiting and circuit breaking
 */
interface RequestTracker {
  timestamp: number;
  tokens?: number;
  success: boolean;
}

/**
 * Abstract base provider class
 * 
 * Provides common functionality that all AI providers need:
 * - Rate limiting
 * - Circuit breaking
 * - Retry logic with exponential backoff
 * - Health monitoring
 * - Request/response validation
 * - Metrics collection
 */
export abstract class BaseAIProvider implements UniversalAIProvider {
  public readonly provider: AIProvider;
  public readonly config: ProviderConfig;
  
  protected initialized: boolean = false;
  protected rateLimitConfig: RateLimitConfig;
  protected circuitBreakerConfig: CircuitBreakerConfig;
  protected circuitBreakerState: CircuitBreakerState = CircuitBreakerState.CLOSED;
  protected requestHistory: RequestTracker[] = [];
  protected failureCount: number = 0;
  protected lastFailureTime: number = 0;
  protected healthStatus: ProviderHealth;
  
  constructor(provider: AIProvider) {
    this.provider = provider;
    this.config = {} as ProviderConfig; // Will be set in initialize()
    
    // Default configurations
    this.rateLimitConfig = {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      tokensPerMinute: 100000,
      enabled: true,
    };
    
    this.circuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      enabled: true,
    };
    
    this.healthStatus = {
      provider: this.provider,
      status: 'healthy',
      latency: 0,
      errorRate: 0,
      lastCheck: new Date(),
    };
  }
  
  /**
   * Initialize provider with configuration
   */
  async initialize(config: ProviderConfig): Promise<void> {
    // Validate configuration
    const validationResult = ProviderConfigSchema.safeParse(config);
    if (!validationResult.success) {
      throw new ProviderError(
        `Invalid configuration: ${validationResult.error.message}`,
        this.provider,
        'INVALID_CONFIG'
      );
    }
    
    Object.assign(this.config, config);
    
    // Provider-specific initialization
    await this.initializeProvider(config);
    
    // Test connection
    await this.testConnection();
    
    this.initialized = true;
    console.log(`✅ Provider ${this.provider} initialized successfully`);
  }
  
  /**
   * Abstract method for provider-specific initialization
   */
  protected abstract initializeProvider(config: ProviderConfig): Promise<void>;
  
  /**
   * Abstract method for testing provider connection
   */
  protected abstract testConnection(): Promise<void>;
  
  /**
   * Send completion request with all safety checks
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.ensureInitialized();
    await this.checkRateLimit();
    this.checkCircuitBreaker();
    
    const startTime = Date.now();
    let success = false;
    
    try {
      const response = await this.performCompletion(request);
      success = true;
      this.recordRequest(startTime, true);
      this.updateHealthStatus(Date.now() - startTime, true);
      return response;
    } catch (error) {
      this.recordRequest(startTime, false);
      this.updateHealthStatus(Date.now() - startTime, false);
      this.handleError(error);
      throw error; // Re-throw after handling
    }
  }
  
  /**
   * Send streaming completion request
   */
  async* streamComplete(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    this.ensureInitialized();
    await this.checkRateLimit();
    this.checkCircuitBreaker();
    
    const startTime = Date.now();
    let success = false;
    
    try {
      const stream = this.performStreamCompletion(request);
      
      for await (const chunk of stream) {
        yield chunk;
        if (chunk.finished) {
          success = true;
          break;
        }
      }
      
      this.recordRequest(startTime, success);
      this.updateHealthStatus(Date.now() - startTime, success);
    } catch (error) {
      this.recordRequest(startTime, false);
      this.updateHealthStatus(Date.now() - startTime, false);
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Abstract methods for provider-specific implementation
   */
  protected abstract performCompletion(request: CompletionRequest): Promise<CompletionResponse>;
  protected abstract performStreamCompletion(request: CompletionRequest): AsyncIterableIterator<StreamChunk>;
  
  /**
   * Health check implementation
   */
  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      // Simple ping test
      await this.testConnection();
      
      const latency = Date.now() - startTime;
      const errorRate = this.calculateErrorRate();
      
      this.healthStatus = {
        provider: this.provider,
        status: this.determineHealthStatus(latency, errorRate),
        latency,
        errorRate,
        lastCheck: new Date(),
      };
    } catch (error) {
      this.healthStatus = {
        provider: this.provider,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        errorRate: 1.0,
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
    
    return this.healthStatus;
  }
  
  /**
   * Get available models - must be implemented by each provider
   */
  abstract getAvailableModels(): Promise<string[]>;
  
  /**
   * Validate configuration
   */
  validateConfig(config: ProviderConfig): boolean {
    const result = ProviderConfigSchema.safeParse(config);
    return result.success;
  }
  
  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    console.log(`🧹 Disposing provider ${this.provider}`);
    this.initialized = false;
    // Provider-specific cleanup can be implemented in derived classes
  }
  
  /**
   * Rate limiting check
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.rateLimitConfig.enabled) return;
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    
    // Clean old requests
    this.requestHistory = this.requestHistory.filter(r => r.timestamp > oneHourAgo);
    
    const recentRequests = this.requestHistory.filter(r => r.timestamp > oneMinuteAgo);
    const hourlyRequests = this.requestHistory.length;
    
    if (recentRequests.length >= this.rateLimitConfig.requestsPerMinute) {
      throw new ProviderRateLimitError(this.provider, 60);
    }
    
    if (hourlyRequests >= this.rateLimitConfig.requestsPerHour) {
      throw new ProviderRateLimitError(this.provider, 3600);
    }
  }
  
  /**
   * Circuit breaker check
   */
  private checkCircuitBreaker(): void {
    if (!this.circuitBreakerConfig.enabled) return;
    
    const now = Date.now();
    
    switch (this.circuitBreakerState) {
      case CircuitBreakerState.OPEN:
        if (now - this.lastFailureTime > this.circuitBreakerConfig.resetTimeout) {
          this.circuitBreakerState = CircuitBreakerState.HALF_OPEN;
          console.log(`🔄 Circuit breaker for ${this.provider} moved to HALF_OPEN`);
        } else {
          throw new ProviderError(
            `Circuit breaker is OPEN for provider ${this.provider}`,
            this.provider,
            'CIRCUIT_BREAKER_OPEN'
          );
        }
        break;
        
      case CircuitBreakerState.HALF_OPEN:
        // Allow one request to test if service is back
        break;
        
      case CircuitBreakerState.CLOSED:
        // Normal operation
        break;
    }
  }
  
  /**
   * Record request for metrics and rate limiting
   */
  private recordRequest(startTime: number, success: boolean, tokens?: number): void {
    this.requestHistory.push({
      timestamp: startTime,
      tokens,
      success,
    });
    
    if (success) {
      if (this.circuitBreakerState === CircuitBreakerState.HALF_OPEN) {
        this.circuitBreakerState = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        console.log(`✅ Circuit breaker for ${this.provider} CLOSED`);
      }
    } else {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.circuitBreakerConfig.failureThreshold &&
          this.circuitBreakerState === CircuitBreakerState.CLOSED) {
        this.circuitBreakerState = CircuitBreakerState.OPEN;
        console.log(`🚨 Circuit breaker for ${this.provider} OPENED`);
      }
    }
  }
  
  /**
   * Update health status based on request results
   */
  private updateHealthStatus(latency: number, success: boolean): void {
    this.healthStatus.latency = latency;
    this.healthStatus.errorRate = this.calculateErrorRate();
    this.healthStatus.lastCheck = new Date();
    
    if (success) {
      this.healthStatus.status = this.determineHealthStatus(latency, this.healthStatus.errorRate);
    }
  }
  
  /**
   * Calculate error rate from recent requests
   */
  private calculateErrorRate(): number {
    const recentRequests = this.requestHistory.filter(
      r => r.timestamp > Date.now() - this.circuitBreakerConfig.monitoringWindow
    );
    
    if (recentRequests.length === 0) return 0;
    
    const failedRequests = recentRequests.filter(r => !r.success).length;
    return failedRequests / recentRequests.length;
  }
  
  /**
   * Determine health status based on metrics
   */
  private determineHealthStatus(latency: number, errorRate: number): 'healthy' | 'degraded' | 'unhealthy' {
    if (errorRate > 0.5 || latency > 30000) return 'unhealthy';
    if (errorRate > 0.1 || latency > 5000) return 'degraded';
    return 'healthy';
  }
  
  /**
   * Handle provider-specific errors
   */
  protected handleError(error: any): void {
    console.error(`❌ Provider ${this.provider} error:`, error);
    
    // TODO: Add provider-specific error mapping
    // FIXME: Improve error classification logic
    
    if (error?.status === 401 || error?.code === 'AUTH_FAILED') {
      throw new ProviderAuthenticationError(this.provider);
    }
    
    if (error?.status === 429 || error?.code === 'RATE_LIMIT') {
      const retryAfter = error?.headers?.['retry-after'] ? 
        parseInt(error.headers['retry-after']) : undefined;
      throw new ProviderRateLimitError(this.provider, retryAfter);
    }
    
    if (error?.code === 'TIMEOUT' || error?.name === 'TimeoutError') {
      throw new ProviderTimeoutError(this.provider, this.config.timeout || 30000);
    }
    
    // Generic provider error
    if (!(error instanceof ProviderError)) {
      throw new ProviderError(
        error?.message || 'Unknown provider error',
        this.provider,
        error?.code,
        error?.status,
        error
      );
    }
  }
  
  /**
   * Ensure provider is initialized
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new ProviderError(
        `Provider ${this.provider} not initialized`,
        this.provider,
        'NOT_INITIALIZED'
      );
    }
  }
  
  /**
   * Retry logic with exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retryCount || 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication errors
        if (error instanceof ProviderAuthenticationError) {
          throw error;
        }
        
        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`⏳ Retrying ${this.provider} request in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// TODO: Add metrics collection and export to monitoring systems
// FIXME: Implement proper logging with structured data
// HACK: Circuit breaker timeout should be configurable per provider type