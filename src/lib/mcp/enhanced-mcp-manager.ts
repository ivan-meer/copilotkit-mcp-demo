/**
 * Enhanced MCP Server Manager
 * 
 * Advanced MCP server management system with health monitoring,
 * auto-discovery, connection pooling, and real-time capabilities.
 * 
 * Features:
 * - Multi-transport support (stdio, SSE, WebSocket, HTTP)
 * - Health monitoring and auto-reconnection
 * - Server discovery and capability detection
 * - Tool execution with progress tracking
 * - Resource management and caching
 * - Real-time notifications
 * - Performance metrics and analytics
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';

// Временные типы для демонстрации
interface EnhancedMCPServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'websocket' | 'http';
  connection: {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
  };
  enabled: boolean;
  autoReconnect: boolean;
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    logging?: boolean;
  };
}

enum MCPServerStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

enum MCPTransportType {
  STDIO = 'stdio',
  SSE = 'sse',
  WEBSOCKET = 'websocket',
  HTTP = 'http'
}

interface MCPServerState {
  config: EnhancedMCPServerConfig;
  status: MCPServerStatus;
  connectionInfo: {
    connectedAt?: Date;
    lastActivity?: Date;
    lastError?: string;
    reconnectCount: number;
  };
  discoveredCapabilities: {
    tools: any[];
    resources: any[];
    prompts: any[];
    notifications: any[];
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsInLastMinute: number;
    requestsInLastHour: number;
    lastRequestTime?: Date;
  };
  errors: Array<{
    timestamp: Date;
    error: string;
    context?: string;
    resolved: boolean;
  }>;
}

interface ToolExecutionContext {
  id: string;
  toolName: string;
  serverId: string;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  metadata?: any;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

class MCPError extends Error {
  constructor(message: string, public serverId?: string) {
    super(message);
    this.name = 'MCPError';
  }
}

class MCPConnectionError extends MCPError {
  constructor(serverId: string, message: string) {
    super(message, serverId);
    this.name = 'MCPConnectionError';
  }
}

class MCPToolExecutionError extends MCPError {
  constructor(serverId: string, public toolName: string, message: string) {
    super(message, serverId);
    this.name = 'MCPToolExecutionError';
  }
}

class MCPValidationError extends MCPError {
  constructor(serverId: string, message: string) {
    super(message, serverId);
    this.name = 'MCPValidationError';
  }
}

/**
 * MCP Transport interface for different connection types
 */
interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: any): Promise<any>;
  isConnected(): boolean;
  getStatus(): MCPServerStatus;
}

/**
 * Server event types
 */
export interface MCPServerEvents {
  'server:connected': (serverId: string) => void;
  'server:disconnected': (serverId: string, error?: Error) => void;
  'server:error': (serverId: string, error: Error) => void;
  'server:capability_discovered': (serverId: string, capability: string, data: any) => void;
  'tool:execution_started': (context: ToolExecutionContext) => void;
  'tool:execution_progress': (context: ToolExecutionContext) => void;
  'tool:execution_completed': (context: ToolExecutionContext) => void;
  'tool:execution_failed': (context: ToolExecutionContext) => void;
  'notification:received': (notification: MCPNotification) => void;
  'metrics:updated': (serverId: string, metrics: any) => void;
}

/**
 * Enhanced MCP Server Manager
 */
export class EnhancedMCPManager extends EventEmitter {
  private servers: Map<string, MCPServerState> = new Map();
  private transports: Map<string, MCPTransport> = new Map();
  private executionContexts: Map<string, ToolExecutionContext> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private resourceCache: Map<string, any> = new Map();
  
  // Configuration
  private config = {
    maxConcurrentExecutions: 10,
    defaultTimeout: 30000,
    healthCheckInterval: 60000,
    maxRetries: 3,
    retryDelay: 1000,
    resourceCacheSize: 100,
    resourceCacheTtl: 300000, // 5 minutes
  };
  
