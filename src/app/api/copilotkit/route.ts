import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import { McpClient } from "../../../lib/mcp-client";

const serviceAdapter = new OpenAIAdapter();
const runtime = new CopilotRuntime({
  // @ts-ignore
  createMCPClient: async (config) => {
    try {
      const mcpClient = new McpClient({
        serverUrl: config.endpoint,
      });
      await mcpClient.connect();
      return mcpClient;
    } catch (error) {
      console.error(`Error creating MCP client for ${config.endpoint}:`, error);
    }
  },
});

export const POST = async (req: NextRequest) => {
  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

    return handleRequest(req);
  } catch (error) {
    console.error("Error handling CopilotKit request:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
