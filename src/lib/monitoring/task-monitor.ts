/**
 * Task Monitor - Система мониторинга длительных задач
 * 
 * Отслеживает выполнение длительных операций, предоставляет
 * подробную информацию о прогрессе и позволяет отменять задачи.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

import { EventEmitter } from 'events';

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface TaskStep {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  progress: number; // 0-100
  startTime?: Date;
  endTime?: Date;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface TaskProgress {
  taskId: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number; // Overall progress 0-100
  currentStep: number;
  totalSteps: number;
  steps: TaskStep[];
  startTime: Date;
  estimatedEndTime?: Date;
  endTime?: Date;
  error?: Error;
  metadata: Record<string, any>;
  logs: TaskLog[];
}

export interface TaskLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  stepId?: string;
}

export interface TaskOptions {
  priority?: TaskPriority;
  timeout?: number; // milliseconds
  retryCount?: number;
  metadata?: Record<string, any>;
  onProgress?: (progress: TaskProgress) => void;
  onComplete?: (progress: TaskProgress) => void;
  onError?: (error: Error, progress: TaskProgress) => void;
}

/**
 * Менеджер задач с мониторингом прогресса
 */
export class TaskMonitor extends EventEmitter {
  private tasks: Map<string, TaskProgress> = new Map();
  private activeTasks: Set<string> = new Set();
  private taskTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxConcurrentTasks: number = 10;
  private taskQueue: string[] = [];

  constructor() {
    super();
    this.setMaxListeners(100); // Увеличиваем лимит слушателей
  }

  /**
   * Создание новой задачи
   */
  createTask(
    taskId: string,
    name: string,
    description: string,
    steps: Array<{ name: string; description: string }>,
    options: TaskOptions = {}
  ): TaskProgress {
    const task: TaskProgress = {
      taskId,
      name,
      description,
      status: TaskStatus.PENDING,
      priority: options.priority || TaskPriority.MEDIUM,
      progress: 0,
      currentStep: 0,
      totalSteps: steps.length,
      steps: steps.map((step, index) => ({
        id: `${taskId}_step_${index}`,
        name: step.name,
        description: step.description,
        status: TaskStatus.PENDING,
        progress: 0,
      })),
      startTime: new Date(),
      metadata: options.metadata || {},
      logs: [],
    };

    this.tasks.set(taskId, task);
    this.log(taskId, 'info', `Task created: ${name}`, { totalSteps: steps.length });

    // Настройка callback'ов
    if (options.onProgress) {
      this.on(`progress:${taskId}`, options.onProgress);
    }
    if (options.onComplete) {
      this.on(`complete:${taskId}`, options.onComplete);
    }
    if (options.onError) {
      this.on(`error:${taskId}`, options.onError);
    }

    // Настройка timeout
    if (options.timeout) {
      const timeout = setTimeout(() => {
        this.cancelTask(taskId, new Error(`Task timeout after ${options.timeout}ms`));
      }, options.timeout);
      this.taskTimeouts.set(taskId, timeout);
    }

    this.emit('task:created', task);
    return task;
  }