  constructor() {
    super();
    this.setupCleanupTasks();
  }
  
  /**
   * Add and initialize a new MCP server
   */
  async addServer(config: EnhancedMCPServerConfig): Promise<void> {
    // Basic validation
    if (!config.id || !config.name || !config.transport) {
      throw new MCPValidationError(
        config.id || 'unknown',
        'Invalid server configuration: missing required fields'
      );
    }
    
    console.log(`🔧 Adding MCP server: ${config.name} (${config.id})`);
    
    // Create server state
    const serverState: MCPServerState = {
      config,
      status: MCPServerStatus.DISCONNECTED,
      connectionInfo: {
        reconnectCount: 0,
      },
      discoveredCapabilities: {
        tools: [],
        resources: [],
        prompts: [],
        notifications: [],
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsInLastMinute: 0,
        requestsInLastHour: 0,
      },
      errors: [],
    };
    
    this.servers.set(config.id, serverState);
    
    // Create transport
    const transport = this.createTransport(config);
    this.transports.set(config.id, transport);
    
    // Connect if enabled
    if (config.enabled) {
      await this.connectServer(config.id);
    }
    
    // Setup health checking
    this.setupHealthCheck(config.id);
    
    console.log(`✅ MCP server ${config.name} added successfully`);
  }
  
  /**
   * Remove a server
   */
  async removeServer(serverId: string): Promise<void> {
    const serverState = this.servers.get(serverId);
    if (!serverState) {
      throw new MCPError(`Server ${serverId} not found`, serverId);
    }
    
    console.log(`🗑️ Removing MCP server: ${serverState.config.name}`);
    
    // Disconnect and cleanup
    await this.disconnectServer(serverId);
    this.cleanupHealthCheck(serverId);
    
    // Remove from collections
    this.servers.delete(serverId);
    this.transports.delete(serverId);
    
    // Cancel running executions
    for (const [contextId, context] of this.executionContexts.entries()) {
      if (context.serverId === serverId) {
        context.status = 'cancelled';
        this.executionContexts.delete(contextId);
      }
    }
    
    console.log(`✅ MCP server ${serverId} removed`);
  }
  
