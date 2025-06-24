# Universal AI Chat Hub - Implementation Guide

## Overview

The Universal AI Chat Hub is a comprehensive solution for building AI-powered applications with multi-provider support, MCP server integration, and dynamic UI generation. This guide covers the complete implementation and usage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Universal AI Chat Hub                         │
├─────────────────────────────────────────────────────────────────┤
│  React Components Layer                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ UniversalAI     │ │ Chat Interface  │ │ Admin Panel     │   │
│  │ Provider        │ │ - Multi-thread  │ │ - MCP Config    │   │
│  │ - Context       │ │ - Real-time UI  │ │ - AI Providers  │   │
│  │ - State Mgmt    │ │ - Tool Exec     │ │ - Monitoring    │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Core Engine Layer                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ AI Orchestrator │ │ Enhanced MCP    │ │ UI Generator    │   │
│  │ - Multi-provider│ │ Manager         │ │ - Schema Parser │   │
│  │ - Load Balance  │ │ - Server Pool   │ │ - Component Lib │   │
│  │ - Health Check  │ │ - Health Check  │ │ - Form Builder  │   │
│  │ - Failover      │ │ - Tool Execution│ │ - Data Viz      │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Integration Layer                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ AI Providers    │ │ MCP Servers     │ │ CopilotKit      │   │
│  │ - OpenAI        │ │ - SSE/stdio     │ │ - Actions       │   │
│  │ - Anthropic     │ │ - WebSocket     │ │ - Readable      │   │
│  │ - Google        │ │ - HTTP/REST     │ │ - Chat UI       │   │
│  │ - Azure         │ │ - Health Mon.   │ │ - Streaming     │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. AI Orchestrator (`/src/lib/ai-providers/ai-orchestrator.ts`)

The central hub for managing multiple AI providers with intelligent routing.

**Features:**
- **Multi-provider support**: OpenAI, Anthropic, Google, Azure, CopilotCloud, Local models
- **Load balancing**: Round-robin, least connections, health-based, cost-optimized
- **Health monitoring**: Automatic failover and recovery
- **Circuit breaker**: Prevents cascade failures
- **Rate limiting**: Per-provider rate limiting and quota management
- **Metrics collection**: Performance, cost, and usage analytics

**Usage:**
```typescript
import { AIOrchestrator, AIProvider, ProviderConfig } from '@/lib/ai-providers';

const orchestrator = new AIOrchestrator({
  strategy: LoadBalanceStrategy.HEALTH_BASED,
  fallbackProviders: [AIProvider.OPENAI, AIProvider.ANTHROPIC],
  healthCheckInterval: 60000,
});

// Add providers
await orchestrator.addProvider({
  provider: AIProvider.OPENAI,
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
});

// Execute with automatic provider selection
const response = await orchestrator.complete({
  messages: [{ role: 'user', content: 'Hello, world!' }],
  temperature: 0.7,
});
```

### 2. Enhanced MCP Manager (`/src/lib/mcp/enhanced-mcp-manager.ts`)

Advanced MCP server management with multi-transport support and health monitoring.

**Features:**
- **Multi-transport**: stdio, SSE, WebSocket, HTTP
- **Health monitoring**: Connection status, performance metrics
- **Auto-reconnection**: Intelligent retry with exponential backoff
- **Tool discovery**: Automatic capability detection
- **Resource management**: Caching and optimization
- **Real-time notifications**: Event-driven architecture

**Usage:**
```typescript
import { EnhancedMCPManager, MCPTransportType } from '@/lib/mcp';

const mcpManager = new EnhancedMCPManager();

// Add server
await mcpManager.addServer({
  id: 'github-server',
  name: 'GitHub Integration',
  transport: MCPTransportType.SSE,
  connection: {
    url: 'https://api.github.com/mcp',
    headers: { 'Authorization': `Bearer ${token}` },
  },
  enabled: true,
  autoReconnect: true,
});

// Execute tool
const result = await mcpManager.executeTool(
  'github-server',
  'create-issue',
  {
    title: 'Bug Report',
    description: 'Found a critical bug',
    labels: ['bug', 'critical'],
  }
);
```

### 3. Dynamic UI Generator (`/src/lib/ui-generator/`)

Schema-driven UI generation with intelligent component mapping.

**Features:**
- **Schema-driven**: JSON Schema, MCP tool definitions, OpenAPI specs
- **Intelligent mapping**: Automatic component type detection
- **Validation**: Real-time form validation
- **Accessibility**: ARIA labels, keyboard navigation
- **Theming**: Customizable themes and styling
- **Responsive**: Mobile-first design

**Usage:**
```typescript
import { SchemaGenerator, UIRenderer } from '@/lib/ui-generator';

const generator = new SchemaGenerator();

// Generate from MCP tool
const { schema } = await generator.generateFromMCPTool(tool, {
  options: {
    theme: 'modern',
    compactMode: false,
    a11y: { labels: true, descriptions: true },
  },
});

// Render UI
<UIRenderer
  schema={schema}
  onSubmit={async (data) => {
    const result = await executeToolWithData(data);
    return { success: true, data: result };
  }}
  onChange={(data) => console.log('Form changed:', data)}
/>
```

