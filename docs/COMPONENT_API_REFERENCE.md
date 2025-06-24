# 📚 Component API Reference - Universal AI Chat Hub

> **Полная документация всех компонентов интерфейса** с API, примерами использования и best practices.

## 📖 Содержание

1. [🏠 Основные компоненты](#-основные-компоненты)
2. [📝 Todo Management](#-todo-management-компоненты)
3. [🔗 MCP Integration](#-mcp-integration-компоненты)
4. [🧠 AI & Universal Hub](#-ai--universal-hub-компоненты)
5. [🎨 UI Foundation](#-ui-foundation-компоненты)
6. [⚙️ Utility Components](#️-utility-components)
7. [🔄 State Management](#-state-management-компоненты)

---

## 🏠 Основные компоненты

### Canvas

**Описание**: Главный компонент макета приложения, организующий весь интерфейс.

```typescript
// src/components/canvas.tsx
export const Canvas: FC = () => {
  // Основной макет приложения
}
```

**Особенности**:
- Разделенный макет: чат слева, рабочая память справа
- Интеграция с TodoProvider для управления состоянием
- Suspense-загрузка с скелетами
- Модальное окно конфигурации MCP серверов

**Использование**:
```typescript
import { Canvas } from '@/components/canvas';

export default function HomePage() {
  return <Canvas />;
}
```

**Dependencies**:
- TodoProvider context
- MCPConfigModal
- ChatWindow
- VisualRepresentation

---

### ChatWindow

**Описание**: Интерфейс чата для помощника по управлению задачами.

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const ChatWindow: FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
}
```

**API**:
- **State**: Управляет историей сообщений и состоянием загрузки
- **Events**: `handleSend()` - отправка сообщений
- **Integration**: Использует TodoContext для отображения количества задач

**Примеры использования**:
```typescript
// Встроенное в Canvas
<ChatWindow />

// Кастомизация через props (будущее расширение)
interface ChatWindowProps {
  className?: string;
  placeholder?: string;
  maxMessages?: number;
}
```

**Текущий статус**: 
- ⚠️ CopilotChat временно отключен из-за совместимости версий
- ✅ Работает custom implementation с симуляцией ответов

---

### AppSidebar

**Описание**: Навигационная боковая панель с управлением профилем пользователя.

```typescript
export const AppSidebar: FC = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
}
```

**Функциональность**:
- Навигация к Task Manager
- Модальное окно обновления профиля
- Placeholder для подключения Gmail
- Отображение версии приложения

**Примеры использования**:
```typescript
import { AppSidebar } from '@/components/app-sidebar';

<SidebarProvider>
  <AppSidebar />
  <main>{/* основной контент */}</main>
</SidebarProvider>
```

---

## 📝 Todo Management Компоненты

### Todo

**Описание**: Основной интерфейс списка задач с полным CRUD функционалом.

```typescript
export const Todo: FC = () => {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodo();
}
```

**CopilotKit Actions**:
```typescript
// Доступные действия для AI
const actions = [
  'ADD_TASK',           // Добавить основную задачу
  'ADD_SUBTASK',        // Добавить подзадачу
  'ADD_TASK_AND_SUBTASK', // Добавить задачу с подзадачей
  'DELETE_TASK',        // Удалить задачу
  'DELETE_SUBTASK',     // Удалить подзадачу
  'COMPLETE_TASK',      // Завершить задачу
  'COMPLETE_SUBTASK'    // Завершить подзадачу
];
```

**Интерфейсы**:
```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  subtasks: SubTask[];
  createdAt: Date;
  updatedAt: Date;
}

interface SubTask {
  id: string;
  text: string;
  completed: boolean;
  parentId: string;
}
```

**Особенности**:
- Иерархическая структура todo/subtask
- Accordion-стиль с развертываемыми элементами
- Keyboard shortcuts (Enter для добавления)
- Real-time синхронизация с CopilotKit

**Использование**:
```typescript
import { Todo } from '@/components/Todo';
import { TodoProvider } from '@/contexts/TodoContext';

<TodoProvider>
  <Todo />
</TodoProvider>
```

---

### VisualRepresentation

**Описание**: Визуализация задач на основе ReactFlow в виде интерактивного дерева.

```typescript
export const VisualRepresentation: FC = () => {
  const { todos } = useTodo();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
}
```

**Типы узлов**:
```typescript
const nodeTypes = {
  parentNode: ParentNode,  // Основные задачи
  childNode: ChildNode     // Подзадачи
};
```

**API функциональность**:
- Автоматическое позиционирование узлов
- Интерактивные клики для переключения завершения
- Метрики прогресса и трекинг
- Адаптивное масштабирование

**Примеры использования**:
```typescript
<VisualRepresentation />

// С кастомными стилями
<div className="h-96 w-full border rounded-lg">
  <VisualRepresentation />
</div>
```

---

### Nodes

**Описание**: Кастомные компоненты узлов для ReactFlow.

```typescript
// Компонент родительского узла
interface ParentNodeProps {
  data: Todo;
}

export const ParentNode: FC<ParentNodeProps> = ({ data }) => {
  const { toggleTodo } = useTodo();
  
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
      {/* UI элементы */}
    </div>
  );
};

// Компонент дочернего узла
interface ChildNodeProps {
  data: SubTask;
}

export const ChildNode: FC<ChildNodeProps> = ({ data }) => {
  // Аналогичная структура для подзадач
};
```

**Особенности**:
- Material-UI иконы для статусов
- Визуальные индикаторы завершения
- Hover effects и интерактивность
- Responsive дизайн

---

## 🔗 MCP Integration Компоненты

### MCPConfigModal

**Описание**: Интерфейс конфигурации для MCP серверов.

```typescript
interface MCPConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MCPConfigModal: FC<MCPConfigModalProps> = ({ isOpen, onClose }) => {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
}
```

**Функциональность**:
- Управление серверами (добавление/удаление)
- Выбор типа подключения (SSE/STDIO)
- Dashboard статистики серверов
- Внешние ссылки на директории MCP серверов

**API**:
```typescript
interface MCPServerConfig {
  id: string;
  name: string;
  transport: 'sse' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  enabled: boolean;
}
```

**Использование**:
```typescript
const [configOpen, setConfigOpen] = useState(false);

<MCPConfigModal 
  isOpen={configOpen} 
  onClose={() => setConfigOpen(false)} 
/>
```

---

### McpServerManager

**Описание**: Bridge компонент для настройки MCP серверов в CopilotKit контексте.

```typescript
interface McpServerManagerProps {
  configs: Config[];
}

export const McpServerManager: FC<McpServerManagerProps> = ({ configs }) => {
  // Устанавливает MCP серверы в CopilotKit
  return null; // Рендерит null
}
```

**Особенности**:
- Invisible компонент (null render)
- Мостик между конфигурацией и CopilotKit
- Автоматическая настройка серверов

---

### MCPToolCall

**Описание**: Визуальное представление выполнения MCP инструментов.

```typescript
interface ToolCallProps {
  status: "complete" | "inProgress" | "executing";
  name?: string;
  args?: any;
  result?: any;
}

export const MCPToolCall: FC<ToolCallProps> = ({ status, name, args, result }) => {
  // Визуализация статуса выполнения инструмента
}
```

**Статусы**:
- `complete` - Завершено успешно
- `inProgress` - В процессе выполнения
- `executing` - Выполняется

**UI элементы**:
- Цветовые индикаторы статуса
- Отображение ошибок
- Развертываемые детали (комментировано)

---

### ToolRenderer

**Описание**: Универсальный рендерер tool calls для CopilotKit.

```typescript
export const ToolRenderer: FC = () => {
  useCopilotAction({
    name: "*", // Wildcard - ловит все tool calls
    handler: ({ name, args }) => {
      // Обработка всех вызовов инструментов
    },
    render: ({ status, name, args, result }) => (
      <MCPToolCall 
        status={status} 
        name={name} 
        args={args} 
        result={result} 
      />
    ),
  });

  return null;
}
```

---

## 🧠 AI & Universal Hub Компоненты

### UniversalAIChatHub

**Описание**: Центральный компонент оркестрации AI с мульти-провайдерной интеграцией.

```typescript
interface UniversalAIChatHubProps {
  aiProviders?: AIProviderConfig[];
  mcpServers?: MCPServerConfig[];
  features?: {
    dynamicUI?: boolean;
    realTimeMonitoring?: boolean;
    autoFailover?: boolean;
  };
  onStatusChange?: (status: HubStatus) => void;
}

export const UniversalAIChatHub: FC<UniversalAIChatHubProps> = (props) => {
  // Централизованная AI логика
}
```

**CopilotKit Actions**:
```typescript
const actions = [
  'universal_ai_chat',    // Универсальный AI чат
  'execute_mcp_tool',     // Выполнение MCP инструментов
  'get_available_tools',  // Получение доступных инструментов
  'get_hub_status'        // Статус хаба
];
```

**Особенности**:
- Динамическая генерация UI
- Real-time мониторинг статуса
- Интеграция с несколькими AI провайдерами
- Автоматическое переключение при ошибках

---

### UniversalAIProvider

**Описание**: Context провайдер для Universal AI функциональности.

```typescript
interface UniversalAIProviderProps {
  children: ReactNode;
  config?: Partial<UniversalAIConfig>;
  showHub?: boolean;
  hubPosition?: 'top' | 'bottom' | 'floating';
}

export const UniversalAIProvider: FC<UniversalAIProviderProps> = ({
  children,
  config,
  showHub = false,
  hubPosition = 'bottom'
}) => {
  // Конфигурация и контекст
}
```

**Конфигурация**:
```typescript
interface UniversalAIConfig {
  providers: {
    openai?: { apiKey: string; model: string; };
    anthropic?: { apiKey: string; model: string; };
    google?: { apiKey: string; model: string; };
  };
  mcp: {
    servers: MCPServerConfig[];
    timeout: number;
    retryCount: number;
  };
  debug: {
    enabled: boolean;
    showMetrics: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

**Использование**:
```typescript
const config = {
  providers: {
    openai: { 
      apiKey: process.env.OPENAI_API_KEY!, 
      model: 'gpt-4' 
    }
  },
  debug: { enabled: true }
};

<UniversalAIProvider config={config} showHub={true}>
  <App />
</UniversalAIProvider>
```

---

### TaskMonitorDisplay

**Описание**: Продвинутый мониторинг задач с отслеживанием прогресса.

```typescript
interface TaskMonitorDisplayProps {
  showCompleted?: boolean;
  maxTasks?: number;
  refreshInterval?: number;
}

export const TaskMonitorDisplay: FC<TaskMonitorDisplayProps> = ({
  showCompleted = false,
  maxTasks = 10,
  refreshInterval = 1000
}) => {
  const [tasks, setTasks] = useState<TaskProgress[]>([]);
  const [stats, setStats] = useState<TaskStats>({});
}
```

**Интерфейсы**:
```typescript
interface TaskProgress {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  steps: TaskStep[];
  metadata?: Record<string, any>;
}

interface TaskStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  averageTime: number;
}
```

**Функциональность**:
- Real-time progress bars
- Dashboard статистики задач
- Просмотр логов и отмена
- Автоматическое обновление

**Использование**:
```typescript
// Только активные задачи
<TaskMonitorDisplay 
  showCompleted={false}
  maxTasks={5}
  refreshInterval={1000}
/>

// Полная история
<TaskMonitorDisplay 
  showCompleted={true}
  maxTasks={20}
  refreshInterval={2000}
/>
```

---

## 🎨 UI Foundation Компоненты

### Button

**Описание**: Многовариантная кнопка с CVA стилизацией.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    // Реализация кнопки
  }
);
```

**Варианты**:
- `default` - Основная кнопка
- `destructive` - Опасное действие
- `outline` - Контурная кнопка
- `secondary` - Вторичная кнопка
- `ghost` - Прозрачная кнопка
- `link` - Ссылка-кнопка

**Использование**:
```typescript
<Button variant="default" size="lg">
  Основная кнопка
</Button>

<Button variant="outline" size="sm">
  Контурная
</Button>

<Button variant="destructive">
  Удалить
</Button>
```

---

### Card

**Описание**: Набор компонентов для создания карточек.

```typescript
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )
);

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(/* ... */);
export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(/* ... */);
export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(/* ... */);
export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(/* ... */);
export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(/* ... */);
```

**Использование**:
```typescript
<Card>
  <CardHeader>
    <CardTitle>Заголовок карточки</CardTitle>
    <CardDescription>Описание содержимого</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Основное содержимое карточки</p>
  </CardContent>
  <CardFooter>
    <Button>Действие</Button>
  </CardFooter>
</Card>
```

---

### Dialog

**Описание**: Модальные окна и диалоги на основе Radix UI.

```typescript
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, ...props }, ref) => (
  // Реализация контента модального окна
));
```

**Компоненты**:
- `Dialog` - Корневой компонент
- `DialogTrigger` - Триггер открытия
- `DialogContent` - Содержимое
- `DialogHeader` - Заголовок
- `DialogTitle` - Заголовок диалога
- `DialogDescription` - Описание
- `DialogFooter` - Подвал

**Использование**:
```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Открыть диалог</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Редактировать профиль</DialogTitle>
      <DialogDescription>
        Внесите изменения в свой профиль здесь.
      </DialogDescription>
    </DialogHeader>
    {/* Содержимое формы */}
    <DialogFooter>
      <Button type="submit">Сохранить изменения</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## ⚙️ Utility Components

