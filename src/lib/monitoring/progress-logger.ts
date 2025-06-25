/**
 * Progress Logger - Логирование прогресса длительных операций
 * 
 * Предоставляет красивое логирование прогресса с индикаторами,
 * временными метриками и детальными отчетами.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

import { TaskProgress, TaskStatus, TaskLog } from './task-monitor';

interface LoggerColors {
  reset: string;
  bright: string;
  dim: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  gray: string;
  bgRed: string;
  bgGreen: string;
  bgYellow: string;
  bgBlue: string;
}

interface LoggerIcons {
  pending: string;
  running: string;
  completed: string;
  failed: string;
  cancelled: string;
  progress: string;
  step: string;
  time: string;
  error: string;
  warning: string;
  info: string;
  debug: string;
  stats: string;
}

/**
 * Утилита для красивого логирования прогресса
 */
export class ProgressLogger {
  private colors: LoggerColors;
  private icons: LoggerIcons;
  private terminalWidth: number = 80;
  private enableColors: boolean;
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';

  constructor(enableColors: boolean = true) {
    this.enableColors = enableColors && process.stdout.isTTY;
    
    this.colors = {
      reset: this.enableColors ? '\x1b[0m' : '',
      bright: this.enableColors ? '\x1b[1m' : '',
      dim: this.enableColors ? '\x1b[2m' : '',
      red: this.enableColors ? '\x1b[31m' : '',
      green: this.enableColors ? '\x1b[32m' : '',
      yellow: this.enableColors ? '\x1b[33m' : '',
      blue: this.enableColors ? '\x1b[34m' : '',
      magenta: this.enableColors ? '\x1b[35m' : '',
      cyan: this.enableColors ? '\x1b[36m' : '',
      white: this.enableColors ? '\x1b[37m' : '',
      gray: this.enableColors ? '\x1b[90m' : '',
      bgRed: this.enableColors ? '\x1b[41m' : '',
      bgGreen: this.enableColors ? '\x1b[42m' : '',
      bgYellow: this.enableColors ? '\x1b[43m' : '',
      bgBlue: this.enableColors ? '\x1b[44m' : '',
    };

    this.icons = {
      pending: '⏳',
      running: '🔄',
      completed: '✅',
      failed: '❌',
      cancelled: '🚫',
      progress: '📊',
      step: '📝',
      time: '⏱️',
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️',
      debug: '🔍',
      stats: '📈',
    };

    // Определяем ширину терминала
    if (process.stdout.columns) {
      this.terminalWidth = Math.min(process.stdout.columns, 120);
    }
  }

  /**
   * Логирование начала задачи
   */
  logTaskStart(task: TaskProgress): void {
    const timestamp = this.formatTimestamp(task.startTime);
    const priorityColor = this.getPriorityColor(task.priority);
    
    console.log();
    console.log(this.createSeparator('═', `TASK STARTED`));
    console.log(`${this.icons.running} ${this.colors.bright}${task.name}${this.colors.reset}`);
    console.log(`${this.colors.gray}   Description: ${task.description}${this.colors.reset}`);
    console.log(`${this.colors.gray}   Task ID: ${task.taskId}${this.colors.reset}`);
    console.log(`${this.colors.gray}   Priority: ${priorityColor}${task.priority.toUpperCase()}${this.colors.reset}`);
    console.log(`${this.colors.gray}   Total Steps: ${task.totalSteps}${this.colors.reset}`);
    console.log(`${this.colors.gray}   Started: ${timestamp}${this.colors.reset}`);
    console.log();
  }

  /**
   * Логирование прогресса задачи
   */
  logTaskProgress(task: TaskProgress): void {
    const progressBar = this.createProgressBar(task.progress, 40);
    const currentStep = task.steps[task.currentStep];
    const eta = this.formatETA(task.estimatedEndTime);
    
    // Очищаем предыдущую строку если в терминале
    if (this.enableColors && process.stdout.isTTY) {
      process.stdout.write('\x1b[1A\x1b[2K'); // Move up and clear line
    }
    
    console.log(
      `${this.icons.progress} ${progressBar} ${this.colors.bright}${task.progress}%${this.colors.reset} ` +
      `${this.colors.gray}(${task.currentStep + 1}/${task.totalSteps})${this.colors.reset} ` +
      `${currentStep ? this.colors.cyan + currentStep.name : 'Waiting...'}${this.colors.reset} ` +
      `${eta ? this.colors.gray + 'ETA: ' + eta : ''}${this.colors.reset}`
    );
  }

