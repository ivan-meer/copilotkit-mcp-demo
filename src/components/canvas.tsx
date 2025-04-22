"use client";

import * as Skeletons from "@/components/skeletons";
import { CircleOff, Loader2, Settings, Plus, Trash2, Check, ChevronDown, ChevronRight } from "lucide-react";
import React, { Suspense, useState, useRef, ChangeEvent } from "react";
import { ChatWindow } from "./chat-window";
import { MCPConfigModal } from "./mcp-config-modal";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { useTodo, TodoProvider } from "@/contexts/TodoContext";
import { TodoApp } from "./Todo";
import VisualRepresentation from "./VisualRepresentation";
import Test from "./Test";

export default function Canvas() {
  const [showMCPConfigModal, setShowMCPConfigModal] = useState(false);

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
