/**
 * Universal AI Chat Hub - Main Integration Component
 * 
 * Central component that integrates all the Universal AI Chat Hub functionality
 * with the existing CopilotKit system. Provides unified interface for
 * AI providers, MCP servers, and dynamic UI generation.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { AIOrchestrator } from '@/lib/ai-providers/ai-orchestrator';
import { EnhancedMCPManager } from '@/lib/mcp/enhanced-mcp-manager';
import { SchemaGenerator } from '@/lib/ui-generator/schema-generator';
import { UIRenderer, useUIRenderer } from '@/lib/ui-generator/ui-renderer';
import {
  AIProvider,
  ProviderConfig,
  CompletionRequest,
} from '@/lib/ai-providers/types';
import {
  EnhancedMCPServerConfig,
  MCPServerStatus,
  ToolExecutionContext,
} from '@/lib/mcp/enhanced-types';
import {
  UISchema,
  SchemaGenerationContext,
} from '@/lib/ui-generator/types';

/**
 * Configuration for the Universal AI Chat Hub
 */
interface UniversalAIChatHubConfig {
  // AI Provider settings
  aiProviders: ProviderConfig[];
  defaultProvider?: AIProvider;
  
  // MCP Server settings
  mcpServers: EnhancedMCPServerConfig[];
  autoConnectMCP?: boolean;
  
  // UI Generation settings
  uiGenerationEnabled?: boolean;
  defaultTheme?: string;
  
  // Feature flags
  features?: {
    multiProvider?: boolean;
    dynamicUI?: boolean;
    realTimeUpdates?: boolean;
    pluginSupport?: boolean;
  };
}

/**
 * Hub state interface
 */
interface HubState {
  // AI Providers
  availableProviders: AIProvider[];
  activeProvider: AIProvider | null;
  providerMetrics: any;
  
  // MCP Servers
  connectedServers: string[];
  availableTools: any[];
  serverStatus: Record<string, MCPServerStatus>;
  
  // UI Generation
  generatedSchemas: Map<string, UISchema>;
  activeSchema: UISchema | null;
  
  // Execution state
  executingTools: Map<string, ToolExecutionContext>;
  lastResults: any[];
  
  // System status
  initialized: boolean;
  errors: string[];
}

/**
 * Universal AI Chat Hub Component
 */
