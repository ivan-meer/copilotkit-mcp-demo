/**
 * Universal AI Provider Component
 * 
 * Provider component that wraps the entire application and provides
 * Universal AI Chat Hub functionality to all child components.
 * Integrates with existing CopilotKit providers.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UniversalAIChatHub } from './UniversalAIChatHub';
import {
  AIProvider,
  ProviderConfig,
} from '@/lib/ai-providers/types';
import {
  EnhancedMCPServerConfig,
  MCPTransportType,
} from '@/lib/mcp/enhanced-types';

/**
 * Universal AI configuration interface
 */
interface UniversalAIConfig {
  // AI Providers
  aiProviders: ProviderConfig[];
  defaultProvider?: AIProvider;
  
  // MCP Servers
  mcpServers: EnhancedMCPServerConfig[];
  autoConnectMCP?: boolean;
  
  // UI Generation
  uiGeneration?: {
    enabled: boolean;
    defaultTheme?: string;
    compactMode?: boolean;
    maxFormWidth?: number;
  };
  
  // Features
  features?: {
    multiProvider?: boolean;
    dynamicUI?: boolean;
    realTimeUpdates?: boolean;
    pluginSupport?: boolean;
    monitoring?: boolean;
  };
  
  // Debug settings
  debug?: {
    enabled: boolean;
    logLevel?: 'info' | 'warn' | 'error' | 'debug';
    showMetrics?: boolean;
  };
}

/**
 * Context for Universal AI functionality
 */
interface UniversalAIContextType {
  config: UniversalAIConfig;
  hubState: any;
  updateConfig: (newConfig: Partial<UniversalAIConfig>) => void;
  addAIProvider: (provider: ProviderConfig) => void;
  addMCPServer: (server: EnhancedMCPServerConfig) => void;
  toggleFeature: (feature: keyof NonNullable<UniversalAIConfig['features']>) => void;
}

const UniversalAIContext = createContext<UniversalAIContextType | null>(null);

/**
 * Default configuration
 */
const DEFAULT_CONFIG: UniversalAIConfig = {
  aiProviders: [],
  mcpServers: [],
  autoConnectMCP: true,
  uiGeneration: {
    enabled: true,
    defaultTheme: 'modern',
    compactMode: false,
    maxFormWidth: 600,
  },
  features: {
    multiProvider: true,
    dynamicUI: true,
    realTimeUpdates: true,
    pluginSupport: false,
    monitoring: true,
  },
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: 'info',
    showMetrics: false,
  },
};

/**
 * Universal AI Provider Props
 */
interface UniversalAIProviderProps {
  children: ReactNode;
  config?: Partial<UniversalAIConfig>;
  showHub?: boolean;
  hubPosition?: 'top' | 'bottom' | 'floating';
}

/**
 * Universal AI Provider Component
 */
