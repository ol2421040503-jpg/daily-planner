/**
 * 每日规划 - 存储服务
 * @author 严辉村高斯林
 * @license MIT
 */

import type {
  DateTasks,
  Anniversary,
  Tag,
  BackgroundTheme,
  ThemeMode,
  ViewMode,
  TaskSortBy,
  HolidayCache,
  ReminderConfig,
} from '../types';
import {
  STORAGE_KEYS,
  DEFAULT_REMINDER_CONFIG,
} from '../config';

/**
 * 存储服务类
 * 负责所有 localStorage 相关的数据持久化操作
 */
export class StorageService {
  // ==================== 任务相关 ====================

  /** 加载任务数据 */
  static loadTasks(): DateTasks {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    return saved ? JSON.parse(saved) : {};
  }

  /** 保存任务数据 */
  static saveTasks(tasks: DateTasks): void {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  // ==================== 纪念日相关 ====================

  /** 加载纪念日数据 */
  static loadAnniversaries(): Anniversary[] {
    const saved = localStorage.getItem(STORAGE_KEYS.ANNIVERSARIES);
    return saved ? JSON.parse(saved) : [];
  }

  /** 保存纪念日数据 */
  static saveAnniversaries(anniversaries: Anniversary[]): void {
    localStorage.setItem(STORAGE_KEYS.ANNIVERSARIES, JSON.stringify(anniversaries));
  }

  // ==================== 主题相关 ====================

  /** 加载背景主题 */
  static loadTheme(): BackgroundTheme {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return (saved as BackgroundTheme) || 'blue';
  }

  /** 保存背景主题 */
  static saveTheme(theme: BackgroundTheme): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  /** 加载主题模式（明/暗） */
  static loadThemeMode(): ThemeMode {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    return (saved as ThemeMode) || 'light';
  }

  /** 保存主题模式 */
  static saveThemeMode(mode: ThemeMode): void {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
  }

  // ==================== 视图相关 ====================

  /** 加载视图模式 */
  static loadViewMode(): ViewMode {
    const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    return (saved as ViewMode) || 'month';
  }

  /** 保存视图模式 */
  static saveViewMode(mode: ViewMode): void {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
  }

  /** 加载任务排序方式 */
  static loadTaskSortBy(): TaskSortBy {
    const saved = localStorage.getItem(STORAGE_KEYS.TASK_SORT_BY);
    return (saved as TaskSortBy) || 'priority';
  }

  /** 保存任务排序方式 */
  static saveTaskSortBy(sortBy: TaskSortBy): void {
    localStorage.setItem(STORAGE_KEYS.TASK_SORT_BY, sortBy);
  }

  // ==================== 节假日缓存 ====================

  /** 加载节假日缓存 */
  static loadHolidayCache(): HolidayCache {
    const saved = localStorage.getItem(STORAGE_KEYS.HOLIDAY_CACHE);
    return saved ? JSON.parse(saved) : {};
  }

  /** 保存节假日缓存 */
  static saveHolidayCache(cache: HolidayCache): void {
    localStorage.setItem(STORAGE_KEYS.HOLIDAY_CACHE, JSON.stringify(cache));
  }

  // ==================== 标签相关 ====================

  /** 加载自定义标签 */
  static loadCustomTags(): Tag[] {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_TAGS);
    return saved ? JSON.parse(saved) : [];
  }

  /** 保存自定义标签 */
  static saveCustomTags(tags: Tag[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TAGS, JSON.stringify(tags));
  }

  /** 加载标签排序 */
  static loadTagOrder(): string[] {
    const saved = localStorage.getItem(STORAGE_KEYS.TAG_ORDER);
    return saved ? JSON.parse(saved) : [];
  }

  /** 保存标签排序 */
  static saveTagOrder(order: string[]): void {
    localStorage.setItem(STORAGE_KEYS.TAG_ORDER, JSON.stringify(order));
  }

  /** 加载已删除的预设标签ID */
  static loadDeletedDefaultTagIds(): string[] {
    const saved = localStorage.getItem(STORAGE_KEYS.DELETED_DEFAULT_TAGS);
    return saved ? JSON.parse(saved) : [];
  }

  /** 保存已删除的预设标签ID */
  static saveDeletedDefaultTagIds(ids: string[]): void {
    localStorage.setItem(STORAGE_KEYS.DELETED_DEFAULT_TAGS, JSON.stringify(ids));
  }

  // ==================== 提醒配置 ====================

  /** 加载提醒配置 */
  static loadReminderConfig(): ReminderConfig {
    const saved = localStorage.getItem(STORAGE_KEYS.REMINDER_CONFIG);
    return saved ? JSON.parse(saved) : DEFAULT_REMINDER_CONFIG;
  }

  /** 保存提醒配置 */
  static saveReminderConfig(config: ReminderConfig): void {
    localStorage.setItem(STORAGE_KEYS.REMINDER_CONFIG, JSON.stringify(config));
  }

  // ==================== 通用方法 ====================

  /** 清除所有数据 */
  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /** 导出所有数据 */
  static exportAllData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const saved = localStorage.getItem(key);
      if (saved) {
        data[name] = JSON.parse(saved);
      }
    });
    return data;
  }

  /** 导入数据 */
  static importData(data: Record<string, unknown>): void {
    Object.entries(data).forEach(([name, value]) => {
      const key = STORAGE_KEYS[name as keyof typeof STORAGE_KEYS];
      if (key && value !== undefined) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
  }
}
