# 🔧 MCP STDIO & Server Details Guide

> **Полное руководство** по работе с MCP серверами через STDIO протокол и использованию детального просмотра серверов.

## 🚀 Новые возможности

### ✅ Что реализовано

1. **📡 Полная поддержка STDIO транспорта**
   - Реальная интеграция с процессами
   - JSON-RPC коммуникация
   - Автоматический handshake
   - Error handling и reconnection

2. **👁️ Детальный просмотр серверов**
   - Полная информация о сервере
   - Инструменты с примерами выполнения
   - Ресурсы и их метаданные
   - Промпты с аргументами
   - Метрики производительности
   - Логи ошибок

3. **🔄 Улучшенное управление**
   - Переключение между SSE и STDIO
   - Визуальные индикаторы транспорта
   - Кнопки подключения/отключения
   - Real-time статусы

## 📊 Обзор транспортов

### STDIO (Standard Input/Output)
```
┌─────────────────┐    JSON-RPC     ┌─────────────────┐
│   Client App    │ ──────────────► │   MCP Server    │
│                 │                 │   (Process)     │
│  (Your App)     │ ◄────────────── │                 │
└─────────────────┘    stdin/out    └─────────────────┘
```

**Преимущества:**
- ✅ Прямая интеграция с процессами
- ✅ Низкая задержка
- ✅ Полный контроль жизненного цикла
- ✅ Поддержка environment variables

**Недостатки:**
- ❌ Требует запуска процесса
- ❌ Может быть ресурсоемко
- ❌ Сложнее в debugging

### SSE (Server-Sent Events)
```
┌─────────────────┐      HTTP       ┌─────────────────┐
│   Client App    │ ──────────────► │   HTTP Server   │
│                 │                 │                 │
│  (Your App)     │ ◄────────────── │   (Express)     │
└─────────────────┘   EventSource   └─────────────────┘
```

**Преимущества:**
- ✅ Web-based
- ✅ Простая отладка
- ✅ Масштабируемость
- ✅ Стандартный HTTP

**Недостатки:**
- ❌ Требует HTTP сервер
- ❌ Больше overhead
- ❌ Сложнее с authentication

## 🔧 Использование STDIO серверов

### Шаг 1: Добавление сервера

1. Откройте **MCP Configuration Modal**
2. Перейдите на вкладку **"MCP Servers"**
3. Нажмите **"Add Server"**
4. Выберите **"STDIO"** в Connection Type

### Шаг 2: Конфигурация

```typescript
// Пример конфигурации STDIO сервера
{
  serverName: "My Custom Server",
  connectionType: "stdio",
  command: "python",
  args: ["-m", "my_mcp_server"],
  env: {
    "API_KEY": "your-api-key",
    "DEBUG": "true"
  }
}
```

### Шаг 3: Подключение

После сохранения сервер автоматически:
1. **Spawns process** с указанной командой
2. **Устанавливает stdin/stdout** коммуникацию
3. **Выполняет handshake** по JSON-RPC
4. **Обнаруживает capabilities** (tools, resources, prompts)

## 👁️ Детальный просмотр серверов

### Открытие деталей

1. В списке MCP серверов нажмите **"Details"**
2. Откроется модальное окно с 6 вкладками:

#### 📋 Overview
- Информация о сервере
- Детали подключения
- Capabilities и статус

#### 🛠️ Tools
- Список всех инструментов
- Input schemas с валидацией
- Примеры выполнения
- Интерактивное тестирование

#### 📄 Resources
- Доступные ресурсы
- Метаданные (размер, тип, изменение)
- URI и annotations

#### 💬 Prompts
- Системные промпты
- Аргументы и типы
- Примеры использования

#### 📊 Metrics
- Статистика производительности
- Uptime и response time
- Success rate
- Breakdown по capabilities

#### 📝 Logs
- История ошибок
- Timestamp и контекст
- Stack traces для debugging

## 🔧 Работа с инструментами

### Интерактивное выполнение

В деталях сервера на вкладке **Tools**:

1. **Разверните инструмент** для просмотра schema
2. **Найдите пример** использования
3. **Нажмите "Execute"** для тестирования
4. **Просмотрите результат** в реальном времени

```typescript
// Пример выполнения filesystem tool
{
  tool: "list_directory",
  input: {
    path: "/home/user/documents"
  },
  output: {
    files: ["file1.txt", "file2.md"],
    directories: ["folder1", "folder2"]
  }
}
```

