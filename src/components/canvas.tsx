"use client";


import * as Skeletons from "@/components/skeletons";
import { CircleOff, Loader2, Settings, Plus, Trash2, Check, ChevronDown, ChevronRight } from "lucide-react";
import React, { Suspense, useState, useRef, ChangeEvent } from "react";
import { ChatWindow } from "./chat-window";
import { MCPConfigModal } from "./mcp-config-modal";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { useTodo, TodoProvider } from "@/contexts/TodoContext";


const TodoApp = () => {
  const { todos, addTodo, toggleTodo, deleteTodo, toggleAccordion, addSubtask, toggleSubtask, deleteSubtask, addTaskAndSubtask } = useTodo();
  const [newTodo, setNewTodo] = useState("");
  const [newSubtask, setNewSubtask] = useState<{ parentId: number | null; text: string }>({
    parentId: null,
    text: "",
  });
  // const subtaskInputRef = useRef<HTMLInputElement>(null);

  const handleAddTodo = () => {
    if (newTodo.trim() === "") return;
    addTodo(newTodo);
    setNewTodo("");
  };

  const handleAddSubtask = (parentIndex: number) => {
    if (newSubtask.text.trim() === "") return;
    addSubtask(parentIndex, newSubtask.text);
    setNewSubtask({ parentId: null, text: "" });
    
  };

  const handleSubtaskChange = (e: ChangeEvent<HTMLInputElement>, todoId: number) => {
    setNewSubtask({ parentId: todoId, text: e.target.value });
  };

  useCopilotAction({
    name: "addTask",
    description: "Adds a task to the todo list",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "The title of the task",
        required: true,
      },
    ],
    handler: ({ title }) => {
      addTodo(title);
    }
  });

  useCopilotAction({
    name: "addSubtask",
    description: "Adds a subtask to the todo list",
    parameters: [
      {
        name: "index",
        type: "number",
        description: "The position of the parent task in the todo list",
        required: true,
      },
      {
        name: "subtask",
        type: "string",
        description: "The subtask to add",
        required: true,
      },
    ],
    handler: ({ index, subtask }) => {
      addSubtask(index, subtask);
    }
  });


  useCopilotReadable({
    description: "The current state of the todo list",
    value: JSON.stringify(todos),
  })

  useCopilotAction({
    name: "addTaskAndSubtask",
    description: "Adds a task and its subtask to the todo list",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "The title of the task",
        required: true,
      },
      {
        name: "subtask",
        type: "string[]",
        description: "The subtask to add",
        required: true,
      },
    ],
    handler: ({ title, subtask }) => {
      addTaskAndSubtask(title, subtask);
    }
  });

  useCopilotAction({
    name: "deleteTodo",
    description: "Deletes a parent todo item from the todo list",
    parameters: [
      {
        name: "id",
        type: "number",
        description: "The id of the todo item to be deleted",
        required: true,
      },
    ],
    handler: ({ id }) => {
      deleteTodo(id);
    },
  });

  useCopilotAction({
    name: "deleteSubTodo",
    description: "Deletes a subtask from the todo list",
    parameters: [
      {
        name: "parentId",
        type: "number",
        description: "The id of the parent todo item to be deleted",
        required: true,
      },
      {
        name: "subtaskId",
        type: "number",
        description: "The id of the subtask to be deleted",
        required: true,
      },
    ],
    handler: ({ parentId, subtaskId }) => {
      deleteSubtask(parentId, subtaskId);
    },
  });

  useCopilotAction({
    name: "completeTodo",
    description: "Completes a parent todo item from the todo list",
    parameters: [
      {
        name: "id",
        type: "number",
        description: "The id of the todo item to be completed",
        required: true,
      },
    ],
    handler: ({ id }) => {
      toggleTodo(id);
    },
  });

  useCopilotAction({
    name: "completeSubtask",
    description: "Completes a subtask from the todo list",
    parameters: [
      {
        name: "parentId",
        type: "number",
        description: "The id of the parent todo item",
        required: true,
      },
      {
        name: "subtaskId",
        type: "number",
        description: "The id of the subtask to be completed",
        required: true,
      },
    ],
    handler: ({ parentId, subtaskId }) => {
      toggleSubtask(parentId, subtaskId);
    },
  });

  return (
    <div className="flex flex-col items-center justify-start h-full w-full max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Working Memory</h1>

      <div className="flex w-full mb-6">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
          placeholder="Add a new task..."
          className="flex-grow p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAddTodo}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-lg flex items-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full space-y-3">
        {todos.length === 0 ? (
          <p className="text-center text-gray-500 italic">No todos yet. Add one above!</p>
        ) : (
          todos.map((todo,index) => (
            <div
              key={todo.id+Math.random()}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center">
                  <button
                    onClick={() => toggleAccordion(todo.id)}
                    className="mr-2 text-gray-500 hover:text-gray-700"
                  >
                    {todo.expanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${todo.completed
                      ? "bg-green-500 border-green-500"
                      : "border-gray-400"
                      }`}
                  >
                    {todo.completed && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <span
                    className={`${todo.completed ? "line-through text-gray-400" : "text-gray-800"
                      }`}
                  >
                    {todo.text}
                  </span>
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {todo.expanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex w-full mb-3">
                    <input
                      type="text"
                      value={newSubtask.text}
                      onChange={(e) => handleSubtaskChange(e, todo.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubtask(todo.id)}
                      placeholder="Add a subtask..."
                      className="flex-grow p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={() => handleAddSubtask(todo.id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-r-lg flex items-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {todo.subtasks.length > 0 ? (
                    <div className="space-y-2">
                      {todo.subtasks.map((subtask,index) => (
                        <div
                          key={subtask.id+Math.random()}
                          className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleSubtask(todo.id, subtask.id)}
                              className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${subtask.completed
                                ? "bg-green-500 border-green-500"
                                : "border-gray-400"
                                }`}
                            >
                              {subtask.completed && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <span
                              className={`text-sm ${subtask.completed ? "line-through text-gray-400" : "text-gray-800"
                                }`}
                            >
                              {subtask.text}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteSubtask(todo.id, subtask.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 italic text-sm">No subtasks yet</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default function Canvas() {
  const [showMCPConfigModal, setShowMCPConfigModal] = useState(false);




  return (
    <div className="relative h-full w-full grid grid-cols-1 md:grid-cols-12">

      <div className="absolute top-4 right-4 flex gap-2 z-[9999]">
        <button
          onClick={() => setShowMCPConfigModal(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="font-medium">MCP Servers</span>
        </button>

      </div>

      <div className="order-last md:order-first md:col-span-4 p-4 border-r h-screen overflow-y-auto">
        <TodoProvider>
          <ChatWindow />
        </TodoProvider>
      </div>

      <div className="order-first md:order-last md:col-span-8 bg-white p-8 overflow-y-auto">
        <div className="space-y-8 h-full">
          <Suspense fallback={<Skeletons.EmailListSkeleton />}>
            <div className="h-full">
              <TodoProvider>
                <TodoApp />
              </TodoProvider>
            </div>
          </Suspense>
        </div>
      </div>

      {/* MCP Config Modal */}
      <MCPConfigModal
        isOpen={showMCPConfigModal}
        onClose={() => setShowMCPConfigModal(false)}
      />
    </div>
  );
}