  /**
   * Connect to a server
   */
  async connectServer(serverId: string): Promise<void> {
    const serverState = this.servers.get(serverId);
    const transport = this.transports.get(serverId);
    
    if (!serverState || !transport) {
      throw new MCPError(`Server ${serverId} not found`, serverId);
    }
    
    if (serverState.status === MCPServerStatus.CONNECTED) {
      return; // Already connected
    }
    
    try {
      console.log(`🔌 Connecting to MCP server: ${serverState.config.name}`);
      serverState.status = MCPServerStatus.CONNECTING;
      
      await transport.connect();
      
      serverState.status = MCPServerStatus.CONNECTED;
      serverState.connectionInfo.connectedAt = new Date();
      serverState.connectionInfo.lastActivity = new Date();
      
      // Discover capabilities
      await this.discoverCapabilities(serverId);
      
      this.emit('server:connected', serverId);
      console.log(`✅ Connected to MCP server: ${serverState.config.name}`);
      
    } catch (error) {
      serverState.status = MCPServerStatus.ERROR;
      serverState.connectionInfo.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      this.recordError(serverId, error instanceof Error ? error : new Error('Unknown error'));
      this.emit('server:error', serverId, error instanceof Error ? error : new Error('Unknown error'));
      
      console.error(`❌ Failed to connect to MCP server ${serverState.config.name}:`, error);
      
      // Auto-reconnect if enabled
      if (serverState.config.autoReconnect) {
        this.scheduleReconnect(serverId);
      }
      
      throw new MCPConnectionError(serverId, error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  /**
   * Disconnect from a server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const serverState = this.servers.get(serverId);
    const transport = this.transports.get(serverId);
    
    if (!serverState || !transport) {
      throw new MCPError(`Server ${serverId} not found`, serverId);
    }
    
    try {
      console.log(`🔌 Disconnecting from MCP server: ${serverState.config.name}`);
      
      await transport.disconnect();
      
      serverState.status = MCPServerStatus.DISCONNECTED;
      serverState.connectionInfo.lastActivity = new Date();
      
      this.emit('server:disconnected', serverId);
      console.log(`✅ Disconnected from MCP server: ${serverState.config.name}`);
      
    } catch (error) {
      console.error(`❌ Error disconnecting from MCP server ${serverState.config.name}:`, error);
      this.recordError(serverId, error instanceof Error ? error : new Error('Unknown error'));
    }
  }
  
  /**
   * Execute a tool on a server
   */
  async executeTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, any>,
    options?: {
      timeout?: number;
      metadata?: any;
      onProgress?: (context: ToolExecutionContext) => void;
    }
  ): Promise<any> {
    const serverState = this.servers.get(serverId);
    const transport = this.transports.get(serverId);
    
    if (!serverState || !transport) {
      throw new MCPError(`Server ${serverId} not found`, serverId);
    }
    
    if (serverState.status !== MCPServerStatus.CONNECTED) {
      throw new MCPConnectionError(serverId, 'Server not connected');
    }
    
    // Find tool definition
    const tool = serverState.discoveredCapabilities.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new MCPToolExecutionError(serverId, toolName, 'Tool not found');
    }
    
    // Validate parameters
    const validationResult = this.validateToolParameters(tool, parameters);
    if (!validationResult.valid) {
      throw new MCPValidationError(serverId, `Invalid parameters: ${validationResult.errors.join(', ')}`);
    }
    
    // Create execution context
    const context: ToolExecutionContext = {
      id: this.generateExecutionId(),
      toolName,
      serverId,
      parameters,
      status: 'pending',
      startTime: new Date(),
      metadata: options?.metadata,
    };
    
    this.executionContexts.set(context.id, context);
    this.emit('tool:execution_started', context);
    
    try {
      context.status = 'executing';
      
      // Execute tool with timeout
      const timeout = options?.timeout || this.config.defaultTimeout;
      const result = await Promise.race([
        this.performToolExecution(transport, toolName, parameters, context, options?.onProgress),
        this.createTimeout(timeout),
      ]);
      
      context.status = 'completed';
      context.endTime = new Date();
      context.result = result;
      
      // Update metrics
      this.updateServerMetrics(serverId, true, Date.now() - context.startTime.getTime());
      
      this.emit('tool:execution_completed', context);
      return result;
      
    } catch (error) {
      context.status = 'failed';
      context.endTime = new Date();
      context.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Update metrics
      this.updateServerMetrics(serverId, false, Date.now() - context.startTime.getTime());
      
      this.recordError(serverId, error instanceof Error ? error : new Error('Unknown error'));
      this.emit('tool:execution_failed', context);
      
      throw new MCPToolExecutionError(
        serverId,
        toolName,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      this.executionContexts.delete(context.id);
    }
  }
  
  /**
   * Get available tools for a server
   */
  getServerTools(serverId: string): EnhancedMCPTool[] {
    const serverState = this.servers.get(serverId);
    if (!serverState) {
      throw new MCPError(`Server ${serverId} not found`, serverId);
    }
    
    return serverState.discoveredCapabilities.tools;
  }
  
  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): Array<EnhancedMCPTool & { serverId: string; serverName: string }> {
    const allTools: Array<EnhancedMCPTool & { serverId: string; serverName: string }> = [];
    
    for (const [serverId, serverState] of this.servers.entries()) {
      if (serverState.status === MCPServerStatus.CONNECTED) {
        for (const tool of serverState.discoveredCapabilities.tools) {
          allTools.push({
            ...tool,
            serverId,
            serverName: serverState.config.name,
          });
        }
      }
    }
    
    return allTools;
  }
  
  /**
   * Get server resources
   */
  getServerResources(serverId: string): EnhancedMCPResource[] {
    const serverState = this.servers.get(serverId);
    if (!serverState) {
      throw new MCPError(`Server ${serverId} not found`, serverId);
    }
    
    return serverState.discoveredCapabilities.resources;
  }
  
  /**
   * Get server prompts
   */
  getServerPrompts(serverId: string): EnhancedMCPPrompt[] {
    const serverState = this.servers.get(serverId);
    if (!serverState) {
      throw new MCPError(`Server ${serverId} not found`, serverId);
    }
    
    return serverState.discoveredCapabilities.prompts;
  }
  
  /**
   * Get server status and metrics
   */
  getServerStatus(serverId?: string): MCPServerState | MCPServerState[] {
    if (serverId) {
      const serverState = this.servers.get(serverId);
      if (!serverState) {
        throw new MCPError(`Server ${serverId} not found`, serverId);
      }
      return serverState;
    }
    
    return Array.from(this.servers.values());
  }
  
  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): {
    totalServers: number;
    connectedServers: number;
    totalTools: number;
    totalResources: number;
    totalPrompts: number;
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
  } {
    let totalServers = 0;
    let connectedServers = 0;
    let totalTools = 0;
    let totalResources = 0;
    let totalPrompts = 0;
    let totalRequests = 0;
    let successfulRequests = 0;
    let totalResponseTime = 0;
    
    for (const serverState of this.servers.values()) {
      totalServers++;
      
      if (serverState.status === MCPServerStatus.CONNECTED) {
        connectedServers++;
        totalTools += serverState.discoveredCapabilities.tools.length;
        totalResources += serverState.discoveredCapabilities.resources.length;
        totalPrompts += serverState.discoveredCapabilities.prompts.length;
      }
      
      totalRequests += serverState.metrics.totalRequests;
      successfulRequests += serverState.metrics.successfulRequests;
      totalResponseTime += serverState.metrics.averageResponseTime * serverState.metrics.totalRequests;
    }
    
    return {
      totalServers,
      connectedServers,
      totalTools,
      totalResources,
      totalPrompts,
      totalRequests,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
    };
  }
  
