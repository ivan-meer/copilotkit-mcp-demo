"use client";

import { FC, useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  Activity, 
  Settings, 
  Tool, 
  FileText, 
  MessageSquare, 
  Play, 
  Pause, 
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Hash,
  Code,
  Database,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Types for server details
interface MCPServerDetails {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  transport: 'stdio' | 'sse' | 'websocket' | 'http';
  connection: {
    command?: string;
    args?: string[];
    url?: string;
    env?: Record<string, string>;
  };
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
    logging: boolean;
  };
  tools: MCPToolDetail[];
  resources: MCPResourceDetail[];
  prompts: MCPPromptDetail[];
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    uptime: number;
    lastActivity?: Date;
  };
  errors: Array<{
    timestamp: Date;
    message: string;
    context?: string;
  }>;
}

interface MCPToolDetail {
  name: string;
  description: string;
  inputSchema: any;
  examples?: Array<{
    name: string;
    description: string;
    input: any;
    output?: any;
  }>;
  category?: string;
  tags?: string[];
}

interface MCPResourceDetail {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  size?: number;
  lastModified?: Date;
  annotations?: {
    audience?: string[];
    priority?: number;
    category?: string;
  };
}

interface MCPPromptDetail {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    type?: string;
    default?: any;
  }>;
  examples?: Array<{
    name: string;
    arguments: Record<string, any>;
    output?: string;
  }>;
  category?: string;
}

interface MCPServerDetailsProps {
  server: MCPServerDetails;
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (serverId: string) => void;
  onDisconnect?: (serverId: string) => void;
  onReconnect?: (serverId: string) => void;
  onExecuteTool?: (serverId: string, toolName: string, args: any) => Promise<any>;
}

const statusIcons = {
  connected: <CheckCircle className="h-4 w-4 text-green-500" />,
  disconnected: <XCircle className="h-4 w-4 text-gray-400" />,
  connecting: <RotateCcw className="h-4 w-4 text-blue-500 animate-spin" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />
};

const statusColors = {
  connected: 'bg-green-100 text-green-800 border-green-200',
  disconnected: 'bg-gray-100 text-gray-600 border-gray-200',
  connecting: 'bg-blue-100 text-blue-800 border-blue-200',
  error: 'bg-red-100 text-red-800 border-red-200'
};

const transportIcons = {
  stdio: <Code className="h-4 w-4" />,
  sse: <Activity className="h-4 w-4" />,
  websocket: <Zap className="h-4 w-4" />,
  http: <Database className="h-4 w-4" />
};

