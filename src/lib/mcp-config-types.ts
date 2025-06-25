export type ConnectionType = "stdio" | "sse";

export interface StdioConfig {
  command: string;
  args: string[];
  transport: "stdio";
  env?: Record<string, string>;
  autoApprove?: string[];
  disabled?: boolean;
  timeout?: number;
}

export interface SSEConfig {
  url: string;
  transport: "sse";
  env?: Record<string, string>;
  autoApprove?: string[];
  disabled?: boolean;
  timeout?: number;
}

export type ServerConfig = StdioConfig | SSEConfig;

export interface MCPConfig {
  mcp_config: Record<string, ServerConfig>;
}

// Pre-configured MCP servers from user's configuration
export const PRECONFIGURED_MCP_SERVERS: Record<string, ServerConfig> = {
  "filesystem": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "D:\\.AI-DATA\\AI-AGENTS\\MCP-CONTROL-PANEL"],
    transport: "stdio",
    autoApprove: ["list_directory", "read_file"],
    disabled: false,
    timeout: 60
  },
  "github": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    transport: "stdio",
    env: {
      "GITHUB_PERSONAL_ACCESS_TOKEN": process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ""
    },
    timeout: 60
  },
  "hugeicons": {
    command: "npx",
    args: ["-y", "@hugeicons/mcp-server"],
    transport: "stdio",
    timeout: 60
  },
  "sequential-thinking": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    transport: "stdio",
    autoApprove: ["sequentialthinking"],
    disabled: false,
    timeout: 60
  },
  "context7": {
    command: "cmd",
    args: ["/c", "npx", "-y", "@upstash/context7-mcp"],
    transport: "stdio",
    disabled: false,
    timeout: 60
  },
  "firecrawl": {
    command: "cmd",
    args: ["/c", `set FIRECRAWL_API_KEY=${process.env.FIRECRAWL_API_KEY || ''} && npx -y firecrawl-mcp`],
    transport: "stdio",
    autoApprove: ["firecrawl_scrape"],
    disabled: false,
    timeout: 60
  },
  "perplexity": {
    command: "node",
    args: ["C:/Users/oat70/Documents/Cline/MCP/perplexity-mcp/build/index.js"],
    transport: "stdio",
    env: {
      "PERPLEXITY_API_KEY": process.env.PERPLEXITY_API_KEY || ""
    },
    autoApprove: ["search"],
    disabled: false,
    timeout: 60
  },
  "magic": {
    command: "cmd",
    args: ["/c", "npx", "-y", "@21st-dev/magic@latest", `API_KEY="${process.env.MAGIC_API_KEY || ''}"`],
    transport: "stdio",
    autoApprove: ["21st_magic_component_refiner"],
    disabled: false,
    timeout: 60
  },
  "fetch": {
    command: "node",
    args: ["C:/Users/oat70/Documents/Cline/MCP/fetch-mcp/dist/index.js"],
    transport: "stdio",
    autoApprove: ["fetch_html"],
    disabled: false,
    timeout: 60
  },
  "memory": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    transport: "stdio",
    autoApprove: ["create_entities", "add_observations"],
    disabled: false,
    timeout: 60
  },
  "software-planning": {
    command: "node",
    args: ["C:/Users/oat70/Documents/Cline/MCP/Software-planning-mcp/build/index.js"],
    transport: "stdio",
    autoApprove: ["start_planning"],
    disabled: false,
    timeout: 60
  }
};

// Local storage key for saving MCP configurations
export const MCP_STORAGE_KEY = "mcp-server-configs";