## Integration with CopilotKit

### 1. Provider Setup

```typescript
// src/providers/Providers.tsx
import { UniversalAIProvider } from '@/components/UniversalAIProvider';

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CopilotKit publicApiKey={process.env.NEXT_PUBLIC_COPILOT_CLOUD_API_KEY}>
        <UniversalAIProvider
          config={{
            aiProviders: [
              {
                provider: AIProvider.OPENAI,
                apiKey: process.env.OPENAI_API_KEY,
                model: 'gpt-4',
              },
            ],
            mcpServers: [
              {
                id: 'example-server',
                name: 'Example MCP Server',
                transport: MCPTransportType.SSE,
                connection: { url: 'https://example.com/mcp' },
                enabled: true,
                autoReconnect: true,
              },
            ],
            features: {
              multiProvider: true,
              dynamicUI: true,
              realTimeUpdates: true,
            },
          }}
          showHub={true}
          hubPosition="top"
        >
          {children}
        </UniversalAIProvider>
      </CopilotKit>
    </QueryClientProvider>
  );
}
```

### 2. Using CopilotKit Actions

The Universal AI Chat Hub automatically registers these CopilotKit actions:

- **`universal_ai_chat`**: Execute AI completion with automatic provider selection
- **`execute_mcp_tool`**: Execute MCP tools with dynamic UI generation
- **`get_available_tools`**: List all available tools from connected servers
- **`get_hub_status`**: Get system status and metrics

### 3. Chat Integration

```typescript
// In your chat component
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { useUniversalAI } from '@/components/UniversalAIProvider';

export function ChatWindow() {
  const { hubState } = useUniversalAI();

  // Make hub state available to AI
  useCopilotReadable({
    description: 'Available AI tools and server status',
    value: {
      availableTools: hubState.availableTools,
      connectedServers: hubState.connectedServers,
      executionStatus: hubState.executingTools,
    },
  });

  return (
    <CopilotChat
      instructions="You have access to multiple AI providers and MCP servers. Use the available tools to help the user accomplish their tasks."
      labels={{
        title: "Universal AI Assistant",
        initial: "Hello! I can help you with various tasks using multiple AI providers and connected services.",
      }}
    />
  );
}
```

## Configuration

### Environment Variables

```bash
# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key
AZURE_OPENAI_API_KEY=your_azure_key
NEXT_PUBLIC_COPILOT_CLOUD_API_KEY=your_copilot_key

# Debug
NODE_ENV=development
UNIVERSAL_AI_DEBUG=true
UNIVERSAL_AI_LOG_LEVEL=debug
```

### Configuration File

```typescript
// universal-ai.config.ts
import { UniversalAIConfig } from '@/components/UniversalAIProvider';

export const config: UniversalAIConfig = {
  aiProviders: [
    {
      provider: AIProvider.OPENAI,
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      timeout: 30000,
    },
    {
      provider: AIProvider.ANTHROPIC,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 2000,
    },
  ],
  
  mcpServers: [
    {
      id: 'github-server',
      name: 'GitHub Integration',
      description: 'GitHub API integration via MCP',
      transport: MCPTransportType.SSE,
      connection: {
        url: 'https://api.github.com/mcp',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      },
      enabled: true,
      autoReconnect: true,
      metadata: {
        category: 'development',
        tags: ['git', 'collaboration'],
        icon: '🐙',
      },
    },
  ],
  
  features: {
    multiProvider: true,
    dynamicUI: true,
    realTimeUpdates: true,
    pluginSupport: false,
    monitoring: true,
  },
  
  uiGeneration: {
    enabled: true,
    defaultTheme: 'modern',
    compactMode: false,
    maxFormWidth: 600,
  },
};
```

## Advanced Features

### 1. Custom AI Providers

```typescript
// Create custom provider
import { BaseAIProvider, AIProvider } from '@/lib/ai-providers';

class CustomAIProvider extends BaseAIProvider {
  constructor() {
    super(AIProvider.LOCAL);
  }

  protected async initializeProvider(config: ProviderConfig): Promise<void> {
    // Initialize your custom provider
  }

  protected async performCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    // Implement completion logic
  }

  // ... other required methods
}

// Register with orchestrator
const orchestrator = new AIOrchestrator();
await orchestrator.addProvider(customProviderConfig);
```

### 2. Custom MCP Transports

```typescript
// Implement custom transport
class CustomMCPTransport implements MCPTransport {
  async connect(): Promise<void> {
    // Connection logic
  }

  async send(message: any): Promise<any> {
    // Message sending logic
  }

  // ... other methods
}
```

### 3. Custom UI Components