export const UniversalAIChatHub: React.FC<{
  config: UniversalAIChatHubConfig;
  onStateChange?: (state: HubState) => void;
}> = ({ config, onStateChange }) => {
  // Core instances
  const [aiOrchestrator] = useState(() => new AIOrchestrator());
  const [mcpManager] = useState(() => new EnhancedMCPManager());
  const [schemaGenerator] = useState(() => new SchemaGenerator());
  
  // State management
  const [hubState, setHubState] = useState<HubState>({
    availableProviders: [],
    activeProvider: null,
    providerMetrics: null,
    connectedServers: [],
    availableTools: [],
    serverStatus: {},
    generatedSchemas: new Map(),
    activeSchema: null,
    executingTools: new Map(),
    lastResults: [],
    initialized: false,
    errors: [],
  });
  
  // Initialize the hub
  useEffect(() => {
    const initializeHub = async () => {
      try {
        console.log('🚀 Initializing Universal AI Chat Hub...');
        
        // Initialize AI providers
        for (const providerConfig of config.aiProviders) {
          try {
            await aiOrchestrator.addProvider(providerConfig);
            console.log(`✅ Added AI provider: ${providerConfig.provider}`);
          } catch (error) {
            console.error(`❌ Failed to add provider ${providerConfig.provider}:`, error);
            setHubState(prev => ({
              ...prev,
              errors: [...prev.errors, `Failed to add provider ${providerConfig.provider}`],
            }));
          }
        }
        
        // Initialize MCP servers
        for (const serverConfig of config.mcpServers) {
          try {
            await mcpManager.addServer(serverConfig);
            if (config.autoConnectMCP && serverConfig.enabled) {
              await mcpManager.connectServer(serverConfig.id);
            }
            console.log(`✅ Added MCP server: ${serverConfig.name}`);
          } catch (error) {
            console.error(`❌ Failed to add MCP server ${serverConfig.name}:`, error);
            setHubState(prev => ({
              ...prev,
              errors: [...prev.errors, `Failed to add MCP server ${serverConfig.name}`],
            }));
          }
        }
        
        // Update state
        const availableProviders = aiOrchestrator.getAvailableProviders();
        const allTools = mcpManager.getAllTools();
        const serverStates = mcpManager.getServerStatus() as any[];
        
        setHubState(prev => ({
          ...prev,
          availableProviders,
          activeProvider: config.defaultProvider || availableProviders[0] || null,
          availableTools: allTools,
          connectedServers: serverStates
            .filter(s => s.status === MCPServerStatus.CONNECTED)
            .map(s => s.config.id),
          serverStatus: Object.fromEntries(
            serverStates.map(s => [s.config.id, s.status])
          ),
          initialized: true,
        }));
        
        console.log('✅ Universal AI Chat Hub initialized successfully');
        
      } catch (error) {
        console.error('❌ Failed to initialize Universal AI Chat Hub:', error);
        setHubState(prev => ({
          ...prev,
          errors: [...prev.errors, 'Failed to initialize hub'],
        }));
      }
    };
    
    initializeHub();
  }, [config, aiOrchestrator, mcpManager]);
  
  // Setup MCP event listeners
  useEffect(() => {
    const handleServerConnected = (serverId: string) => {
      setHubState(prev => ({
        ...prev,
        connectedServers: [...prev.connectedServers, serverId],
        serverStatus: { ...prev.serverStatus, [serverId]: MCPServerStatus.CONNECTED },
        availableTools: mcpManager.getAllTools(),
      }));
    };
    
    const handleServerDisconnected = (serverId: string) => {
      setHubState(prev => ({
        ...prev,
        connectedServers: prev.connectedServers.filter(id => id !== serverId),
        serverStatus: { ...prev.serverStatus, [serverId]: MCPServerStatus.DISCONNECTED },
        availableTools: mcpManager.getAllTools(),
      }));
    };
    
    const handleToolExecutionStarted = (context: ToolExecutionContext) => {
      setHubState(prev => ({
        ...prev,
        executingTools: new Map(prev.executingTools.set(context.id, context)),
      }));
    };
    
    const handleToolExecutionCompleted = (context: ToolExecutionContext) => {
      setHubState(prev => {
        const newExecutingTools = new Map(prev.executingTools);
        newExecutingTools.delete(context.id);
        
        return {
          ...prev,
          executingTools: newExecutingTools,
          lastResults: [context.result, ...prev.lastResults.slice(0, 9)], // Keep last 10
        };
      });
    };
    
    mcpManager.on('server:connected', handleServerConnected);
    mcpManager.on('server:disconnected', handleServerDisconnected);
    mcpManager.on('tool:execution_started', handleToolExecutionStarted);
    mcpManager.on('tool:execution_completed', handleToolExecutionCompleted);
    
    return () => {
      mcpManager.removeAllListeners();
    };
  }, [mcpManager]);
  
  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(hubState);
  }, [hubState, onStateChange]);
  
  // Register CopilotKit actions
  useCopilotAction({
    name: 'universal_ai_chat',
    description: 'Execute AI completion using the Universal AI Chat Hub with automatic provider selection and failover',
    parameters: [
      {
        name: 'prompt',
        type: 'string',
        description: 'The prompt to send to the AI',
        required: true,
      },
      {
        name: 'provider',
        type: 'string',
        description: 'Preferred AI provider (optional)',
        required: false,
      },
      {
        name: 'temperature',
        type: 'number',
        description: 'Temperature for response generation (0.0-2.0)',
        required: false,
      },
      {
        name: 'maxTokens',
        type: 'number',
        description: 'Maximum tokens in response',
        required: false,
      },
    ],
    handler: async ({ prompt, provider, temperature, maxTokens }) => {
      try {
        const request: CompletionRequest = {
          messages: [
            {
              id: `msg_${Date.now()}`,
              role: 'user' as any,
              content: prompt,
              timestamp: new Date(),
            },
          ],
          temperature,
          maxTokens,
          metadata: {
            preferredProvider: provider,
          },
        };
        
        const response = await aiOrchestrator.complete(request);
        
        return {
          success: true,
          content: response.message.content,
          provider: response.metadata?.provider,
          usage: response.usage,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
  
  useCopilotAction({
    name: 'execute_mcp_tool',
    description: 'Execute a tool from connected MCP servers with dynamic UI generation',
    parameters: [
      {
        name: 'toolName',
        type: 'string',
        description: 'Name of the tool to execute',
        required: true,
      },
      {
        name: 'serverId',
        type: 'string',
        description: 'ID of the MCP server (optional, will auto-select if not provided)',
        required: false,
      },
      {
        name: 'parameters',
        type: 'object',
        description: 'Parameters for the tool execution',
        required: false,
      },
      {
        name: 'generateUI',
        type: 'boolean',
        description: 'Whether to generate dynamic UI for the tool',
        required: false,
      },
    ],
    handler: async ({ toolName, serverId, parameters = {}, generateUI = true }) => {
      try {
        // Find the tool
        const allTools = mcpManager.getAllTools();
        const tool = allTools.find(t => 
          t.name === toolName && (!serverId || t.serverId === serverId)
        );
        
        if (!tool) {
          throw new Error(`Tool '${toolName}' not found`);
        }
        
        // Generate UI schema if requested
        let schema: UISchema | null = null;
        if (generateUI && config.features?.dynamicUI) {
          const generationResult = await schemaGenerator.generateFromMCPTool(tool);
          schema = generationResult.schema;
          
          setHubState(prev => ({
            ...prev,
            generatedSchemas: new Map(prev.generatedSchemas.set(tool.name, schema!)),
            activeSchema: schema,
          }));
        }
        
        // Execute the tool
        const result = await mcpManager.executeTool(
          tool.serverId,
          toolName,
          parameters,
          {
            timeout: 30000,
            metadata: { 
              source: 'copilot_action',
              generateUI,
            },
          }
        );
        
        return {
          success: true,
          result,
          toolName,
          serverId: tool.serverId,
          serverName: tool.serverName,
          schema: schema ? {
            id: schema.id,
            title: schema.title,
            hasUI: true,
          } : null,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          toolName,
          serverId,
        };
      }
    },
  });
  
  useCopilotAction({
    name: 'get_available_tools',
    description: 'Get list of all available tools from connected MCP servers',
    parameters: [
      {
        name: 'category',
        type: 'string',
        description: 'Filter tools by category (optional)',
        required: false,
      },
      {
        name: 'serverId',
        type: 'string',
        description: 'Filter tools by server ID (optional)',
        required: false,
      },
    ],
    handler: async ({ category, serverId }) => {
      const allTools = mcpManager.getAllTools();
      
      let filteredTools = allTools;
      
      if (serverId) {
        filteredTools = filteredTools.filter(t => t.serverId === serverId);
      }
      
      if (category) {
        filteredTools = filteredTools.filter(t => 
          t.metadata?.category === category ||
          t.metadata?.tags?.includes(category)
        );
      }
      
      return {
        tools: filteredTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          serverId: tool.serverId,
          serverName: tool.serverName,
          category: tool.metadata?.category,
          tags: tool.metadata?.tags,
          parameters: Object.keys(tool.inputSchema.properties || {}),
          requiredParameters: tool.inputSchema.required || [],
        })),
        totalCount: filteredTools.length,
        categories: [...new Set(filteredTools.map(t => t.metadata?.category).filter(Boolean))],
        servers: [...new Set(filteredTools.map(t => ({ id: t.serverId, name: t.serverName })))],
      };
    },
  });
  
  useCopilotAction({
    name: 'get_hub_status',
    description: 'Get current status and metrics of the Universal AI Chat Hub',
    parameters: [],
    handler: async () => {
      const providerMetrics = aiOrchestrator.getProviderMetrics();
      const mcpMetrics = mcpManager.getAggregatedMetrics();
      
      return {
        initialized: hubState.initialized,
        aiProviders: {
          available: hubState.availableProviders,
          active: hubState.activeProvider,
          metrics: Array.isArray(providerMetrics) ? providerMetrics : [providerMetrics],
        },
        mcpServers: {
          connected: hubState.connectedServers.length,
          total: config.mcpServers.length,
          status: hubState.serverStatus,
          metrics: mcpMetrics,
        },
        tools: {
          available: hubState.availableTools.length,
          executing: hubState.executingTools.size,
          recentResults: hubState.lastResults.length,
        },
        uiGeneration: {
          enabled: config.features?.dynamicUI ?? false,
          schemasGenerated: hubState.generatedSchemas.size,
          activeSchema: hubState.activeSchema?.title || null,
        },
        errors: hubState.errors,
      };
    },
  });
  
  // Make hub state readable by CopilotKit
  useCopilotReadable({
    description: 'Current state of the Universal AI Chat Hub including connected providers, servers, and available tools',
    value: {
      hubStatus: {
        initialized: hubState.initialized,
        errors: hubState.errors,
      },
      aiProviders: {
        available: hubState.availableProviders,
        active: hubState.activeProvider,
      },
      mcpServers: {
        connected: hubState.connectedServers,
        available: config.mcpServers.map(s => ({
          id: s.id,
          name: s.name,
          status: hubState.serverStatus[s.id] || 'unknown',
        })),
      },
      availableTools: hubState.availableTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        server: tool.serverName,
        category: tool.metadata?.category || 'general',
      })),
      executionStatus: {
        running: hubState.executingTools.size,
        recentResults: hubState.lastResults.length,
      },
    },
  });
  
  // Render active UI schema if available
  const renderActiveSchema = () => {
    if (!hubState.activeSchema || !config.features?.dynamicUI) {
      return null;
    }
    
    return (
      <div className="universal-ai-schema-display">
        <h3>Dynamic Tool Interface: {hubState.activeSchema.title}</h3>
        <UIRenderer
          schema={hubState.activeSchema}
          onSubmit={async (data) => {
            // Handle form submission
            console.log('Schema form submitted:', data);
            return {
              success: true,
              data,
              metadata: {
                submissionId: `sub_${Date.now()}`,
                timestamp: new Date(),
                processingTime: 0,
              },
            };
          }}
          onChange={(data) => {
            console.log('Schema form changed:', data);
          }}
        />
      </div>
    );
  };
  
  return (
    <div className="universal-ai-chat-hub" data-initialized={hubState.initialized}>
      {/* Status indicator */}
      <div className="hub-status">
        <div className={`status-indicator ${hubState.initialized ? 'connected' : 'initializing'}`}>
          <span className="status-dot"></span>
          Universal AI Hub: {hubState.initialized ? 'Ready' : 'Initializing...'}
        </div>
        
        {/* Quick stats */}
        <div className="hub-stats">
          <span>AI Providers: {hubState.availableProviders.length}</span>
          <span>MCP Servers: {hubState.connectedServers.length}/{config.mcpServers.length}</span>
          <span>Tools: {hubState.availableTools.length}</span>
          {hubState.executingTools.size > 0 && (
            <span className="executing">Executing: {hubState.executingTools.size}</span>
          )}
        </div>
      </div>
      
      {/* Error display */}
      {hubState.errors.length > 0 && (
        <div className="hub-errors">
          <h4>⚠️ Initialization Warnings:</h4>
          <ul>
            {hubState.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Active schema display */}
      {renderActiveSchema()}
      
      {/* Executing tools display */}
      {hubState.executingTools.size > 0 && (
        <div className="executing-tools">
          <h4>🔄 Executing Tools:</h4>
          {Array.from(hubState.executingTools.values()).map(context => (
            <div key={context.id} className="executing-tool">
              <strong>{context.toolName}</strong> on {context.serverId}
              {context.progress && (
                <div className="progress">
                  {context.progress.current}/{context.progress.total} - {context.progress.message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .universal-ai-chat-hub {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
          margin: 16px 0;
        }
        
        .hub-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
        }
        
        .status-indicator.initializing .status-dot {
          background: #f59e0b;
          animation: pulse 2s infinite;
        }
        
        .hub-stats {
          display: flex;
          gap: 16px;
          font-size: 14px;
          color: #6b7280;
        }
        
        .hub-stats .executing {
          color: #f59e0b;
          font-weight: 500;
        }
        
        .hub-errors {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 16px;
        }
        
        .hub-errors h4 {
          margin: 0 0 8px 0;
          color: #dc2626;
        }
        
        .hub-errors ul {
          margin: 0;
          padding-left: 16px;
          color: #dc2626;
        }
        
        .universal-ai-schema-display {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 16px;
          background: #ffffff;
          margin: 16px 0;
        }
        
        .executing-tools {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 6px;
          padding: 12px;
          margin-top: 16px;
        }
        
        .executing-tools h4 {
          margin: 0 0 8px 0;
          color: #ea580c;
        }
        
        .executing-tool {
          font-size: 14px;
          color: #ea580c;
          margin: 4px 0;
        }
        
        .progress {
          font-size: 12px;
          color: #9ca3af;
          margin-left: 16px;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default UniversalAIChatHub;

// TODO: Add plugin system integration
// TODO: Implement real-time notifications
// FIXME: Error handling should be more granular
// TODO: Add configuration validation
// TODO: Implement proper state persistence
// HACK: Using inline styles - should use CSS modules or styled-components