### Loader

**Описание**: Простой индикатор загрузки с текстовыми сообщениями.

```typescript
interface LoaderProps {
  texts: string[];
}

export const Loader: FC<LoaderProps> = React.memo(({ texts }) => {
  return (
    <div className="flex items-center space-x-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <div className="space-y-1">
        {texts.map((text, index) => (
          <p key={index} className="text-sm text-muted-foreground">
            {text}
          </p>
        ))}
      </div>
    </div>
  );
});
```

**Использование**:
```typescript
<Loader texts={["Загрузка данных...", "Это может занять некоторое время"]} />
```

---

### Skeletons

**Описание**: Коллекция skeleton компонентов для состояний загрузки.

```typescript
// Доступные скелеты
export const EmailSkeleton: FC = () => { /* ... */ };
export const EmailListSkeleton: FC = () => { /* ... */ };
export const ResearchPaperSkeleton: FC = () => { /* ... */ };
export const XKCDSkeleton: FC = () => { /* ... */ };
export const ChatSkeleton: FC = () => { /* ... */ };
export const GenericSkeleton: FC = () => { /* ... */ };
export const MapSkeleton: FC = () => { /* ... */ };
```

**Использование**:
```typescript
import { EmailSkeleton, ChatSkeleton } from '@/components/skeletons';

// В состоянии загрузки
{isLoading ? <EmailSkeleton /> : <EmailComponent />}
{chatLoading ? <ChatSkeleton /> : <ChatWindow />}
```

