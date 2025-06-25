# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application that demonstrates MCP (Model Context Protocol) server-client integrations using CopilotKit. The app provides an AI chat interface with project management capabilities through MCP servers.

## Common Commands

- **Development**: `npm run dev` or `pnpm dev` - Start development server on http://localhost:3000
- **Build**: `npm run build` or `pnpm build` - Build for production
- **Start**: `npm run start` or `pnpm start` - Start production server
- **Lint**: `npm run lint` or `pnpm lint` - Run ESLint

## Environment Setup

Copy `env.example` to `.env` and configure:
- Either `OPENAI_API_KEY` for self-hosting
- Or `NEXT_PUBLIC_COPILOT_CLOUD_API_KEY` for CopilotCloud

## Architecture

### Core Structure
- **App Router**: Uses Next.js 15 app directory structure with route groups
- **Canvas Pages**: Main application interface in `src/app/(canvas-pages)/`
- **CopilotKit Pages**: Alternative interface in `src/app/copilotkit/`

### Key Components
- **Providers.tsx**: Global state management with CopilotKit, React Query, and MCP config context
- **McpServerManager**: Manages MCP server connections via `useCopilotChat().setMcpServers()`
- **CoAgentsProvider**: Handles agent state for travel/research functionality
- **ToolRenderer**: Renders dynamic tool interfaces from MCP servers

### State Management
- **MCP Configuration**: Stored in localStorage via `useLocalStorage` hook with key "mcpConfig"
- **Server Configs Context**: Provides `config` and `setConfig` for MCP server endpoints
- **CopilotKit Integration**: Uses `@copilotkit/react-core` for AI chat and agent coordination

### MCP Integration
- Supports both stdio and SSE transport types for MCP servers
- Configuration stored as `Config[]` with `{endpoint, serverName}` structure
- MCP servers are dynamically registered with CopilotKit via `setMcpServers()`

### UI Framework
- Tailwind CSS with custom fonts (Inter, JetBrains Mono)
- Radix UI components for accessibility
- React Flow for diagram visualization
- Framer Motion for animations

## Universal AI Chat Hub Architecture

This project now includes a comprehensive Universal AI Chat Hub implementation with the following key enhancements:

### Core Systems
- **AI Orchestrator**: Multi-provider AI management with load balancing, health monitoring, and failover (`src/lib/ai-providers/ai-orchestrator.ts`)
- **Enhanced MCP Manager**: Advanced MCP server management with multi-transport support (`src/lib/mcp/enhanced-mcp-manager.ts`)
- **Dynamic UI Generator**: Schema-driven UI generation from tool definitions (`src/lib/ui-generator/`)

### Integration Components
- **UniversalAIProvider**: Main provider component that wraps the application (`src/components/UniversalAIProvider.tsx`)
- **UniversalAIChatHub**: Central hub component with CopilotKit integration (`src/components/UniversalAIChatHub.tsx`)

### AI Provider Support
- OpenAI (including Azure OpenAI)
- Anthropic Claude
- Google AI
- CopilotCloud
- Local models (via Ollama, etc.)

### MCP Features
- Multi-transport support (stdio, SSE, WebSocket, HTTP)
- Health monitoring and auto-reconnection
- Tool discovery and capability detection
- Dynamic UI generation from tool schemas
- Real-time execution tracking

### CopilotKit Actions Available
- `universal_ai_chat`: Execute AI completion with automatic provider selection
- `execute_mcp_tool`: Execute MCP tools with dynamic UI generation
- `get_available_tools`: List all available tools from connected servers
- `get_hub_status`: Get system status and metrics

## Key Files
- `src/providers/Providers.tsx`: Central provider setup and MCP configuration context
- `src/components/McpServerManager.tsx`: MCP server lifecycle management
- `src/lib/mcp-config-types.ts`: TypeScript definitions for MCP configurations
- `src/hooks/use-local-storage.tsx`: Persistent storage utilities
- `src/lib/ai-providers/`: Universal AI provider system
- `src/lib/mcp/enhanced-mcp-manager.ts`: Advanced MCP server management
- `src/lib/ui-generator/`: Dynamic UI generation system
- `src/components/UniversalAI*.tsx`: Main integration components
- `src/lib/documentation/implementation-guide.md`: Comprehensive implementation guide