export const UniversalAIProvider: React.FC<UniversalAIProviderProps> = ({
  children,
  config: userConfig = {},
  showHub = true,
  hubPosition = 'top',
}) => {
  const [config, setConfig] = useState<UniversalAIConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...userConfig,
    features: {
      ...DEFAULT_CONFIG.features,
      ...userConfig.features,
    },
    uiGeneration: {
      ...DEFAULT_CONFIG.uiGeneration,
      ...userConfig.uiGeneration,
    },
    debug: {
      ...DEFAULT_CONFIG.debug,
      ...userConfig.debug,
    },
  }));
  
  const [hubState, setHubState] = useState<any>({});
  
  // Load configuration from environment variables
  useEffect(() => {
    const loadEnvConfig = () => {
      const envProviders: ProviderConfig[] = [];
      const envServers: EnhancedMCPServerConfig[] = [];
      
      // Load AI providers from environment
      if (process.env.NEXT_PUBLIC_COPILOT_CLOUD_API_KEY) {
        envProviders.push({
          provider: AIProvider.COPILOT_CLOUD,
          apiKey: process.env.NEXT_PUBLIC_COPILOT_CLOUD_API_KEY,
          model: 'gpt-4',
          timeout: 30000,
        });
      }
      
      if (process.env.OPENAI_API_KEY) {
        envProviders.push({
          provider: AIProvider.OPENAI,
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4',
          timeout: 30000,
        });
      }
      
      if (process.env.ANTHROPIC_API_KEY) {
        envProviders.push({
          provider: AIProvider.ANTHROPIC,
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-3-sonnet-20240229',
          timeout: 30000,
        });
      }
      
      // Load MCP servers from localStorage (from existing app)
      try {
        const storedMCPConfig = localStorage.getItem('mcpConfig');
        if (storedMCPConfig) {
          const mcpConfigs = JSON.parse(storedMCPConfig);
          
          mcpConfigs.forEach((mcpConfig: any, index: number) => {
            envServers.push({
              id: `server_${index}`,
              name: mcpConfig.serverName || `Server ${index + 1}`,
              description: `MCP Server: ${mcpConfig.serverName}`,
              transport: mcpConfig.endpoint?.startsWith('http') ? 
                MCPTransportType.SSE : MCPTransportType.STDIO,
              connection: {
                url: mcpConfig.endpoint?.startsWith('http') ? mcpConfig.endpoint : undefined,
                command: !mcpConfig.endpoint?.startsWith('http') ? 'node' : undefined,
                args: !mcpConfig.endpoint?.startsWith('http') ? [mcpConfig.endpoint] : undefined,
              },
              enabled: true,
              autoReconnect: true,
              metadata: {
                category: 'imported',
                tags: ['legacy'],
              },
            });
          });
        }
      } catch (error) {
        console.warn('Failed to load MCP config from localStorage:', error);
      }
      
      // Merge with existing config
      if (envProviders.length > 0 || envServers.length > 0) {
        setConfig(prev => ({
          ...prev,
          aiProviders: [...envProviders, ...prev.aiProviders],
          mcpServers: [...envServers, ...prev.mcpServers],
        }));
      }
    };
    
    loadEnvConfig();
  }, []);
  
  // Context methods
  const updateConfig = (newConfig: Partial<UniversalAIConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...newConfig,
      features: {
        ...prev.features,
        ...newConfig.features,
      },
      uiGeneration: {
        ...prev.uiGeneration,
        ...newConfig.uiGeneration,
      },
    }));
  };
  
  const addAIProvider = (provider: ProviderConfig) => {
    setConfig(prev => ({
      ...prev,
      aiProviders: [...prev.aiProviders, provider],
    }));
  };
  
  const addMCPServer = (server: EnhancedMCPServerConfig) => {
    setConfig(prev => ({
      ...prev,
      mcpServers: [...prev.mcpServers, server],
    }));
  };
  
  const toggleFeature = (feature: keyof NonNullable<UniversalAIConfig['features']>) => {
    setConfig(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features?.[feature],
      },
    }));
  };
  
  const contextValue: UniversalAIContextType = {
    config,
    hubState,
    updateConfig,
    addAIProvider,
    addMCPServer,
    toggleFeature,
  };
  
  // Debug logging
  useEffect(() => {
    if (config.debug?.enabled) {
      console.log('🔧 Universal AI Config:', config);
      console.log('🏗️ Hub State:', hubState);
    }
  }, [config, hubState]);
  
  const renderHub = () => {
    if (!showHub || !config.aiProviders.length) return null;
    
    return (
      <UniversalAIChatHub
        config={{
          aiProviders: config.aiProviders,
          defaultProvider: config.defaultProvider,
          mcpServers: config.mcpServers,
          autoConnectMCP: config.autoConnectMCP,
          uiGenerationEnabled: config.uiGeneration?.enabled,
          defaultTheme: config.uiGeneration?.defaultTheme,
          features: config.features,
        }}
        onStateChange={setHubState}
      />
    );
  };
  
  return (
    <UniversalAIContext.Provider value={contextValue}>
      <div className={`universal-ai-provider ${hubPosition}`}>
        {/* Hub at top */}
        {hubPosition === 'top' && renderHub()}
        
        {/* Main content */}
        <div className=\"universal-ai-content\">
          {children}
        </div>
        
        {/* Hub at bottom */}
        {hubPosition === 'bottom' && renderHub()}
        
        {/* Floating hub */}
        {hubPosition === 'floating' && (
          <div className=\"floating-hub\">
            {renderHub()}
          </div>
        )}
        
        {/* Debug panel */}
        {config.debug?.enabled && config.debug.showMetrics && (
          <DebugPanel config={config} hubState={hubState} />
        )}
      </div>
      
      <style jsx>{`
        .universal-ai-provider {
          position: relative;
          min-height: 100%;
        }
        
        .universal-ai-content {
          flex: 1;
        }
        
        .floating-hub {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          background: white;
        }
        
        .universal-ai-provider.top {
          display: flex;
          flex-direction: column;
        }
        
        .universal-ai-provider.bottom {
          display: flex;
          flex-direction: column-reverse;
        }
      `}</style>
    </UniversalAIContext.Provider>
  );
};