---

## 🔄 State Management Компоненты

### CoAgentsProvider

**Описание**: Провайдер состояния для agent-related функциональности.

```typescript
interface CoAgentsProviderProps {
  children: React.ReactNode;
}

// Типы агентов
interface TravelAgent {
  destination: string;
  budget: number;
  dates: DateRange;
}

interface ResearchAgent {
  topic: string;
  sources: string[];
  depth: 'basic' | 'intermediate' | 'advanced';
}

export const CoAgentsProvider: FC<CoAgentsProviderProps> = ({ children }) => {
  // Минимальная реализация
  return <>{children}</>;
}
```

---

### Storage

**Описание**: Альтернативное визуальное представление хранилища todo.

```typescript
export const Storage: FC = () => {
  const { todos } = useTodo();
  
  // ReactFlow-based storage visualization
  // Styled components с Emotion
}
```

**Особенности**:
- ReactFlow для визуализации
- Стилизованные компоненты с Emotion
- Альтернативный вид todo структуры

---

## 🔧 Best Practices

### 1. Именование компонентов
```typescript
// ✅ Хорошо - PascalCase для компонентов
export const TodoItem: FC<TodoItemProps> = ({ todo, onUpdate }) => {
  // ...
};

// ✅ Хорошо - camelCase для пропсов
interface TodoItemProps {
  todo: Todo;
  onUpdate: (todo: Todo) => void;
  className?: string;
}
```

