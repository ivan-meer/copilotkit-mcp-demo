# 👨‍💻 Developer Guide - Universal AI Chat Hub

> **Полное руководство разработчика** для работы с Universal AI Chat Hub. От быстрого старта до advanced концепций.

## 📚 Содержание

1. [Быстрый старт](#-быстрый-старт)
2. [Архитектура проекта](#️-архитектура-проекта)
3. [Структура компонентов](#-структура-компонентов)
4. [Интеграция AI провайдеров](#-интеграция-ai-провайдеров)
5. [MCP серверы](#-mcp-серверы)
6. [Система мониторинга](#-система-мониторинга)
7. [Development Tools](#️-development-tools)
8. [Тестирование](#-тестирование)
9. [Deployment](#-deployment)
10. [Troubleshooting](#-troubleshooting)

## 🚀 Быстрый старт

### Предварительные требования

```bash
# Требования к системе
Node.js >= 18.0.0
npm >= 9.0.0
Git >= 2.0.0

# Проверка версий
node --version
npm --version
git --version
```

### Установка и запуск

```bash
# 1. Клонирование репозитория
git clone <repository-url>
cd universal-ai-chat-hub

# 2. Установка зависимостей
npm install

# 3. Настройка окружения
cp env.example .env.local

# 4. Проверка здоровья проекта
npm run health

# 5. Запуск в режиме разработки
npm run dev:smart
```

### Первый запуск

После успешного запуска:
- **Main App**: http://localhost:3001
- **CopilotKit Page**: http://localhost:3001/copilotkit

## 🏗️ Архитектура проекта

### Слоистая архитектура

```
📱 Presentation Layer (UI Components)
├── Canvas Interface
├── Chat Window  
├── Todo Management
├── Visual Representation
└── Configuration Modals

🧠 Business Logic Layer
├── AI Orchestrator
├── MCP Manager
├── Schema Generator
├── Task Monitor
└── Progress Logger

🔌 Integration Layer
├── AI Providers (OpenAI, Anthropic, Google)
├── MCP Transports (SSE, stdio, WebSocket, HTTP)
├── Universal Abstractions
└── Event System

💾 Data Layer
├── React Context (State)
├── Local Storage
├── Configuration
└── Cache Management
```

### Основные принципы

1. **Single Responsibility** - Каждый компонент имеет одну задачу
2. **Dependency Injection** - Слабая связанность компонентов
3. **Event-Driven** - Реактивная архитектура
4. **Type Safety** - 100% TypeScript coverage
5. **Testability** - Легкое unit/integration тестирование

## 🧩 Структура компонентов

### Основные компоненты

```
src/
├── components/           # React компоненты
│   ├── ui/              # Базовые UI компоненты
│   ├── canvas.tsx       # Главный интерфейс
│   ├── chat-window.tsx  # Чат интерфейс
│   ├── Todo.tsx         # Управление задачами
│   └── ...
├── lib/                 # Бизнес-логика
│   ├── ai-providers/    # AI интеграция
│   ├── mcp/            # MCP протокол
│   ├── monitoring/     # Система мониторинга
│   └── ui-generator/   # Динамическая генерация UI
├── contexts/           # React Context
├── hooks/              # Кастомные hooks
└── providers/          # Провайдеры
```

### Компонентная архитектура

```typescript
// Базовый интерфейс для всех компонентов
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

// Пример типизированного компонента
interface TodoItemProps extends BaseComponentProps {
  todo: Todo;
  onUpdate: (todo: Todo) => void;
  onDelete: (id: string) => void;
}

export const TodoItem: FC<TodoItemProps> = ({ 
  todo, 
  onUpdate, 
  onDelete, 
  className,
  testId 
}) => {
  // Реализация компонента
};
```

## 🤖 Интеграция AI провайдеров

### Добавление нового провайдера

```typescript
// 1. Определение типа провайдера
enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  YOUR_PROVIDER = 'your_provider' // Добавляем новый
}

// 2. Создание класса провайдера
class YourProviderImplementation extends BaseAIProvider {
  constructor() {
    super(AIProvider.YOUR_PROVIDER);
  }

  protected async initializeProvider(config: ProviderConfig): Promise<void> {
    // Инициализация вашего провайдера
    this.client = new YourProviderClient(config.apiKey);
  }

  protected async performCompletion(
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    // Реализация completion логики
    const response = await this.client.complete({
      messages: request.messages,
      temperature: request.temperature
    });

    return this.convertToUniversalFormat(response);
  }

  async getAvailableModels(): Promise<string[]> {
    // Возвращаем доступные модели
    return ['your-model-1', 'your-model-2'];
  }
}

// 3. Регистрация в фабрике
class ProviderFactory {
  static create(type: AIProvider): UniversalAIProvider {
    switch (type) {
      case AIProvider.YOUR_PROVIDER:
        return new YourProviderImplementation();
      // ... другие провайдеры
    }
  }
}
```

### Использование AI Orchestrator

```typescript
// Создание и настройка оркестратора
const orchestrator = new AIOrchestrator({
  strategy: LoadBalanceStrategy.HEALTH_BASED,
  fallbackStrategy: LoadBalanceStrategy.ROUND_ROBIN,
  timeout: 30000,
  retryCount: 3
});

// Добавление провайдеров
await orchestrator.addProvider({
  provider: AIProvider.OPENAI,
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  maxTokens: 4000,
  temperature: 0.7
});

await orchestrator.addProvider({
  provider: AIProvider.ANTHROPIC,
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-sonnet',
  maxTokens: 4000
});

// Использование
const response = await orchestrator.complete({
  messages: [
    {
      id: 'msg_1',
      role: MessageRole.USER,
      content: 'Hello, how can you help me?',
      timestamp: new Date()
    }
  ],
  temperature: 0.7,
  metadata: {
    preferredProvider: AIProvider.OPENAI // Опционально
  }
});
```

## 🔗 MCP серверы

### Создание MCP сервера

```typescript
// 1. Определение конфигурации сервера
const serverConfig: EnhancedMCPServerConfig = {
  id: 'my-custom-server',
  name: 'My Custom MCP Server',
  transport: MCPTransportType.HTTP,
  connection: {
    url: 'http://localhost:3002/mcp',
    headers: {
      'Authorization': 'Bearer your-token'
    }
  },
  enabled: true,
  autoReconnect: true,
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000
  },
  tools: [
    {
      name: 'custom_tool',
      description: 'My custom tool',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'First parameter' },
          param2: { type: 'number', description: 'Second parameter' }
        },
        required: ['param1']
      }
    }
  ]
};

// 2. Добавление сервера
const mcpManager = new EnhancedMCPManager();
await mcpManager.addServer(serverConfig);

// 3. Подключение
await mcpManager.connectServer('my-custom-server');

// 4. Использование инструментов
const result = await mcpManager.executeTool(
  'my-custom-server',
  'custom_tool',
  {
    param1: 'hello',
    param2: 42
  }
);
```

### Обработка событий MCP

```typescript
// Подписка на события
mcpManager.on('server:connected', (serverId: string) => {
  console.log(`Server ${serverId} connected`);
});

mcpManager.on('server:disconnected', (serverId: string) => {
  console.log(`Server ${serverId} disconnected`);
});

mcpManager.on('tool:execution_started', (context: ToolExecutionContext) => {
  console.log(`Tool ${context.toolName} started executing`);
});

mcpManager.on('tool:execution_completed', (context: ToolExecutionContext) => {
  console.log(`Tool ${context.toolName} completed`, context.result);
});

mcpManager.on('tool:execution_failed', (context: ToolExecutionContext) => {
  console.error(`Tool ${context.toolName} failed`, context.error);
});
```

## 📊 Система мониторинга

### Создание и отслеживание задач

```typescript
import { taskMonitor, TaskPriority } from '@/lib/monitoring/task-monitor';

// Создание задачи
const task = taskMonitor.createTask(
  'data-processing',
  'Data Processing Task',
  'Processing large dataset for analysis',
  [
    { name: 'Load Data', description: 'Loading data from source' },
    { name: 'Clean Data', description: 'Cleaning and validating data' },
    { name: 'Process Data', description: 'Running analysis algorithms' },
    { name: 'Save Results', description: 'Saving processed results' }
  ],
  {
    priority: TaskPriority.HIGH,
    timeout: 300000, // 5 minutes
    onProgress: (progress) => {
      console.log(`Task progress: ${progress.progress}%`);
    },
    onComplete: (progress) => {
      console.log('Task completed successfully!', progress);
    },
    onError: (error, progress) => {
      console.error('Task failed:', error, progress);
    }
  }
);

// Запуск задачи
await taskMonitor.startTask('data-processing');

// Обновление прогресса шагов
taskMonitor.updateStepProgress('data-processing', 0, 50); // Step 0, 50% complete
taskMonitor.updateStepProgress('data-processing', 0, 100, TaskStatus.COMPLETED);

// Переход к следующему шагу
taskMonitor.updateStepProgress('data-processing', 1, 0, TaskStatus.RUNNING);
```

### Использование Progress Logger

```typescript
import { progressLogger } from '@/lib/monitoring/progress-logger';

// Настройка уровня логирования
progressLogger.setLogLevel('debug');

// Логирование различных уровней
progressLogger.log('info', 'Starting data processing');
progressLogger.log('debug', 'Loading configuration', { config: myConfig });
progressLogger.log('warn', 'Using fallback provider');
progressLogger.log('error', 'Failed to connect to service', { error: errorObject });

// Логирование прогресса задач (автоматически при использовании TaskMonitor)
const tasks = taskMonitor.getAllTasks();
progressLogger.logTaskReport(tasks);
```

### React компонент мониторинга

```typescript
import { TaskMonitorDisplay } from '@/components/TaskMonitorDisplay';

// Использование в компоненте
export const MyComponent: FC = () => {
  return (
    <div>
      <h1>My Application</h1>
      
      {/* Отображение активных задач */}
      <TaskMonitorDisplay
        showCompleted={false}
        maxTasks={5}
        refreshInterval={1000}
      />
      
      {/* Отображение всех задач включая завершенные */}
      <TaskMonitorDisplay
        showCompleted={true}
        maxTasks={20}
        refreshInterval={2000}
      />
    </div>
  );
};
```

## 🛠️ Development Tools

### Использование automation скриптов

```bash
# Полный аудит проекта
node scripts/audit.js

# Проверка здоровья
node scripts/health-check.js

# Управление портами
node scripts/port-manager.js status
node scripts/port-manager.js free 3000 --force
node scripts/port-manager.js find 3000 3100

# Исправление кавычек
node scripts/fix-quotes.js

# Краткий обзор
node scripts/summary.js

# Умный запуск разработки
node scripts/dev.js
```

### Кастомизация dev скрипта

```javascript
// scripts/dev.js - настройка
const DevRunner = require('./dev.js').DevRunner;

const customConfig = {
  port: 3000,
  healthCheckInterval: 30000,
  enableHealthMonitor: true,
  enablePortManagement: true,
  logLevel: 'debug'
};

const runner = new DevRunner(customConfig);
runner.run();
```

## 🧪 Тестирование

### Unit тестирование

```typescript
// __tests__/components/TodoItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TodoItem } from '@/components/Todo';

describe('TodoItem', () => {
  const mockTodo = {
    id: '1',
    text: 'Test todo',
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it('renders todo text correctly', () => {
    const mockOnUpdate = jest.fn();
    const mockOnDelete = jest.fn();

    render(
      <TodoItem 
        todo={mockTodo} 
        onUpdate={mockOnUpdate} 
        onDelete={mockOnDelete} 
      />
    );

    expect(screen.getByText('Test todo')).toBeInTheDocument();
  });

  it('calls onUpdate when checkbox is clicked', () => {
    const mockOnUpdate = jest.fn();
    const mockOnDelete = jest.fn();

    render(
      <TodoItem 
        todo={mockTodo} 
        onUpdate={mockOnUpdate} 
        onDelete={mockOnDelete} 
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      ...mockTodo,
      completed: true
    });
  });
});
```

### Integration тестирование

```typescript
// __tests__/integration/ai-orchestrator.test.ts
import { AIOrchestrator } from '@/lib/ai-providers/ai-orchestrator';
import { AIProvider } from '@/lib/ai-providers/types';

describe('AIOrchestrator Integration', () => {
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    orchestrator = new AIOrchestrator();
  });

  it('should complete request with fallback', async () => {
    // Mock failing primary provider
    const mockFailingProvider = {
      complete: jest.fn().mockRejectedValue(new Error('API Error')),
      healthCheck: jest.fn().mockResolvedValue({ status: 'unhealthy' })
    };

    // Mock working fallback provider
    const mockWorkingProvider = {
      complete: jest.fn().mockResolvedValue({
        message: { content: 'Test response' }
      }),
      healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
    };

    orchestrator.providers.set(AIProvider.OPENAI, mockFailingProvider);
    orchestrator.providers.set(AIProvider.ANTHROPIC, mockWorkingProvider);

    const response = await orchestrator.complete({
      messages: [{ role: 'user', content: 'test' }]
    });

    expect(response.message.content).toBe('Test response');
    expect(mockFailingProvider.complete).toHaveBeenCalled();
    expect(mockWorkingProvider.complete).toHaveBeenCalled();
  });
});
```

### E2E тестирование

```typescript
// __tests__/e2e/app.spec.ts
import { test, expect } from '@playwright/test';

test('should load main application', async ({ page }) => {
  await page.goto('http://localhost:3001');
  
  // Check main components are loaded
  await expect(page.locator('[data-testid="chat-window"]')).toBeVisible();
  await expect(page.locator('[data-testid="todo-list"]')).toBeVisible();
  await expect(page.locator('[data-testid="canvas"]')).toBeVisible();
});

test('should add new todo', async ({ page }) => {
  await page.goto('http://localhost:3001');
  
  // Add new todo
  await page.fill('[data-testid="todo-input"]', 'Test todo item');
  await page.click('[data-testid="add-todo-button"]');
  
  // Verify todo appears
  await expect(page.locator('text=Test todo item')).toBeVisible();
});
```

## 🚀 Deployment

### Production сборка

```bash
# 1. Проверка перед сборкой
npm run health
npm run type-check
npm run lint

# 2. Сборка
npm run build

# 3. Тестирование production сборки
npm run start

# 4. Проверка размера бандла
npm run analyze
```

### Docker deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Сборка и запуск
npm run docker:build
npm run docker:run
```

### Environment переменные

```bash
# Production .env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key

# MCP Configuration
MCP_SERVER_TIMEOUT=30000
MCP_RETRY_COUNT=3

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

## 🔧 Troubleshooting

### Частые проблемы

1. **TypeScript ошибки компиляции**
   ```bash
   # Исправление кавычек
   node scripts/fix-quotes.js
   
   # Проверка
   npm run type-check
   ```

2. **Port уже занят**
   ```bash
   # Освобождение порта
   npm run port:free 3000 --force
   
   # Поиск свободного порта
   npm run port:find
   ```

3. **CopilotKit совместимость**
   ```bash
   # Проверка версий
   npm list @copilotkit/react-core @copilotkit/react-ui
   
   # Обновление до совместимых версий
   npm install @copilotkit/react-core@^1.8.9 @copilotkit/react-ui@^1.8.9
   ```

4. **Проблемы с зависимостями**
   ```bash
   # Очистка и переустановка
   npm run clean
   rm -rf node_modules package-lock.json
   npm install
   ```

### Debugging

```typescript
// Включение debug режима
const config = {
  debug: {
    enabled: true,
    showMetrics: true,
    logLevel: 'debug'
  }
};

// Использование с UniversalAIProvider
<UniversalAIProvider config={config}>
  {/* Ваше приложение */}
</UniversalAIProvider>
```

### Логирование

```typescript
// Настройка логирования
import { progressLogger } from '@/lib/monitoring/progress-logger';

// В development
progressLogger.setLogLevel('debug');

// В production
progressLogger.setLogLevel('info');
```

## 📞 Поддержка

### Полезные команды

```bash
# Комплексная диагностика
npm run health

# Полный аудит
node scripts/audit.js --save-report

# Очистка проекта
npm run clean

# Перезапуск с очисткой
npm run restart:clean
```

### Получение помощи

1. **Документация**: Проверьте `docs/` директорию
2. **Примеры**: Изучите компоненты в `src/components/`
3. **Issues**: Создайте issue в репозитории
4. **Health Check**: Запустите `npm run health` для диагностики

---

**Успешной разработки! 🚀**