  /**
   * Запуск задачи
   */
  async startTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== TaskStatus.PENDING) {
      throw new Error(`Task ${taskId} is not in pending status`);
    }

    // Проверяем лимит одновременных задач
    if (this.activeTasks.size >= this.maxConcurrentTasks) {
      this.taskQueue.push(taskId);
      this.log(taskId, 'info', 'Task queued due to concurrent task limit');
      return;
    }

    this.activeTasks.add(taskId);
    task.status = TaskStatus.RUNNING;
    task.startTime = new Date();

    this.log(taskId, 'info', 'Task started');
    this.emitProgress(taskId);
    this.emit('task:started', task);
  }

  /**
   * Обновление прогресса шага
   */
  updateStepProgress(
    taskId: string,
    stepIndex: number,
    progress: number,
    status?: TaskStatus,
    metadata?: Record<string, any>
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (stepIndex < 0 || stepIndex >= task.steps.length) {
      throw new Error(`Invalid step index ${stepIndex} for task ${taskId}`);
    }

    const step = task.steps[stepIndex];
    step.progress = Math.max(0, Math.min(100, progress));
    
    if (status) {
      step.status = status;
      if (status === TaskStatus.RUNNING && !step.startTime) {
        step.startTime = new Date();
      }
      if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
        step.endTime = new Date();
      }
    }

    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    // Обновляем текущий шаг задачи
    if (status === TaskStatus.RUNNING) {
      task.currentStep = stepIndex;
    }

    // Вычисляем общий прогресс
    this.calculateOverallProgress(taskId);
    
    this.log(taskId, 'debug', `Step ${stepIndex} progress: ${progress}%`, { stepName: step.name });
    this.emitProgress(taskId);
  }

  /**
   * Завершение шага
   */
  completeStep(taskId: string, stepIndex: number, result?: any): void {
    this.updateStepProgress(taskId, stepIndex, 100, TaskStatus.COMPLETED, { result });
    
    const task = this.tasks.get(taskId);
    if (!task) return;

    this.log(taskId, 'info', `Step completed: ${task.steps[stepIndex].name}`);

    // Проверяем, завершены ли все шаги
    if (task.steps.every(step => step.status === TaskStatus.COMPLETED)) {
      this.completeTask(taskId);
    }
  }

  /**
   * Ошибка в шаге
   */
  failStep(taskId: string, stepIndex: number, error: Error): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const step = task.steps[stepIndex];
    step.status = TaskStatus.FAILED;
    step.error = error;
    step.endTime = new Date();

    this.log(taskId, 'error', `Step failed: ${step.name}`, { error: error.message });
    this.failTask(taskId, error);
  }

  /**
   * Завершение задачи
   */
  completeTask(taskId: string, result?: any): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = TaskStatus.COMPLETED;
    task.progress = 100;
    task.endTime = new Date();
    
    if (result) {
      task.metadata.result = result;
    }

    this.log(taskId, 'info', 'Task completed successfully');
    this.finishTask(taskId);
    
    this.emit(`complete:${taskId}`, task);
    this.emit('task:completed', task);
  }

  /**
   * Провал задачи
   */
  failTask(taskId: string, error: Error): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = TaskStatus.FAILED;
    task.error = error;
    task.endTime = new Date();

    this.log(taskId, 'error', `Task failed: ${error.message}`, { error: error.stack });
    this.finishTask(taskId);

    this.emit(`error:${taskId}`, error, task);
    this.emit('task:failed', { task, error });
  }

  /**
   * Отмена задачи
   */
  cancelTask(taskId: string, reason?: Error): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = TaskStatus.CANCELLED;
    task.endTime = new Date();
    
    if (reason) {
      task.error = reason;
    }

    // Отменяем все выполняющиеся шаги
    task.steps.forEach(step => {
      if (step.status === TaskStatus.RUNNING) {
        step.status = TaskStatus.CANCELLED;
        step.endTime = new Date();
      }
    });

    this.log(taskId, 'warn', 'Task cancelled', { reason: reason?.message });
    this.finishTask(taskId);

    this.emit('task:cancelled', { task, reason });
  }

  /**
   * Получение информации о задаче
   */
  getTask(taskId: string): TaskProgress | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Получение всех задач
   */
  getAllTasks(): TaskProgress[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Получение активных задач
   */
  getActiveTasks(): TaskProgress[] {
    return Array.from(this.tasks.values()).filter(task => 
      task.status === TaskStatus.RUNNING || task.status === TaskStatus.PENDING
    );
  }

  /**
   * Получение статистики
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageExecutionTime: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    
    const averageExecutionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => {
          if (task.endTime && task.startTime) {
            return sum + (task.endTime.getTime() - task.startTime.getTime());
          }
          return sum;
        }, 0) / completedTasks.length
      : 0;

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      running: tasks.filter(t => t.status === TaskStatus.RUNNING).length,
      completed: completedTasks.length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length,
      cancelled: tasks.filter(t => t.status === TaskStatus.CANCELLED).length,
      averageExecutionTime,
    };
  }

  /**
   * Очистка завершенных задач
   */
  cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = new Date(Date.now() - olderThanMs);
    const tasksToRemove: string[] = [];

    this.tasks.forEach((task, taskId) => {
      if (
        task.status !== TaskStatus.RUNNING &&
        task.status !== TaskStatus.PENDING &&
        task.endTime &&
        task.endTime < cutoffTime
      ) {
        tasksToRemove.push(taskId);
      }
    });

    tasksToRemove.forEach(taskId => {
      this.tasks.delete(taskId);
      this.removeAllListeners(`progress:${taskId}`);
      this.removeAllListeners(`complete:${taskId}`);
      this.removeAllListeners(`error:${taskId}`);
    });

    if (tasksToRemove.length > 0) {
      console.log(`🧹 Cleaned up ${tasksToRemove.length} old tasks`);
    }
  }

  // Приватные методы

  private finishTask(taskId: string): void {
    this.activeTasks.delete(taskId);
    
    // Очищаем timeout
    const timeout = this.taskTimeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.taskTimeouts.delete(taskId);
    }

    // Запускаем следующую задачу из очереди
    if (this.taskQueue.length > 0) {
      const nextTaskId = this.taskQueue.shift()!;
      this.startTask(nextTaskId).catch(error => {
        console.error(`Failed to start queued task ${nextTaskId}:`, error);
      });
    }
  }

  private calculateOverallProgress(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const totalProgress = task.steps.reduce((sum, step) => sum + step.progress, 0);
    task.progress = Math.round(totalProgress / task.steps.length);

    // Обновляем оценку времени завершения
    if (task.progress > 0 && task.startTime) {
      const elapsed = Date.now() - task.startTime.getTime();
      const estimatedTotal = (elapsed / task.progress) * 100;
      task.estimatedEndTime = new Date(task.startTime.getTime() + estimatedTotal);
    }
  }

  private emitProgress(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    this.emit(`progress:${taskId}`, task);
    this.emit('task:progress', task);
  }

  private log(taskId: string, level: TaskLog['level'], message: string, data?: any): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const logEntry: TaskLog = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    task.logs.push(logEntry);

    // Ограничиваем количество логов
    if (task.logs.length > 1000) {
      task.logs = task.logs.slice(-500); // Оставляем последние 500
    }

    // Выводим в консоль в режиме разработки
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${taskId}]`;
      switch (level) {
        case 'debug':
          console.debug(`🔍 ${prefix} ${message}`, data);
          break;
        case 'info':
          console.info(`ℹ️ ${prefix} ${message}`, data);
          break;
        case 'warn':
          console.warn(`⚠️ ${prefix} ${message}`, data);
          break;
        case 'error':
          console.error(`❌ ${prefix} ${message}`, data);
          break;
      }
    }
  }
}

// Глобальный экземпляр для использования в приложении
export const taskMonitor = new TaskMonitor();