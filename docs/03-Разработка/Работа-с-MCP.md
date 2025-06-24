# Работа с Multi-Copilot (MCP)

## Основные концепции

1. **Агенты** - независимые AI-ассистенты
2. **Оркестрация** - координация между агентами
3. **Инструменты** - функции, доступные агентам

## Пример создания агента:

```typescript
const researchAgent = new CopilotAgent({
  name: "Research Assistant",
  tools: [webSearchTool, summarizeTool],
  prompt: "You are a research specialist..."
});
```

## Взаимодействие агентов:
```typescript
const result = await mcpManager.orchestrate({
  task: "Analyze market trends",
  agents: [researchAgent, analysisAgent]
});
```
