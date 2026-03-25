/**
 * 每日规划 - 任务工具函数
 * @author 严辉村高斯林
 * @license MIT
 */

import type { Task, DateTasks, TaskPriority, MonthlyStats, TaskSortBy } from '../types';
import { PRIORITY_CONFIG } from '../config';
import { formatDate } from './date';

/**
 * 生成任务ID
 */
export function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 按优先级排序任务
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const orderA = PRIORITY_CONFIG[a.priority]?.order ?? 3;
    const orderB = PRIORITY_CONFIG[b.priority]?.order ?? 3;
    return orderA - orderB;
  });
}

/**
 * 按时间排序任务
 */
export function sortTasksByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

/**
 * 按状态排序任务（未完成在前）
 */
export function sortTasksByStatus(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });
}

/**
 * 按文本排序任务
 */
export function sortTasksByText(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.text.localeCompare(b.text));
}

/**
 * 按指定方式排序任务
 */
export function sortTasks(tasks: Task[], sortBy: TaskSortBy): Task[] {
  switch (sortBy) {
    case 'priority':
      return sortTasksByPriority(tasks);
    case 'time':
      return sortTasksByTime(tasks);
    case 'status':
      return sortTasksByStatus(tasks);
    case 'text':
      return sortTasksByText(tasks);
    default:
      return tasks;
  }
}

/**
 * 计算月度统计
 */
export function calculateMonthlyStats(
  tasks: DateTasks,
  year: number,
  month: number
): MonthlyStats {
  let total = 0;
  let completed = 0;

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = formatDate(d);
    const dateTasks = tasks[dateKey];
    if (dateTasks) {
      total += dateTasks.length;
      completed += dateTasks.filter(t => t.completed).length;
    }
  }

  return {
    total,
    completed,
    pending: total - completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * 计算日期范围统计
 */
export function calculateRangeStats(
  tasks: DateTasks,
  startDate: Date,
  endDate: Date
): MonthlyStats {
  let total = 0;
  let completed = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = formatDate(d);
    const dateTasks = tasks[dateKey];
    if (dateTasks) {
      total += dateTasks.length;
      completed += dateTasks.filter(t => t.completed).length;
    }
  }

  return {
    total,
    completed,
    pending: total - completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * 获取指定优先级的任务
 */
export function filterTasksByPriority(tasks: Task[], priority: TaskPriority): Task[] {
  return tasks.filter(t => t.priority === priority);
}

/**
 * 获取未完成的任务
 */
export function filterPendingTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => !t.completed);
}

/**
 * 获取已完成的任务
 */
export function filterCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.completed);
}

/**
 * 获取指定标签的任务
 */
export function filterTasksByTag(tasks: Task[], tagId: string): Task[] {
  return tasks.filter(t => t.tags.includes(tagId));
}

/**
 * 获取过期任务
 */
export function getOverdueTasks(tasks: DateTasks): Array<{ date: string; task: Task }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDate(today);
  
  const overdue: Array<{ date: string; task: Task }> = [];
  
  Object.entries(tasks).forEach(([date, dateTasks]) => {
    if (date < todayKey) {
      dateTasks.forEach(task => {
        if (!task.completed) {
          overdue.push({ date, task });
        }
      });
    }
  });
  
  return overdue.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 获取今日任务
 */
export function getTodayTasks(tasks: DateTasks): Task[] {
  const todayKey = formatDate(new Date());
  return tasks[todayKey] || [];
}

/**
 * 批量更新任务优先级
 */
export function batchUpdatePriority(
  tasks: DateTasks,
  dateKey: string,
  taskId: string,
  priority: TaskPriority
): DateTasks {
  const newTasks = { ...tasks };
  if (newTasks[dateKey]) {
    newTasks[dateKey] = newTasks[dateKey].map(t =>
      t.id === taskId ? { ...t, priority } : t
    );
  }
  return newTasks;
}