/**
 * Debug Panel Component
 */
const DebugPanel: React.FC<{
  config: UniversalAIConfig;
  hubState: any;
}> = ({ config, hubState }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className=\"debug-panel\">
      <button
        className=\"debug-toggle\"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        🔍 Debug {isExpanded ? '↓' : '→'}
      </button>
      
      {isExpanded && (
        <div className=\"debug-content\">
          <div className=\"debug-section\">
            <h4>Configuration</h4>
            <pre>{JSON.stringify(config, null, 2)}</pre>
          </div>
          
          <div className=\"debug-section\">
            <h4>Hub State</h4>
            <pre>{JSON.stringify(hubState, null, 2)}</pre>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .debug-panel {
          position: fixed;
          bottom: 20px;
          left: 20px;
          z-index: 1001;
          background: #1f2937;
          color: #f9fafb;
          border-radius: 8px;
          max-width: 500px;
          max-height: 70vh;
          overflow: hidden;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
        }
        
        .debug-toggle {
          background: #374151;
          color: #f9fafb;
          border: none;
          padding: 8px 12px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          font-family: inherit;
          font-size: inherit;
        }
        
        .debug-toggle:hover {
          background: #4b5563;
        }
        
        .debug-content {
          max-height: 500px;
          overflow-y: auto;
          padding: 12px;
        }
        
        .debug-section {
          margin-bottom: 16px;
        }
        
        .debug-section h4 {
          margin: 0 0 8px 0;
          color: #60a5fa;
          font-size: 14px;
        }
        
        .debug-section pre {
          background: #111827;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 11px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};

/**
 * Hook to use Universal AI context
 */
export const useUniversalAI = (): UniversalAIContextType => {
  const context = useContext(UniversalAIContext);
  if (!context) {
    throw new Error('useUniversalAI must be used within UniversalAIProvider');
  }
  return context;
};

/**
 * Hook to use specific Universal AI features
 */
export const useUniversalAIFeatures = () => {
  const { config, toggleFeature } = useUniversalAI();
  
  return {
    features: config.features || {},
    toggleFeature,
    isEnabled: (feature: keyof NonNullable<UniversalAIConfig['features']>) => 
      config.features?.[feature] ?? false,
  };
};

/**
 * Hook to use AI providers
 */
export const useAIProviders = () => {
  const { config, addAIProvider, hubState } = useUniversalAI();
  
  return {
    providers: config.aiProviders,
    addProvider: addAIProvider,
    activeProvider: hubState.activeProvider,
    availableProviders: hubState.availableProviders || [],
    metrics: hubState.providerMetrics,
  };
};

/**
 * Hook to use MCP servers
 */
export const useMCPServers = () => {
  const { config, addMCPServer, hubState } = useUniversalAI();
  
  return {
    servers: config.mcpServers,
    addServer: addMCPServer,
    connectedServers: hubState.connectedServers || [],
    availableTools: hubState.availableTools || [],
    serverStatus: hubState.serverStatus || {},
  };
};

export default UniversalAIProvider;

// TODO: Add configuration persistence
// TODO: Implement provider hot-swapping
// FIXME: Error boundaries should be added
// TODO: Add real-time configuration updates
// TODO: Implement provider health monitoring UI