# Объяснение потоков данных - Universal AI Chat Hub

> 🌊 **Поток данных** - это путь, который проходит информация в приложении от пользователя до результата. Понимание этих потоков критично для работы с любой сложной системой.

## 📋 Содержание

1. [Основные концепции](#основные-концепции)
2. [Простой поток: отправка сообщения](#простой-поток-отправка-сообщения)
3. [Сложный поток: выполнение MCP инструмента](#сложный-поток-выполнение-mcp-инструмента)
4. [Поток генерации UI](#поток-генерации-ui)
5. [Error handling и recovery](#error-handling-и-recovery)
6. [State management](#state-management)
7. [Real-time updates](#real-time-updates)

## 🎯 Основные концепции

### Что такое поток данных?

Представьте поток данных как **водопровод в доме**:

```
🚿 Кран (User Input) 
   ↓
🔧 Фильтр (Validation)
   ↓  
🏠 Котел (Business Logic)
   ↓
🌡️ Термостат (AI Processing)
   ↓
🚿 Душ (UI Output)
```

### Участники системы

1. **User** - источник данных (вводит команды)
2. **React Components** - интерфейс (отображают и собирают данные)
3. **Context/Hooks** - менеджеры состояния (хранят и передают данные)
4. **Business Logic** - обработчики (AI Orchestrator, MCP Manager)
5. **External Services** - внешние системы (AI API, MCP серверы)

## 💬 Простой поток: отправка сообщения

### Схема потока

```
👤 User Types Message → 📱 ChatInput → 🎯 Context → 🤖 AI Orchestrator → 🌐 AI Provider → 📤 Response → 📱 UI Update
```

### Детальный разбор

#### 1. **Пользователь вводит сообщение**

```typescript
// Компонент ChatInput.tsx
function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendMessage } = useUniversalAI(); // Получаем функцию из контекста
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('🎯 Step 1: User submitted message:', message);
    
    // Отправляем сообщение в систему
    sendMessage(message);
    setMessage(''); // Очищаем поле
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Введите сообщение..."
      />
      <button type="submit">Отправить</button>
    </form>
  );
}
```

#### 2. **Context принимает сообщение**

```typescript
// UniversalAIProvider.tsx
export const UniversalAIProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const sendMessage = async (content: string) => {
    console.log('🎯 Step 2: Context received message:', content);
    
    // Добавляем сообщение пользователя в историю
    const userMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Передаем в AI Orchestrator
      const response = await aiOrchestrator.complete({
        messages: [...messages, userMessage]
      });
      
      console.log('🎯 Step 6: Context received AI response:', response);
      
      // Добавляем ответ AI в историю
      setMessages(prev => [...prev, response.message]);
      
    } catch (error) {
      console.error('🎯 Step 6: Error in Context:', error);
      
      // Добавляем сообщение об ошибке
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Извините, произошла ошибка: ' + error.message,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <UniversalAIContext.Provider value={{ messages, sendMessage, isLoading }}>
      {children}
    </UniversalAIContext.Provider>
  );
};
```

#### 3. **AI Orchestrator обрабатывает запрос**

```typescript
// ai-orchestrator.ts
export class AIOrchestrator {
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    console.log('🎯 Step 3: AI Orchestrator received request:', request);
    
    // Выбираем лучшего провайдера
    const providers = this.selectProviders(request);
    console.log('🎯 Step 3.1: Selected providers:', providers.map(p => p.name));
    
    let lastError: Error | null = null;
    
    // Пробуем провайдеров по очереди
    for (const providerType of providers) {
      try {
        console.log('🎯 Step 3.2: Trying provider:', providerType);
        
        const provider = this.providers.get(providerType);
        const response = await provider.complete(request);
        
        console.log('🎯 Step 5: AI Orchestrator got response from', providerType);
        
        // Обновляем метрики
        this.updateProviderMetrics(providerType, true, response.usage);
        
        return response;
        
      } catch (error) {
        console.warn('🎯 Step 3.3: Provider failed:', providerType, error.message);
        lastError = error;
        
        // Обновляем метрики
        this.updateProviderMetrics(providerType, false);
        
        // Пробуем следующего провайдера
        continue;
      }
    }
    
    // Все провайдеры не сработали
    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }
}
```

#### 4. **AI Provider отправляет запрос**

```typescript
// openai-provider.ts
export class OpenAIProvider extends BaseAIProvider {
  async performCompletion(request: CompletionRequest): Promise<CompletionResponse> {
    console.log('🎯 Step 4: OpenAI Provider processing request');
    
    // Конвертируем в формат OpenAI
    const openaiMessages = this.convertMessages(request.messages);
    
    console.log('🎯 Step 4.1: Sending to OpenAI API');
    
    // Отправляем запрос к OpenAI
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: openaiMessages,
      temperature: request.temperature,
      max_tokens: request.maxTokens
    });
    
    console.log('🎯 Step 4.2: Received response from OpenAI API');
    
    // Конвертируем обратно в универсальный формат
    return this.convertResponse(response);
  }
}
```

#### 5. **Результат возвращается через всю цепочку**

```typescript
// Данные "пузырьком" поднимаются обратно:
OpenAI API → OpenAI Provider → AI Orchestrator → Context → React Component → User
```

### Временная диаграмма

```
Time →   0ms    100ms   500ms   2000ms  2100ms
User     📝 Type  ⏎ Send   ⏳ Wait  ⏳ Wait  📖 Read
UI       [input] [sent]   [loading][loading][response]
Context           📤 Send           📥 Receive
AI Orch           📤 Route         📥 Return
Provider                   🌐 API Call      📥 Response
OpenAI                     🤖 Processing    📤 Response
```

## 🔧 Сложный поток: выполнение MCP инструмента

### Схема сложного потока

```
👤 User Request → 🤖 AI Response with Tool Call → 🔧 MCP Manager → 🌐 MCP Server → 📊 Tool Execution → 🎨 UI Generation → 📱 Display Result
```

### Детальный разбор

#### 1. **AI решает использовать инструмент**

```typescript
// AI получает запрос: "Создай todo список для планирования отпуска"
const aiResponse = {
  message: {
    content: "Я создам для вас todo список для планирования отпуска.",
    toolCalls: [
      {
        id: "call_123",
        name: "create_todo_list",
        parameters: {
          title: "Планирование отпуска",
          items: [
            "Выбрать направление",
            "Забронировать отель", 
            "Купить билеты",
            "Оформить страховку"
          ]
        }
      }
    ]
  }
};
```

#### 2. **MCP Manager выполняет инструмент**

```typescript
// enhanced-mcp-manager.ts
export class EnhancedMCPManager {
  async executeTool(serverId: string, toolName: string, parameters: any) {
    console.log('🔧 Step 1: MCP Manager executing tool:', { serverId, toolName, parameters });
    
    // Находим сервер
    const serverState = this.servers.get(serverId);
    if (!serverState) {
      throw new MCPError(`Server ${serverId} not found`);
    }
    
    // Проверяем статус сервера
    if (serverState.status !== MCPServerStatus.CONNECTED) {
      console.log('🔧 Step 1.1: Server not connected, attempting reconnection');
      await this.connectServer(serverId);
    }
    
    // Находим инструмент
    const tool = serverState.discoveredCapabilities.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new MCPError(`Tool ${toolName} not found on server ${serverId}`);
    }
    
    // Валидируем параметры
    console.log('🔧 Step 1.2: Validating parameters');
    const validationResult = this.validateToolParameters(tool, parameters);
    if (!validationResult.valid) {
      throw new MCPValidationError(serverId, `Invalid parameters: ${validationResult.errors.join(', ')}`);
    }
    
    // Создаем контекст выполнения
    const executionContext = {
      id: this.generateExecutionId(),
      toolName,
      serverId,
      parameters,
      status: 'executing',
      startTime: new Date()
    };
    
    this.executionContexts.set(executionContext.id, executionContext);
    this.emit('tool:execution_started', executionContext);
    
    try {
      console.log('🔧 Step 2: Sending tool execution to MCP server');
      
      // Выполняем инструмент на сервере
      const transport = this.transports.get(serverId);
      const result = await transport.send({
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: parameters
        }
      });
      
      console.log('🔧 Step 3: Received result from MCP server:', result);
      
      // Обновляем контекст
      executionContext.status = 'completed';
      executionContext.endTime = new Date();
      executionContext.result = result;
      
      this.emit('tool:execution_completed', executionContext);
      
      return result;
      
    } catch (error) {
      console.error('🔧 Step 3: Tool execution failed:', error);
      
      executionContext.status = 'failed';
      executionContext.endTime = new Date();
      executionContext.error = error.message;
      
      this.emit('tool:execution_failed', executionContext);
      throw error;
    }
  }
}
```

#### 3. **MCP Server обрабатывает запрос**

```typescript
// На стороне MCP сервера (может быть отдельное приложение)
class TodoListServer {
  async handleToolCall(toolName: string, parameters: any) {
    console.log('🌐 Step 1: MCP Server received tool call:', { toolName, parameters });
    
    switch (toolName) {
      case 'create_todo_list':
        return this.createTodoList(parameters);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
  
  async createTodoList({ title, items }) {
    console.log('🌐 Step 2: Creating todo list:', { title, items });
    
    // Сохраняем в базу данных
    const todoList = await this.database.createTodoList({
      id: generateId(),
      title,
      items: items.map(item => ({
        id: generateId(),
        text: item,
        completed: false,
        createdAt: new Date()
      })),
      createdAt: new Date()
    });
    
    console.log('🌐 Step 3: Todo list created:', todoList);
    
    return {
      success: true,
      todoList: {
        id: todoList.id,
        title: todoList.title,
        itemCount: todoList.items.length,
        items: todoList.items
      }
    };
  }
}
```

#### 4. **UI Generator создает интерфейс**

```typescript
// schema-generator.ts
export class SchemaGenerator {
  async generateFromToolResult(tool: EnhancedMCPTool, result: any) {
    console.log('🎨 Step 1: UI Generator analyzing result:', { tool: tool.name, result });
    
    // Анализируем структуру результата
    const resultStructure = this.analyzeResultStructure(result);
    console.log('🎨 Step 1.1: Result structure:', resultStructure);
    
    // Генерируем схему UI
    const uiSchema = {
      id: `result_${tool.name}_${Date.now()}`,
      title: `Результат: ${tool.name}`,
      layout: {
        type: UIComponentType.CONTAINER,
        children: []
      }
    };
    
    // Если результат содержит список задач
    if (result.todoList) {
      console.log('🎨 Step 2: Generating todo list UI');
      
      uiSchema.layout.children.push({
        type: UIComponentType.CARD,
        id: 'todo_list_card',
        label: result.todoList.title,
        children: [
          {
            type: UIComponentType.TEXT,
            id: 'item_count',
            props: {
              content: `Создано задач: ${result.todoList.itemCount}`
            }
          },
          {
            type: UIComponentType.TABLE,
            id: 'todo_items',
            tableProps: {
              columns: [
                { key: 'text', label: 'Задача' },
                { key: 'completed', label: 'Выполнено', formatter: (value) => value ? '✅' : '⏳' },
                { key: 'createdAt', label: 'Создано', formatter: (value) => new Date(value).toLocaleString() }
              ]
            },
            data: result.todoList.items
          }
        ]
      });
    }
    
    console.log('🎨 Step 3: UI Schema generated:', uiSchema);
    
    return uiSchema;
  }
}
```

#### 5. **React рендерит результат**

```typescript
// UIRenderer.tsx
export const UIRenderer = ({ schema, data }) => {
  console.log('📱 Step 1: UIRenderer rendering schema:', schema.id);
  
  useEffect(() => {
    console.log('📱 Step 2: Component mounted, data received:', data);
  }, [data]);
  
  return (
    <div className="ui-renderer">
      <ComponentRenderer 
        config={schema.layout} 
        data={data}
        componentLibrary={componentLibrary}
      />
    </div>
  );
};

const ComponentRenderer = ({ config, data }) => {
  console.log('📱 Step 3: Rendering component:', config.type);
  
  // Получаем компонент из библиотеки
  const renderer = componentLibrary.renderers.get(config.type);
  
  if (!renderer) {
    console.error('📱 Step 3.1: Component not found:', config.type);
    return <div>Компонент {config.type} не найден</div>;
  }
  
  const Component = renderer.component;
  
  return (
    <Component 
      config={config} 
      data={data}
      onUpdate={(newData) => {
        console.log('📱 Step 4: Component data updated:', newData);
        // Обновляем состояние
      }}
    />
  );
};
```

### Полная временная диаграмма сложного потока

```
Time →     0ms     100ms    500ms    1000ms   1500ms   2000ms   2500ms
User       📝 Type  ⏎ Send   ⏳ Wait  ⏳ Wait  ⏳ Wait  ⏳ Wait  📖 Read
AI         
Context             📤 Send                                     📥 Show
AI Orch             📤 Route          📥 Tool                   📥 Return
MCP Mgr                      📤 Exec           📥 Result        📤 Return
MCP Srv                              🔧 Process        📤 Send
UI Gen                                                 🎨 Generate
React                                                           📱 Render
```

## 🎨 Поток генерации UI

### Быстрая генерация для простых случаев

```typescript
// Простой case: string input
const simpleSchema = {
  type: 'string',
  description: 'Введите ваше имя'
};

// Генератор автоматически создает:
const uiComponent = {
  type: UIComponentType.TEXT_INPUT,
  label: 'Введите ваше имя',
  placeholder: 'Введите имя...',
  validation: { required: true }
};
```

### Сложная генерация для объектов

```typescript
// Сложный case: объект с вложенными полями
const complexSchema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Имя пользователя' },
        email: { type: 'string', format: 'email' },
        age: { type: 'number', minimum: 18, maximum: 120 }
      }
    },
    preferences: {
      type: 'object',
      properties: {
        theme: { type: 'string', enum: ['light', 'dark'] },
        notifications: { type: 'boolean' }
      }
    }
  }
};

// Генератор создает структурированную форму:
const complexUI = {
  type: UIComponentType.CONTAINER,
  children: [
    {
      type: UIComponentType.GROUP,
      label: 'Информация о пользователе',
      children: [
        { type: UIComponentType.TEXT_INPUT, name: 'user.name', label: 'Имя' },
        { type: UIComponentType.TEXT_INPUT, name: 'user.email', inputType: 'email', label: 'Email' },
        { type: UIComponentType.NUMBER_INPUT, name: 'user.age', min: 18, max: 120, label: 'Возраст' }
      ]
    },
    {
      type: UIComponentType.GROUP,
      label: 'Настройки',
      children: [
        { type: UIComponentType.SELECT, name: 'preferences.theme', options: ['light', 'dark'], label: 'Тема' },
        { type: UIComponentType.CHECKBOX, name: 'preferences.notifications', label: 'Уведомления' }
      ]
    }
  ]
};
```

## ❌ Error handling и recovery

### Типы ошибок и их обработка

```typescript
// 1. Сетевые ошибки
try {
  const response = await aiProvider.complete(request);
} catch (error) {
  if (error instanceof NetworkError) {
    console.log('🔄 Network error, retrying with another provider');
    // Переключаемся на другого провайдера
    return this.tryNextProvider(request);
  }
}

// 2. Ошибки валидации
try {
  const validatedParams = this.validateParameters(params);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('📋 Validation error, showing user-friendly message');
    // Показываем пользователю что именно неправильно
    return {
      error: true,
      message: 'Пожалуйста, проверьте введенные данные:',
      details: error.details
    };
  }
}

// 3. Ошибки MCP серверов
try {
  const result = await mcpManager.executeTool(toolName, params);
} catch (error) {
  if (error instanceof MCPConnectionError) {
    console.log('🔧 MCP server disconnected, attempting reconnection');
    await mcpManager.reconnectServer(serverId);
    return this.retryToolExecution(toolName, params);
  }
}
```

### Graceful degradation

```typescript
// Если основной функционал недоступен, предоставляем упрощенную версию
class GracefulDegradation {
  async handleToolFailure(toolName: string, error: Error) {
    console.log(`🔄 Tool ${toolName} failed, providing fallback`);
    
    switch (toolName) {
      case 'create_todo_list':
        // Если MCP сервер недоступен, создаем простой список в localStorage
        return this.createLocalTodoList();
      
      case 'search_web':
        // Если поиск недоступен, предлагаем статичные ссылки
        return this.provideStaticSearchResults();
      
      default:
        // Общий fallback - просто показываем текстовое описание
        return {
          type: 'fallback',
          message: `Инструмент ${toolName} временно недоступен, но вы можете сделать это вручную:`,
          instructions: this.getManualInstructions(toolName)
        };
    }
  }
}
```

## 📊 State management

### Централизованное состояние через Context

```typescript
// Схема состояния приложения
interface UniversalAIState {
  // AI провайдеры
  providers: {
    available: AIProvider[];
    active: AIProvider | null;
    health: Record<AIProvider, ProviderHealth>;
  };
  
  // MCP серверы
  mcpServers: {
    connected: string[];
    available: EnhancedMCPServerConfig[];
    status: Record<string, MCPServerStatus>;
  };
  
  // Сообщения и история
  chat: {
    messages: UniversalMessage[];
    isLoading: boolean;
    activeExecutions: Map<string, ToolExecutionContext>;
  };
  
  // UI состояние
  ui: {
    activeSchema: UISchema | null;
    generatedSchemas: Map<string, UISchema>;
    theme: string;
  };
  
  // Ошибки и уведомления
  system: {
    errors: SystemError[];
    notifications: Notification[];
    debugMode: boolean;
  };
}
```

### Обновление состояния

```typescript
// Reducer pattern для предсказуемых обновлений
function universalAIReducer(state: UniversalAIState, action: UniversalAIAction): UniversalAIState {
  switch (action.type) {
    case 'PROVIDER_CONNECTED':
      return {
        ...state,
        providers: {
          ...state.providers,
          available: [...state.providers.available, action.provider],
          health: {
            ...state.providers.health,
            [action.provider]: { status: 'healthy', lastCheck: new Date() }
          }
        }
      };
    
    case 'MCP_TOOL_STARTED':
      return {
        ...state,
        chat: {
          ...state.chat,
          activeExecutions: new Map(state.chat.activeExecutions.set(action.executionId, action.context))
        }
      };
    
    case 'UI_SCHEMA_GENERATED':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeSchema: action.schema,
          generatedSchemas: new Map(state.ui.generatedSchemas.set(action.schema.id, action.schema))
        }
      };
  }
}
```

## ⚡ Real-time updates

### WebSocket соединения для живых обновлений

```typescript
// Система событий для real-time обновлений
class RealTimeManager {
  private eventEmitter = new EventEmitter();
  private websockets: Map<string, WebSocket> = new Map();
  
  // Подписка на события MCP серверов
  subscribeToMCPEvents(serverId: string) {
    const ws = new WebSocket(`ws://mcp-server/${serverId}/events`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      console.log('⚡ Real-time event from MCP server:', data);
      
      switch (data.type) {
        case 'tool_progress':
          this.eventEmitter.emit('tool:progress', {
            serverId,
            toolId: data.toolId,
            progress: data.progress
          });
          break;
        
        case 'server_status':
          this.eventEmitter.emit('server:status_change', {
            serverId,
            status: data.status
          });
          break;
      }
    };
    
    this.websockets.set(serverId, ws);
  }
  
  // Подписка на события в React компонентах
  useRealTimeUpdates(eventType: string, callback: (data: any) => void) {
    useEffect(() => {
      this.eventEmitter.on(eventType, callback);
      
      return () => {
        this.eventEmitter.off(eventType, callback);
      };
    }, [eventType, callback]);
  }
}

// Использование в компонентах
function ToolExecutionProgress({ executionId }) {
  const [progress, setProgress] = useState(0);
  
  useRealTimeUpdates('tool:progress', (data) => {
    if (data.toolId === executionId) {
      console.log('⚡ Progress update in component:', data.progress);
      setProgress(data.progress);
    }
  });
  
  return (
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${progress}%` }}
      />
      <span>{progress}%</span>
    </div>
  );
}
```

### Server-Sent Events для односторонних обновлений

```typescript
// Для случаев когда не нужна двусторонняя связь
class SSEManager {
  subscribeToUpdates(endpoint: string, callback: (data: any) => void) {
    const eventSource = new EventSource(endpoint);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📡 SSE update received:', data);
      callback(data);
    };
    
    eventSource.onerror = (error) => {
      console.error('📡 SSE connection error:', error);
      // Автоматически переподключаемся через 5 секунд
      setTimeout(() => {
        this.subscribeToUpdates(endpoint, callback);
      }, 5000);
    };
    
    return eventSource;
  }
}
```

## 🎯 Заключение

Понимание потоков данных помогает:

1. **Отлаживать проблемы** - вы знаете где искать ошибку
2. **Оптимизировать производительность** - видите узкие места
3. **Расширять функциональность** - понимаете как добавить новые возможности
4. **Поддерживать код** - логика становится прозрачной

**Следующий шаг**: Изучите файлы в `src/lib/` чтобы увидеть эти потоки в реальном коде! 🚀