### Автоматическое выполнение

Инструменты также интегрированы с CopilotKit:

```typescript
// AI может автоматически вызывать tools
const response = await copilot.chat("List files in my documents folder");
// Автоматически вызовет filesystem.list_directory
```

## 🚀 Практические примеры

### 1. Filesystem Server

**Конфигурация:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"],
  "transport": "stdio"
}
```

**Возможности:**
- ✅ Чтение файлов
- ✅ Список директорий
- ✅ Поиск файлов
- ✅ Создание/удаление

### 2. GitHub Server

**Конфигурация:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxx"
  },
  "transport": "stdio"
}
```

**Возможности:**
- ✅ Создание репозиториев
- ✅ Issues и PR
- ✅ File operations
- ✅ Search

### 3. Database Server (Custom)

**Конфигурация:**
```json
{
  "command": "python",
  "args": ["mcp_servers/database_server.py"],
  "env": {
    "DATABASE_URL": "postgresql://localhost/mydb"
  },
  "transport": "stdio"
}
```

**Возможности:**
- ✅ SQL queries
- ✅ Schema inspection
- ✅ Data export
- ✅ Migrations

## 🔍 Debugging и troubleshooting

### Общие проблемы

#### 1. Process не запускается
```bash
# Проверьте команду вручную
npx -y @modelcontextprotocol/server-filesystem /path

# Проверьте права доступа
chmod +x mcp_servers/my_server.py
```

#### 2. JSON-RPC ошибки
```typescript
// Включите debug logging
const config = {
  debug: true,
  logLevel: 'debug'
};
```

#### 3. Environment variables
```typescript
// Убедитесь что env переменные установлены
console.log(process.env.API_KEY);
```

### Логирование

Все ошибки автоматически:
- 📝 Записываются в Logs tab
- 🕐 Содержат timestamp
- 📋 Включают stack trace
- 🔄 Доступны для копирования

## 🎯 Best Practices

### 1. Безопасность
```typescript
// ❌ Не включайте secrets в args
args: ["--api-key", "secret123"]

// ✅ Используйте environment variables
env: {
  "API_KEY": process.env.MY_API_KEY
}
```

### 2. Performance
```typescript
// ✅ Включите health checks
healthCheck: {
  enabled: true,
  interval: 30000
}

// ✅ Настройте timeout
timeout: 60000
```

### 3. Reliability
```typescript
// ✅ Включите auto-reconnect
autoReconnect: true

// ✅ Используйте error handling
try {
  const result = await executeTool(serverId, toolName, args);
} catch (error) {
  console.error('Tool execution failed:', error);
}
```

## 📚 API Reference

### EnhancedMCPManager

```typescript
class EnhancedMCPManager {
  // Добавление сервера
  async addServer(config: EnhancedMCPServerConfig): Promise<void>
  
  // Подключение
  async connectServer(serverId: string): Promise<void>
  
  // Выполнение инструмента
  async executeTool(serverId: string, toolName: string, args: any): Promise<any>
  
  // Получение информации
  getServerStatus(serverId: string): MCPServerConnection
  getAllTools(): EnhancedMCPTool[]
  getServerResources(serverId: string): MCPResource[]
}
```

### Events

```typescript
manager.on('server:connected', (serverId) => {
  console.log(`Server ${serverId} connected`);
});

manager.on('tool:execution_completed', (context) => {
  console.log('Tool completed:', context.result);
});

manager.on('server:error', (serverId, error) => {
  console.error(`Server ${serverId} error:`, error);
});
```

## 🚀 Что дальше?

### Запланированные улучшения

1. **🔐 Authentication**
   - OAuth integration
   - API key management
   - Role-based access

2. **📊 Advanced Monitoring**
   - Performance graphs
   - Alert system
   - Health dashboards

3. **🔧 Developer Tools**
   - MCP server generator
   - Testing framework
   - Documentation generator

4. **🌐 Network Features**
   - WebSocket transport
   - HTTP transport
   - Load balancing

---

**🎯 Готово! Теперь у вас есть полная поддержка STDIO протокола и детальный просмотр всех аспектов MCP серверов.**

**Попробуйте:**
1. Добавить STDIO сервер
2. Подключиться к нему
3. Открыть детали сервера
4. Протестировать инструменты
5. Изучить метрики