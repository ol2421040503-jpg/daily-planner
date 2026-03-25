/**
 * 每日规划 - 配置常量
 * @author 严辉村高斯林
 * @license MIT
 */

import type { 
  TaskPriority, 
  Tag, 
  BackgroundTheme, 
  BackgroundThemeConfig,
  PriorityConfig,
  ReminderConfig
} from '../types';

// ==================== 版本配置 ====================
export const APP_VERSION = '1.6.1';
export const VERSION_CHECK_URL = 'https://your-server.com/api/version';

/** 版本更新日志 */
export const RELEASE_NOTES: Record<string, string[]> = {
  '1.0.0': [
    '✨ 首次发布',
    '📅 支持日历视图（月/周/日）',
    '📝 任务管理与优先级',
    '🎂 纪念日提醒（支持农历）',
    '🌙 深色模式',
    '🎨 多种主题背景'
  ]
};

// ==================== 优先级配置 ====================

/** 四象限优先级配置 */
export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  'urgent-important': { 
    label: '紧急重要', 
    shortLabel: '紧急重要',
    desc: '立即处理',
    bgColor: 'bg-red-100', 
    darkBg: 'bg-red-900/50', 
    color: 'text-red-700', 
    darkColor: 'text-red-300',
    borderColor: 'border-red-500',
    order: 0
  },
  'important': { 
    label: '重要不急', 
    shortLabel: '重要不急',
    desc: '计划安排',
    bgColor: 'bg-yellow-100', 
    darkBg: 'bg-yellow-900/50', 
    color: 'text-yellow-700', 
    darkColor: 'text-yellow-300',
    borderColor: 'border-yellow-500',
    order: 1
  },
  'urgent': { 
    label: '紧急不重要', 
    shortLabel: '紧急不重要',
    desc: '快速处理',
    bgColor: 'bg-orange-100', 
    darkBg: 'bg-orange-900/50', 
    color: 'text-orange-700', 
    darkColor: 'text-orange-300',
    borderColor: 'border-orange-500',
    order: 2
  },
  'normal': { 
    label: '不重要不急', 
    shortLabel: '不重要不急',
    desc: '有空处理',
    bgColor: 'bg-gray-100', 
    darkBg: 'bg-gray-700', 
    color: 'text-gray-600', 
    darkColor: 'text-gray-400',
    borderColor: 'border-gray-400',
    order: 3
  }
};

/** 有效优先级列表 */
export const VALID_PRIORITIES: TaskPriority[] = ['urgent-important', 'important', 'urgent', 'normal'];

// ==================== 标签配置 ====================

/** 预设标签列表 */
export const DEFAULT_TAGS: Tag[] = [
  { id: 'work', name: '工作', color: 'bg-blue-100', textColor: 'text-blue-700', icon: '💼' },
  { id: 'life', name: '生活', color: 'bg-green-100', textColor: 'text-green-700', icon: '🏠' },
  { id: 'study', name: '学习', color: 'bg-purple-100', textColor: 'text-purple-700', icon: '📚' },
  { id: 'health', name: '健康', color: 'bg-red-100', textColor: 'text-red-700', icon: '💪' },
  { id: 'finance', name: '财务', color: 'bg-yellow-100', textColor: 'text-yellow-700', icon: '💰' },
  { id: 'social', name: '社交', color: 'bg-pink-100', textColor: 'text-pink-700', icon: '👥' },
  { id: 'travel', name: '出行', color: 'bg-orange-100', textColor: 'text-orange-700', icon: '✈️' },
  { id: 'shopping', name: '购物', color: 'bg-indigo-100', textColor: 'text-indigo-700', icon: '🛒' },
];

