"use client";

import * as Skeletons from "@/components/skeletons";
import { Settings } from "lucide-react";
import React, { Suspense, useState } from "react";
import { ChatWindow } from "./chat-window";
import { MCPConfigModal } from "./mcp-config-modal";
import { TodoProvider } from "@/contexts/TodoContext";
import { TodoApp } from "./Todo";
import VisualRepresentation from "./VisualRepresentation";
// import { useCopilotChatSuggestions } from "@copilotkit/react-core";

export default function Canvas() {
  const [showMCPConfigModal, setShowMCPConfigModal] = useState(false);
  
  // TODO: Fix CopilotKit version compatibility
  // useCopilotChatSuggestions(
  //   {
  //     instructions:
  //       "Check the Asana workspace. Make sure it's the parent workspace. If Asana is connected, first get the workspace projects and ID details, then read them back to me. Then, suggest creating a ticket in Asana with each task as a bullet point. If Typefully is connected, suggest a draft tweet with the Asana tasks an individual Tweet in Typefully.",
  //     minSuggestions: 1,
  //     maxSuggestions: 2,
  //   },
  //   []
  // );
  return (
    <TodoProvider>
      <div className="flex h-screen w-screen bg-gray-100">
        <div className="w-96 flex-shrink-0 border-r border-gray-200 bg-white p-4 overflow-y-auto">
          <ChatWindow />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white flex-shrink-0">
            <h1 className="text-2xl font-bold">Working Memory</h1>
            <button
              onClick={() => setShowMCPConfigModal(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span className="font-medium">MCP Servers</span>
            </button>
          </div>

          <div className="flex-1 flex gap-5 p-5 overflow-hidden">
            <div className="flex-[3] bg-white p-6 rounded-lg shadow border border-gray-200 overflow-y-auto">
              <Suspense fallback={<Skeletons.EmailListSkeleton />}>
                <VisualRepresentation />
              </Suspense>
            </div>

            <div className="flex-[3] bg-white p-6 rounded-lg shadow border border-gray-200 overflow-y-auto">
              <Suspense fallback={<Skeletons.EmailListSkeleton />}>
                <TodoApp />
              </Suspense>
            </div>
          </div>
        </div>

        <MCPConfigModal
          isOpen={showMCPConfigModal}
          onClose={() => setShowMCPConfigModal(false)}
        />
      </div>
    </TodoProvider>
  );
}