```typescript
// Create custom component library
const customLibrary: ComponentLibrary = {
  name: 'Custom',
  version: '1.0.0',
  renderers: new Map([
    [UIComponentType.CUSTOM_CHART, {
      type: UIComponentType.CUSTOM_CHART,
      component: ({ config, data }) => (
        <CustomChartComponent config={config} data={data} />
      ),
    }],
  ]),
  // ... other configuration
};

// Use with renderer
<UIRenderer
  schema={schema}
  componentLibrary={customLibrary}
/>
```

## Best Practices

### 1. Error Handling

```typescript
// Always wrap in try-catch
try {
  const result = await orchestrator.complete(request);
  // Handle success
} catch (error) {
  if (error instanceof ProviderError) {
    // Handle provider-specific errors
  } else if (error instanceof MCPError) {
    // Handle MCP errors
  } else {
    // Handle generic errors
  }
}
```

### 2. Resource Management

```typescript
// Always dispose resources
useEffect(() => {
  return () => {
    orchestrator.dispose();
    mcpManager.dispose();
  };
}, []);
```

### 3. Performance Optimization

```typescript
// Use React.memo for expensive components
const OptimizedUIRenderer = React.memo(UIRenderer);

// Debounce form changes
const debouncedOnChange = useMemo(
  () => debounce(onChange, 300),
  [onChange]
);
```

### 4. Security

```typescript
// Validate all inputs
const validateToolParameters = (tool: EnhancedMCPTool, params: any) => {
  const result = toolParameterSchema.safeParse(params);
  if (!result.success) {
    throw new ValidationError('Invalid parameters');
  }
  return result.data;
};

// Sanitize outputs
const sanitizeResult = (result: any) => {
  // Remove sensitive data
  return sanitize(result);
};
```

## Monitoring and Analytics

### 1. Metrics Collection

The system automatically collects metrics for:
- **AI Provider Performance**: Response times, success rates, costs
- **MCP Server Health**: Connection status, tool execution metrics
- **UI Generation**: Schema generation times, component counts
- **System Resources**: Memory usage, CPU utilization

### 2. Health Monitoring

```typescript
// Monitor system health
const { hubState } = useUniversalAI();

useEffect(() => {
  const checkHealth = async () => {
    const health = await orchestrator.getHealthStatus();
    const mcpHealth = await mcpManager.getAggregatedMetrics();
    
    // Log or alert on health issues
    if (health.some(h => h.status === 'unhealthy')) {
      console.warn('Provider health issues detected');
    }
  };

  const interval = setInterval(checkHealth, 60000);
  return () => clearInterval(interval);
}, []);
```

### 3. Performance Tuning

```typescript
// Optimize provider selection
const optimizedConfig = {
  strategy: LoadBalanceStrategy.COST_OPTIMIZED,
  costWeights: {
    [AIProvider.OPENAI]: 1.0,
    [AIProvider.ANTHROPIC]: 1.2,
    [AIProvider.LOCAL]: 0.1,
  },
};
```

## Troubleshooting

### Common Issues

1. **Provider Connection Failed**
   - Check API keys and endpoints
   - Verify network connectivity
   - Check rate limits

2. **MCP Server Not Connecting**
   - Verify server URL and transport type
   - Check authentication credentials
   - Ensure server supports MCP protocol

3. **UI Generation Failed**
   - Validate tool schema format
   - Check for missing required fields
   - Verify component library compatibility

4. **Performance Issues**
   - Enable connection pooling
   - Implement proper caching
   - Optimize component rendering

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const config = {
  debug: {
    enabled: true,
    logLevel: 'debug',
    showMetrics: true,
  },
};
```

## Migration Guide

### From Basic CopilotKit

1. **Install Dependencies**
   ```bash
   npm install zod react-hook-form
   ```

2. **Wrap Application**
   ```typescript
   // Replace existing providers
   <UniversalAIProvider config={config}>
     <CopilotKit>
       <App />
     </CopilotKit>
   </UniversalAIProvider>
   ```

3. **Update Actions**
   ```typescript
   // Replace manual tool calls with universal actions
   useCopilotAction({
     name: 'execute_tool',
     handler: async ({ toolName, parameters }) => {
       // Now handled automatically by Universal AI Hub
     },
   });
   ```

### From Legacy MCP Integration

1. **Convert Server Configs**
   ```typescript
   // Old format
   const oldConfig = { endpoint: 'http://example.com', serverName: 'Example' };
   
   // New format
   const newConfig: EnhancedMCPServerConfig = {
     id: 'example-server',
     name: 'Example',
     transport: MCPTransportType.SSE,
     connection: { url: 'http://example.com' },
     enabled: true,
     autoReconnect: true,
   };
   ```

2. **Update Tool Execution**
   ```typescript
   // Old manual execution
   const result = await fetch('/api/execute-tool', { ... });
   
   // New automatic execution
   const result = await useCopilotAction('execute_mcp_tool')({
     toolName: 'example-tool',
     parameters: { ... },
   });
   ```

This implementation provides a robust, scalable foundation for building advanced AI-powered applications with multi-provider support, MCP integration, and dynamic UI generation.