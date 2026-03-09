/**
 * 每日规划 - 工具函数
 * @author 严辉村高斯林
 * @license MIT
 */

import { Solar, Lunar } from 'lunar-javascript';
import type {
  TaskPriority,
  PriorityConfig,
  Task,
  MonthlyStats,
  DateTasks,
  Tag,
} from '../types';
import {
  PRIORITY_CONFIG,
  VALID_PRIORITIES,
  DEFAULT_TAGS,
  WEEKDAY_NAMES,
  MONTH_NAMES,
} from '../config';

// ==================== 日期工具 ====================

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为中文格式 YYYY年MM月DD日
 */
export function formatDateCN(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 获取当前时间 HH:MM
 */
export function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 判断是否是今天
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * 判断两个日期是否是同一天
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 获取月份的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 获取月份第一天是星期几（0=周日，但我们转为周一=0）
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // 转换为周一开始
}

/**
 * 获取周数
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * 获取某周的日期范围（周一到周日）
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
  const start = new Date(d.setDate(diff));
  const end = new Date(d.setDate(d.getDate() + 6));
  return { start, end };
}

// ==================== 农历工具 ====================

/**
 * 获取农历信息
 */
export function getLunarInfo(date: Date): {
  lunarDate: string;
  lunarMonth: string;
  lunarDay: string;
  festival: string | null;
  jieQi: string | null;
} {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  return {
    lunarDate: lunar.toString(),
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    festival: lunar.getFestivals()[0] || null,
    jieQi: lunar.getJieQi() || null,
  };
}

/**
 * 获取农历日显示文本
 */
export function getLunarDayText(date: Date): string {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  // 优先显示节日
  const festivals = lunar.getFestivals();
  if (festivals.length > 0) {
    return festivals[0];
  }

  // 节气
  const jieQi = lunar.getJieQi();
  if (jieQi) {
    return jieQi;
  }

  // 初一显示月份
  if (lunar.getDay() === 1) {
    return lunar.getMonthInChinese() + '月';
  }

  // 其他显示日期
  return lunar.getDayInChinese();
}

// ==================== 优先级工具 ====================

/**
 * 安全获取优先级配置
 */
export function getPriorityConfig(priority: string | undefined): PriorityConfig {
  const p = priority || 'normal';
  if (VALID_PRIORITIES.includes(p as TaskPriority)) {
    return PRIORITY_CONFIG[p as TaskPriority];
  }
  return PRIORITY_CONFIG['normal'];
}

/**
 * 获取优先级排序值
 */
export function getPriorityOrder(priority: string | undefined): number {
  return getPriorityConfig(priority).order;
}

// ==================== 标签工具 ====================

/**
 * 获取所有标签（预设 + 自定义），按排序排列
 */
export function getAllTags(
  customTags: Tag[],
  tagOrder: string[],
  deletedDefaultTagIds: Set<string>
): Tag[] {
  // 过滤掉已删除的预设标签
  const availableDefaultTags = DEFAULT_TAGS.filter(
    tag => !deletedDefaultTagIds.has(tag.id)
  );

  // 合并预设和自定义标签
  const allTags = [...availableDefaultTags, ...customTags];

  // 如果有排序，按排序排列
  if (tagOrder.length > 0) {
    const orderedTags: Tag[] = [];
    const tagMap = new Map(allTags.map(tag => [tag.id, tag]));

    // 先按排序添加
    for (const id of tagOrder) {
      const tag = tagMap.get(id);
      if (tag) {
        orderedTags.push(tag);
        tagMap.delete(id);
      }
    }

    // 添加未排序的新标签
    for (const tag of tagMap.values()) {
      orderedTags.push(tag);
    }

    return orderedTags;
  }

  return allTags;
}

/**
 * 根据ID获取标签
 */
export function getTagById(tagId: string, allTags: Tag[]): Tag | undefined {
  return allTags.find(tag => tag.id === tagId);
}

/**
 * 获取标签名称列表
 */
export function getTagNames(tagIds: string[], allTags: Tag[]): string[] {
  return tagIds
    .map(id => getTagById(id, allTags)?.name)
    .filter((name): name is string => name !== undefined);
}

// ==================== 任务工具 ====================

/**
 * 生成任务ID
 */
export function generateTaskId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/**
 * 按优先级排序任务
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // 先按优先级排序
    const orderDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
    if (orderDiff !== 0) return orderDiff;

    // 再按时间排序
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    if (a.time) return -1;
    if (b.time) return 1;

    // 最后按ID排序（创建顺序）
    return a.id.localeCompare(b.id);
  });
}

/**
 * 按时间排序任务
 */
export function sortTasksByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
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
  return [...tasks].sort((a, b) => a.text.localeCompare(b.text, 'zh-CN'));
}

// ==================== 统计工具 ====================

/**
 * 计算月度统计
 */
export function calculateMonthlyStats(tasks: DateTasks, year: number, month: number): MonthlyStats {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  let total = 0;
  let completed = 0;

  Object.entries(tasks).forEach(([date, dateTasks]) => {
    if (date.startsWith(prefix)) {
      total += dateTasks.length;
      completed += dateTasks.filter(t => t.completed).length;
    }
  });

  return {
    total,
    completed,
    pending: total - completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * 计算日期范围内的统计
 */
export function calculateRangeStats(
  tasks: DateTasks,
  startDate: Date,
  endDate: Date
): MonthlyStats {
  let total = 0;
  let completed = 0;

  Object.entries(tasks).forEach(([date, dateTasks]) => {
    const d = new Date(date);
    if (d >= startDate && d <= endDate) {
      total += dateTasks.length;
      completed += dateTasks.filter(t => t.completed).length;
    }
  });

  return {
    total,
    completed,
    pending: total - completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// ==================== 常量导出 ====================

export { WEEKDAY_NAMES, MONTH_NAMES };
