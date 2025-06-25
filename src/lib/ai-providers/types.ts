/**
 * Universal AI Provider Types
 * 
 * This module defines the core types for the Universal AI Chat Hub's
 * multi-provider architecture. It provides abstractions for different
 * AI providers (OpenAI, Anthropic, Google, etc.) and standardizes
 * their interfaces for seamless integration.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

import { z } from 'zod';

/**
 * Supported AI providers
 * TODO: Add support for more providers (Cohere, Mistral, local models)
 */
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  AZURE = 'azure',
  COPILOT_CLOUD = 'copilot_cloud',
  LOCAL = 'local', // For local models via Ollama, etc.
}

/**
 * Standard message roles across all providers
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL = 'tool',
  FUNCTION = 'function', // Legacy OpenAI function calling
}

/**
 * Universal message format that works across all providers
 */
export interface UniversalMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  toolCalls?: ToolCall[];
  toolCallId?: string; // For tool responses
}

/**
 * Tool call representation
 */
export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

/**
 * Streaming chunk for real-time responses
 */
export interface StreamChunk {
  id: string;
  content?: string;
  delta?: string;
  toolCalls?: Partial<ToolCall>[];
  finished: boolean;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  endpoint?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retryCount?: number;
  // Provider-specific settings
  additionalConfig?: Record<string, any>;
}

/**
 * Request options for AI completion
 */
export interface CompletionRequest {
  messages: UniversalMessage[];
  tools?: Tool[];
  toolChoice?: 'auto' | 'required' | 'none' | { type: 'function', function: { name: string } };
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
  metadata?: Record<string, any>;
}

/**
 * Tool definition compatible with various providers
 */
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>; // JSON Schema
  };
}

/**
 * Response from AI provider
 */
export interface CompletionResponse {
  id: string;
  message: UniversalMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  metadata?: Record<string, any>;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: AIProvider;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: Date;
  message?: string;
}

/**
 * Load balancing strategy
 */
export enum LoadBalanceStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  WEIGHTED = 'weighted',
  HEALTH_BASED = 'health_based',
  COST_OPTIMIZED = 'cost_optimized',
}

/**
 * Provider selection criteria
 */
export interface ProviderSelection {
  strategy: LoadBalanceStrategy;
  fallbackProviders: AIProvider[];
  healthCheckInterval: number;
  failoverThreshold: number;
  costWeights?: Record<AIProvider, number>;
}

/**
 * Universal AI Provider Interface
 * 
 * All provider implementations must implement this interface
 * to ensure consistent behavior across different AI services.
 */
export interface UniversalAIProvider {
  readonly provider: AIProvider;
  readonly config: ProviderConfig;
  
  /**
   * Initialize the provider with configuration
   * @param config Provider-specific configuration
   */
  initialize(config: ProviderConfig): Promise<void>;
  
  /**
   * Send completion request
   * @param request Completion request
   * @returns Promise resolving to completion response
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  
  /**
   * Send streaming completion request
   * @param request Completion request
   * @returns Async iterator of stream chunks
   */
  streamComplete(request: CompletionRequest): AsyncIterableIterator<StreamChunk>;
  
  /**
   * Check provider health
   * @returns Provider health status
   */
  healthCheck(): Promise<ProviderHealth>;
  
  /**
   * Get available models for this provider
   * @returns List of available models
   */
  getAvailableModels(): Promise<string[]>;
  
  /**
   * Validate provider configuration
   * @param config Configuration to validate
   * @returns True if valid, false otherwise
   */
  validateConfig(config: ProviderConfig): boolean;
  
  /**
   * Clean up resources
   */
  dispose(): Promise<void>;
}

/**
 * Zod schemas for runtime validation
 */
export const ProviderConfigSchema = z.object({
  provider: z.nativeEnum(AIProvider),
  apiKey: z.string().optional(),
  endpoint: z.string().url().optional(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  timeout: z.number().positive().optional(),
  retryCount: z.number().min(0).max(10).optional(),
  additionalConfig: z.record(z.any()).optional(),
});

export const UniversalMessageSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(MessageRole),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    parameters: z.record(z.any()),
    result: z.any().optional(),
    error: z.string().optional(),
    status: z.enum(['pending', 'executing', 'completed', 'failed']),
  })).optional(),
  toolCallId: z.string().optional(),
});

export const CompletionRequestSchema = z.object({
  messages: z.array(UniversalMessageSchema),
  tools: z.array(z.object({
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.any()),
    }),
  })).optional(),
  toolChoice: z.union([
    z.enum(['auto', 'required', 'none']),
    z.object({
      type: z.literal('function'),
      function: z.object({
        name: z.string(),
      }),
    }),
  ]).optional(),
  stream: z.boolean().optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Error types for provider operations
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public code?: string,
    public statusCode?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: AIProvider, timeout: number) {
    super(`Provider ${provider} timed out after ${timeout}ms`, provider, 'TIMEOUT');
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: AIProvider, retryAfter?: number) {
    super(`Provider ${provider} rate limit exceeded`, provider, 'RATE_LIMIT');
    this.name = 'ProviderRateLimitError';
    this.statusCode = 429;
    this.metadata = { retryAfter };
  }
  
  metadata?: { retryAfter?: number };
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(provider: AIProvider) {
    super(`Provider ${provider} authentication failed`, provider, 'AUTH_FAILED');
    this.name = 'ProviderAuthenticationError';
    this.statusCode = 401;
  }
}

// FIXME: Add proper error handling for network issues
// TODO: Implement provider-specific error mapping
// HACK: Using generic error handling until provider-specific errors are implemented