"use client";
import { useCoAgent } from "@copilotkit/react-core";
import { createContext, useContext, useRef } from "react";
// import { AvailableAgents } from "@/lib/available-agents";
import { MCPAgentState } from "./agents/mcp-agent";
import { MCP_STORAGE_KEY, ServerConfig } from "@/lib/mcp-config-types";
import { useLocalStorage } from "@/hooks/use-local-storage";

/**
 * Base Agent State
 */
export type BaseAgentState = {
  // __name__: AvailableAgents;
};

/**
 * Travel Agent Types
 */
export type Place = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  description?: string;
};

export type Trip = {
  id: string;
  name: string;
  center_latitude: number;
  center_longitude: number;
  zoom_level?: number | 13;
  places: Place[];
};

export type SearchProgress = {
  query: string;
  done: boolean;
};

export type TravelAgentState = BaseAgentState & {
  trips: Trip[];
  selected_trip_id: string | null;
  search_progress?: SearchProgress[];
};

/**
 * Research Agent Types
 */
export interface Section {
  title: string;
  content: string;
  idx: number;
  footer?: string;
  id: string;
}

export interface Source {
  content: string;
  published_date: string;
  score: number;
  title: string;
  url: string;
}
export type Sources = Record<string, Source>;

export interface Log {
  message: string;
  done: boolean;
}

export const AgentsContext = createContext<
  Array<TravelAgentState | MCPAgentState>
>([]);

/**
 * This provider wraps state from all agents
 */
export const CoAgentsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {



  return (
    <AgentsContext.Provider
      value={[
      ]}
    >
      {children}
    </AgentsContext.Provider>
  );
};

export const useCoAgents = () => {
  const context = useContext(AgentsContext);
  if (!context) {
    throw new Error("useAgents must be used within an AgentsProvider");
  }
  return context;
};
