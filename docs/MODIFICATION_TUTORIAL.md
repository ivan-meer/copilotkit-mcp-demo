# 🛠️ Modification Tutorial - Universal AI Chat Hub

> **Полное руководство по модификации приложения**: добавление новых агентов, компонентов, изменение дизайна и логики.

## 📚 Содержание

1. [🚀 Быстрый старт модификации](#-быстрый-старт-модификации)
2. [🤖 Добавление новых AI агентов](#-добавление-новых-ai-агентов)
3. [🧩 Создание новых компонентов](#-создание-новых-компонентов)
4. [🎨 Изменение дизайна и стилей](#-изменение-дизайна-и-стилей)
5. [🔗 Интеграция MCP серверов](#-интеграция-mcp-серверов)
6. [⚙️ Модификация бизнес-логики](#️-модификация-бизнес-логики)
7. [🔄 Добавление новых состояний](#-добавление-новых-состояний)
8. [🎯 Best Practices и примеры](#-best-practices-и-примеры)

---

## 🚀 Быстрый старт модификации

### Структура проекта для модификации

```
src/
├── components/           # Компоненты UI
│   ├── ui/              # Базовые UI компоненты
│   ├── [new-component]/ # Ваши новые компоненты
├── lib/                 # Бизнес-логика
│   ├── ai-providers/    # AI интеграция
│   ├── mcp/            # MCP протокол  
│   ├── [new-feature]/  # Ваша новая функциональность
├── contexts/           # React Context
├── hooks/              # Кастомные hooks
└── providers/          # Провайдеры
```

### Пошаговый процесс модификации

1. **Определите цель** - Что вы хотите добавить/изменить?
2. **Найдите точку интеграции** - Где лучше всего добавить функциональность?
3. **Создайте компоненты** - Реализуйте UI части
4. **Добавьте логику** - Подключите бизнес-логику
5. **Интегрируйте** - Подключите к основному приложению
6. **Тестируйте** - Проверьте работоспособность

---

## 🤖 Добавление новых AI агентов

### Создание нового AI агента

#### Шаг 1: Определение типа агента

```typescript
// src/lib/agents/weather-agent.ts

export interface WeatherAgentState {
  location: string;
  forecast: WeatherData[];
  preferences: {
    units: 'celsius' | 'fahrenheit';
    language: string;
  };
}

export interface WeatherData {
  date: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}
```

#### Шаг 2: Создание агента

```typescript
// src/lib/agents/weather-agent.ts

import { useCoAgent } from '@copilotkit/react-core';
import { useState } from 'react';

export class WeatherAgent {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getForecast(location: string, days: number = 5): Promise<WeatherData[]> {
    // Интеграция с weather API
    const response = await fetch(`https://api.weather.com/forecast`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
      method: 'POST',
      body: JSON.stringify({ location, days })
    });
    
    return response.json();
  }

  formatForecast(data: WeatherData[]): string {
    return data.map(day => 
      `${day.date}: ${day.temperature}°, ${day.condition}`
    ).join('\n');
  }
}

// Hook для использования в компонентах
export function useWeatherAgent(apiKey: string) {
  const [agent] = useState(() => new WeatherAgent(apiKey));
  
  const { state, setState } = useCoAgent<WeatherAgentState>({
    name: "weather_agent",
    initialState: {
      location: "",
      forecast: [],
      preferences: {
        units: 'celsius',
        language: 'en'
      }
    }
  });

  const updateLocation = async (location: string) => {
    setState({ ...state, location });
    const forecast = await agent.getForecast(location);
    setState({ ...state, location, forecast });
  };

  return {
    state,
    updateLocation,
    agent
  };
}
```

#### Шаг 3: Создание компонента агента

```typescript
// src/components/WeatherAgent.tsx

import { FC } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';
import { useWeatherAgent } from '@/lib/agents/weather-agent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cloud, Sun, MapPin } from 'lucide-react';

interface WeatherAgentProps {
  apiKey: string;
  className?: string;
}

export const WeatherAgent: FC<WeatherAgentProps> = ({ apiKey, className }) => {
  const { state, updateLocation, agent } = useWeatherAgent(apiKey);

  // CopilotKit действия для AI
  useCopilotAction({
    name: "get_weather_forecast",
    description: "Get weather forecast for a specific location",
    parameters: [
      {
        name: "location",
        type: "string",
        description: "City name or coordinates",
        required: true
      },
      {
        name: "days",
        type: "number", 
        description: "Number of days for forecast (1-7)",
        required: false
      }
    ],
    handler: async ({ location, days = 5 }) => {
      await updateLocation(location);
      return `Weather forecast for ${location} retrieved successfully`;
    }
  });

  useCopilotAction({
    name: "set_weather_preferences",
    description: "Set weather display preferences",
    parameters: [
      {
        name: "units",
        type: "string",
        description: "Temperature units: celsius or fahrenheit"
      },
      {
        name: "language", 
        type: "string",
        description: "Display language"
      }
    ],
    handler: ({ units, language }) => {
      setState({
        ...state,
        preferences: { 
          units: units as 'celsius' | 'fahrenheit', 
          language 
        }
      });
      return "Weather preferences updated";
    }
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Weather Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter location..."
            value={state.location}
            onChange={(e) => updateLocation(e.target.value)}
          />
          <Button size="sm">
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        {/* Forecast display */}
        {state.forecast.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">5-Day Forecast</h3>
            {state.forecast.map((day, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{day.date}</span>
                <div className="flex items-center gap-2">
                  {day.condition.includes('sun') ? <Sun className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                  <span>{day.temperature}°{state.preferences.units === 'celsius' ? 'C' : 'F'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

#### Шаг 4: Интеграция в основное приложение

```typescript
// src/components/canvas.tsx

import { WeatherAgent } from '@/components/WeatherAgent';

export const Canvas: FC = () => {
  return (
    <div className="h-screen flex bg-gray-50">
      {/* Существующий контент */}
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/2 border-r border-gray-200">
          <ChatWindow />
        </div>
        <div className="w-full lg:w-1/2 p-4 space-y-4">
          <VisualRepresentation />
          
          {/* Новый Weather Agent */}
          <WeatherAgent 
            apiKey={process.env.NEXT_PUBLIC_WEATHER_API_KEY!}
            className="mt-4"
          />
        </div>
      </div>
    </div>
  );
};
```

---

## 🧩 Создание новых компонентов

### Создание компонента уведомлений

#### Шаг 1: Определение интерфейса

```typescript
// src/lib/types/notifications.ts

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // ms
  actions?: NotificationAction[];
  createdAt: Date;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}
```

#### Шаг 2: Создание контекста

```typescript
// src/contexts/NotificationContext.tsx

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Notification, NotificationType } from '@/lib/types/notifications';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'createdAt'>
  ): string => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Convenience hook for common notification types
export function useNotify() {
  const { addNotification } = useNotifications();

  return {
    success: (title: string, message: string) => 
      addNotification({ type: 'success', title, message }),
    error: (title: string, message: string) => 
      addNotification({ type: 'error', title, message, duration: 0 }),
    warning: (title: string, message: string) => 
      addNotification({ type: 'warning', title, message }),
    info: (title: string, message: string) => 
      addNotification({ type: 'info', title, message })
  };
}
```

#### Шаг 3: Компонент отображения

```typescript
// src/components/NotificationCenter.tsx

import { FC } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
};

export const NotificationCenter: FC = () => {
  const { notifications, removeNotification, clearAll } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            className="mb-2"
          >
            Clear All
          </Button>
        </div>
      )}
      
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type];
        const colorClass = colorMap[notification.type];
        
        return (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border shadow-lg ${colorClass} animate-in slide-in-from-right`}
          >
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                <p className="text-sm mt-1 opacity-90">{notification.message}</p>
                
                {notification.actions && (
                  <div className="flex gap-2 mt-3">
                    {notification.actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.variant === 'primary' ? 'default' : 'outline'}
                        onClick={() => {
                          action.action();
                          removeNotification(notification.id);
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

#### Шаг 4: Интеграция в приложение

```typescript
// src/app/layout.tsx или src/providers/Providers.tsx

import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationCenter } from '@/components/NotificationCenter';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          {children}
          <NotificationCenter />
        </NotificationProvider>
      </body>
    </html>
  );
}
```

#### Шаг 5: Использование в компонентах

```typescript
// В любом компоненте
import { useNotify } from '@/contexts/NotificationContext';

export const MyComponent: FC = () => {
  const notify = useNotify();

  const handleSuccess = () => {
    notify.success('Task Completed', 'Your task has been completed successfully!');
  };

  const handleError = () => {
    notify.error('Error Occurred', 'Something went wrong. Please try again.');
  };

  return (
    <div>
      <Button onClick={handleSuccess}>Success Notification</Button>
      <Button onClick={handleError}>Error Notification</Button>
    </div>
  );
};
```

---

## 🎨 Изменение дизайна и стилей

### Кастомизация темы

#### Шаг 1: Создание системы тем

```typescript
// src/lib/theme/types.ts

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  spacing: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
  };
}
```

#### Шаг 2: Конфигурация тем

```typescript
// src/lib/theme/themes.ts

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#10b981',
    background: '#ffffff',
    foreground: '#1f2937',
    muted: '#f8fafc',
    border: '#e2e8f0'
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    }
  }
};

export const darkTheme: Theme = {
  ...lightTheme,
  mode: 'dark',
  colors: {
    primary: '#60a5fa',
    secondary: '#94a3b8',
    accent: '#34d399',
    background: '#0f172a',
    foreground: '#f1f5f9',
    muted: '#1e293b',
    border: '#334155'
  }
};

export const themes = {
  light: lightTheme,
  dark: darkTheme
};
```

#### Шаг 3: Контекст темы

```typescript
// src/contexts/ThemeContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeMode, themes } from '@/lib/theme/themes';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('theme-mode') as ThemeMode;
    if (saved) setMode(saved);
  }, []);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('theme-mode', mode);

    // Resolve system theme
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedMode(mediaQuery.matches ? 'dark' : 'light');
      
      const handler = (e: MediaQueryListEvent) => {
        setResolvedMode(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setResolvedMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    // Apply theme CSS variables
    const theme = themes[resolvedMode];
    const root = document.documentElement;
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
    
    root.style.setProperty('--font-family', theme.typography.fontFamily);
    
    // Update data attribute for CSS selectors
    root.setAttribute('data-theme', resolvedMode);
  }, [resolvedMode]);

  const toggleMode = () => {
    setMode(current => current === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{
      theme: themes[resolvedMode],
      mode,
      setMode,
      toggleMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

#### Шаг 4: Компонент переключения темы

```typescript
// src/components/ThemeToggle.tsx

import { FC } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: FC = () => {
  const { mode, setMode } = useTheme();

  const modes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' }
  ];

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {modes.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={mode === value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode(value as any)}
          className="gap-2"
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
};
```

#### Шаг 5: Обновление CSS

```css
/* src/app/globals.css */

:root {
  /* CSS variables будут установлены через JavaScript */
}

/* Themed components */
.theme-card {
  background-color: var(--color-background);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}

.theme-button {
  background-color: var(--color-primary);
  color: var(--color-background);
  padding: var(--spacing-md);
  font-size: var(--font-size-base);
  font-family: var(--font-family);
}

/* Dark mode specific styles */
[data-theme="dark"] .custom-shadow {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

[data-theme="light"] .custom-shadow {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

---

## 🔗 Интеграция MCP серверов

### Добавление нового MCP сервера

#### Шаг 1: Определение конфигурации

```typescript
// src/lib/mcp-config-types.ts - дополнение

export const CUSTOM_MCP_SERVERS: Record<string, ServerConfig> = {
  "custom-database": {
    command: "node",
    args: ["./mcp-servers/database-server.js"],
    transport: "stdio",
    env: {
      "DATABASE_URL": process.env.DATABASE_URL,
      "API_KEY": process.env.DB_API_KEY
    },
    autoApprove: ["query_database", "get_schema"],
    disabled: false,
    timeout: 30
  },
  "pdf-processor": {
    command: "python",
    args: ["./mcp-servers/pdf-processor.py"],
    transport: "stdio",
    autoApprove: ["extract_text", "analyze_document"],
    disabled: false,
    timeout: 60
  }
};
```

#### Шаг 2: Создание MCP сервера

```javascript
// mcp-servers/database-server.js

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const mysql = require('mysql2/promise');

class DatabaseMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "database-server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.connection = null;
    this.setupTools();
  }

  async setupTools() {
    // Database connection tool
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: "query_database",
            description: "Execute SQL queries on the database",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "SQL query to execute"
                },
                params: {
                  type: "array",
                  description: "Query parameters",
                  items: { type: "string" }
                }
              },
              required: ["query"]
            }
          },
          {
            name: "get_schema",
            description: "Get database schema information",
            inputSchema: {
              type: "object",
              properties: {
                table: {
                  type: "string",
                  description: "Specific table name (optional)"
                }
              }
            }
          }
        ]
      };
    });

    // Tool execution
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "query_database":
          return await this.queryDatabase(args.query, args.params);
        case "get_schema":
          return await this.getSchema(args.table);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async queryDatabase(query, params = []) {
    try {
      if (!this.connection) {
        this.connection = await mysql.createConnection(process.env.DATABASE_URL);
      }

      const [rows] = await this.connection.execute(query, params);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Database error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async getSchema(tableName) {
    try {
      if (!this.connection) {
        this.connection = await mysql.createConnection(process.env.DATABASE_URL);
      }

      let query = "SHOW TABLES";
      if (tableName) {
        query = `DESCRIBE ${tableName}`;
      }

      const [rows] = await this.connection.execute(query);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Schema error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Start server
const server = new DatabaseMCPServer();
server.run().catch(console.error);
```

#### Шаг 3: Интеграция в UI

```typescript
// src/components/DatabaseQueryPanel.tsx

import { FC, useState } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Database, Play } from 'lucide-react';

export const DatabaseQueryPanel: FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // CopilotKit действие для AI
  useCopilotAction({
    name: "execute_database_query",
    description: "Execute a SQL query on the connected database",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "SQL query to execute",
        required: true
      }
    ],
    handler: async ({ query }) => {
      setIsLoading(true);
      try {
        // Это будет выполнено через MCP сервер
        const response = await fetch('/api/mcp/execute-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            server: 'custom-database',
            tool: 'query_database',
            args: { query }
          })
        });
        
        const data = await response.json();
        setResult(data.result);
        setQuery(query);
        return `Query executed successfully. ${data.result.length} rows returned.`;
      } catch (error) {
        setResult(`Error: ${error.message}`);
        return `Query failed: ${error.message}`;
      } finally {
        setIsLoading(false);
      }
    }
  });

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    // Execute through MCP
    // Implementation similar to CopilotKit action
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Query Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">SQL Query</label>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SELECT * FROM users WHERE active = 1;"
            rows={4}
          />
        </div>
        
        <Button
          onClick={executeQuery}
          disabled={!query.trim() || isLoading}
          className="w-full"
        >
          <Play className="h-4 w-4 mr-2" />
          {isLoading ? 'Executing...' : 'Execute Query'}
        </Button>

        {result && (
          <div>
            <label className="block text-sm font-medium mb-2">Result</label>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-60">
              {result}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## ⚙️ Модификация бизнес-логики

### Создание нового модуля бизнес-логики

#### Шаг 1: Архитектура модуля

```typescript
// src/lib/analytics/types.ts

export interface AnalyticsEvent {
  id: string;
  name: string;
  timestamp: Date;
  userId?: string;
  properties: Record<string, any>;
  context: AnalyticsContext;
}

export interface AnalyticsContext {
  page: string;
  userAgent: string;
  sessionId: string;
  source: string;
}

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): Promise<void>;
  identify(userId: string, traits: Record<string, any>): Promise<void>;
  page(name: string, properties?: Record<string, any>): Promise<void>;
}
```

#### Шаг 2: Реализация провайдеров

```typescript
// src/lib/analytics/providers/google-analytics.ts

export class GoogleAnalyticsProvider implements AnalyticsProvider {
  private trackingId: string;
  private gtag: any;

  constructor(trackingId: string) {
    this.trackingId = trackingId;
    this.initializeGtag();
  }

  private initializeGtag() {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.trackingId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    this.gtag = function() {
      window.dataLayer.push(arguments);
    };
    
    this.gtag('js', new Date());
    this.gtag('config', this.trackingId);
  }

  async track(event: AnalyticsEvent): Promise<void> {
    this.gtag('event', event.name, {
      event_category: event.properties.category || 'general',
      event_label: event.properties.label,
      value: event.properties.value,
      custom_map: event.properties
    });
  }

  async identify(userId: string, traits: Record<string, any>): Promise<void> {
    this.gtag('config', this.trackingId, {
      user_id: userId,
      custom_map: traits
    });
  }

  async page(name: string, properties?: Record<string, any>): Promise<void> {
    this.gtag('config', this.trackingId, {
      page_title: name,
      page_location: window.location.href,
      ...properties
    });
  }
}
```

#### Шаг 3: Менеджер аналитики

```typescript
// src/lib/analytics/analytics-manager.ts

import { AnalyticsEvent, AnalyticsProvider, AnalyticsContext } from './types';
import { GoogleAnalyticsProvider } from './providers/google-analytics';

export class AnalyticsManager {
  private providers: AnalyticsProvider[] = [];
  private context: AnalyticsContext;
  private queue: AnalyticsEvent[] = [];
  private isInitialized = false;

  constructor() {
    this.context = this.createContext();
  }

  addProvider(provider: AnalyticsProvider) {
    this.providers.push(provider);
  }

  async initialize() {
    // Add configured providers
    if (process.env.NEXT_PUBLIC_GA_TRACKING_ID) {
      this.addProvider(new GoogleAnalyticsProvider(process.env.NEXT_PUBLIC_GA_TRACKING_ID));
    }

    // Process queued events
    await this.processQueue();
    this.isInitialized = true;
  }

  async track(name: string, properties: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      id: `event-${Date.now()}-${Math.random()}`,
      name,
      timestamp: new Date(),
      properties,
      context: this.context
    };

    if (!this.isInitialized) {
      this.queue.push(event);
      return;
    }

    await Promise.all(
      this.providers.map(provider => 
        provider.track(event).catch(console.error)
      )
    );
  }

  async identify(userId: string, traits: Record<string, any> = {}) {
    await Promise.all(
      this.providers.map(provider => 
        provider.identify(userId, traits).catch(console.error)
      )
    );
  }

  async page(name: string, properties: Record<string, any> = {}) {
    await Promise.all(
      this.providers.map(provider => 
        provider.page(name, properties).catch(console.error)
      )
    );
  }

  private createContext(): AnalyticsContext {
    return {
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      sessionId: this.getSessionId(),
      source: typeof document !== 'undefined' ? document.referrer : ''
    };
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random()}`;
      sessionStorage.setItem('analytics-session-id', sessionId);
    }
    return sessionId;
  }

  private async processQueue() {
    for (const event of this.queue) {
      await Promise.all(
        this.providers.map(provider => 
          provider.track(event).catch(console.error)
        )
      );
    }
    this.queue = [];
  }
}

// Singleton instance
export const analytics = new AnalyticsManager();
```

#### Шаг 4: React хуки

```typescript
// src/hooks/useAnalytics.ts

import { useEffect, useCallback } from 'react';
import { analytics } from '@/lib/analytics/analytics-manager';
import { useRouter } from 'next/router';

export function useAnalytics() {
  const router = useRouter();

  useEffect(() => {
    analytics.initialize();
  }, []);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      analytics.page(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  const track = useCallback((event: string, properties?: Record<string, any>) => {
    analytics.track(event, properties);
  }, []);

  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    analytics.identify(userId, traits);
  }, []);

  return { track, identify };
}

// Специализированные хуки
export function usePageTracking(pageName: string) {
  useEffect(() => {
    analytics.page(pageName);
  }, [pageName]);
}

export function useEventTracking() {
  const { track } = useAnalytics();

  return {
    trackButtonClick: (buttonName: string, context?: Record<string, any>) =>
      track('button_click', { button: buttonName, ...context }),
    
    trackFormSubmit: (formName: string, success: boolean) =>
      track('form_submit', { form: formName, success }),
    
    trackFeatureUsage: (feature: string, action: string) =>
      track('feature_usage', { feature, action }),
    
    trackError: (error: Error, context?: Record<string, any>) =>
      track('error', { message: error.message, stack: error.stack, ...context })
  };
}
```

#### Шаг 5: Интеграция в компоненты

```typescript
// src/components/Todo.tsx - дополнение

import { useEventTracking } from '@/hooks/useAnalytics';

export const Todo: FC = () => {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodo();
  const { trackFeatureUsage, trackButtonClick } = useEventTracking();

  const handleAddTodo = (text: string) => {
    addTodo(text);
    trackFeatureUsage('todo', 'create');
  };

  const handleToggleTodo = (id: string) => {
    toggleTodo(id);
    trackFeatureUsage('todo', 'toggle');
  };

  const handleDeleteTodo = (id: string) => {
    deleteTodo(id);
    trackFeatureUsage('todo', 'delete');
  };

  // CopilotKit action с аналитикой
  useCopilotAction({
    name: "ADD_TASK",
    description: "Add a new task to the todo list",
    parameters: [
      { name: "text", type: "string", description: "Task description", required: true }
    ],
    handler: ({ text }) => {
      handleAddTodo(text);
      trackFeatureUsage('ai', 'add_task');
      return `Added task: ${text}`;
    }
  });

  // Остальная реализация...
};
```

---

## 🔄 Добавление новых состояний

### Создание сложного состояния с машиной состояний

#### Шаг 1: Определение состояний

```typescript
// src/lib/state-machines/file-upload.ts

export type FileUploadState = 
  | 'idle'
  | 'selecting'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error';

export type FileUploadEvent = 
  | { type: 'SELECT_FILES'; files: File[] }
  | { type: 'START_UPLOAD' }
  | { type: 'UPLOAD_PROGRESS'; progress: number }
  | { type: 'UPLOAD_SUCCESS'; urls: string[] }
  | { type: 'UPLOAD_ERROR'; error: string }
  | { type: 'RESET' };

export interface FileUploadContext {
  files: File[];
  uploadProgress: number;
  uploadedUrls: string[];
  error: string | null;
  maxFiles: number;
  maxFileSize: number;
}
```

#### Шаг 2: Реализация машины состояний

```typescript
// src/lib/state-machines/file-upload.ts (продолжение)

import { createMachine, assign, interpret } from 'xstate';

export const fileUploadMachine = createMachine<FileUploadContext, FileUploadEvent, FileUploadState>({
  id: 'fileUpload',
  initial: 'idle',
  context: {
    files: [],
    uploadProgress: 0,
    uploadedUrls: [],
    error: null,
    maxFiles: 10,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  },
  states: {
    idle: {
      on: {
        SELECT_FILES: {
          target: 'selecting',
          actions: assign({
            files: (_, event) => event.files,
            error: null
          })
        }
      }
    },
    selecting: {
      always: [
        {
          target: 'error',
          cond: (context) => context.files.length > context.maxFiles,
          actions: assign({
            error: 'Too many files selected'
          })
        },
        {
          target: 'error',
          cond: (context) => context.files.some(file => file.size > context.maxFileSize),
          actions: assign({
            error: 'File size too large'
          })
        },
        { target: 'idle' }
      ],
      on: {
        START_UPLOAD: 'uploading'
      }
    },
    uploading: {
      on: {
        UPLOAD_PROGRESS: {
          actions: assign({
            uploadProgress: (_, event) => event.progress
          })
        },
        UPLOAD_SUCCESS: {
          target: 'processing',
          actions: assign({
            uploadedUrls: (_, event) => event.urls,
            uploadProgress: 100
          })
        },
        UPLOAD_ERROR: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.error
          })
        }
      }
    },
    processing: {
      after: {
        1000: 'success' // Simulate processing time
      }
    },
    success: {
      on: {
        RESET: {
          target: 'idle',
          actions: assign({
            files: [],
            uploadProgress: 0,
            uploadedUrls: [],
            error: null
          })
        }
      }
    },
    error: {
      on: {
        RESET: {
          target: 'idle',
          actions: assign({
            files: [],
            uploadProgress: 0,
            uploadedUrls: [],
            error: null
          })
        }
      }
    }
  }
});
```

#### Шаг 3: React Hook для машины состояний

```typescript
// src/hooks/useFileUpload.ts

import { useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { fileUploadMachine } from '@/lib/state-machines/file-upload';

export function useFileUpload() {
  const [state, send] = useMachine(fileUploadMachine);

  const selectFiles = useCallback((files: File[]) => {
    send({ type: 'SELECT_FILES', files });
  }, [send]);

  const startUpload = useCallback(async () => {
    send({ type: 'START_UPLOAD' });

    try {
      const formData = new FormData();
      state.context.files.forEach(file => {
        formData.append('files', file);
      });

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          send({ type: 'UPLOAD_PROGRESS', progress });
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          send({ type: 'UPLOAD_SUCCESS', urls: response.urls });
        } else {
          send({ type: 'UPLOAD_ERROR', error: 'Upload failed' });
        }
      };

      xhr.onerror = () => {
        send({ type: 'UPLOAD_ERROR', error: 'Network error' });
      };

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (error) {
      send({ type: 'UPLOAD_ERROR', error: error.message });
    }
  }, [state.context.files, send]);

  const reset = useCallback(() => {
    send({ type: 'RESET' });
  }, [send]);

  return {
    state: state.value,
    context: state.context,
    canUpload: state.matches('selecting'),
    isUploading: state.matches('uploading'),
    isProcessing: state.matches('processing'),
    isSuccess: state.matches('success'),
    isError: state.matches('error'),
    selectFiles,
    startUpload,
    reset
  };
}
```

#### Шаг 4: Компонент загрузки файлов

```typescript
// src/components/FileUpload.tsx

import { FC, useRef } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const FileUpload: FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    state,
    context,
    canUpload,
    isUploading,
    isProcessing,
    isSuccess,
    isError,
    selectFiles,
    startUpload,
    reset
  } = useFileUpload();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    selectFiles(files);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* File selection */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600 mb-2">
            Drag files here or click to select
          </p>
          <Button onClick={handleFileSelect} variant="outline">
            Select Files
          </Button>
        </div>

        {/* Selected files */}
        {context.files.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Selected Files:</h4>
            <ul className="space-y-1">
              {context.files.map((file, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Uploading...</span>
              <span>{Math.round(context.uploadProgress)}%</span>
            </div>
            <Progress value={context.uploadProgress} />
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Processing files...
          </div>
        )}

        {/* Success */}
        {isSuccess && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Files uploaded successfully!
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            {context.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {canUpload && (
            <Button onClick={startUpload}>
              Start Upload
            </Button>
          )}
          
          {(isSuccess || isError) && (
            <Button onClick={reset} variant="outline">
              Upload More
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## 🎯 Best Practices и примеры

### Архитектурные принципы

#### 1. Разделение ответственности

```typescript
// ❌ Плохо - всё в одном компоненте
export const BadTodoComponent: FC = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const addTodo = async (text: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      
      // Analytics
      gtag('event', 'todo_added');
      
      // Notification
      toast.success('Todo added!');
    } catch (error) {
      toast.error('Failed to add todo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Много UI логики... */}
    </div>
  );
};

// ✅ Хорошо - разделённые модули
export const GoodTodoComponent: FC = () => {
  const { todos, addTodo, loading } = useTodos();
  const { trackFeatureUsage } = useAnalytics();
  const { notify } = useNotifications();

  const handleAddTodo = async (text: string) => {
    try {
      await addTodo(text);
      trackFeatureUsage('todo', 'create');
      notify.success('Todo added', 'Your todo has been added successfully');
    } catch (error) {
      notify.error('Failed to add todo', error.message);
    }
  };

  return <TodoUI todos={todos} onAddTodo={handleAddTodo} loading={loading} />;
};
```

#### 2. Типизация и интерфейсы

```typescript
// ✅ Строгая типизация
interface TodoService {
  getTodos(): Promise<Todo[]>;
  addTodo(todo: CreateTodoRequest): Promise<Todo>;
  updateTodo(id: string, updates: Partial<Todo>): Promise<Todo>;
  deleteTodo(id: string): Promise<void>;
}

interface CreateTodoRequest {
  text: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  tags?: string[];
}

// Generic типы для переиспользования
interface APIResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

#### 3. Error Boundaries и обработка ошибок

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2 className="text-red-800 font-semibold">Something went wrong</h2>
          <p className="text-red-600 text-sm mt-1">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Использование
<ErrorBoundary
  onError={(error, info) => analytics.track('error', { error: error.message, info })}
  fallback={<CustomErrorFallback />}
>
  <MyComponent />
</ErrorBoundary>
```

#### 4. Performance оптимизация

```typescript
// ✅ Оптимизированный компонент
export const OptimizedTodoList: FC<{ todos: Todo[] }> = React.memo(({ todos }) => {
  // Мемоизация вычислений
  const completedCount = useMemo(() => 
    todos.filter(todo => todo.completed).length, 
    [todos]
  );

  // Мемоизация коллбеков
  const handleToggle = useCallback((id: string) => {
    // Обработчик
  }, []);

  // Виртуализация для больших списков
  const virtualizer = useVirtualizer({
    count: todos.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 60,
  });

  return (
    <div ref={scrollElementRef} className="h-96 overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const todo = todos[virtualItem.index];
          return (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
});
```

#### 5. Тестирование

```typescript
// __tests__/components/Todo.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Todo } from '@/components/Todo';
import { TodoProvider } from '@/contexts/TodoContext';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <TodoProvider>
      {ui}
    </TodoProvider>
  );
};

describe('Todo Component', () => {
  it('should add a new todo', async () => {
    renderWithProviders(<Todo />);
    
    const input = screen.getByPlaceholderText('Add new todo...');
    const addButton = screen.getByRole('button', { name: /add/i });
    
    fireEvent.change(input, { target: { value: 'Test todo' } });
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test todo')).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    // Mock API error
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('API Error'));
    
    renderWithProviders(<Todo />);
    
    const input = screen.getByPlaceholderText('Add new todo...');
    fireEvent.change(input, { target: { value: 'Test todo' } });
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Полный пример добавления новой функциональности

#### Добавление системы комментариев к задачам

```typescript
// 1. Типы
interface Comment {
  id: string;
  todoId: string;
  text: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Сервис
class CommentService {
  async getComments(todoId: string): Promise<Comment[]> {
    const response = await fetch(`/api/todos/${todoId}/comments`);
    return response.json();
  }

  async addComment(todoId: string, text: string): Promise<Comment> {
    const response = await fetch(`/api/todos/${todoId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    return response.json();
  }
}

// 3. Hook
function useComments(todoId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const commentService = useMemo(() => new CommentService(), []);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await commentService.getComments(todoId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [todoId, commentService]);

  const addComment = useCallback(async (text: string) => {
    try {
      const newComment = await commentService.addComment(todoId, text);
      setComments(prev => [...prev, newComment]);
      return newComment;
    } catch (error) {
      throw new Error('Failed to add comment');
    }
  }, [todoId, commentService]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return { comments, loading, addComment, refreshComments: loadComments };
}

// 4. Компонент
const TodoComments: FC<{ todoId: string }> = ({ todoId }) => {
  const { comments, loading, addComment } = useComments(todoId);
  const [newComment, setNewComment] = useState('');
  const { notify } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addComment(newComment);
      setNewComment('');
      notify.success('Comment added', 'Your comment has been added successfully');
    } catch (error) {
      notify.error('Failed to add comment', error.message);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Comments</h3>
      
      {loading ? (
        <div>Loading comments...</div>
      ) : (
        <div className="space-y-2">
          {comments.map(comment => (
            <div key={comment.id} className="p-3 bg-gray-50 rounded">
              <p className="text-sm">{comment.text}</p>
              <div className="text-xs text-gray-500 mt-1">
                {comment.author} • {comment.createdAt.toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-2 border rounded text-sm"
          rows={3}
        />
        <Button type="submit" size="sm">
          Add Comment
        </Button>
      </form>
    </div>
  );
};

// 5. Интеграция в Todo компонент
const EnhancedTodoItem: FC<{ todo: Todo }> = ({ todo }) => {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-center">
        <span>{todo.text}</span>
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-blue-600 text-sm"
        >
          Comments
        </button>
      </div>
      
      {showComments && (
        <div className="mt-4 pt-4 border-t">
          <TodoComments todoId={todo.id} />
        </div>
      )}
    </div>
  );
};
```

---

## 🚀 Быстрый чеклист для модификации

### ✅ Перед началом
- [ ] Определить цель модификации
- [ ] Изучить существующую архитектуру
- [ ] Найти точки интеграции
- [ ] Создать план разработки

### ✅ Во время разработки
- [ ] Следовать существующим паттернам
- [ ] Добавить типизацию TypeScript
- [ ] Реализовать error handling
- [ ] Добавить аналитику (при необходимости)
- [ ] Следовать принципам accessibility

### ✅ Тестирование
- [ ] Unit тесты для логики
- [ ] Integration тесты для API
- [ ] Component тесты для UI
- [ ] E2E тесты для критических путей

### ✅ Документация
- [ ] Обновить типы и интерфейсы
- [ ] Добавить комментарии к сложной логике
- [ ] Обновить README при необходимости
- [ ] Создать примеры использования

---

**🎯 Теперь у вас есть полное руководство по модификации Universal AI Chat Hub! Следуйте этим принципам и примерам для создания масштабируемых и поддерживаемых расширений.**