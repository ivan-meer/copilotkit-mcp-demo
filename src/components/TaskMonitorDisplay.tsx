/**
 * Task Monitor Display - React компонент для отображения прогресса задач
 * 
 * Отображает активные задачи с прогресс-барами, логами и возможностью отмены.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { TaskProgress, TaskStatus, TaskPriority, taskMonitor } from '../lib/monitoring/task-monitor';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface TaskMonitorDisplayProps {
  showCompleted?: boolean;
  maxTasks?: number;
  refreshInterval?: number;
}

interface TaskCardProps {
  task: TaskProgress;
  onCancel?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onCancel }) => {
  const [showLogs, setShowLogs] = useState(false);
  
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING: return 'bg-gray-500';
      case TaskStatus.RUNNING: return 'bg-blue-500';
      case TaskStatus.COMPLETED: return 'bg-green-500';
      case TaskStatus.FAILED: return 'bg-red-500';
      case TaskStatus.CANCELLED: return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL: return 'bg-red-100 text-red-800';
      case TaskPriority.HIGH: return 'bg-orange-100 text-orange-800';
      case TaskPriority.MEDIUM: return 'bg-blue-100 text-blue-800';
      case TaskPriority.LOW: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING: return '⏳';
      case TaskStatus.RUNNING: return '🔄';
      case TaskStatus.COMPLETED: return '✅';
      case TaskStatus.FAILED: return '❌';
      case TaskStatus.CANCELLED: return '🚫';
      default: return '❓';
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const diffMs = end.getTime() - startTime.getTime();
    
    if (diffMs < 1000) return `${diffMs}ms`;
    if (diffMs < 60000) return `${(diffMs / 1000).toFixed(1)}s`;
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatETA = (estimatedEndTime?: Date) => {
    if (!estimatedEndTime) return null;
    
    const now = new Date();
    const diffMs = estimatedEndTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Overdue';
    
    if (diffMs < 60000) return `${Math.ceil(diffMs / 1000)}s remaining`;
    
    const minutes = Math.ceil(diffMs / 60000);
    return `${minutes}m remaining`;
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getStatusIcon(task.status)}</span>
            <CardTitle className="text-lg">{task.name}</CardTitle>
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {(task.status === TaskStatus.RUNNING || task.status === TaskStatus.PENDING) && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(task.taskId)}
                className="text-red-600 hover:text-red-700"
              >
                Cancel
              </Button>
            )}
            <Badge variant="outline" className={getStatusColor(task.status)}>
              {task.status.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">{task.description}</p>
      </CardHeader>

      <CardContent>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Progress: {task.progress}%
            </span>
            <span className="text-sm text-gray-500">
              Step {task.currentStep + 1} of {task.totalSteps}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                task.status === TaskStatus.COMPLETED ? 'bg-green-500' :
                task.status === TaskStatus.FAILED ? 'bg-red-500' :
                task.status === TaskStatus.CANCELLED ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>

        {/* Timing Information */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="font-medium">Started:</span>{' '}
            <span className="text-gray-600">
              {task.startTime.toLocaleTimeString()}
            </span>
          </div>
          <div>
            <span className="font-medium">Duration:</span>{' '}
            <span className="text-gray-600">
              {formatDuration(task.startTime, task.endTime)}
            </span>
          </div>
          {task.estimatedEndTime && task.status === TaskStatus.RUNNING && (
            <>
              <div>
                <span className="font-medium">ETA:</span>{' '}
                <span className="text-gray-600">
                  {formatETA(task.estimatedEndTime)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Current Step */}
        {task.status === TaskStatus.RUNNING && task.steps[task.currentStep] && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-600">🔄</span>
              <span className="font-medium text-blue-800">
                Current Step: {task.steps[task.currentStep].name}
              </span>
            </div>
            <p className="text-sm text-blue-600">
              {task.steps[task.currentStep].description}
            </p>
          </div>
        )}

        {/* Error Display */}
        {task.error && (
          <div className="mb-4 p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-red-600">❌</span>
              <span className="font-medium text-red-800">Error</span>
            </div>
            <p className="text-sm text-red-600">{task.error.message}</p>
          </div>
        )}

        {/* Steps Overview */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full mb-2">
              {showLogs ? 'Hide Steps' : 'Show Steps'} ({task.steps.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2">
              {task.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    index === task.currentStep && task.status === TaskStatus.RUNNING
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <span>{getStatusIcon(step.status)}</span>
                  <span className="flex-1">{step.name}</span>
                  {step.progress > 0 && (
                    <span className="text-xs text-gray-500">
                      {step.progress}%
                    </span>
                  )}
                  {step.endTime && step.startTime && (
                    <span className="text-xs text-gray-500">
                      {formatDuration(step.startTime, step.endTime)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Logs */}
        {task.logs.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full mt-2">
                {showLogs ? 'Hide Logs' : 'Show Logs'} ({task.logs.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
                {task.logs.slice(-10).map((log, index) => (
                  <div key={index} className="text-xs mb-1">
                    <span className="text-gray-500">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className={`ml-2 ${
                      log.level === 'error' ? 'text-red-600' :
                      log.level === 'warn' ? 'text-yellow-600' :
                      log.level === 'debug' ? 'text-gray-500' :
                      'text-blue-600'
                    }`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="ml-1">{log.message}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Task Metadata */}
        {Object.keys(task.metadata).length > 0 && (
          <details className="mt-2">
            <summary className="text-sm text-gray-600 cursor-pointer">
              Task Metadata
            </summary>
            <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(task.metadata, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

export const TaskMonitorDisplay: React.FC<TaskMonitorDisplayProps> = ({
  showCompleted = false,
  maxTasks = 10,
  refreshInterval = 1000,
}) => {
  const [tasks, setTasks] = useState<TaskProgress[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    averageExecutionTime: 0,
  });

  useEffect(() => {
    const updateTasks = () => {
      let allTasks = taskMonitor.getAllTasks();
      
      if (!showCompleted) {
        allTasks = allTasks.filter(task => 
          task.status === TaskStatus.RUNNING || 
          task.status === TaskStatus.PENDING
        );
      }

      // Сортируем по времени старта (новые сначала)
      allTasks.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
      
      // Ограничиваем количество
      if (maxTasks > 0) {
        allTasks = allTasks.slice(0, maxTasks);
      }

      setTasks(allTasks);
      setStats(taskMonitor.getStats());
    };

    // Подписываемся на события
    const handleTaskUpdate = () => updateTasks();
    
    taskMonitor.on('task:created', handleTaskUpdate);
    taskMonitor.on('task:started', handleTaskUpdate);
    taskMonitor.on('task:progress', handleTaskUpdate);
    taskMonitor.on('task:completed', handleTaskUpdate);
    taskMonitor.on('task:failed', handleTaskUpdate);
    taskMonitor.on('task:cancelled', handleTaskUpdate);

    // Первоначальная загрузка
    updateTasks();

    // Периодическое обновление
    const interval = setInterval(updateTasks, refreshInterval);

    return () => {
      taskMonitor.off('task:created', handleTaskUpdate);
      taskMonitor.off('task:started', handleTaskUpdate);
      taskMonitor.off('task:progress', handleTaskUpdate);
      taskMonitor.off('task:completed', handleTaskUpdate);
      taskMonitor.off('task:failed', handleTaskUpdate);
      taskMonitor.off('task:cancelled', handleTaskUpdate);
      clearInterval(interval);
    };
  }, [showCompleted, maxTasks, refreshInterval]);

  const handleCancelTask = (taskId: string) => {
    taskMonitor.cancelTask(taskId, new Error('Cancelled by user'));
  };

  if (tasks.length === 0 && stats.running === 0 && stats.pending === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No active tasks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📊</span>
            Task Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
              <div className="text-sm text-gray-600">Running</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.cancelled}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
          
          {stats.averageExecutionTime > 0 && (
            <>
              <Separator className="my-4" />
              <div className="text-center">
                <div className="text-sm text-gray-600">Average Execution Time</div>
                <div className="text-lg font-medium">
                  {stats.averageExecutionTime < 1000 
                    ? `${Math.round(stats.averageExecutionTime)}ms`
                    : `${(stats.averageExecutionTime / 1000).toFixed(1)}s`}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Active Tasks */}
      {tasks.map(task => (
        <TaskCard
          key={task.taskId}
          task={task}
          onCancel={handleCancelTask}
        />
      ))}
    </div>
  );
};

export default TaskMonitorDisplay;