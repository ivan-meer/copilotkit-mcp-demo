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
    <div style={{border:"1px solid red"}} className="relative h-full w-full grid grid-cols-1 md:grid-cols-12 p-5">

      <div className="absolute top-4 right-4 flex gap-2 z-[9999]">
        <button
          onClick={() => setShowMCPConfigModal(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="font-medium">MCP Servers</span>
        </button>

      </div>
      <TodoProvider>

        <div className="order-last md:order-first md:col-span-3 p-4 border-r h-screen overflow-y-auto">
          <ChatWindow />
        </div>

        <div className="order-first md:order-last md:col-span-5 bg-white p-8 overflow-y-auto">
          <div className="space-y-8 h-full">
            <Suspense fallback={<Skeletons.EmailListSkeleton />}>
              <div className="h-full">
                <VisualRepresentation />
              </div>
            </Suspense>
          </div>
        </div>
        <div className="order-first md:order-last md:col-span-4 bg-white p-8 overflow-y-auto">
          <div className="space-y-8 h-full">
            <Suspense fallback={<Skeletons.EmailListSkeleton />}>
              <div className="h-full">
                <TodoApp />
              </div>
            </Suspense>
          </div>
        </div>
      </TodoProvider>


      {/* MCP Config Modal */}
      <MCPConfigModal
        isOpen={showMCPConfigModal}
        onClose={() => setShowMCPConfigModal(false)}
      />
    </div>
  );
}