/** 可选图标列表 */
export const ICON_OPTIONS: string[] = [
  // 工作相关
  '💼', '📁', '📋', '📝', '📌', '📎', '✏️', '📊', '📈', '📉',
  '💻', '🖥️', '⌨️', '🖱️', '🖨️', '📱', '☎️', '📧', '📬', '📮',
  // 学习相关
  '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '✏️',
  '🎓', '🎯', '🏆', '🥇', '🏅', '🎖️', '🔍', '🔬', '🔭', '💡',
  // 生活相关
  '🏠', '🏡', '🏢', '🏗️', '🔑', '🛋️', '🛏️', '🚿', '🧹', '🧺',
  '🍳', '🍽️', '☕', '🍵', '🥤', '🍷', '🍺', '🥘', '🍲', '🥗',
  // 健康相关
  '💪', '🏃', '🧘', '⚽', '🏀', '🎾', '🏐', '🎱', '🏓', '🏸',
  '❤️', '💊', '🏥', '🩺', '💉', '🩹', '🦷', '👁️', '🧠', '🦴',
  // 财务相关
  '💰', '💵', '💴', '💶', '💷', '💸', '💳', '🧾', '📊', '📈',
  '🏦', '🏧', '💎', '🎁', '🧧', '💷', '💰', '💲', '💹', '🔢',
  // 社交相关
  '👥', '👤', '🤝', '💬', '💭', '🗣️', '📢', '📣', '📞', '📱',
  '👨‍👩‍👧', '👨‍👩‍👧‍👦', '👴', '👵', '👶', '🧒', '👦', '👧', '🧑', '👨',
  // 出行相关
  '✈️', '🚀', '🚁', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈',
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
  // 购物相关
  '🛒', '🛍️', '🛐', '🏪', '🏬', '🏭', '🏷️', '🎫', '🎁', '🎀',
  '🛍️', '🛒', '💸', '💳', '🧾', '📦', '📬', '📮', '🛍️', '🎁',
  // 娱乐相关
  '🎮', '🎯', '🎲', '♟️', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹',
  '🎺', '🎻', '🥁', '📻', '🎛️', '🎚️', '🎤', '🎼', '🎵', '🎶',
  // 自然相关
  '🌟', '⭐', '🌙', '☀️', '🌤️', '⛅', '🌈', '🌸', '🌺', '🌻',
  '🍀', '🌿', '🍃', '🌾', '🌵', '🌴', '🌳', '🌲', '🍁', '🍂',
  // 其他
  '⭐', '✨', '💫', '🔥', '💥', '💢', '💦', '💨', '🎉', '🎊',
  '🔔', '🔕', '💡', '🕯️', '🔦', '🔋', '🔌', '⚙️', '🔧', '🔨'
];

// ==================== 主题配置 ====================

/** 背景主题配置 */
export const BACKGROUND_THEMES: Record<BackgroundTheme, BackgroundThemeConfig> = {
  blue: { from: 'from-blue-100', to: 'to-indigo-200', name: '蓝色', darkFrom: 'from-gray-900', darkTo: 'to-slate-900' },
  purple: { from: 'from-purple-100', to: 'to-pink-200', name: '紫色', darkFrom: 'from-gray-900', darkTo: 'to-purple-950' },
  green: { from: 'from-green-100', to: 'to-emerald-200', name: '绿色', darkFrom: 'from-gray-900', darkTo: 'to-emerald-950' },
  orange: { from: 'from-orange-100', to: 'to-amber-200', name: '橙色', darkFrom: 'from-gray-900', darkTo: 'to-amber-950' },
  pink: { from: 'from-pink-100', to: 'to-rose-200', name: '粉色', darkFrom: 'from-gray-900', darkTo: 'to-rose-950' }
};

// ==================== 提醒配置 ====================

/** 默认提醒配置 */
export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  anniversary: 3,   // 纪念日提前3天
  high: 7,          // 高优先级提前7天
  medium: 5,        // 中优先级提前5天
  low: 3            // 低优先级提前3天
};

// ==================== 存储键名 ====================

/** localStorage 键名 */
export const STORAGE_KEYS = {
  TASKS: 'dailyPlannerTasks',
  ANNIVERSARIES: 'dailyPlannerAnniversaries',
  THEME: 'dailyPlannerTheme',
  THEME_MODE: 'dailyPlannerThemeMode',
  VIEW_MODE: 'dailyPlannerViewMode',
  TASK_SORT_BY: 'dailyPlannerTaskSortBy',
  HOLIDAY_CACHE: 'dailyPlannerHolidayCache',
  CUSTOM_TAGS: 'dailyPlannerCustomTags',
  TAG_ORDER: 'dailyPlannerTagOrder',
  DELETED_DEFAULT_TAGS: 'dailyPlannerDeletedDefaultTags',
  REMINDER_CONFIG: 'dailyPlannerReminderConfig',
} as const;

// ==================== 其他常量 ====================

/** 悬停延迟时间（毫秒） */
export const HOVER_DELAY = 300;

/** 日期格式 */
export const DATE_FORMAT = 'YYYY-MM-DD';

/** 星期名称（周一到周日） */
export const WEEKDAY_NAMES = ['一', '二', '三', '四', '五', '六', '日'];

/** 月份名称 */
export const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
