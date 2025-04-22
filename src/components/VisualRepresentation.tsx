import { Todo, useTodo } from '@/contexts/TodoContext';
import { randomUUID } from 'crypto';
import React, { useCallback, useEffect, useRef } from 'react';
import DoneIcon from '@mui/icons-material/Done';
import "../app/globals.css";

import {
    Background,
    ReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    useReactFlow,
    ReactFlowProvider,
    Edge,
    Node,
} from 'reactflow';
import "reactflow/dist/style.css";
import { ChildNode, ParentNode } from './Nodes';



const VisualRepresentation = () => {
    const { todos,toggleTodo,toggleSubtask } = useTodo();
    // const reactFlowWrapper = useRef(null);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, _onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        console.log(todos);
        let units: Node[] = todos.flatMap((item, index) => {
            if (!item.expanded && todos.length != 1) return [];
            let arr: Node[] = [{
                id: item.id.toString(),
                data: item,
                position: { x: nodes.find((node) => node.id.toString() === item.id.toString())?.position.x || index * 100, y: nodes.find((node) => node.id.toString() === item.id.toString())?.position.y || index * 100 },
                type: "ParentNode",               
            }]
            if (item.subtasks.length > 0) {
                for (let i = 0; i < item.subtasks.length; i++) {
                    arr.push({
                        id: item.subtasks[i].id.toString(),
                        data: {...item.subtasks[i],parentId:item.id.toString()},
                        position: {
                            x: nodes.find((node) => node.id.toString() === item.subtasks[i].id.toString())?.position.x || (i % 2 == 0 ? -100 : 100),
                            y: nodes.find((node) => node.id.toString() === item.subtasks[i].id.toString())?.position.y || (i % 2 == 0 ? (i * 100) + 100 : ((i - 1) * 100) + 100)
                        },
                        type: "ChildNode",
                    })
                }
            }
            return [...arr];
        });
        setNodes(units);
        let edges: Edge[] = todos.flatMap((item, _index) => {
            if (!item.expanded && todos.length != 1) return [];
            if (item.subtasks.length > 0) {
                let arr = [];
                for (let i = 0; i < item.subtasks.length; i++) {
                    arr.push({
                        id: `${item.id}-${item.subtasks[i].id}`,
                        source: item.id.toString(),
                        target: item.subtasks[i].id.toString(),
                        animated: true,
                    })
                }
                console.log(arr, "arr");
                return [...arr];
            }
            return [];
        })
        setEdges(edges);
    }, [todos]);



    return (
        <div style={{ width: "100%", height: "100%" }} className="wrapper">
            <ReactFlow
                style={{ backgroundColor: "#F7F9FB" }}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onNodeClick={(event, node) => {
                    if(node.type == "ParentNode"){
                        toggleTodo(node.data.id);
                    }
                    else{
                        console.log(node.data, "nodenodenodenodenodenodenode");
                        toggleSubtask(parseInt(node.data.parentId),node.data.id);
                    }
                }}
                // fitView
                defaultViewport={{ x: 200, y: 100, zoom: 1 }}
                nodeTypes={nodeTypes}
            >
                <Background />
            </ReactFlow>
        </div>
    );
};


const nodeTypes = {
    ParentNode: ParentNode,
    ChildNode: ChildNode,
}
export default function Test() {
    return (
        <ReactFlowProvider>
            <VisualRepresentation />
        </ReactFlowProvider>
    );
}