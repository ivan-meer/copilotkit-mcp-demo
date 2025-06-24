/**
 * Enhanced MCP (Model Context Protocol) Types
 * 
 * Extended type definitions for the Universal AI Chat Hub's MCP integration.
 * Provides comprehensive types for server management, tool definitions,
 * resource handling, and real-time communication.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

import { z } from 'zod';

/**
 * Enhanced MCP connection types
 */
export enum MCPTransportType {
  STDIO = 'stdio',
  SSE = 'sse',
  WEBSOCKET = 'websocket',
  HTTP = 'http',
  GRPC = 'grpc', // Future support
}

/**
 * MCP server status
 */
export enum MCPServerStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
}

/**
 * MCP tool parameter types
 */
export enum MCPParameterType {
  STRING = 'string',
  NUMBER = 'number',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  NULL = 'null',
}

/**
 * Enhanced MCP server configuration
 */
export interface EnhancedMCPServerConfig {
  id: string;
  name: string;
  description?: string;
  version?: string;
  transport: MCPTransportType;
  
  // Connection settings
  connection: {
    // For stdio
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    
    // For HTTP/SSE/WebSocket
    url?: string;
    headers?: Record<string, string>;
    
    // Common settings
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
    keepAlive?: boolean;
  };
  
  // Security settings
  security?: {
    apiKey?: string;
    bearerToken?: string;
    certificate?: string;
    allowSelfSigned?: boolean;
  };
  
  // Server capabilities
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    notifications?: boolean;
    experimental?: string[];
  };
  
  // UI generation settings
  ui?: {
    theme?: string;
    customStyles?: Record<string, any>;
    layout?: 'grid' | 'list' | 'tabs';
    grouping?: 'category' | 'type' | 'alphabetical';
  };
  
  // Metadata
  metadata?: {
    tags?: string[];
    category?: string;
    priority?: number;
    icon?: string;
    color?: string;
    author?: string;
    homepage?: string;
    documentation?: string;
  };
  
  // Runtime settings
  enabled: boolean;
  autoReconnect: boolean;
  healthCheckInterval?: number;
  rateLimiting?: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    burstLimit?: number;
  };
}

/**
 * MCP tool definition with enhanced metadata
 */
export interface EnhancedMCPTool {
  name: string;
  description: string;
  
  // JSON Schema for parameters
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPParameterSchema>;
    required?: string[];
    additionalProperties?: boolean;
  };
  
  // Enhanced metadata for UI generation
  metadata?: {
    category?: string;
    tags?: string[];
    examples?: Array<{
      name: string;
      description: string;
      parameters: Record<string, any>;
    }>;
    
    // UI hints
    ui?: {
      icon?: string;
      color?: string;
      confirmationRequired?: boolean;
      confirmationMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      
      // Form generation hints
      form?: {
        layout?: 'vertical' | 'horizontal' | 'inline';
        grouping?: Record<string, string[]>; // group name -> parameter names
        fieldOrder?: string[];
        conditionalFields?: Record<string, {
          dependsOn: string;
          condition: any;
        }>;
      };
      
      // Result display hints
      result?: {
        format?: 'json' | 'markdown' | 'html' | 'table' | 'chart';
        template?: string;
        visualization?: {
          type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
          xAxis?: string;
          yAxis?: string;
          groupBy?: string;
        };
      };
    };
  };
  
  // Runtime information
  runtime?: {
    lastUsed?: Date;
    usageCount?: number;
    averageExecutionTime?: number;
    successRate?: number;
    deprecated?: boolean;
    experimental?: boolean;
  };
}

/**
 * Enhanced parameter schema
 */
export interface MCPParameterSchema {
  type: MCPParameterType | MCPParameterType[];
  description?: string;
  default?: any;
  enum?: any[];
  examples?: any[];
  
  // Validation
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  
  // Array specific
  items?: MCPParameterSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Object specific
  properties?: Record<string, MCPParameterSchema>;
  required?: string[];
  additionalProperties?: boolean | MCPParameterSchema;
  
  // UI hints
  ui?: {
    widget?: 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'slider' | 'date' | 'time' | 'datetime' | 'file' | 'color';
    placeholder?: string;
    help?: string;
    group?: string;
    order?: number;
    width?: 'full' | 'half' | 'third' | 'quarter';
    hidden?: boolean;
    readonly?: boolean;
    sensitive?: boolean; // For passwords, API keys, etc.
  };
}

/**
 * MCP resource definition
 */
export interface EnhancedMCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  
  // Metadata
  metadata?: {
    size?: number;
    lastModified?: Date;
    version?: string;
    tags?: string[];
    category?: string;
    
    // Access control
    permissions?: {
      read?: boolean;
      write?: boolean;
      delete?: boolean;
    };
    
    // UI hints
    ui?: {
      icon?: string;
      preview?: boolean;
      downloadable?: boolean;
      editable?: boolean;
      
      // Viewer hints
      viewer?: {
        type?: 'text' | 'json' | 'xml' | 'markdown' | 'html' | 'image' | 'video' | 'audio' | 'pdf';
        syntax?: string; // For code highlighting
        maxSize?: number; // Maximum size to display inline
      };
    };
  };
}

/**
 * MCP prompt template
 */
export interface EnhancedMCPPrompt {
  name: string;
  description?: string;
  