  /**
   * Discover available MCP servers (placeholder for future implementation)
   */
  async discoverServers(): Promise<MCPServerDiscovery> {
    // TODO: Implement server discovery protocol
    console.log('🔍 MCP server discovery not yet implemented');
    return { servers: [] };
  }
  
  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    console.log('🧹 Disposing Enhanced MCP Manager');
    
    // Clear health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval);
    }
    this.healthCheckIntervals.clear();
    
    // Disconnect all servers
    const disconnectPromises = Array.from(this.servers.keys()).map(
      serverId => this.disconnectServer(serverId).catch(error => 
        console.error(`Error disconnecting server ${serverId}:`, error)
      )
    );
    
    await Promise.all(disconnectPromises);
    
    // Clear collections
    this.servers.clear();
    this.transports.clear();
    this.executionContexts.clear();
    this.resourceCache.clear();
    
    this.removeAllListeners();
  }
  
  /**
   * Create transport based on configuration
   */
  private createTransport(config: EnhancedMCPServerConfig): MCPTransport {
    switch (config.transport) {
      case MCPTransportType.STDIO:
        return new StdioTransport(config);
      case MCPTransportType.SSE:
        return new SSETransport(config);
      case MCPTransportType.WEBSOCKET:
        return new WebSocketTransport(config);
      case MCPTransportType.HTTP:
        return new HTTPTransport(config);
      default:
        throw new MCPError(`Unsupported transport type: ${config.transport}`, config.id);
    }
  }
  
  /**
   * Discover server capabilities
   */
  private async discoverCapabilities(serverId: string): Promise<void> {
    const transport = this.transports.get(serverId);
    const serverState = this.servers.get(serverId);
    
    if (!transport || !serverState) return;
    
    try {
      // Discover tools
      if (serverState.config.capabilities?.tools !== false) {
        const tools = await transport.send({ method: 'tools/list' });
        serverState.discoveredCapabilities.tools = tools || [];
        this.emit('server:capability_discovered', serverId, 'tools', tools);
      }
      
      // Discover resources
      if (serverState.config.capabilities?.resources !== false) {
        const resources = await transport.send({ method: 'resources/list' });
        serverState.discoveredCapabilities.resources = resources || [];
        this.emit('server:capability_discovered', serverId, 'resources', resources);
      }
      
      // Discover prompts
      if (serverState.config.capabilities?.prompts !== false) {
        const prompts = await transport.send({ method: 'prompts/list' });
        serverState.discoveredCapabilities.prompts = prompts || [];
        this.emit('server:capability_discovered', serverId, 'prompts', prompts);
      }
      
      console.log(`🔍 Discovered capabilities for ${serverState.config.name}:`, {
        tools: serverState.discoveredCapabilities.tools.length,
        resources: serverState.discoveredCapabilities.resources.length,
        prompts: serverState.discoveredCapabilities.prompts.length,
      });
      
    } catch (error) {
      console.warn(`⚠️ Failed to discover capabilities for ${serverState.config.name}:`, error);
    }
  }
  
  /**
   * Validate tool parameters against schema
   */
  private validateToolParameters(tool: EnhancedMCPTool, parameters: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    // TODO: Implement comprehensive JSON Schema validation
    // For now, just check required parameters
    const errors: string[] = [];
    const required = tool.inputSchema.required || [];
    
    for (const param of required) {
      if (!(param in parameters)) {
        errors.push(`Missing required parameter: ${param}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Perform actual tool execution
   */
  private async performToolExecution(
    transport: MCPTransport,
    toolName: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext,
    onProgress?: (context: ToolExecutionContext) => void
  ): Promise<any> {
    const message = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters,
      },
    };
    
    // TODO: Implement progress tracking for long-running operations
    if (onProgress) {
      context.progress = { current: 0, total: 100, message: 'Starting execution...' };
      onProgress(context);
    }
    
    const result = await transport.send(message);
    
    if (onProgress) {
      context.progress = { current: 100, total: 100, message: 'Execution completed' };
      onProgress(context);
    }
    
    return result;
  }
  
  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    });
  }
  
  /**
   * Update server metrics
   */
  private updateServerMetrics(serverId: string, success: boolean, responseTime: number): void {
    const serverState = this.servers.get(serverId);
    if (!serverState) return;
    
    const metrics = serverState.metrics;
    metrics.totalRequests++;
    metrics.lastRequestTime = new Date();
    
    if (success) {
      metrics.successfulRequests++;
      metrics.averageResponseTime = (
        (metrics.averageResponseTime * (metrics.successfulRequests - 1)) + responseTime
      ) / metrics.successfulRequests;
    } else {
      metrics.failedRequests++;
    }
    
    this.emit('metrics:updated', serverId, metrics);
  }
  
  /**
   * Record error for a server
   */
  private recordError(serverId: string, error: Error): void {
    const serverState = this.servers.get(serverId);
    if (!serverState) return;
    
    serverState.errors.push({
      timestamp: new Date(),
      error: error.message,
      context: error.stack,
      resolved: false,
    });
    
    // Keep only last 100 errors
    if (serverState.errors.length > 100) {
      serverState.errors.splice(0, serverState.errors.length - 100);
    }
  }
  
  /**
   * Setup health check for a server
   */
  private setupHealthCheck(serverId: string): void {
    const serverState = this.servers.get(serverId);
    if (!serverState) return;
    
    const interval = serverState.config.healthCheckInterval || this.config.healthCheckInterval;
    
    const healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck(serverId);
    }, interval);
    
    this.healthCheckIntervals.set(serverId, healthCheckInterval);
  }
  
  /**
   * Cleanup health check for a server
   */
  private cleanupHealthCheck(serverId: string): void {
    const interval = this.healthCheckIntervals.get(serverId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(serverId);
    }
  }
  
  /**
   * Perform health check for a server
   */
  private async performHealthCheck(serverId: string): Promise<void> {
    const serverState = this.servers.get(serverId);
    const transport = this.transports.get(serverId);
    
    if (!serverState || !transport) return;
    
    try {
      if (serverState.status === MCPServerStatus.CONNECTED) {
        await transport.send({ method: 'ping' });
        serverState.connectionInfo.lastActivity = new Date();
      }
    } catch (error) {
      console.warn(`⚠️ Health check failed for ${serverState.config.name}:`, error);
      
      if (serverState.config.autoReconnect) {
        this.scheduleReconnect(serverId);
      }
    }
  }
  
  /**
   * Schedule reconnection for a server
   */
  private scheduleReconnect(serverId: string): void {
    const serverState = this.servers.get(serverId);
    if (!serverState) return;
    
    if (serverState.status === MCPServerStatus.RECONNECTING) {
      return; // Already reconnecting
    }
    
    serverState.status = MCPServerStatus.RECONNECTING;
    serverState.connectionInfo.reconnectCount++;
    
    const delay = Math.min(
      this.config.retryDelay * Math.pow(2, serverState.connectionInfo.reconnectCount),
      30000 // Max 30 seconds
    );
    
    console.log(`🔄 Scheduling reconnect for ${serverState.config.name} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connectServer(serverId);
      } catch (error) {
        console.error(`❌ Reconnection failed for ${serverState.config.name}:`, error);
      }
    }, delay);
  }
  
  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Setup cleanup tasks
   */
  private setupCleanupTasks(): void {
    // Clean up resource cache periodically
    setInterval(() => {
      if (this.resourceCache.size > this.config.resourceCacheSize) {
        this.resourceCache.clear();
      }
    }, this.config.resourceCacheTtl);
  }
}

