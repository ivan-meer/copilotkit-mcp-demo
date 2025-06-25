/**
 * Advanced Logging System
 * 
 * Красивая система логирования с цветным выводом в терминал,
 * структурированными логами и performance метриками.
 * 
 * @author Claude Code
 * @version 1.0.0
 * @since 2025-01-24
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  metadata?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    component?: string;
    action?: string;
    duration?: number;
    error?: Error;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  enableMetadata: boolean;
  maxHistorySize: number;
  persistLogs: boolean;
  prettyPrint: boolean;
}

/**
 * Цветовые коды для терминала
 */
const Colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  
  // Цвета текста
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m',
  Blue: '\x1b[34m',
  Magenta: '\x1b[35m',
  Cyan: '\x1b[36m',
  White: '\x1b[37m',
  Gray: '\x1b[90m',
  
  // Цвета фона
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  
  // Градиенты (эмуляция)
  Rainbow: ['\x1b[31m', '\x1b[33m', '\x1b[32m', '\x1b[36m', '\x1b[34m', '\x1b[35m'],
} as const;

/**
 * Иконки для разных типов логов
 */
const Icons = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: '💡',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
  success: '✅',
  loading: '⏳',
  process: '⚙️',
  network: '🌐',
  database: '💾',
  auth: '🔐',
  performance: '⚡',
  memory: '🧠',
  config: '⚙️',
  api: '🔌',
  ai: '🤖',
  mcp: '🔗',
  ui: '🎨',
} as const;

/**
 * Продвинутый Logger класс
 */
