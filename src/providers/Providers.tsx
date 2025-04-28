"use client";

import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CoAgentsProvider } from "@/components/coagents-provider";
import { useLocalStorage } from "@/hooks/use-local-storage";
import McpServerManager from "@/components/McpServerManager";

export interface Config {
  endpoint: string;
  serverName: string;
}

export interface ConfigContextType {
  config: Config[];
  setConfig: (config: Config[]) => void;
}

const queryClient = new QueryClient();
export const ServerConfigsContext = React.createContext<ConfigContextType | undefined>(undefined);
export default function Providers({ children }: { children: React.ReactNode }) {
  const [mcpConfig] = useLocalStorage("mcpConfig",[]);
  const [config, setConfig] = React.useState<Config[]>(mcpConfig || []);


  return (
    <ServerConfigsContext.Provider value={{config,setConfig}} >
      <QueryClientProvider client={queryClient}>
        <CopilotKit
          showDevConsole={true}
          // publicApiKey={process.env.NEXT_PUBLIC_COPILOT_CLOUD_API_KEY}
          runtimeUrl="/api/copilotkit"
        >
          <McpServerManager configs={config} />
          <CoAgentsProvider>{children}</CoAgentsProvider>
        </CopilotKit>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ServerConfigsContext.Provider>
  );
}