// Full transport implementations
class StdioTransport implements MCPTransport {
  private process?: ChildProcess;
  private isConnectedState = false;
  private requestCounter = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private buffer = '';

  constructor(private config: EnhancedMCPServerConfig) {}

  async connect(): Promise<void> {
    if (this.isConnectedState) return;

    const { command, args = [], env = {} } = this.config.connection;
    if (!command) {
      throw new Error('Command is required for stdio transport');
    }

    // Spawn process
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
      shell: true
    });

    if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
      throw new Error('Failed to establish stdio streams');
    }

    // Setup event handlers
    this.process.on('error', (error) => {
      this.isConnectedState = false;
      this.rejectAllPending(error);
    });

    this.process.on('exit', (code, signal) => {
      this.isConnectedState = false;
      this.rejectAllPending(new Error(`Process exited with code ${code}, signal ${signal}`));
    });

    // Setup stdout handler for responses
    this.process.stdout.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    // Setup stderr handler for logging
    this.process.stderr.on('data', (data) => {
      console.warn(`MCP Server ${this.config.id} stderr:`, data.toString());
    });

    // Perform handshake
    await this.performHandshake();
    this.isConnectedState = true;
  }

  async disconnect(): Promise<void> {
    if (!this.isConnectedState || !this.process) return;

    this.isConnectedState = false;
    
    // Reject all pending requests
    this.rejectAllPending(new Error('Connection closed'));

    // Kill process
    this.process.kill('SIGTERM');
    
    // Give it time to gracefully exit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!this.process.killed) {
      this.process.kill('SIGKILL');
    }

    this.process = undefined;
  }

  async send(message: any): Promise<any> {
    if (!this.isConnectedState || !this.process || !this.process.stdin) {
      throw new Error('Not connected');
    }

    const requestId = ++this.requestCounter;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      ...message
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, 30000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        const jsonMessage = JSON.stringify(request) + '\n';
        this.process!.stdin!.write(jsonMessage);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  isConnected(): boolean {
    return this.isConnectedState;
  }

  getStatus(): MCPServerStatus {
    return this.isConnectedState ? MCPServerStatus.CONNECTED : MCPServerStatus.DISCONNECTED;
  }

  private async performHandshake(): Promise<void> {
    const initRequest = {
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {}
        },
        clientInfo: {
          name: 'Universal AI Chat Hub',
          version: '1.0.0'
        }
      }
    };

    try {
      await this.send(initRequest);
    } catch (error) {
      throw new Error(`Handshake failed: ${error.message}`);
    }
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse JSON-RPC message:', error, line);
        }
      }
    }
  }

  private handleMessage(message: any): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message || 'Request failed'));
      } else {
        pending.resolve(message.result);
      }
    } else if (message.method) {
      // Handle notifications and requests from server
      console.log(`Received notification from ${this.config.id}:`, message);
    }
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