export class Logger {
  private config: LoggerConfig;
  private history: LogEntry[] = [];
  private performanceMarks: Map<string, number> = new Map();
  private sessionId: string;
  
  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: LogLevel.INFO,
      enableColors: typeof window === 'undefined', // Только в Node.js
      enableTimestamp: true,
      enableMetadata: true,
      maxHistorySize: 1000,
      persistLogs: false,
      prettyPrint: true,
      ...config,
    };
    
    this.sessionId = this.generateSessionId();
    
    // Инициализация в браузере
    if (typeof window !== 'undefined') {
      this.initBrowserLogging();
    }
  }
  
  /**
   * Debug логи (только в development)
   */
  debug(message: string, data?: any, metadata?: any): void {
    if (this.config.level <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, 'DEBUG', message, data, metadata);
    }
  }
  
  /**
   * Информационные логи
   */
  info(message: string, data?: any, metadata?: any): void {
    if (this.config.level <= LogLevel.INFO) {
      this.log(LogLevel.INFO, 'INFO', message, data, metadata);
    }
  }
  
  /**
   * Предупреждения
   */
  warn(message: string, data?: any, metadata?: any): void {
    if (this.config.level <= LogLevel.WARN) {
      this.log(LogLevel.WARN, 'WARN', message, data, metadata);
    }
  }
  
  /**
   * Ошибки
   */
  error(message: string, error?: Error | any, metadata?: any): void {
    if (this.config.level <= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, 'ERROR', message, error, {
        ...metadata,
        error: error instanceof Error ? error : undefined,
      });
    }
  }
  
  /**
   * Специализированные логи
   */
  success(message: string, data?: any): void {
    this.info(`${Icons.success} ${message}`, data, { type: 'success' });
  }
  
  loading(message: string, data?: any): void {
    this.info(`${Icons.loading} ${message}`, data, { type: 'loading' });
  }
  
  performance(operation: string, duration: number, data?: any): void {
    const color = duration < 100 ? Colors.Green : 
                 duration < 500 ? Colors.Yellow : Colors.Red;
    
    this.info(
      `${Icons.performance} Performance: ${operation}`,
      data,
      { type: 'performance', duration, color }
    );
  }
  
  ai(message: string, data?: any): void {
    this.info(`${Icons.ai} AI: ${message}`, data, { category: 'ai' });
  }
  
  mcp(message: string, data?: any): void {
    this.info(`${Icons.mcp} MCP: ${message}`, data, { category: 'mcp' });
  }
  
  ui(message: string, data?: any): void {
    this.info(`${Icons.ui} UI: ${message}`, data, { category: 'ui' });
  }
  
  api(message: string, data?: any): void {
    this.info(`${Icons.api} API: ${message}`, data, { category: 'api' });
  }
  
  /**
   * Performance измерения
   */
  startPerformance(operation: string): void {
    this.performanceMarks.set(operation, performance.now());
    this.debug(`Performance start: ${operation}`);
  }
  
  endPerformance(operation: string, data?: any): number {
    const startTime = this.performanceMarks.get(operation);
    if (!startTime) {
      this.warn(`Performance end called without start: ${operation}`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.performanceMarks.delete(operation);
    this.performance(operation, duration, data);
    
    return duration;
  }
  
  /**
   * Группировка логов
   */
  group(label: string): void {
    if (typeof console.group === 'function') {
      console.group(this.formatMessage('GROUP', label));
    } else {
      this.info(`📁 Group: ${label}`);
    }
  }
  
  groupEnd(): void {
    if (typeof console.groupEnd === 'function') {
      console.groupEnd();
    }
  }
  
  /**
   * Таблицы данных
   */
  table(data: any, label?: string): void {
    if (label) {
      this.info(`📊 Table: ${label}`);
    }
    
    if (typeof console.table === 'function') {
      console.table(data);
    } else {
      this.info('Table data:', data);
    }
  }
  
  /**
   * Основной метод логирования
   */
  private log(level: LogLevel, category: string, message: string, data?: any, metadata?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      metadata: {
        sessionId: this.sessionId,
        ...metadata,
      },
    };
    
    // Добавляем в историю
    this.addToHistory(entry);
    
    // Выводим в консоль
    this.outputToConsole(entry);
    
    // Сохраняем при необходимости
    if (this.config.persistLogs) {
      this.persistLog(entry);
    }
  }
  
  /**
   * Форматирование сообщения для консоли
   */
  private formatMessage(category: string, message: string, level?: LogLevel): string {
    let formatted = '';
    
    // Временная метка
    if (this.config.enableTimestamp) {
      const timestamp = new Date().toLocaleTimeString('ru-RU', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      });
      
      if (this.config.enableColors) {
        formatted += `${Colors.Gray}[${timestamp}]${Colors.Reset} `;
      } else {
        formatted += `[${timestamp}] `;
      }
    }
    
    // Иконка и категория
    const icon = level !== undefined ? Icons[level] : Icons.process;
    
    if (this.config.enableColors) {
      const color = this.getLevelColor(level || LogLevel.INFO);
      formatted += `${icon} ${color}[${category}]${Colors.Reset} `;
    } else {
      formatted += `${icon} [${category}] `;
    }
    
    // Сообщение
    formatted += message;
    
    return formatted;
  }
  
  /**
   * Получение цвета для уровня лога
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return Colors.Gray;
      case LogLevel.INFO: return Colors.Blue;
      case LogLevel.WARN: return Colors.Yellow;
      case LogLevel.ERROR: return Colors.Red;
      default: return Colors.White;
    }
  }
  
  /**
   * Вывод в консоль
   */
  private outputToConsole(entry: LogEntry): void {
    const formatted = this.formatMessage(entry.category, entry.message, entry.level);
    
    // Выбираем метод консоли
    const consoleMethod = this.getConsoleMethod(entry.level);
    
    if (entry.data !== undefined) {
      if (this.config.prettyPrint && typeof entry.data === 'object') {
        consoleMethod(formatted);
        console.log(this.formatData(entry.data));
      } else {
        consoleMethod(formatted, entry.data);
      }
    } else {
      consoleMethod(formatted);
    }
    
    // Метаданные
    if (this.config.enableMetadata && entry.metadata && Object.keys(entry.metadata).length > 1) {
      console.log(this.formatMetadata(entry.metadata));
    }
  }
  
  /**
   * Форматирование данных
   */
  private formatData(data: any): string {
    if (this.config.enableColors) {
      return `${Colors.Cyan}${JSON.stringify(data, null, 2)}${Colors.Reset}`;
    }
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Форматирование метаданных
   */
  private formatMetadata(metadata: any): string {
    const filtered = { ...metadata };
    delete filtered.sessionId; // Убираем sessionId из вывода
    
    if (Object.keys(filtered).length === 0) {
      return '';
    }
    
    if (this.config.enableColors) {
      return `${Colors.Dim}📋 Metadata: ${JSON.stringify(filtered)}${Colors.Reset}`;
    }
    return `📋 Metadata: ${JSON.stringify(filtered)}`;
  }
  
  /**
   * Получение метода консоли для уровня
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG: return console.debug || console.log;
      case LogLevel.INFO: return console.info || console.log;
      case LogLevel.WARN: return console.warn || console.log;
      case LogLevel.ERROR: return console.error || console.log;
      default: return console.log;
    }
  }
  
  /**
   * Добавление в историю
   */
  private addToHistory(entry: LogEntry): void {
    this.history.push(entry);
    
    // Ограничиваем размер истории
    if (this.history.length > this.config.maxHistorySize) {
      this.history.splice(0, this.history.length - this.config.maxHistorySize);
    }
  }
  
  /**
   * Сохранение лога
   */
  private persistLog(entry: LogEntry): void {
    if (typeof window !== 'undefined') {
      // Браузер - сохраняем в localStorage
      try {
        const logs = JSON.parse(localStorage.getItem('universal-ai-logs') || '[]');
        logs.push(entry);
        
        // Ограничиваем количество сохраненных логов
        if (logs.length > 500) {
          logs.splice(0, logs.length - 500);
        }
        
        localStorage.setItem('universal-ai-logs', JSON.stringify(logs));
      } catch (error) {
        console.warn('Failed to persist log to localStorage:', error);
      }
    }
    // Node.js сохранение можно добавить по необходимости
  }
  
  /**
   * Инициализация логирования в браузере
   */
  private initBrowserLogging(): void {
    // Перехватываем необработанные ошибки
    window.addEventListener('error', (event) => {
      this.error('Uncaught Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
    
    // Перехватываем необработанные promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', event.reason);
    });
  }
  
  /**
   * Генерация ID сессии
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Получение истории логов
   */
  getHistory(): LogEntry[] {
    return [...this.history];
  }
  
  /**
   * Очистка истории
   */
  clearHistory(): void {
    this.history.length = 0;
  }
  
  /**
   * Получение статистики логирования
   */
  getStats(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    sessionId: string;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    for (const entry of this.history) {
      const levelName = LogLevel[entry.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    }
    
    return {
      totalLogs: this.history.length,
      byLevel,
      byCategory,
      sessionId: this.sessionId,
    };
  }
  
  /**
   * Красивый баннер для запуска приложения
   */
  printBanner(appName: string, version: string): void {
    if (!this.config.enableColors) {
      this.info(`=== ${appName} v${version} ===`);
      return;
    }
    
    const banner = `
${Colors.Cyan}╔══════════════════════════════════════════════════════════════╗${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}                                                              ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}  ${Colors.Bright}${Colors.Blue}🚀 ${appName}${Colors.Reset}                                    ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}     ${Colors.Gray}Version: ${version}${Colors.Reset}                                      ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}     ${Colors.Gray}Session: ${this.sessionId}${Colors.Reset}       ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}                                                              ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}  ${Colors.Green}✅ Logging System Initialized${Colors.Reset}                           ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}  ${Colors.Blue}💡 Level: ${LogLevel[this.config.level]}${Colors.Reset}                                     ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}  ${Colors.Magenta}🎨 Colors: ${this.config.enableColors ? 'Enabled' : 'Disabled'}${Colors.Reset}                                ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}║${Colors.Reset}                                                              ${Colors.Cyan}║${Colors.Reset}
${Colors.Cyan}╚══════════════════════════════════════════════════════════════╝${Colors.Reset}
`;
    
    console.log(banner);
  }
}

/**
 * Глобальный экземпляр логгера
 */
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableColors: true,
  enableTimestamp: true,
  enableMetadata: true,
  prettyPrint: true,
  persistLogs: true,
});

/**
 * Хелперы для быстрого логирования
 */
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: any) => logger.error(message, error),
  success: (message: string, data?: any) => logger.success(message, data),
  loading: (message: string, data?: any) => logger.loading(message, data),
  performance: (operation: string, duration: number, data?: any) => 
    logger.performance(operation, duration, data),
  ai: (message: string, data?: any) => logger.ai(message, data),
  mcp: (message: string, data?: any) => logger.mcp(message, data),
  ui: (message: string, data?: any) => logger.ui(message, data),
  api: (message: string, data?: any) => logger.api(message, data),
  
  // Performance helpers
  start: (operation: string) => logger.startPerformance(operation),
  end: (operation: string, data?: any) => logger.endPerformance(operation, data),
  
  // Grouping helpers
  group: (label: string) => logger.group(label),
  groupEnd: () => logger.groupEnd(),
  table: (data: any, label?: string) => logger.table(data, label),
  
  // Banner
  banner: (appName: string, version: string) => logger.printBanner(appName, version),
};

export default logger;