"use client";

import { useState, useEffect, useRef, useContext } from "react";
import { useCoAgent, useCopilotChat } from "@copilotkit/react-core";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ConnectionType, ServerConfig, MCP_STORAGE_KEY, MCPConfig, PRECONFIGURED_MCP_SERVERS } from "@/lib/mcp-config-types";
import { X, Plus, Server, Globe, Trash2, Settings, CheckCircle, Play, Pause, Info, Eye, Code, Activity, Zap, Database } from "lucide-react";
import { MCPServerDetails } from "./MCPServerDetails";
import { ServerConfigsContext } from "@/providers/Providers";
// External link icon component
const ExternalLink = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-3 h-3 ml-1"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

interface MCPConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Config {
  endpoint: string;
  serverName: string;
}
export function MCPConfigModal({ isOpen, onClose }: MCPConfigModalProps) {
  // Use ref to avoid re-rendering issues
  const configsRef = useRef<Record<string, ServerConfig>>({});

  // Use localStorage hook for persistent storage
  const [savedConfigs, setSavedConfigs] = useLocalStorage<
    Record<string, ServerConfig>
  >(MCP_STORAGE_KEY, {});
  // console.log(savedConfigs, "savedConfigs");
  // Set the ref value once we have the saved configs
  useEffect(() => {
    if (Object.keys(savedConfigs).length > 0) {
      configsRef.current = savedConfigs;
    }
  }, [savedConfigs]);

  const con = useContext(ServerConfigsContext);
  const [configs, setConfigs] = useState<Config[]>(con?.config || []);
  const [mcpConfig, setMcpConfig] = useLocalStorage<any>("mcpConfig", []);
  const [serverName, setServerName] = useState("");
  const [connectionType, setConnectionType] = useState<ConnectionType>("sse");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [enabledMcpServers, setEnabledMcpServers] = useLocalStorage<Record<string, boolean>>("enabled-mcp-servers", {});
  const [activeTab, setActiveTab] = useState<"configured" | "preconfigured">("preconfigured");
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [serverDetailsOpen, setServerDetailsOpen] = useState(false);

  // Calculate server statistics
  const totalServers = configs.length;
  const stdioServers = 0
  const sseServers = configs.length
  const enabledPreservers = Object.values(enabledMcpServers).filter(Boolean).length;
  const totalMcpServers = Object.keys(PRECONFIGURED_MCP_SERVERS).length;

  const { setMcpServers } = useCopilotChat();



  // Set loading to false when state is loaded
  useEffect(() => {
    setIsLoading(false);
    return () => {
      setMcpConfig(configs);
    }
  }, []);

  const addConfig = () => {
    if (!serverName) return;


    setConfigs([...configs, {
      endpoint: url,
      serverName: serverName,
    }]);
    con?.setConfig([...configs, {
      endpoint: url,
      serverName: serverName,
    }]);
    setMcpConfig([...configs, {
      endpoint: url,
      serverName: serverName,
    }]);
    setMcpServers([...configs, {
      endpoint: url,
      serverName: serverName,
    }]);

    // Reset form
    setServerName("");
    setCommand("");
    setArgs("");
    setUrl("");
    setShowAddServerForm(false);
  };

  const removeConfig = (index: number) => {
    setConfigs((prev) => { return prev.filter((_item, i) => i != index) });
    con?.setConfig(con?.config.filter((_item, i: number) => i != index));
    setMcpConfig(mcpConfig.filter((_item: Config[], i: number) => i != index));
  };

  const toggleMcpServer = (serverKey: string) => {
    setEnabledMcpServers(prev => ({
      ...prev,
      [serverKey]: !prev[serverKey]
    }));
  };

  const openServerDetails = (serverKey: string) => {
    setSelectedServer(serverKey);
    setServerDetailsOpen(true);
  };

  const getTransportIcon = (transport: string) => {
    switch (transport) {
      case 'stdio': return <Code className="w-3 h-3 mr-1" />;
      case 'sse': return <Activity className="w-3 h-3 mr-1" />;
      case 'websocket': return <Zap className="w-3 h-3 mr-1" />;
      case 'http': return <Database className="w-3 h-3 mr-1" />;
      default: return <Server className="w-3 h-3 mr-1" />;
    }
  };

  // Mock server details for demonstration
  const getServerDetails = (serverKey: string) => {
    const server = PRECONFIGURED_MCP_SERVERS[serverKey];
    if (!server) return null;

    return {
      id: serverKey,
      name: serverKey.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `${serverKey} MCP server for enhanced functionality`,
      version: "1.0.0",
      author: "MCP Team",
      status: enabledMcpServers[serverKey] ? 'connected' as const : 'disconnected' as const,
      transport: server.transport as 'stdio' | 'sse',
      connection: {
        command: server.command,
        args: server.args,
        env: server.env
      },
      capabilities: {
        tools: true,
        resources: serverKey === 'filesystem',
        prompts: serverKey === 'sequential-thinking',
        logging: true
      },
      tools: getMockTools(serverKey),
      resources: getMockResources(serverKey),
      prompts: getMockPrompts(serverKey),
      metrics: {
        totalRequests: Math.floor(Math.random() * 1000),
        successfulRequests: Math.floor(Math.random() * 900),
        failedRequests: Math.floor(Math.random() * 100),
        averageResponseTime: Math.floor(Math.random() * 500) + 100,
        uptime: Math.floor(Math.random() * 86400),
        lastActivity: new Date()
      },
      errors: []
    };
  };

  const getMockTools = (serverKey: string) => {
    const toolSets = {
      filesystem: [
        {
          name: "list_directory",
          description: "List files and directories in a given path",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Directory path to list" }
            },
            required: ["path"]
          },
          category: "File Operations"
        },
        {
          name: "read_file",
          description: "Read the contents of a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path to read" }
            },
            required: ["path"]
          },
          category: "File Operations"
        }
      ],
      github: [
        {
          name: "create_repository",
          description: "Create a new GitHub repository",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Repository name" },
              description: { type: "string", description: "Repository description" },
              private: { type: "boolean", description: "Make repository private" }
            },
            required: ["name"]
          },
          category: "Repository Management"
        }
      ],
      perplexity: [
        {
          name: "search",
          description: "Search the web using Perplexity AI",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              focus: { type: "string", description: "Focus area (academic, news, etc.)" }
            },
            required: ["query"]
          },
          category: "Search"
        }
      ]
    };
    
    return toolSets[serverKey] || [
      {
        name: "example_tool",
        description: `Example tool for ${serverKey}`,
        inputSchema: {
          type: "object",
          properties: {
            input: { type: "string", description: "Input parameter" }
          },
          required: ["input"]
        },
        category: "General"
      }
    ];
  };

  const getMockResources = (serverKey: string) => {
    if (serverKey !== 'filesystem') return [];
    
    return [
      {
        uri: "file:///documents/project.md",
        name: "Project Documentation",
        description: "Main project documentation file",
        mimeType: "text/markdown",
        size: 2048,
        lastModified: new Date()
      }
    ];
  };

  const getMockPrompts = (serverKey: string) => {
    if (serverKey !== 'sequential-thinking') return [];
    
    return [
      {
        name: "analyze_problem",
        description: "Analyze a problem step by step",
        arguments: [
          {
            name: "problem",
            description: "The problem to analyze",
            required: true,
            type: "string"
          }
        ],
        category: "Analysis"
      }
    ];
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000]">
          <div className="p-4">Loading configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-[10000]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Server className="h-6 w-6 mr-2 text-gray-700" />
              <h1 className="text-2xl font-semibold">MCP Server Configuration</h1>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
            <p className="text-sm text-gray-600">
              Manage and configure your MCP servers
            </p>
            <button
              onClick={() => setShowAddServerForm(true)}
              className="w-full sm:w-auto px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 flex items-center gap-1 justify-center"
            >
              <Plus className="h-4 w-4" />
              Add Server
            </button>
          </div>
        </div>

        {/* Server Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-md p-4">
            <div className="text-sm text-gray-500">Custom Servers</div>
            <div className="text-3xl font-bold">{totalServers}</div>
          </div>
          <div className="bg-white border rounded-md p-4">
            <div className="text-sm text-gray-500">MCP Servers</div>
            <div className="text-3xl font-bold">{totalMcpServers}</div>
          </div>
          <div className="bg-white border rounded-md p-4">
            <div className="text-sm text-gray-500">Enabled MCP</div>
            <div className="text-3xl font-bold text-green-600">{enabledPreservers}</div>
          </div>
          <div className="bg-white border rounded-md p-4">
            <div className="text-sm text-gray-500">Total Active</div>
            <div className="text-3xl font-bold text-blue-600">{totalServers + enabledPreservers}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("configured")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "configured"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Custom Servers ({totalServers})
                </div>
              </button>
              <button
                onClick={() => setActiveTab("preconfigured")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "preconfigured"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  MCP Servers ({enabledPreservers}/{totalMcpServers})
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Server List */}
        <div className="bg-white border rounded-md p-6">
          {activeTab === "configured" ? (
            <>
              <h2 className="text-lg font-semibold mb-4">Custom Servers</h2>
              {totalServers === 0 ? (
                <div className="text-gray-500 text-center py-10">
                  No custom servers configured. Click &quot;Add Server&quot; to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {configs.map((config, index) => (
                    <div
                      key={index}
                      className="border rounded-md overflow-hidden bg-white shadow-sm"
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{config?.serverName}</h3>
                            <div className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-xs rounded mt-1">
                              <Globe className="w-3 h-3 mr-1" />
                              SSE
                            </div>
                          </div>
                          <button
                            onClick={() => removeConfig(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="mt-3 text-sm text-gray-600">
                          <p className="truncate">URL: {config.endpoint}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">MCP Servers</h2>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(PRECONFIGURED_MCP_SERVERS).map(([key, server]) => {
                  const isEnabled = enabledMcpServers[key];
                  return (
                    <div
                      key={key}
                      className={`border rounded-md overflow-hidden shadow-sm transition-all ${
                        isEnabled ? "bg-green-50 border-green-200" : "bg-white"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold capitalize">{key.replace('-', ' ')}</h3>
                              {isEnabled && (
                                <div className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Enabled
                                </div>
                              )}
                            </div>
                            <div className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-xs rounded">
                              {getTransportIcon(server.transport)}
                              {server.transport}
                            </div>
                            <div className="mt-3 text-sm text-gray-600">
                              <p>Command: {server.command}</p>
                              <p className="truncate">Args: {server.args.join(" ")}</p>
                              {server.autoApprove && server.autoApprove.length > 0 && (
                                <p className="mt-1">
                                  <span className="text-xs text-blue-600">Auto-approve: </span>
                                  {server.autoApprove.join(", ")}
                                </p>
                              )}
                              {server.env && (
                                <p className="mt-1">
                                  <span className="text-xs text-purple-600">Environment variables configured</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openServerDetails(key)}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Details
                            </button>
                            <button
                              onClick={() => toggleMcpServer(key)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                isEnabled
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                            >
                              {isEnabled ? (
                                <>
                                  <Pause className="w-4 h-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4" />
                                  Enable
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Reference */}
          <div className="mt-10 pt-4 border-t text-center text-sm text-gray-500">
            More MCP servers available on the web, e.g.{" "}
            <a
              href="https://mcp.composio.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 inline-flex items-center mr-2"
            >
              mcp.composio.dev
              <ExternalLink />
            </a>
            and{" "}
            <a
              href="https://www.mcp.run/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 inline-flex items-center"
            >
              mcp.run
              <ExternalLink />
            </a>
          </div>
        </div>

        {/* Add Server Modal */}
        {showAddServerForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Server
                </h2>
                <button
                  onClick={() => setShowAddServerForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Server Name
                  </label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="e.g., api-service, data-processor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Connection Type
                  </label>
                  <select
                    value={connectionType}
                    onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="sse">SSE (Server-Sent Events)</option>
                    <option value="stdio">STDIO (Standard Input/Output)</option>
                  </select>
                </div>

                {connectionType === "stdio" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Command
                      </label>
                      <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="e.g., python, node"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Arguments
                      </label>
                      <input
                        type="text"
                        value={args}
                        onChange={(e) => setArgs(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="e.g., path/to/script.py"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">SSE URL</label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="e.g., http://localhost:8000/events"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setShowAddServerForm(false)}
                    className="px-4 py-2 border text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium flex items-center"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                  <button
                    onClick={addConfig}
                    className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 text-sm font-medium flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Server
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Server Details Modal */}
        {selectedServer && serverDetailsOpen && (
          <MCPServerDetails
            server={getServerDetails(selectedServer)!}
            isOpen={serverDetailsOpen}
            onClose={() => {
              setServerDetailsOpen(false);
              setSelectedServer(null);
            }}
            onConnect={(serverId) => {
              toggleMcpServer(serverId);
              console.log(`Connecting to server: ${serverId}`);
            }}
            onDisconnect={(serverId) => {
              toggleMcpServer(serverId);
              console.log(`Disconnecting from server: ${serverId}`);
            }}
            onReconnect={(serverId) => {
              console.log(`Reconnecting to server: ${serverId}`);
            }}
            onExecuteTool={async (serverId, toolName, args) => {
              console.log(`Executing tool ${toolName} on server ${serverId}:`, args);
              // Mock execution
              await new Promise(resolve => setTimeout(resolve, 1000));
              return { success: true, result: `Tool ${toolName} executed successfully` };
            }}
          />
        )}
      </div>
    </div>
  );
}
