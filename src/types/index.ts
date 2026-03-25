/**
 * 每日规划 - 类型定义
 * @author 严辉村高斯林
 * @license MIT
 */

// ==================== 任务相关类型 ====================

/** 任务优先级 - 四象限法则 */
export type TaskPriority = 'urgent-important' | 'important' | 'urgent' | 'normal';

/** 任务排序方式 */
export type TaskSortBy = 'time' | 'priority' | 'status' | 'text';

/** 任务接口 */
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  time: string;
  priority: TaskPriority;
  tags: string[];
  guideId?: string;
}

/** 按日期分组的任务 */
export interface DateTasks {
  [date: string]: Task[];
}

// ==================== 标签相关类型 ====================

/** 标签接口 */
export interface Tag {
  id: string;
  name: string;
  color: string;
  textColor: string;
  icon: string;
  isCustom?: boolean;
}

// ==================== 纪念日相关类型 ====================

/** 纪念日接口 */
export interface Anniversary {
  id: string;
  name: string;
  month: number;
  day: number;
  type: 'birthday' | 'anniversary' | 'custom';
  isLunar?: boolean;
}

// ==================== 统计相关类型 ====================

/** 月度统计 */
export interface MonthlyStats {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
}

/** 周度统计 */
export interface WeeklyStats {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
  byDay: { date: string; dayName: string; total: number; completed: number }[];
  lastWeekPercentage: number;
  improvement: number;
  streakDays: number;
}

/** 年度统计扩展 */
export interface YearlyStatsExtended {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
  byMonth: { month: number; total: number; completed: number; percentage: number }[];
  busiestMonth: { month: number; count: number } | null;
  mostProductiveMonth: { month: number; rate: number } | null;
  streakDays: number;
  longestStreak: number;
  avgDailyTasks: number;
}

/** 月度筛选类型 */
export type MonthlyFilter = 'all' | 'completed' | 'pending';

// ==================== 视图与主题类型 ====================

/** 视图模式 */
export type ViewMode = 'month' | 'week';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark';

/** 背景主题 */
export type BackgroundTheme = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

// ==================== 节假日相关类型 ====================

/** 节假日信息 */
export interface HolidayInfo {
  date: string;
  name: string;
  holiday: boolean;
  wage: number;
}

/** 节假日缓存 */
export interface HolidayCache {
  [year: string]: {
    [date: string]: HolidayInfo;
  };
}

// ==================== 配置接口 ====================

/** 优先级配置 */
export interface PriorityConfig {
  label: string;
  shortLabel: string;
  desc: string;
  bgColor: string;
  darkBg: string;
  color: string;
  darkColor: string;
  borderColor: string;
  order: number;
}

/** 提醒配置 */
export interface ReminderConfig {
  anniversary: number;
  high: number;
  medium: number;
  low: number;
}

/** 背景主题配置 */
export interface BackgroundThemeConfig {
  from: string;
  to: string;
  name: string;
  darkFrom: string;
  darkTo: string;
}

// ==================== 知识库相关类型 ====================

/** 知识库步骤 */
export interface KnowledgeStep {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  images?: string[];
  order: number;
}

/** 知识库指南 */
export interface KnowledgeGuide {
  id: string;
  name: string;
  steps: KnowledgeStep[];
  createdAt: number;
  updatedAt: number;
}

// ==================== 总结笔记类型 ====================

/** 总结笔记 */
export interface SummaryNotes {
  weekly: Record<string, string>;
  monthly: Record<string, string>;
  yearly: Record<string, string>;
}

// ==================== Electron API 类型 ====================

declare global {
  interface Window {
    electronAPI?: {
      // 文件存储
      saveKnowledgeFile: (data: unknown) => Promise<{ success: boolean; error?: string }>;
      loadKnowledgeFile: () => Promise<unknown[]>;
      // 窗口控制
      minimizeToTray: () => void;
      toggleMaximize: () => void;
      closeToTray: () => void;
      showWindow: () => void;
      isMaximized: () => Promise<boolean>;
      toggleAlwaysOnTop: () => Promise<boolean>;
      isAlwaysOnTop: () => Promise<boolean>;
      // 通知相关
      sendNotification: (title: string, body: string, data?: Record<string, unknown>) => Promise<boolean>;
      testNotification: () => void;
      // 提醒相关
      sendReminderData: (data: { tasks: DateTasks; anniversaries: Anniversary[] }) => void;
      getReminderConfig: () => Promise<ReminderConfig>;
      onRequestReminderData: (callback: () => void) => void;
      onCheckDayEndTasks: (callback: () => void) => void;
      sendDayEndReminderData: (data: { pendingCount: number; overdueCount: number }) => void;
      onNavigateToDate: (callback: (date: string) => void) => void;
      // 任务进度相关
      sendTaskProgress: (data: { completed: number; total: number }) => void;
      onRequestTaskProgress: (callback: () => void) => void;
      // 快捷操作相关
      onAddTaskFocus: (callback: () => void) => void;
      onJumpToToday: (callback: () => void) => void;
      onShowStats: (callback: () => void) => void;
      // 应用设置相关
      getAppVersion: () => Promise<string>;
      getAutoStartStatus: () => Promise<boolean>;
      setAutoStart: (enable: boolean) => Promise<boolean>;
      // 自动更新相关
      checkForUpdate: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
      onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes?: string }) => void) => void;
      onUpdateNotAvailable: (callback: () => void) => void;
      onDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => void;
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => void;
      onUpdateError: (callback: (error: string) => void) => void;
      // 窗口准备完成
      onWindowReady: (callback: () => void) => void;
      // 清理
      removeAllListeners: (channel: string) => void;
      // 截图功能
      startScreenshot: () => Promise<{ success: boolean; error?: string }>;
      onCompleteScreenshot: (callback: (data: { success: boolean; imageData?: string }) => void) => void;
      cancelScreenshot: () => Promise<{ success: boolean }>;
    };
  }
}

export {};