### 2. Типизация
```typescript
// ✅ Хорошо - строгая типизация пропсов
interface ComponentProps {
  required: string;
  optional?: number;
  children?: React.ReactNode;
  className?: string;
}

// ✅ Хорошо - forwardRef для ref передачи
export const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ required, optional, children, className }, ref) => {
    return <div ref={ref} className={className}>{children}</div>;
  }
);
```

### 3. Performance
```typescript
// ✅ Хорошо - мемоизация для тяжелых компонентов
export const ExpensiveComponent: FC<Props> = React.memo(({ data }) => {
  const expensiveValue = useMemo(() => {
    return heavyCalculation(data);
  }, [data]);

  return <div>{expensiveValue}</div>;
});
```

### 4. Error Boundaries
```typescript
// ✅ Хорошо - обработка ошибок
<ErrorBoundary fallback={<ErrorFallback />}>
  <UniversalAIChatHub />
</ErrorBoundary>
```

### 5. Accessibility
```typescript
// ✅ Хорошо - ARIA атрибуты
<button 
  aria-label="Добавить новую задачу"
  aria-describedby="add-task-description"
  onClick={handleAdd}
>
  <PlusIcon />
</button>
```

---

## 📊 Архитектурные паттерны

### 1. Composition Pattern
```typescript
// Композиционный подход
<Card>
  <CardHeader>
    <CardTitle>Todo Management</CardTitle>
  </CardHeader>
  <CardContent>
    <Todo />
  </CardContent>
</Card>
```