  // Prompt arguments
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    type?: MCPParameterType;
    default?: any;
  }>;
  
  // Metadata
  metadata?: {
    category?: string;
    tags?: string[];
    examples?: Array<{
      name: string;
      description: string;
      arguments: Record<string, any>;
    }>;
    
    // UI hints
    ui?: {
      icon?: string;
      category?: string;
      preview?: boolean;
      
      // Form generation
      form?: {
        layout?: 'vertical' | 'horizontal';
        fieldOrder?: string[];
      };
    };
  };
}

/**
 * MCP server runtime state
 */
export interface MCPServerState {
  config: EnhancedMCPServerConfig;
  status: MCPServerStatus;
  
  // Connection info
  connectionInfo: {
    connectedAt?: Date;
    lastActivity?: Date;
    reconnectCount?: number;
    lastError?: string;
    uptime?: number;
  };
  
  // Capabilities discovered at runtime
  discoveredCapabilities: {
    tools: EnhancedMCPTool[];
    resources: EnhancedMCPResource[];
    prompts: EnhancedMCPPrompt[];
    notifications: string[];
  };
  
  // Health and performance metrics
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastRequestTime?: Date;
    
    // Resource usage
    memoryUsage?: number;
    cpuUsage?: number;
    
    // Rate limiting
    requestsInLastMinute: number;
    requestsInLastHour: number;
  };
  
  // Error tracking
  errors: Array<{
    timestamp: Date;
    error: string;
    context?: any;
    resolved?: boolean;
  }>;
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  id: string;
  toolName: string;
  serverId: string;
  parameters: Record<string, any>;
  
  // Execution state
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  
  // Results
  result?: any;
  error?: string;
  
  // Metadata
  metadata?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    tags?: string[];
  };
  
  // Progress tracking
  progress?: {
    current: number;
    total: number;
    message?: string;
    details?: any;
  };
}

/**
 * MCP notification
 */
export interface MCPNotification {
  id: string;
  type: string;
  timestamp: Date;
  serverId: string;
  
  // Notification data
  data: any;
  
  // Metadata
  metadata?: {
    severity?: 'info' | 'warning' | 'error';
    category?: string;
    dismissible?: boolean;
    persistent?: boolean;
    
    // UI hints
    ui?: {
      icon?: string;
      color?: string;
      sound?: boolean;
      toast?: boolean;
    };
  };
}

/**
 * MCP server discovery result
 */
export interface MCPServerDiscovery {
  servers: Array<{
    id: string;
    name: string;
    description?: string;
    version?: string;
    transport: MCPTransportType;
    endpoint: string;
    
    // Metadata
    metadata?: {
      category?: string;
      tags?: string[];
      icon?: string;
      homepage?: string;
      documentation?: string;
      author?: string;
      license?: string;
    };
    
    // Capabilities preview
    capabilities?: {
      toolCount?: number;
      resourceCount?: number;
      promptCount?: number;
      features?: string[];
    };
  }>;
}

/**
 * Zod schemas for validation
 */
export const EnhancedMCPServerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  transport: z.nativeEnum(MCPTransportType),
  
  connection: z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    url: z.string().url().optional(),
    headers: z.record(z.string()).optional(),
    timeout: z.number().positive().optional(),
    retryCount: z.number().min(0).max(10).optional(),
    retryDelay: z.number().positive().optional(),
    keepAlive: z.boolean().optional(),
  }),
  
  security: z.object({
    apiKey: z.string().optional(),
    bearerToken: z.string().optional(),
    certificate: z.string().optional(),
    allowSelfSigned: z.boolean().optional(),
  }).optional(),
  
  capabilities: z.object({
    tools: z.boolean().optional(),
    resources: z.boolean().optional(),
    prompts: z.boolean().optional(),
    notifications: z.boolean().optional(),
    experimental: z.array(z.string()).optional(),
  }).optional(),
  
  ui: z.object({
    theme: z.string().optional(),
    customStyles: z.record(z.any()).optional(),
    layout: z.enum(['grid', 'list', 'tabs']).optional(),
    grouping: z.enum(['category', 'type', 'alphabetical']).optional(),
  }).optional(),
  
  metadata: z.object({
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    priority: z.number().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    author: z.string().optional(),
    homepage: z.string().url().optional(),
    documentation: z.string().url().optional(),
  }).optional(),
  
  enabled: z.boolean(),
  autoReconnect: z.boolean(),
  healthCheckInterval: z.number().positive().optional(),
  
  rateLimiting: z.object({
    requestsPerSecond: z.number().positive().optional(),
    requestsPerMinute: z.number().positive().optional(),
    burstLimit: z.number().positive().optional(),
  }).optional(),
});

/**
 * Error types for MCP operations
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public serverId: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class MCPConnectionError extends MCPError {
  constructor(serverId: string, message: string, details?: any) {
    super(`Connection failed: ${message}`, serverId, 'CONNECTION_ERROR', details);
    this.name = 'MCPConnectionError';
  }
}

export class MCPToolExecutionError extends MCPError {
  constructor(serverId: string, toolName: string, message: string, details?: any) {
    super(`Tool execution failed: ${toolName} - ${message}`, serverId, 'TOOL_EXECUTION_ERROR', details);
    this.name = 'MCPToolExecutionError';
  }
}

export class MCPValidationError extends MCPError {
  constructor(serverId: string, message: string, details?: any) {
    super(`Validation failed: ${message}`, serverId, 'VALIDATION_ERROR', details);
    this.name = 'MCPValidationError';
  }
}

// TODO: Add support for WebSocket and gRPC transports
// TODO: Implement MCP server discovery protocol
// FIXME: Parameter validation should be more comprehensive
// TODO: Add support for streaming tool execution
// HACK: Using JSON Schema instead of proper MCP schema definitions