export const MCPServerDetails: FC<MCPServerDetailsProps> = ({
  server,
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  onReconnect,
  onExecuteTool
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [toolResults, setToolResults] = useState<Record<string, any>>({});
  const [executingTools, setExecutingTools] = useState<Set<string>>(new Set());

  const toggleExpanded = (type: 'tool' | 'resource' | 'prompt', name: string) => {
    const setMap = {
      tool: setExpandedTools,
      resource: setExpandedResources,
      prompt: setExpandedPrompts
    };
    
    const expandedMap = {
      tool: expandedTools,
      resource: expandedResources,
      prompt: expandedPrompts
    };

    const setter = setMap[type];
    const expanded = expandedMap[type];
    
    const newExpanded = new Set(expanded);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setter(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const executeToolExample = async (tool: MCPToolDetail, example: any) => {
    if (!onExecuteTool) return;
    
    const toolKey = `${tool.name}-${JSON.stringify(example.input)}`;
    setExecutingTools(prev => new Set(prev).add(toolKey));
    
    try {
      const result = await onExecuteTool(server.id, tool.name, example.input);
      setToolResults(prev => ({ ...prev, [toolKey]: result }));
    } catch (error) {
      setToolResults(prev => ({ 
        ...prev, 
        [toolKey]: { error: error.message || 'Execution failed' }
      }));
    } finally {
      setExecutingTools(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolKey);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded">
              <Server className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{server.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${statusColors[server.status]}`}>
                  {statusIcons[server.status]}
                  {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {transportIcons[server.transport]}
                  {server.transport.toUpperCase()}
                </div>
                {server.version && (
                  <Badge variant="outline" className="text-xs">
                    v{server.version}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {server.status === 'disconnected' && onConnect && (
              <Button onClick={() => onConnect(server.id)} size="sm">
                <Play className="h-4 w-4 mr-1" />
                Connect
              </Button>
            )}
            {server.status === 'connected' && onDisconnect && (
              <Button onClick={() => onDisconnect(server.id)} variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            )}
            {(server.status === 'error' || server.status === 'disconnected') && onReconnect && (
              <Button onClick={() => onReconnect(server.id)} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reconnect
              </Button>
            )}
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6 mx-6 mt-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tools" className="flex items-center gap-2">
                <Tool className="h-4 w-4" />
                Tools ({server.tools.length})
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resources ({server.resources.length})
              </TabsTrigger>
              <TabsTrigger value="prompts" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Prompts ({server.prompts.length})
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Metrics
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Logs
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-6">
                    {/* Server Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Server Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Name</label>
                            <p className="font-medium">{server.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">ID</label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm">{server.id}</p>
                              <Button 
                                onClick={() => copyToClipboard(server.id)} 
                                variant="ghost" 
                                size="sm"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {server.description && (
                            <div className="col-span-2">
                              <label className="text-sm font-medium text-gray-500">Description</label>
                              <p>{server.description}</p>
                            </div>
                          )}
                          {server.author && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Author</label>
                              <p>{server.author}</p>
                            </div>
                          )}
                          {server.version && (
                            <div>
                              <label className="text-sm font-medium text-gray-500">Version</label>
                              <p>{server.version}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Connection Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {transportIcons[server.transport]}
                          Connection Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Transport</label>
                            <p className="uppercase font-medium">{server.transport}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Status</label>
                            <div className="flex items-center gap-2">
                              {statusIcons[server.status]}
                              <span className="capitalize">{server.status}</span>
                            </div>
                          </div>
                        </div>

                        {server.transport === 'stdio' && server.connection.command && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Command</label>
                            <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                              {server.connection.command} {server.connection.args?.join(' ')}
                            </div>
                          </div>
                        )}

                        {server.transport !== 'stdio' && server.connection.url && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">URL</label>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm">{server.connection.url}</p>
                              <Button 
                                onClick={() => copyToClipboard(server.connection.url!)} 
                                variant="ghost" 
                                size="sm"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {server.connection.env && Object.keys(server.connection.env).length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Environment Variables</label>
                            <div className="space-y-1">
                              {Object.entries(server.connection.env).map(([key, value]) => (
                                <div key={key} className="bg-gray-100 p-2 rounded font-mono text-sm">
                                  <span className="text-blue-600">{key}</span>=<span className="text-gray-600">***</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Capabilities */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Capabilities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(server.capabilities).map(([capability, supported]) => (
                            <div key={capability} className="flex items-center gap-2">
                              {supported ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="capitalize">{capability}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tools Tab */}
              <TabsContent value="tools" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {server.tools.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Tool className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No tools available</p>
                      </div>
                    ) : (
                      server.tools.map((tool) => (
                        <Card key={tool.name}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Tool className="h-5 w-5 text-blue-500" />
                                <CardTitle className="text-lg">{tool.name}</CardTitle>
                                {tool.category && (
                                  <Badge variant="secondary">{tool.category}</Badge>
                                )}
                              </div>
                              <Button
                                onClick={() => toggleExpanded('tool', tool.name)}
                                variant="ghost"
                                size="sm"
                              >
                                {expandedTools.has(tool.name) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {tool.description && (
                              <p className="text-sm text-gray-600">{tool.description}</p>
                            )}
                          </CardHeader>
                          
                          {expandedTools.has(tool.name) && (
                            <CardContent className="space-y-4">
                              {/* Input Schema */}
                              <div>
                                <h4 className="font-medium mb-2">Input Schema</h4>
                                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                                  {JSON.stringify(tool.inputSchema, null, 2)}
                                </pre>
                              </div>

                              {/* Examples */}
                              {tool.examples && tool.examples.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Examples</h4>
                                  <div className="space-y-3">
                                    {tool.examples.map((example, index) => {
                                      const toolKey = `${tool.name}-${JSON.stringify(example.input)}`;
                                      const isExecuting = executingTools.has(toolKey);
                                      const result = toolResults[toolKey];
                                      
                                      return (
                                        <div key={index} className="border rounded p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <h5 className="font-medium">{example.name}</h5>
                                            {onExecuteTool && (
                                              <Button
                                                onClick={() => executeToolExample(tool, example)}
                                                disabled={isExecuting}
                                                size="sm"
                                              >
                                                {isExecuting ? (
                                                  <RotateCcw className="h-3 w-3 animate-spin mr-1" />
                                                ) : (
                                                  <Play className="h-3 w-3 mr-1" />
                                                )}
                                                Execute
                                              </Button>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-600 mb-2">{example.description}</p>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                              <label className="text-xs font-medium text-gray-500">Input</label>
                                              <pre className="bg-gray-50 p-2 rounded text-xs mt-1">
                                                {JSON.stringify(example.input, null, 2)}
                                              </pre>
                                            </div>
                                            
                                            {result && (
                                              <div>
                                                <label className="text-xs font-medium text-gray-500">
                                                  {result.error ? 'Error' : 'Result'}
                                                </label>
                                                <pre className={`p-2 rounded text-xs mt-1 ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50'}`}>
                                                  {JSON.stringify(result, null, 2)}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Tags */}
                              {tool.tags && tool.tags.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Tags</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {tool.tags.map((tag) => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        <Hash className="h-3 w-3 mr-1" />
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Resources Tab */}
              <TabsContent value="resources" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {server.resources.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No resources available</p>
                      </div>
                    ) : (
                      server.resources.map((resource) => (
                        <Card key={resource.uri}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-green-500" />
                                <CardTitle className="text-lg">{resource.name}</CardTitle>
                                {resource.mimeType && (
                                  <Badge variant="secondary">{resource.mimeType}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => copyToClipboard(resource.uri)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={() => toggleExpanded('resource', resource.uri)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  {expandedResources.has(resource.uri) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            {resource.description && (
                              <p className="text-sm text-gray-600">{resource.description}</p>
                            )}
                          </CardHeader>
                          
                          {expandedResources.has(resource.uri) && (
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-500">URI</label>
                                  <p className="font-mono text-sm break-all">{resource.uri}</p>
                                </div>
                                {resource.size && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Size</label>
                                    <p>{formatFileSize(resource.size)}</p>
                                  </div>
                                )}
                                {resource.lastModified && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Last Modified</label>
                                    <p>{resource.lastModified.toLocaleString()}</p>
                                  </div>
                                )}
                                {resource.annotations?.category && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Category</label>
                                    <p>{resource.annotations.category}</p>
                                  </div>
                                )}
                              </div>

                              {resource.annotations?.audience && (
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Audience</label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {resource.annotations.audience.map((audience) => (
                                      <Badge key={audience} variant="outline">{audience}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {resource.annotations?.priority && (
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Priority</label>
                                  <Badge variant={resource.annotations.priority > 5 ? 'default' : 'secondary'}>
                                    {resource.annotations.priority}
                                  </Badge>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Prompts Tab */}
              <TabsContent value="prompts" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {server.prompts.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No prompts available</p>
                      </div>
                    ) : (
                      server.prompts.map((prompt) => (
                        <Card key={prompt.name}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-purple-500" />
                                <CardTitle className="text-lg">{prompt.name}</CardTitle>
                                {prompt.category && (
                                  <Badge variant="secondary">{prompt.category}</Badge>
                                )}
                              </div>
                              <Button
                                onClick={() => toggleExpanded('prompt', prompt.name)}
                                variant="ghost"
                                size="sm"
                              >
                                {expandedPrompts.has(prompt.name) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {prompt.description && (
                              <p className="text-sm text-gray-600">{prompt.description}</p>
                            )}
                          </CardHeader>
                          
                          {expandedPrompts.has(prompt.name) && (
                            <CardContent className="space-y-4">
                              {/* Arguments */}
                              {prompt.arguments && prompt.arguments.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Arguments</h4>
                                  <div className="space-y-2">
                                    {prompt.arguments.map((arg) => (
                                      <div key={arg.name} className="border rounded p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{arg.name}</code>
                                          {arg.required && (
                                            <Badge variant="destructive" className="text-xs">Required</Badge>
                                          )}
                                          {arg.type && (
                                            <Badge variant="outline" className="text-xs">{arg.type}</Badge>
                                          )}
                                        </div>
                                        {arg.description && (
                                          <p className="text-sm text-gray-600">{arg.description}</p>
                                        )}
                                        {arg.default !== undefined && (
                                          <div className="mt-2">
                                            <label className="text-xs font-medium text-gray-500">Default</label>
                                            <code className="block bg-gray-100 p-1 rounded text-xs mt-1">
                                              {JSON.stringify(arg.default)}
                                            </code>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Examples */}
                              {prompt.examples && prompt.examples.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Examples</h4>
                                  <div className="space-y-3">
                                    {prompt.examples.map((example, index) => (
                                      <div key={index} className="border rounded p-3">
                                        <h5 className="font-medium mb-2">{example.name}</h5>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-xs font-medium text-gray-500">Arguments</label>
                                            <pre className="bg-gray-50 p-2 rounded text-xs mt-1">
                                              {JSON.stringify(example.arguments, null, 2)}
                                            </pre>
                                          </div>
                                          
                                          {example.output && (
                                            <div>
                                              <label className="text-xs font-medium text-gray-500">Output</label>
                                              <pre className="bg-gray-50 p-2 rounded text-xs mt-1">
                                                {example.output}
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-6">
                    {/* Performance Metrics */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Performance Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{server.metrics.totalRequests}</div>
                            <div className="text-sm text-gray-500">Total Requests</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{server.metrics.successfulRequests}</div>
                            <div className="text-sm text-gray-500">Successful</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{server.metrics.failedRequests}</div>
                            <div className="text-sm text-gray-500">Failed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {server.metrics.averageResponseTime.toFixed(0)}ms
                            </div>
                            <div className="text-sm text-gray-500">Avg Response Time</div>
                          </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">
                              {formatUptime(server.metrics.uptime)}
                            </div>
                            <div className="text-sm text-gray-500">Uptime</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-teal-600">
                              {server.metrics.totalRequests > 0 
                                ? ((server.metrics.successfulRequests / server.metrics.totalRequests) * 100).toFixed(1)
                                : 0}%
                            </div>
                            <div className="text-sm text-gray-500">Success Rate</div>
                          </div>
                        </div>

                        {server.metrics.lastActivity && (
                          <div className="mt-4 text-center">
                            <div className="text-sm text-gray-500">
                              Last Activity: {server.metrics.lastActivity.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Capability Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Capability Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{server.tools.length}</div>
                            <div className="text-sm text-gray-500">Tools</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">{server.resources.length}</div>
                            <div className="text-sm text-gray-500">Resources</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-purple-600">{server.prompts.length}</div>
                            <div className="text-sm text-gray-500">Prompts</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-orange-600">
                              {Object.values(server.capabilities).filter(Boolean).length}
                            </div>
                            <div className="text-sm text-gray-500">Active Capabilities</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {server.errors.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No recent errors</p>
                      </div>
                    ) : (
                      server.errors.map((error, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-gray-500">
                                    {error.timestamp.toLocaleString()}
                                  </div>
                                  <Button
                                    onClick={() => copyToClipboard(error.message + (error.context || ''))}
                                    variant="ghost"
                                    size="sm"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="font-medium mt-1">{error.message}</p>
                                {error.context && (
                                  <pre className="bg-gray-100 p-2 rounded text-xs mt-2 overflow-auto">
                                    {error.context}
                                  </pre>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};