### 2. Render Props
```typescript
// TaskMonitor с render prop
<TaskMonitor>
  {({ tasks, isLoading }) => (
    <div>
      {isLoading ? <Loader /> : <TaskList tasks={tasks} />}
    </div>
  )}
</TaskMonitor>
```

### 3. Context + Hooks
```typescript
// Контекстный паттерн
const { todos, addTodo } = useTodo(); // Хук использует TodoContext
```

### 4. Event-Driven Architecture
```typescript
// События через CopilotKit
useCopilotAction({
  name: "ADD_TASK",
  handler: ({ text }) => {
    addTodo(text);
    // Автоматическое обновление UI
  }
});
```

---

## 🚀 Примеры интеграции

### Полная интеграция с AI
```typescript
function MyApp() {
  return (
    <UniversalAIProvider 
      config={{
        providers: {
          openai: { apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' }
        },
        debug: { enabled: true }
      }}
      showHub={true}
    >
      <TodoProvider>
        <Canvas />
        <TaskMonitorDisplay showCompleted={true} />
      </TodoProvider>
    </UniversalAIProvider>
  );
}
```

### MCP Integration
```typescript
function McpIntegratedApp() {
  const [mcpConfigOpen, setMcpConfigOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setMcpConfigOpen(true)}>
        Configure MCP Servers
      </Button>
      
      <MCPConfigModal 
        isOpen={mcpConfigOpen}
        onClose={() => setMcpConfigOpen(false)}
      />
      
      <ToolRenderer />
    </>
  );
}
```

---

**🎯 Все компоненты готовы к использованию и полностью задокументированы!**

Эта документация покрывает все компоненты интерфейса Universal AI Chat Hub с подробными API reference, примерами использования и best practices для эффективной разработки.