  /**
   * Логирование шага
   */
  logStep(task: TaskProgress, stepIndex: number): void {
    const step = task.steps[stepIndex];
    if (!step) return;

    const statusIcon = this.getStatusIcon(step.status);
    const statusColor = this.getStatusColor(step.status);
    const timestamp = this.formatTimestamp(new Date());
    
    console.log(
      `  ${statusIcon} ${statusColor}${step.name}${this.colors.reset} ` +
      `${this.colors.gray}[${timestamp}]${this.colors.reset}`
    );
    
    if (step.description && this.logLevel === 'debug') {
      console.log(`    ${this.colors.dim}${step.description}${this.colors.reset}`);
    }
  }

  /**
   * Логирование завершения задачи
   */
  logTaskComplete(task: TaskProgress): void {
    const duration = this.formatDuration(task.startTime, task.endTime);
    const status = task.status === TaskStatus.COMPLETED ? 'COMPLETED' : 'FINISHED';
    const statusColor = task.status === TaskStatus.COMPLETED ? this.colors.green : this.colors.yellow;
    
    console.log();
    console.log(this.createSeparator('═', `TASK ${status}`));
    console.log(`${this.getStatusIcon(task.status)} ${statusColor}${this.colors.bright}${task.name}${this.colors.reset}`);
    console.log(`${this.colors.gray}   Duration: ${duration}${this.colors.reset}`);
    console.log(`${this.colors.gray}   Steps Completed: ${task.steps.filter(s => s.status === TaskStatus.COMPLETED).length}/${task.totalSteps}${this.colors.reset}`);
    
    if (task.error) {
      console.log(`${this.colors.red}   Error: ${task.error.message}${this.colors.reset}`);
    }
    
    console.log();
  }

  /**
   * Логирование ошибки
   */
  logError(task: TaskProgress, error: Error): void {
    console.log();
    console.log(this.createSeparator('!', 'ERROR'));
    console.log(`${this.icons.error} ${this.colors.red}${this.colors.bright}Task Failed: ${task.name}${this.colors.reset}`);
    console.log(`${this.colors.red}   Error: ${error.message}${this.colors.reset}`);
    
    if (this.logLevel === 'debug' && error.stack) {
      console.log(`${this.colors.dim}   Stack Trace:${this.colors.reset}`);
      error.stack.split('\n').forEach(line => {
        console.log(`${this.colors.dim}     ${line}${this.colors.reset}`);
      });
    }
    
    console.log();
  }

  /**
   * Логирование отчета о задачах
   */
  logTaskReport(tasks: TaskProgress[]): void {
    const stats = this.calculateStats(tasks);
    
    console.log();
    console.log(this.createSeparator('═', 'TASK REPORT'));
    console.log(`${this.icons.stats} ${this.colors.bright}Task Execution Summary${this.colors.reset}`);
    console.log();
    
    // Статистика
    console.log(`  ${this.colors.green}✅ Completed: ${stats.completed}${this.colors.reset}`);
    console.log(`  ${this.colors.red}❌ Failed: ${stats.failed}${this.colors.reset}`);
    console.log(`  ${this.colors.yellow}🚫 Cancelled: ${stats.cancelled}${this.colors.reset}`);
    console.log(`  ${this.colors.blue}🔄 Running: ${stats.running}${this.colors.reset}`);
    console.log(`  ${this.colors.gray}⏳ Pending: ${stats.pending}${this.colors.reset}`);
    console.log();
    
    // Производительность
    if (stats.averageExecutionTime > 0) {
      console.log(`  ${this.colors.cyan}⏱️ Average Execution Time: ${this.formatDurationMs(stats.averageExecutionTime)}${this.colors.reset}`);
    }
    
    if (stats.totalExecutionTime > 0) {
      console.log(`  ${this.colors.cyan}🕐 Total Execution Time: ${this.formatDurationMs(stats.totalExecutionTime)}${this.colors.reset}`);
    }
    
    console.log();
    
    // Детали задач
    if (this.logLevel === 'debug') {
      console.log(`  ${this.colors.bright}Task Details:${this.colors.reset}`);
      tasks.forEach(task => {
        const statusIcon = this.getStatusIcon(task.status);
        const duration = task.startTime && task.endTime 
          ? this.formatDuration(task.startTime, task.endTime)
          : 'N/A';
        
        console.log(`    ${statusIcon} ${task.name} ${this.colors.gray}(${duration})${this.colors.reset}`);
      });
      console.log();
    }
    
    console.log(this.createSeparator('═'));
  }

  /**
   * Создание прогресс-бара
   */
  private createProgressBar(progress: number, width: number = 20): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    
    const filledBar = this.colors.green + '█'.repeat(filled) + this.colors.reset;
    const emptyBar = this.colors.gray + '░'.repeat(empty) + this.colors.reset;
    
