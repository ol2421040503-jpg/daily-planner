/**
 * 每日规划 - 任务服务
 * @author 严辉村高斯林
 * @license MIT
 */

import type {
  Task,
  DateTasks,
  TaskPriority,
  MonthlyStats,
} from '../types';
import { StorageService } from './StorageService';
import {
  generateTaskId,
  formatDate,
  sortTasksByPriority,
  sortTasksByTime,
  sortTasksByStatus,
  sortTasksByText,
  calculateMonthlyStats,
  calculateRangeStats,
} from '../utils';

/**
 * 任务服务类
 * 负责任务的增删改查和统计
 */
export class TaskService {
  private tasks: DateTasks;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.tasks = StorageService.loadTasks();
  }

  // ==================== 数据访问 ====================

  /** 获取所有任务 */
  getAllTasks(): DateTasks {
    return { ...this.tasks };
  }

  /** 获取指定日期的任务 */
  getTasksByDate(date: Date): Task[] {
    const dateKey = formatDate(date);
    return this.tasks[dateKey] || [];
  }

  /** 获取指定日期字符串的任务 */
  getTasksByDateKey(dateKey: string): Task[] {
    return this.tasks[dateKey] || [];
  }

  /** 设置任务数据（用于批量更新） */
  setTasks(tasks: DateTasks): void {
    this.tasks = tasks;
    this.saveAndNotify();
  }

  // ==================== 任务操作 ====================

  /** 添加任务 */
  addTask(date: Date, text: string, priority: TaskPriority = 'normal', tags: string[] = []): Task {
    const dateKey = formatDate(date);

    if (!this.tasks[dateKey]) {
      this.tasks[dateKey] = [];
    }

    const task: Task = {
      id: generateTaskId(),
      text: text.trim(),
      completed: false,
      date: dateKey,
      time: '',
      priority,
      tags,
    };

    this.tasks[dateKey].push(task);
    this.saveAndNotify();

    return task;
  }

  /** 更新任务 */
  updateTask(dateKey: string, taskId: string, updates: Partial<Task>): boolean {
    const dateTasks = this.tasks[dateKey];
    if (!dateTasks) return false;

    const taskIndex = dateTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    this.tasks[dateKey][taskIndex] = {
      ...dateTasks[taskIndex],
      ...updates,
    };

    this.saveAndNotify();
    return true;
  }

  /** 删除任务 */
  deleteTask(dateKey: string, taskId: string): boolean {
    const dateTasks = this.tasks[dateKey];
    if (!dateTasks) return false;

    const taskIndex = dateTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    this.tasks[dateKey].splice(taskIndex, 1);

    // 如果日期下没有任务了，删除该日期的键
    if (this.tasks[dateKey].length === 0) {
      delete this.tasks[dateKey];
    }

    this.saveAndNotify();
    return true;
  }

  /** 切换任务完成状态 */
  toggleTask(dateKey: string, taskId: string): boolean {
    const dateTasks = this.tasks[dateKey];
    if (!dateTasks) return false;

    const task = dateTasks.find(t => t.id === taskId);
    if (!task) return false;

    task.completed = !task.completed;
    this.saveAndNotify();
    return true;
  }

  /** 复制任务到其他日期 */
  copyTaskToDates(sourceTask: Task, targetDates: Date[]): Task[] {
    const copiedTasks: Task[] = [];

    targetDates.forEach(date => {
      const dateKey = formatDate(date);
      if (!this.tasks[dateKey]) {
        this.tasks[dateKey] = [];
      }

      const newTask: Task = {
        ...sourceTask,
        id: generateTaskId(),
        date: dateKey,
        completed: false, // 复制的任务默认未完成
      };

      this.tasks[dateKey].push(newTask);
      copiedTasks.push(newTask);
    });

    if (copiedTasks.length > 0) {
      this.saveAndNotify();
    }

    return copiedTasks;
  }

  /** 移动任务到其他日期 */
  moveTask(sourceDateKey: string, taskId: string, targetDate: Date): boolean {
    const sourceTasks = this.tasks[sourceDateKey];
    if (!sourceTasks) return false;

    const taskIndex = sourceTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    const task = sourceTasks.splice(taskIndex, 1)[0];
    const targetDateKey = formatDate(targetDate);

    if (!this.tasks[targetDateKey]) {
      this.tasks[targetDateKey] = [];
    }

    task.date = targetDateKey;
    this.tasks[targetDateKey].push(task);

    // 如果源日期下没有任务了，删除该日期的键
    if (this.tasks[sourceDateKey].length === 0) {
      delete this.tasks[sourceDateKey];
    }

    this.saveAndNotify();
    return true;
  }

  // ==================== 排序 ====================

  /** 按优先级排序 */
  sortTasksByPriority(tasks: Task[]): Task[] {
    return sortTasksByPriority(tasks);
  }

  /** 按时间排序 */
  sortTasksByTime(tasks: Task[]): Task[] {
    return sortTasksByTime(tasks);
  }

  /** 按状态排序 */
  sortTasksByStatus(tasks: Task[]): Task[] {
    return sortTasksByStatus(tasks);
  }

  /** 按文本排序 */
  sortTasksByText(tasks: Task[]): Task[] {
    return sortTasksByText(tasks);
  }

  // ==================== 统计 ====================

  /** 获取月度统计 */
  getMonthlyStats(year: number, month: number): MonthlyStats {
    return calculateMonthlyStats(this.tasks, year, month);
  }

  /** 获取日期范围统计 */
  getRangeStats(startDate: Date, endDate: Date): MonthlyStats {
    return calculateRangeStats(this.tasks, startDate, endDate);
  }

  /** 获取年度统计 */
  getYearlyStats(year: number): MonthlyStats {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    return calculateRangeStats(this.tasks, startDate, endDate);
  }

  /** 获取总任务数和完成数 */
  getTotalStats(): { total: number; completed: number } {
    let total = 0;
    let completed = 0;

    Object.values(this.tasks).forEach(dateTasks => {
      total += dateTasks.length;
      completed += dateTasks.filter(t => t.completed).length;
    });

    return { total, completed };
  }

  // ==================== 搜索 ====================

  /** 搜索任务 */
  searchTasks(query: string): Array<{ date: string; task: Task }> {
    const results: Array<{ date: string; task: Task }> = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(this.tasks).forEach(([date, dateTasks]) => {
      dateTasks.forEach(task => {
        if (task.text.toLowerCase().includes(lowerQuery)) {
          results.push({ date, task });
        }
      });
    });

    // 按日期倒序排列
    return results.sort((a, b) => b.date.localeCompare(a.date));
  }

  // ==================== 监听器 ====================

  /** 添加变化监听器 */
  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** 通知所有监听器 */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  // ==================== 持久化 ====================

  /** 保存并通知 */
  private saveAndNotify(): void {
    StorageService.saveTasks(this.tasks);
    this.notifyListeners();
  }

  /** 重新加载数据 */
  reload(): void {
    this.tasks = StorageService.loadTasks();
    this.notifyListeners();
  }
}
