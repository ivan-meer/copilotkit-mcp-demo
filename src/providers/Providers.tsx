"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { CopilotKit } from "@copilotkit/react-core";
import { CoAgentsProvider } from "@/components/coagents-provider";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface Config {
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
  const [mcpConfig, _setMcpConfig] = useLocalStorage("mcpConfig",[]);
  const [config, setConfig] = React.useState<Config[]>(mcpConfig || []);

  // console.log("MCP",config);

  return (
    <ServerConfigsContext.Provider value={{config,setConfig}} >
      <QueryClientProvider client={queryClient}>
        <CopilotKit
          showDevConsole={true}
          // publicApiKey={process.env.NEXT_PUBLIC_COPILOT_CLOUD_API_KEY}
          runtimeUrl="/api/copilotkit"
          mcpEndpoints={config}
        >
          <CoAgentsProvider>{children}</CoAgentsProvider>
        </CopilotKit>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ServerConfigsContext.Provider>
  );
}