    return `[${filledBar}${emptyBar}]`;
  }

  /**
   * Создание разделителя
   */
  private createSeparator(char: string = '─', title?: string): string {
    const availableWidth = this.terminalWidth - 4;
    
    if (title) {
      const titleLength = title.length + 2; // +2 for spaces
      const sideLength = Math.floor((availableWidth - titleLength) / 2);
      const leftSide = char.repeat(sideLength);
      const rightSide = char.repeat(availableWidth - sideLength - titleLength);
      
      return `${this.colors.gray}${leftSide} ${this.colors.bright}${title}${this.colors.reset}${this.colors.gray} ${rightSide}${this.colors.reset}`;
    }
    
    return `${this.colors.gray}${char.repeat(availableWidth)}${this.colors.reset}`;
  }

  /**
   * Получение иконки статуса
   */
  private getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING: return this.icons.pending;
      case TaskStatus.RUNNING: return this.icons.running;
      case TaskStatus.COMPLETED: return this.icons.completed;
      case TaskStatus.FAILED: return this.icons.failed;
      case TaskStatus.CANCELLED: return this.icons.cancelled;
      default: return this.icons.info;
    }
  }

  /**
   * Получение цвета статуса
   */
  private getStatusColor(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING: return this.colors.gray;
      case TaskStatus.RUNNING: return this.colors.blue;
      case TaskStatus.COMPLETED: return this.colors.green;
      case TaskStatus.FAILED: return this.colors.red;
      case TaskStatus.CANCELLED: return this.colors.yellow;
      default: return this.colors.white;
    }
  }

  /**
   * Получение цвета приоритета
   */
  private getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'critical': return this.colors.red;
      case 'high': return this.colors.yellow;
      case 'medium': return this.colors.blue;
      case 'low': return this.colors.gray;
      default: return this.colors.white;
    }
  }

  /**
   * Форматирование временной метки
   */
  private formatTimestamp(date: Date): string {
    return date.toTimeString().split(' ')[0];
  }

  /**
   * Форматирование ETA
   */
  private formatETA(estimatedEndTime?: Date): string {
    if (!estimatedEndTime) return '';
    
    const now = new Date();
    const diffMs = estimatedEndTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return '';
    
    return this.formatDurationMs(diffMs);
  }

  /**
   * Форматирование длительности
   */
  private formatDuration(startTime: Date, endTime?: Date): string {
    if (!endTime) return 'N/A';
    
    const diffMs = endTime.getTime() - startTime.getTime();
    return this.formatDurationMs(diffMs);
  }

  /**
   * Форматирование длительности в миллисекундах
   */
  private formatDurationMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Вычисление статистики
   */
  private calculateStats(tasks: TaskProgress[]) {
    const stats = {
      total: tasks.length,
      completed: 0,
      failed: 0,
      cancelled: 0,
      running: 0,
      pending: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
    };

    let totalTime = 0;
    let completedCount = 0;

    tasks.forEach(task => {
      switch (task.status) {
        case TaskStatus.COMPLETED:
          stats.completed++;
          break;
        case TaskStatus.FAILED:
          stats.failed++;
          break;
        case TaskStatus.CANCELLED:
          stats.cancelled++;
          break;
        case TaskStatus.RUNNING:
          stats.running++;
          break;
        case TaskStatus.PENDING:
          stats.pending++;
          break;
      }

      if (task.startTime && task.endTime) {
        const duration = task.endTime.getTime() - task.startTime.getTime();
        totalTime += duration;
        completedCount++;
      }
    });

    stats.totalExecutionTime = totalTime;
    stats.averageExecutionTime = completedCount > 0 ? totalTime / completedCount : 0;

    return stats;
  }

  /**
   * Установка уровня логирования
   */
  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.logLevel = level;
  }

  /**
   * Логирование произвольного сообщения с уровнем
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(this.logLevel)) {
      return;
    }

    const icon = this.icons[level] || this.icons.info;
    const color = level === 'error' ? this.colors.red : 
                  level === 'warn' ? this.colors.yellow :
                  level === 'debug' ? this.colors.gray : this.colors.blue;
    
    const timestamp = this.formatTimestamp(new Date());
    
    console.log(`${color}${icon} [${timestamp}] ${message}${this.colors.reset}`);
    
    if (data && this.logLevel === 'debug') {
      console.log(`${this.colors.dim}   ${JSON.stringify(data, null, 2)}${this.colors.reset}`);
    }
  }
}

// Глобальный экземпляр
export const progressLogger = new ProgressLogger();