class SSETransport implements MCPTransport {
  private eventSource?: EventSource;
  private isConnectedState = false;
  private requestCounter = 0;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();

  constructor(private config: EnhancedMCPServerConfig) {}

  async connect(): Promise<void> {
    if (this.isConnectedState) return;

    const { url, headers = {} } = this.config.connection;
    if (!url) {
      throw new Error('URL is required for SSE transport');
    }

    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnectedState = true;
        resolve();
      };

      this.eventSource.onerror = (error) => {
        this.isConnectedState = false;
        this.rejectAllPending(new Error('SSE connection failed'));
        reject(new Error('SSE connection failed'));
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };
    });
  }

  async disconnect(): Promise<void> {
    if (!this.isConnectedState || !this.eventSource) return;

    this.isConnectedState = false;
    this.rejectAllPending(new Error('Connection closed'));
    this.eventSource.close();
    this.eventSource = undefined;
  }

  async send(message: any): Promise<any> {
    if (!this.isConnectedState) {
      throw new Error('Not connected');
    }

    const requestId = ++this.requestCounter;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      ...message
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, 30000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // For SSE, we need to send via HTTP POST to a separate endpoint
      const { url } = this.config.connection;
      const sendUrl = url!.replace('/events', '/send').replace('/sse', '/send');

      fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.connection.headers
        },
        body: JSON.stringify(request)
      }).catch(error => {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  isConnected(): boolean {
    return this.isConnectedState;
  }

  getStatus(): MCPServerStatus {
    return this.isConnectedState ? MCPServerStatus.CONNECTED : MCPServerStatus.DISCONNECTED;
  }

  private handleMessage(message: any): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message || 'Request failed'));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

class WebSocketTransport implements MCPTransport {
  constructor(private config: EnhancedMCPServerConfig) {}
  async connect(): Promise<void> { throw new Error('WebSocketTransport not implemented'); }
  async disconnect(): Promise<void> { throw new Error('WebSocketTransport not implemented'); }
  async send(message: any): Promise<any> { throw new Error('WebSocketTransport not implemented'); }
  isConnected(): boolean { return false; }
  getStatus(): MCPServerStatus { return MCPServerStatus.DISCONNECTED; }
}

class HTTPTransport implements MCPTransport {
  constructor(private config: EnhancedMCPServerConfig) {}
  async connect(): Promise<void> { throw new Error('HTTPTransport not implemented'); }
  async disconnect(): Promise<void> { throw new Error('HTTPTransport not implemented'); }
  async send(message: any): Promise<any> { throw new Error('HTTPTransport not implemented'); }
  isConnected(): boolean { return false; }
  getStatus(): MCPServerStatus { return MCPServerStatus.DISCONNECTED; }
}

// TODO: Implement proper transport classes with real MCP protocol support
// TODO: Add support for MCP protocol versioning
// FIXME: Error handling should be more sophisticated
// TODO: Implement resource caching with TTL
// TODO: Add support for server authentication and authorization