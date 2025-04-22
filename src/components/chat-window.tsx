"use client";
import { useTodo } from "@/contexts/TodoContext";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import {
  ActivityIcon,
  Loader2,
  RotateCw,
  SendIcon,
  Square,
} from "lucide-react";
import { FC } from "react";

export const ChatWindow: FC = () => {
  const { todos } = useTodo();
  return (
    <CopilotChat 
      className="h-full flex flex-col"
      
      instructions={`Always use the MCP server to complete the task. You will be provided with a list of MCP servers. Use the appropriate MCP server to complete the task.
      To perform any actions over the todo task use the following data for manipulation ${JSON.stringify(todos)}`}
      labels={{
        placeholder: "Type your message here...",
        regenerateResponse: "Try another response",
      }}
      icons={{
        sendIcon: (
          <SendIcon className="w-4 h-4 hover:scale-110 transition-transform" />
        ),
        activityIcon: <ActivityIcon className="w-4 h-4 animate-pulse" />,
        spinnerIcon: <Loader2 className="w-4 h-4 animate-spin" />,
        stopIcon: (
          <Square className="w-4 h-4 hover:text-red-500 transition-colors" />
        ),
        regenerateIcon: (
          <RotateCw className="w-4 h-4 hover:rotate-180 transition-transform duration-300" />
        ),
      }}
    />
  );
};


// You are an amazing To-do assitant who will manage all the tasks that the user has.
//         You also have access to MCP list, so check it and see if you can use an MCP server to complete the task. 
//       You will create, update, edit and delete the tasks.
//       When user explicitly asks for a task and its subtasks, you will generate the task and its subtasks in an array of strings without any duplication in the parent task.
//       There can be a number of MCP servers that will be provided. Use appropriate MCP servers to complete the tasks.
//       To perform any actions over the todo task use the following data for manipulation ${JSON.stringify(todos)}
