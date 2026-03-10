/**
 * 每日规划 - Daily Planner
 * 
 * 一款简洁高效的桌面任务管理工具
 * 支持日历视图、四象限分析、标签分类、农历节假日显示
 * 
 * @author 严辉村高斯林
 * @license MIT
 * @version 1.0.0
 */

import './index.css';
import { Solar, Lunar } from 'lunar-javascript';

// ==================== Electron API 类型声明 ====================
declare global {
  interface Window {
    electronAPI?: {
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
      getReminderConfig: () => Promise<{ anniversary: number; high: number; medium: number; low: number }>;
      onRequestReminderData: (callback: () => void) => void;
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
    };
  }
}

// ==================== 版本配置 ====================
const APP_VERSION = '1.0.0';
const VERSION_CHECK_URL = 'https://your-server.com/api/version'; // 替换为你的版本检查API
const RELEASE_NOTES: Record<string, string[]> = {
  '1.0.0': [
    '✨ 首次发布',
    '📅 支持日历视图（月/周/日）',
    '📝 任务管理与优先级',
    '🎂 纪念日提醒（支持农历）',
    '🌙 深色模式',
    '🎨 多种主题背景'
  ]
};

// 类型定义 - 四象限优先级
type TaskPriority = 'urgent-important' | 'important' | 'urgent' | 'normal';

// 任务排序类型
type TaskSortBy = 'time' | 'priority' | 'status' | 'text';

// 四象限优先级配置
const PRIORITY_CONFIG: Record<TaskPriority, { 
  label: string; 
  shortLabel: string;
  desc: string;
  bgColor: string; 
  darkBg: string;
  color: string; 
  darkColor: string;
  borderColor: string;
  order: number;
}> = {
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

// 安全获取优先级配置（兼容旧数据）
function getPriorityConfig(priority: string | undefined): typeof PRIORITY_CONFIG[TaskPriority] {
  const validPriorities: TaskPriority[] = ['urgent-important', 'important', 'urgent', 'normal'];
  const p = priority || 'normal';
  if (validPriorities.includes(p as TaskPriority)) {
    return PRIORITY_CONFIG[p as TaskPriority];
  }
  return PRIORITY_CONFIG['normal'];
}

// 标签类型
interface Tag {
  id: string;
  name: string;
  color: string;       // Tailwind 背景色
  textColor: string;   // Tailwind 文字色
  icon: string;        // emoji 图标
  isCustom?: boolean;  // 是否是自定义标签
}

// 预设标签配置
// 预设标签（用户可自行删除）
const DEFAULT_TAGS: Tag[] = [
  { id: 'work', name: '工作', color: 'bg-blue-100', textColor: 'text-blue-700', icon: '💼' },
  { id: 'life', name: '生活', color: 'bg-green-100', textColor: 'text-green-700', icon: '🏠' },
  { id: 'study', name: '学习', color: 'bg-purple-100', textColor: 'text-purple-700', icon: '📚' },
  { id: 'health', name: '健康', color: 'bg-red-100', textColor: 'text-red-700', icon: '💪' },
  { id: 'finance', name: '财务', color: 'bg-yellow-100', textColor: 'text-yellow-700', icon: '💰' },
  { id: 'social', name: '社交', color: 'bg-pink-100', textColor: 'text-pink-700', icon: '👥' },
  { id: 'travel', name: '出行', color: 'bg-orange-100', textColor: 'text-orange-700', icon: '✈️' },
  { id: 'shopping', name: '购物', color: 'bg-indigo-100', textColor: 'text-indigo-700', icon: '🛒' },
];

// 可选图标列表
const ICON_OPTIONS: string[] = [
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

interface Task {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  time: string;
  priority: TaskPriority;
  tags: string[];  // 标签ID数组
}

interface DateTasks {
  [date: string]: Task[];
}

interface Anniversary {
  id: string;
  name: string;
  month: number;  // 1-12
  day: number;    // 1-31
  type: 'birthday' | 'anniversary' | 'custom';
  isLunar?: boolean;  // 是否是农历日期
}

interface MonthlyStats {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
}

type MonthlyFilter = 'all' | 'completed' | 'pending';

// 视图模式类型
type ViewMode = 'month' | 'week' | 'day';

// 主题模式类型
type ThemeMode = 'light' | 'dark';

// 背景主题类型
type BackgroundTheme = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

// 节假日信息类型
interface HolidayInfo {
  date: string;
  name: string;
  holiday: boolean;  // true=假日, false=工作日(调休)
  wage: number;      // 工资倍数：3=法定假日, 1=普通工作日
}

interface HolidayCache {
  [year: string]: {
    [date: string]: HolidayInfo;
  };
}

// 背景主题配置
const backgroundThemes: Record<BackgroundTheme, { from: string; to: string; name: string; darkFrom: string; darkTo: string }> = {
  blue: { from: 'from-blue-100', to: 'to-indigo-200', name: '蓝色', darkFrom: 'from-gray-900', darkTo: 'to-slate-900' },
  purple: { from: 'from-purple-100', to: 'to-pink-200', name: '紫色', darkFrom: 'from-gray-900', darkTo: 'to-purple-950' },
  green: { from: 'from-green-100', to: 'to-emerald-200', name: '绿色', darkFrom: 'from-gray-900', darkTo: 'to-emerald-950' },
  orange: { from: 'from-orange-100', to: 'to-amber-200', name: '橙色', darkFrom: 'from-gray-900', darkTo: 'to-amber-950' },
  pink: { from: 'from-pink-100', to: 'to-rose-200', name: '粉色', darkFrom: 'from-gray-900', darkTo: 'to-rose-950' }
};

// 应用状态
class DailyPlanner {
  private currentDate: Date;
  private selectedDate: Date | null;
  private hoveredDate: Date | null;
  private tasks: DateTasks;
  private anniversaries: Anniversary[];
  private monthlyFilter: MonthlyFilter;
  private showStatsModal: boolean;
  private showYearlyStats: boolean = false;  // 是否显示年度统计
  private showQuadrantView: boolean = false;  // 是否显示四象限视图
  private quadrantFilter: 'year' | 'month' | 'custom' = 'month';  // 四象限时间筛选
  private quadrantStartDate: string = '';  // 自定义开始日期
  private quadrantEndDate: string = '';  // 自定义结束日期
  private hoverTimer: number | null = null;
  private currentTheme: BackgroundTheme = 'blue';
  private themeMode: ThemeMode = 'light';
  private showThemeMenu: boolean = false;
  private showCopyModal: boolean = false;
  private copyingTask: Task | null = null;
  private selectedCopyDates: Set<string> = new Set();
  private holidayCache: HolidayCache = {};  // 节假日缓存
  private viewMode: ViewMode = 'month';  // 视图模式
  private searchQuery: string = '';  // 搜索关键词
  private showSearchPanel: boolean = false;  // 显示搜索面板
  private showReminderSettings: boolean = false;  // 显示提醒设置弹窗
  private showMonthPicker: boolean = false;  // 显示月份选择器
  private yearRangeOffset: number = 0;  // 年份选择器偏移量
  private selectedPickerYear: number = 0;  // 月份选择器中选中的年份
  private customTags: Tag[] = [];  // 自定义标签
  private selectedTagFilter: string = '';  // 标签筛选（空=全部）
  private showTagManager: boolean = false;  // 显示标签管理弹窗
  private selectedTagsForTask: Set<string> = new Set();  // 添加任务时选中的标签
  private tagOrder: string[] = [];  // 标签排序（存储标签ID顺序）
  private deletedDefaultTagIds: Set<string> = new Set();  // 已删除的预设标签ID
  private draggedTagId: string = '';  // 正在拖动的标签ID
  private showIconPicker: boolean = false;  // 显示图标选择器
  private selectedIcon: string = '🏷️';  // 选中的图标
  private showTaskPanel: boolean = false;  // 显示任务面板
  private preselectedTime: string = '';  // 预选时间（用于周视图点击时间格子）
  
  // 提醒配置
  private reminderConfig = {
    anniversary: 3,   // 纪念日提前3天
    high: 7,          // 高优先级提前7天
    medium: 5,        // 中优先级提前5天
    low: 3            // 低优先级提前3天
  };

  // 任务排序配置
  private taskSortBy: TaskSortBy = 'priority';
  
  // 日期自动更新
  private lastCheckedDate: string = '';  // 上次检查的日期字符串
  private dateCheckInterval: ReturnType<typeof setInterval> | null = null;  // 定时器ID

  constructor() {
    this.currentDate = new Date();
    this.selectedDate = null;
    this.hoveredDate = null;
    this.tasks = this.loadTasks();
    this.anniversaries = this.loadAnniversaries();
    this.customTags = this.loadCustomTags();  // 加载自定义标签
    this.tagOrder = this.loadTagOrder();  // 加载标签排序
    this.deletedDefaultTagIds = new Set(this.loadDeletedDefaultTagIds());  // 加载已删除的预设标签
    this.monthlyFilter = 'all';
    this.showStatsModal = false;
    this.currentTheme = this.loadTheme();
    this.themeMode = this.loadThemeMode();
    this.viewMode = this.loadViewMode();
    this.taskSortBy = this.loadTaskSortBy();
    this.holidayCache = this.loadHolidayCache();
    this.loadHolidaysForYear(this.currentDate.getFullYear());
    this.applyThemeMode();
    this.initElectronAPI();
    this.startDateAutoUpdate();  // 启动日期自动更新
    this.render();
  }

  // 加载任务排序配置
  private loadTaskSortBy(): TaskSortBy {
    const saved = localStorage.getItem('dailyPlannerTaskSortBy');
    return saved ? saved as TaskSortBy : 'priority';
  }

  // 启动日期自动更新（每分钟检查一次）
  private startDateAutoUpdate(): void {
    this.lastCheckedDate = this.formatDate(new Date());
    
    // 每分钟检查一次日期是否变化
    this.dateCheckInterval = setInterval(() => {
      this.checkDateChange();
    }, 60000); // 60秒检查一次
  }

  // 检查日期是否变化
  private checkDateChange(): void {
    const today = new Date();
    const todayStr = this.formatDate(today);
    
    // 如果日期变化了
    if (todayStr !== this.lastCheckedDate) {
      console.log('[日期更新] 检测到日期变化:', this.lastCheckedDate, '->', todayStr);
      
      // 更新记录的日期
      this.lastCheckedDate = todayStr;
      
      // 更新当前月份视图
      const oldMonth = this.currentDate.getMonth();
      const oldYear = this.currentDate.getFullYear();
      const newMonth = today.getMonth();
      const newYear = today.getFullYear();
      
      // 如果月份或年份变化，需要重新加载节假日数据
      if (oldMonth !== newMonth || oldYear !== newYear) {
        this.loadHolidaysForYear(newYear);
      }
      
      // 更新当前日期到新的一天的月份
      this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // 如果当前选中的是昨天的日期，自动切换到今天
      if (this.selectedDate) {
        const selectedStr = this.formatDate(this.selectedDate);
        if (selectedStr !== todayStr) {
          this.selectedDate = new Date(today);
        }
      }
      
      // 重新渲染界面
      this.render();
      
      // 显示通知
      this.showDateChangeNotification(today);
    }
  }

  // 显示日期变化通知
  private showDateChangeNotification(newDate: Date): void {
    const dateStr = this.formatDate(newDate);
    const lunarText = this.getLunarFullText(newDate);
    
    // 使用 Electron 的通知功能（如果可用）
    if (window.electronAPI?.sendNotification) {
      window.electronAPI.sendNotification(
        '新的一天开始了！',
        `今天是 ${dateStr}，农历 ${lunarText}`
      );
    }
  }

  // 停止日期自动更新（清理定时器）
  private stopDateAutoUpdate(): void {
    if (this.dateCheckInterval) {
      clearInterval(this.dateCheckInterval);
      this.dateCheckInterval = null;
    }
  }

  // 保存任务排序配置
  private saveTaskSortBy(sortBy: TaskSortBy): void {
    localStorage.setItem('dailyPlannerTaskSortBy', sortBy);
  }

  // ==================== 标签相关方法 ====================

  // 加载自定义标签
  private loadCustomTags(): Tag[] {
    const saved = localStorage.getItem('dailyPlannerCustomTags');
    return saved ? JSON.parse(saved) : [];
  }

  // 保存自定义标签
  private saveCustomTags(): void {
    localStorage.setItem('dailyPlannerCustomTags', JSON.stringify(this.customTags));
  }

  // 加载标签排序
  private loadTagOrder(): string[] {
    const saved = localStorage.getItem('dailyPlannerTagOrder');
    return saved ? JSON.parse(saved) : [];
  }

  // 保存标签排序
  private saveTagOrder(): void {
    localStorage.setItem('dailyPlannerTagOrder', JSON.stringify(this.tagOrder));
  }

  // 加载已删除的预设标签ID
  private loadDeletedDefaultTagIds(): string[] {
    const saved = localStorage.getItem('dailyPlannerDeletedDefaultTags');
    return saved ? JSON.parse(saved) : [];
  }

  // 保存已删除的预设标签ID
  private saveDeletedDefaultTagIds(): void {
    localStorage.setItem('dailyPlannerDeletedDefaultTags', JSON.stringify([...this.deletedDefaultTagIds]));
  }

  // 获取所有标签（预设 + 自定义），按排序排列，过滤已删除的预设标签
  private getAllTags(): Tag[] {
    // 过滤掉已删除的预设标签
    const availableDefaultTags = DEFAULT_TAGS.filter(t => !this.deletedDefaultTagIds.has(t.id));
    const allTags = [...availableDefaultTags, ...this.customTags];
    
    // 如果有自定义排序，按排序排列
    if (this.tagOrder.length > 0) {
      const orderedTags: Tag[] = [];
      const tagMap = new Map(allTags.map(t => [t.id, t]));
      
      // 先按排序顺序添加
      this.tagOrder.forEach(id => {
        const tag = tagMap.get(id);
        if (tag) {
          orderedTags.push(tag);
          tagMap.delete(id);
        }
      });
      
      // 再添加未在排序中的标签
      tagMap.forEach(tag => orderedTags.push(tag));
      
      return orderedTags;
    }
    
    return allTags;
  }

  // 根据ID获取标签
  private getTagById(id: string): Tag | undefined {
    return this.getAllTags().find(t => t.id === id);
  }

  // 开始拖动标签
  private onTagDragStart(event: DragEvent, tagId: string): void {
    event.stopPropagation(); // 阻止事件冒泡，防止触发弹窗关闭
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', tagId);
    this.draggedTagId = tagId;
  }

  // 拖动标签到目标位置
  private onTagDrop(event: DragEvent, targetTagId: string): void {
    event.stopPropagation(); // 阻止事件冒泡
    event.preventDefault(); // 阻止默认行为
    
    if (!this.draggedTagId || this.draggedTagId === targetTagId) {
      this.draggedTagId = '';
      return;
    }
    
    // 获取所有标签
    const allTags = this.getAllTags();
    
    // 如果没有排序，初始化为当前顺序
    if (this.tagOrder.length === 0) {
      this.tagOrder = allTags.map(t => t.id);
    }
    
    // 找到拖动标签和目标标签的位置
    const draggedIndex = this.tagOrder.indexOf(this.draggedTagId);
    const targetIndex = this.tagOrder.indexOf(targetTagId);
    
    if (draggedIndex >= 0 && targetIndex >= 0) {
      // 从原位置移除
      this.tagOrder.splice(draggedIndex, 1);
      // 插入到目标位置
      this.tagOrder.splice(targetIndex, 0, this.draggedTagId);
      this.saveTagOrder();
    }
    
    this.draggedTagId = '';
    this.render();
  }

  // 添加自定义标签
  private addCustomTag(name: string, color: string, icon: string): void {
    const id = 'custom-' + Date.now();
    this.customTags.push({
      id,
      name,
      color,
      textColor: this.getTextColorForBg(color),
      icon,
      isCustom: true
    });
    this.saveCustomTags();
    this.render();
  }

  // 删除自定义标签
  private deleteCustomTag(id: string): void {
    this.customTags = this.customTags.filter(t => t.id !== id);
    this.saveCustomTags();
    // 从所有任务中移除该标签
    Object.keys(this.tasks).forEach(date => {
      this.tasks[date].forEach(task => {
        if (task.tags) {
          task.tags = task.tags.filter(tid => tid !== id);
        }
      });
    });
    this.saveTasks();
    this.render();
  }

  // 删除任意标签（预设或自定义）
  private deleteTag(id: string): void {
    // 检查是否是预设标签
    const isDefaultTag = DEFAULT_TAGS.some(t => t.id === id);
    
    if (isDefaultTag) {
      // 删除预设标签：添加到已删除列表
      this.deletedDefaultTagIds.add(id);
      this.saveDeletedDefaultTagIds();
    } else {
      // 删除自定义标签
      this.deleteCustomTag(id);
      return;
    }
    
    // 从标签排序中移除
    this.tagOrder = this.tagOrder.filter(tid => tid !== id);
    this.saveTagOrder();
    
    // 从所有任务中移除该标签
    Object.keys(this.tasks).forEach(date => {
      this.tasks[date].forEach(task => {
        if (task.tags) {
          task.tags = task.tags.filter(tid => tid !== id);
        }
      });
    });
    this.saveTasks();
    this.render();
  }

  // 根据背景色获取文字色
  private getTextColorForBg(bgColor: string): string {
    const colorMap: Record<string, string> = {
      'bg-blue-100': 'text-blue-700',
      'bg-green-100': 'text-green-700',
      'bg-purple-100': 'text-purple-700',
      'bg-red-100': 'text-red-700',
      'bg-yellow-100': 'text-yellow-700',
      'bg-pink-100': 'text-pink-700',
      'bg-orange-100': 'text-orange-700',
      'bg-indigo-100': 'text-indigo-700',
      'bg-cyan-100': 'text-cyan-700',
      'bg-teal-100': 'text-teal-700',
    };
    return colorMap[bgColor] || 'text-gray-700';
  }

  // 切换标签筛选
  private toggleTagFilter(tagId: string): void {
    this.selectedTagFilter = this.selectedTagFilter === tagId ? '' : tagId;
    this.render();
  }

  // 切换标签管理弹窗
  private toggleTagManager(): void {
    this.showTagManager = !this.showTagManager;
    this.showIconPicker = false;  // 关闭图标选择器
    this.render();
  }

  // 切换图标选择器
  private toggleIconPicker(): void {
    this.showIconPicker = !this.showIconPicker;
    this.render();
  }

  // 选择图标
  private selectIcon(icon: string): void {
    this.selectedIcon = icon;
    this.showIconPicker = false;
    // 更新隐藏输入框的值
    const iconInput = document.getElementById('newTagIcon') as HTMLInputElement;
    if (iconInput) iconInput.value = icon;
    // 更新显示的图标
    const display = document.getElementById('selectedIconDisplay');
    if (display) display.textContent = icon;
  }

  // 切换任务标签选择
  private toggleTagSelection(tagId: string): void {
    if (this.selectedTagsForTask.has(tagId)) {
      this.selectedTagsForTask.delete(tagId);
    } else {
      this.selectedTagsForTask.add(tagId);
    }
    // 只更新标签按钮样式，不重新渲染整个页面
    document.querySelectorAll('.tag-select-btn').forEach(btn => {
      const id = btn.getAttribute('data-tag-id');
      if (id === tagId) {
        if (this.selectedTagsForTask.has(tagId)) {
          btn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-1');
          btn.innerHTML = btn.innerHTML.replace(/✓/g, '') + ' ✓';
        } else {
          btn.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-1');
          btn.innerHTML = btn.innerHTML.replace(/\s*✓/g, '');
        }
      }
    });
  }

  // 处理添加任务
  private handleAddTask(): void {
    const input = document.getElementById('taskInput') as HTMLInputElement;
    const prioritySelect = document.getElementById('prioritySelect') as HTMLSelectElement;
    const text = input.value;
    const priority = prioritySelect.value as TaskPriority;
    const tags = Array.from(this.selectedTagsForTask);
    
    this.addTask(text, priority, tags);
    
    // 清空输入和选择
    input.value = '';
    this.selectedTagsForTask.clear();
  }

  // 更新任务标签
  private updateTaskTags(taskId: string, tags: string[]): void {
    if (!this.selectedDate) return;
    const dateKey = this.formatDate(this.selectedDate);
    if (this.tasks[dateKey]) {
      const task = this.tasks[dateKey].find(t => t.id === taskId);
      if (task) {
        task.tags = tags;
        this.saveTasks();
        this.render();
      }
    }
  }

  // 快速添加标签的任务ID
  private quickTagTaskId: string = '';

  // 显示快速标签选择器
  private showQuickTagSelector(taskId: string): void {
    this.quickTagTaskId = taskId;
    this.render();
  }

  // 切换任务的某个标签
  private toggleTaskTag(tagId: string): void {
    if (!this.selectedDate || !this.quickTagTaskId) return;
    const dateKey = this.formatDate(this.selectedDate);
    if (this.tasks[dateKey]) {
      const task = this.tasks[dateKey].find(t => t.id === this.quickTagTaskId);
      if (task) {
        if (!task.tags) task.tags = [];
        const idx = task.tags.indexOf(tagId);
        if (idx >= 0) {
          task.tags.splice(idx, 1);
        } else {
          task.tags.push(tagId);
        }
        this.saveTasks();
        this.quickTagTaskId = '';
        this.render();
      }
    }
  }

  // 设置任务排序方式
  private setTaskSortBy(sortBy: TaskSortBy): void {
    this.taskSortBy = sortBy;
    this.saveTaskSortBy(sortBy);
    this.render();
  }

  // 获取排序后的任务列表
  private getSortedTasks(tasks: Task[]): Task[] {
    // 先按标签筛选
    let filtered = tasks;
    if (this.selectedTagFilter) {
      filtered = tasks.filter(t => (t.tags || []).includes(this.selectedTagFilter));
    }
    
    const sorted = [...filtered];
    
    switch (this.taskSortBy) {
      case 'priority':
        sorted.sort((a, b) => {
          const pa = getPriorityConfig(a.priority).order;
          const pb = getPriorityConfig(b.priority).order;
          if (pa !== pb) return pa - pb;
          return a.time.localeCompare(b.time);
        });
        break;
      case 'status':
        sorted.sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return a.time.localeCompare(b.time);
        });
        break;
      case 'time':
        sorted.sort((a, b) => a.time.localeCompare(b.time));
        break;
      case 'text':
        sorted.sort((a, b) => a.text.localeCompare(b.text));
        break;
    }
    
    return sorted;
  }

  // 初始化 Electron API
  private initElectronAPI(): void {
    // 检查是否在 Electron 环境中
    if (window.electronAPI) {
      // 监听窗口准备完成事件
      window.electronAPI.onWindowReady(() => {
        console.log('[Electron] 窗口准备完成');
        // 确保 DOM 渲染完成后重新渲染
        requestAnimationFrame(() => {
          this.render();
        });
      });

      // 获取窗口置顶状态
      window.electronAPI.isAlwaysOnTop().then(isOnTop => {
        this.isAlwaysOnTop = isOnTop;
      });
      
      // 监听主进程请求提醒数据
      window.electronAPI.onRequestReminderData(() => {
        this.sendReminderDataToMain();
      });

      // 监听跳转到日期
      window.electronAPI.onNavigateToDate((date: string) => {
        this.jumpToDate(date);
      });

      // 获取提醒配置
      window.electronAPI.getReminderConfig().then(config => {
        this.reminderConfig = config;
      });

      // ==================== 自动更新事件监听 ====================
      
      // 发现新版本
      window.electronAPI.onUpdateAvailable((info) => {
        console.log('[更新] 发现新版本:', info.version);
        this.updateAvailable = true;
        this.updateInfo = info;
        this.checkingForUpdate = false;
        // 只有手动检查时才弹出弹窗，自动检查静默下载
        if (this.isManualCheck) {
          this.showUpdateModal = true;
        }
        this.render();
      });

      // 没有新版本
      window.electronAPI.onUpdateNotAvailable(() => {
        console.log('[更新] 当前已是最新版本');
        this.checkingForUpdate = false;
        if (this.isManualCheck) {
          // 如果是手动检查，显示提示
          alert('当前已是最新版本！');
          this.showUpdateModal = false;
        }
        this.render();
      });

      // 下载进度
      window.electronAPI.onDownloadProgress((progress) => {
        console.log('[更新] 下载进度:', progress.percent.toFixed(1) + '%');
        this.downloadProgress = progress;
        this.render();
      });

      // 下载完成
      window.electronAPI.onUpdateDownloaded((info) => {
        console.log('[更新] 下载完成，准备安装');
        this.updateDownloaded = true;
        this.downloadProgress = null;
        this.render();
      });

      // 更新错误
      window.electronAPI.onUpdateError((error) => {
        console.error('[更新] 更新错误:', error);
        this.checkingForUpdate = false;
        this.downloadProgress = null;
        alert('更新失败: ' + error);
        this.render();
      });
    }
  }

  // 发送提醒数据到主进程
  private sendReminderDataToMain(): void {
    if (window.electronAPI) {
      window.electronAPI.sendReminderData({
        tasks: this.tasks,
        anniversaries: this.anniversaries
      });
    }
  }

  // 测试通知
  private testNotification(): void {
    if (window.electronAPI) {
      window.electronAPI.testNotification();
    } else {
      alert('通知功能仅在桌面应用中可用');
    }
  }

  // ==================== 窗口控制方法 ====================
  
  // 最小化到托盘
  private minimizeToTray(): void {
    if (window.electronAPI) {
      window.electronAPI.minimizeToTray();
    }
  }

  // 切换最大化
  private toggleMaximize(): void {
    if (window.electronAPI) {
      window.electronAPI.toggleMaximize();
    }
  }

  // 关闭到托盘
  private closeToTray(): void {
    if (window.electronAPI) {
      window.electronAPI.closeToTray();
    }
  }

  // 切换窗口置顶
  private async toggleAlwaysOnTop(): Promise<void> {
    if (window.electronAPI) {
      this.isAlwaysOnTop = await window.electronAPI.toggleAlwaysOnTop();
      this.render();
    }
  }

  // 播放提示音
  private playNotificationSound(type: 'success' | 'reminder' | 'error' = 'success'): void {
    // 使用 Web Audio API 播放提示音
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 不同类型使用不同频率
    const frequencies = {
      success: [523.25, 659.25, 783.99],  // C5, E5, G5 和弦
      reminder: [440, 554.37, 659.25],      // A4, C#5, E5 和弦
      error: [311.13, 392, 466.16]          // Eb4, G4, Bb4 和弦
    };
    
    const notes = frequencies[type];
    gainNode.gain.value = 0.1;
    
    notes.forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      osc.start(audioContext.currentTime + index * 0.1);
      osc.stop(audioContext.currentTime + 0.5);
    });
  }

  // ==================== 自动更新方法 ====================
  
  // 检查更新
  private checkForUpdate(): void {
    if (window.electronAPI) {
      this.checkingForUpdate = true;
      this.isManualCheck = true;  // 手动检查
      this.showUpdateModal = true;
      this.render();
      window.electronAPI.checkForUpdate();
    } else {
      alert('更新功能仅在桌面应用中可用');
    }
  }

  // 下载更新
  private downloadUpdate(): void {
    if (window.electronAPI) {
      window.electronAPI.downloadUpdate();
    }
  }

  // 安装更新（重启应用）
  private installUpdate(): void {
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  }

  // 关闭更新弹窗
  private closeUpdateModal(): void {
    this.showUpdateModal = false;
    this.isManualCheck = false;
    this.render();
  }

  // 从 localStorage 加载节假日缓存
  private loadHolidayCache(): HolidayCache {
    const saved = localStorage.getItem('dailyPlannerHolidays');
    return saved ? JSON.parse(saved) : {};
  }

  // 保存节假日缓存到 localStorage
  private saveHolidayCache(): void {
    localStorage.setItem('dailyPlannerHolidays', JSON.stringify(this.holidayCache));
  }

  // 加载指定年份的节假日数据
  private async loadHolidaysForYear(year: number): Promise<void> {
    const yearStr = year.toString();
    
    // 如果已经缓存了这一年的数据，则跳过
    if (this.holidayCache[yearStr]) {
      return;
    }

    // 使用本地硬编码的节假日数据（更可靠）
    const localHolidays = this.getLocalHolidays(year);
    if (localHolidays) {
      this.holidayCache[yearStr] = localHolidays;
      this.saveHolidayCache();
      return;
    }

    // 如果本地没有数据，尝试从缓存加载
    const savedCache = this.loadHolidayCache();
    if (savedCache[yearStr]) {
      this.holidayCache[yearStr] = savedCache[yearStr];
    }
  }

  // 获取本地硬编码的节假日数据（2024-2027年）
  private getLocalHolidays(year: number): Record<string, HolidayInfo> | null {
    const holidays: Record<string, HolidayInfo> = {};

    // 2024年节假日数据
    if (year === 2024) {
      // 元旦
      holidays['2024-01-01'] = { date: '2024-01-01', name: '元旦', holiday: true, wage: 1 };
      
      // 春节
      holidays['2024-02-10'] = { date: '2024-02-10', name: '春节', holiday: true, wage: 3 };
      holidays['2024-02-11'] = { date: '2024-02-11', name: '春节', holiday: true, wage: 3 };
      holidays['2024-02-12'] = { date: '2024-02-12', name: '春节', holiday: true, wage: 3 };
      holidays['2024-02-13'] = { date: '2024-02-13', name: '春节', holiday: true, wage: 1 };
      holidays['2024-02-14'] = { date: '2024-02-14', name: '春节', holiday: true, wage: 1 };
      holidays['2024-02-15'] = { date: '2024-02-15', name: '春节', holiday: true, wage: 1 };
      holidays['2024-02-16'] = { date: '2024-02-16', name: '春节', holiday: true, wage: 1 };
      holidays['2024-02-17'] = { date: '2024-02-17', name: '春节', holiday: true, wage: 1 };
      // 春节调休
      holidays['2024-02-04'] = { date: '2024-02-04', name: '春节', holiday: false, wage: 1 };
      holidays['2024-02-18'] = { date: '2024-02-18', name: '春节', holiday: false, wage: 1 };
      
      // 清明节
      holidays['2024-04-04'] = { date: '2024-04-04', name: '清明节', holiday: true, wage: 3 };
      holidays['2024-04-05'] = { date: '2024-04-05', name: '清明节', holiday: true, wage: 1 };
      holidays['2024-04-06'] = { date: '2024-04-06', name: '清明节', holiday: true, wage: 1 };
      // 清明调休
      holidays['2024-04-07'] = { date: '2024-04-07', name: '清明节', holiday: false, wage: 1 };
      
      // 劳动节
      holidays['2024-05-01'] = { date: '2024-05-01', name: '劳动节', holiday: true, wage: 3 };
      holidays['2024-05-02'] = { date: '2024-05-02', name: '劳动节', holiday: true, wage: 1 };
      holidays['2024-05-03'] = { date: '2024-05-03', name: '劳动节', holiday: true, wage: 1 };
      holidays['2024-05-04'] = { date: '2024-05-04', name: '劳动节', holiday: true, wage: 1 };
      holidays['2024-05-05'] = { date: '2024-05-05', name: '劳动节', holiday: true, wage: 1 };
      // 劳动节调休
      holidays['2024-04-28'] = { date: '2024-04-28', name: '劳动节', holiday: false, wage: 1 };
      holidays['2024-05-11'] = { date: '2024-05-11', name: '劳动节', holiday: false, wage: 1 };
      
      // 端午节
      holidays['2024-06-10'] = { date: '2024-06-10', name: '端午节', holiday: true, wage: 3 };
      // 端午调休
      holidays['2024-06-08'] = { date: '2024-06-08', name: '端午节', holiday: true, wage: 1 };
      holidays['2024-06-09'] = { date: '2024-06-09', name: '端午节', holiday: true, wage: 1 };
      
      // 中秋节
      holidays['2024-09-15'] = { date: '2024-09-15', name: '中秋节', holiday: true, wage: 1 };
      holidays['2024-09-16'] = { date: '2024-09-16', name: '中秋节', holiday: true, wage: 1 };
      holidays['2024-09-17'] = { date: '2024-09-17', name: '中秋节', holiday: true, wage: 3 };
      // 中秋调休
      holidays['2024-09-14'] = { date: '2024-09-14', name: '中秋节', holiday: false, wage: 1 };
      
      // 国庆节
      holidays['2024-10-01'] = { date: '2024-10-01', name: '国庆节', holiday: true, wage: 3 };
      holidays['2024-10-02'] = { date: '2024-10-02', name: '国庆节', holiday: true, wage: 3 };
      holidays['2024-10-03'] = { date: '2024-10-03', name: '国庆节', holiday: true, wage: 3 };
      holidays['2024-10-04'] = { date: '2024-10-04', name: '国庆节', holiday: true, wage: 1 };
      holidays['2024-10-05'] = { date: '2024-10-05', name: '国庆节', holiday: true, wage: 1 };
      holidays['2024-10-06'] = { date: '2024-10-06', name: '国庆节', holiday: true, wage: 1 };
      holidays['2024-10-07'] = { date: '2024-10-07', name: '国庆节', holiday: true, wage: 1 };
      // 国庆调休
      holidays['2024-09-29'] = { date: '2024-09-29', name: '国庆节', holiday: false, wage: 1 };
      holidays['2024-10-12'] = { date: '2024-10-12', name: '国庆节', holiday: false, wage: 1 };

      return holidays;
    }

    // 2025年节假日数据（国务院发布）
    if (year === 2025) {
      // 元旦
      holidays['2025-01-01'] = { date: '2025-01-01', name: '元旦', holiday: true, wage: 1 };
      
      // 春节
      holidays['2025-01-28'] = { date: '2025-01-28', name: '春节', holiday: true, wage: 1 };
      holidays['2025-01-29'] = { date: '2025-01-29', name: '春节', holiday: true, wage: 3 };
      holidays['2025-01-30'] = { date: '2025-01-30', name: '春节', holiday: true, wage: 3 };
      holidays['2025-01-31'] = { date: '2025-01-31', name: '春节', holiday: true, wage: 3 };
      holidays['2025-02-01'] = { date: '2025-02-01', name: '春节', holiday: true, wage: 1 };
      holidays['2025-02-02'] = { date: '2025-02-02', name: '春节', holiday: true, wage: 1 };
      holidays['2025-02-03'] = { date: '2025-02-03', name: '春节', holiday: true, wage: 1 };
      holidays['2025-02-04'] = { date: '2025-02-04', name: '春节', holiday: true, wage: 1 };
      // 春节调休
      holidays['2025-01-26'] = { date: '2025-01-26', name: '春节', holiday: false, wage: 1 };
      holidays['2025-02-08'] = { date: '2025-02-08', name: '春节', holiday: false, wage: 1 };
      
      // 清明节
      holidays['2025-04-04'] = { date: '2025-04-04', name: '清明节', holiday: true, wage: 3 };
      holidays['2025-04-05'] = { date: '2025-04-05', name: '清明节', holiday: true, wage: 1 };
      holidays['2025-04-06'] = { date: '2025-04-06', name: '清明节', holiday: true, wage: 1 };
      // 清明调休（2025年清明节不需要调休）
      
      // 劳动节
      holidays['2025-05-01'] = { date: '2025-05-01', name: '劳动节', holiday: true, wage: 3 };
      holidays['2025-05-02'] = { date: '2025-05-02', name: '劳动节', holiday: true, wage: 1 };
      holidays['2025-05-03'] = { date: '2025-05-03', name: '劳动节', holiday: true, wage: 1 };
      holidays['2025-05-04'] = { date: '2025-05-04', name: '劳动节', holiday: true, wage: 1 };
      holidays['2025-05-05'] = { date: '2025-05-05', name: '劳动节', holiday: true, wage: 1 };
      // 劳动节调休
      holidays['2025-04-27'] = { date: '2025-04-27', name: '劳动节', holiday: false, wage: 1 };
      
      // 端午节
      holidays['2025-05-31'] = { date: '2025-05-31', name: '端午节', holiday: true, wage: 3 };
      holidays['2025-06-01'] = { date: '2025-06-01', name: '端午节', holiday: true, wage: 1 };
      holidays['2025-06-02'] = { date: '2025-06-02', name: '端午节', holiday: true, wage: 1 };
      // 端午调休
      holidays['2025-05-25'] = { date: '2025-05-25', name: '端午节', holiday: false, wage: 1 };
      
      // 中秋节+国庆节（连休）
      holidays['2025-10-01'] = { date: '2025-10-01', name: '国庆节', holiday: true, wage: 3 };
      holidays['2025-10-02'] = { date: '2025-10-02', name: '国庆节', holiday: true, wage: 3 };
      holidays['2025-10-03'] = { date: '2025-10-03', name: '国庆节', holiday: true, wage: 3 };
      holidays['2025-10-04'] = { date: '2025-10-04', name: '中秋节', holiday: true, wage: 3 };
      holidays['2025-10-05'] = { date: '2025-10-05', name: '国庆节', holiday: true, wage: 1 };
      holidays['2025-10-06'] = { date: '2025-10-06', name: '国庆节', holiday: true, wage: 1 };
      holidays['2025-10-07'] = { date: '2025-10-07', name: '国庆节', holiday: true, wage: 1 };
      holidays['2025-10-08'] = { date: '2025-10-08', name: '国庆节', holiday: true, wage: 1 };
      // 国庆调休
      holidays['2025-09-28'] = { date: '2025-09-28', name: '国庆节', holiday: false, wage: 1 };
      holidays['2025-10-11'] = { date: '2025-10-11', name: '国庆节', holiday: false, wage: 1 };

      return holidays;
    }

    // 2026年节假日数据（预估版，国务院未正式发布）
    if (year === 2026) {
      // 元旦：1月1日是周四，放假1月1-3日
      holidays['2026-01-01'] = { date: '2026-01-01', name: '元旦', holiday: true, wage: 1 };
      holidays['2026-01-02'] = { date: '2026-01-02', name: '元旦', holiday: true, wage: 1 };
      holidays['2026-01-03'] = { date: '2026-01-03', name: '元旦', holiday: true, wage: 1 };
      // 元旦调休
      holidays['2026-01-04'] = { date: '2026-01-04', name: '元旦', holiday: false, wage: 1 }; // 周日上班
      
      // 春节：农历正月初一是2月17日（周二），放假除夕到初六
      holidays['2026-02-16'] = { date: '2026-02-16', name: '春节', holiday: true, wage: 1 }; // 除夕
      holidays['2026-02-17'] = { date: '2026-02-17', name: '春节', holiday: true, wage: 3 }; // 初一
      holidays['2026-02-18'] = { date: '2026-02-18', name: '春节', holiday: true, wage: 3 }; // 初二
      holidays['2026-02-19'] = { date: '2026-02-19', name: '春节', holiday: true, wage: 3 }; // 初三
      holidays['2026-02-20'] = { date: '2026-02-20', name: '春节', holiday: true, wage: 1 }; // 初四
      holidays['2026-02-21'] = { date: '2026-02-21', name: '春节', holiday: true, wage: 1 }; // 初五
      holidays['2026-02-22'] = { date: '2026-02-22', name: '春节', holiday: true, wage: 1 }; // 初六
      // 春节调休
      holidays['2026-02-14'] = { date: '2026-02-14', name: '春节', holiday: false, wage: 1 }; // 周六上班
      holidays['2026-02-28'] = { date: '2026-02-28', name: '春节', holiday: false, wage: 1 }; // 周六上班
      
      // 清明节：4月5日是周日，放假4月4-6日
      holidays['2026-04-04'] = { date: '2026-04-04', name: '清明节', holiday: true, wage: 1 };
      holidays['2026-04-05'] = { date: '2026-04-05', name: '清明节', holiday: true, wage: 3 };
      holidays['2026-04-06'] = { date: '2026-04-06', name: '清明节', holiday: true, wage: 1 };
      // 无需调休
      
      // 劳动节：5月1日是周五，放假5月1-5日
      holidays['2026-05-01'] = { date: '2026-05-01', name: '劳动节', holiday: true, wage: 3 };
      holidays['2026-05-02'] = { date: '2026-05-02', name: '劳动节', holiday: true, wage: 1 };
      holidays['2026-05-03'] = { date: '2026-05-03', name: '劳动节', holiday: true, wage: 1 };
      holidays['2026-05-04'] = { date: '2026-05-04', name: '劳动节', holiday: true, wage: 1 };
      holidays['2026-05-05'] = { date: '2026-05-05', name: '劳动节', holiday: true, wage: 1 };
      // 劳动节调休
      holidays['2026-04-26'] = { date: '2026-04-26', name: '劳动节', holiday: false, wage: 1 }; // 周日上班
      
      // 端午节：农历五月初五是5月31日（周日）
      holidays['2026-05-30'] = { date: '2026-05-30', name: '端午节', holiday: true, wage: 1 };
      holidays['2026-05-31'] = { date: '2026-05-31', name: '端午节', holiday: true, wage: 3 };
      holidays['2026-06-01'] = { date: '2026-06-01', name: '端午节', holiday: true, wage: 1 };
      // 无需调休
      
      // 中秋节：农历八月十五是9月25日（周五）
      holidays['2026-09-25'] = { date: '2026-09-25', name: '中秋节', holiday: true, wage: 3 };
      // 中秋+国庆连休
      
      // 国庆节：10月1日是周四，放假10月1-7日
      holidays['2026-10-01'] = { date: '2026-10-01', name: '国庆节', holiday: true, wage: 3 };
      holidays['2026-10-02'] = { date: '2026-10-02', name: '国庆节', holiday: true, wage: 3 };
      holidays['2026-10-03'] = { date: '2026-10-03', name: '国庆节', holiday: true, wage: 3 };
      holidays['2026-10-04'] = { date: '2026-10-04', name: '国庆节', holiday: true, wage: 1 };
      holidays['2026-10-05'] = { date: '2026-10-05', name: '国庆节', holiday: true, wage: 1 };
      holidays['2026-10-06'] = { date: '2026-10-06', name: '国庆节', holiday: true, wage: 1 };
      holidays['2026-10-07'] = { date: '2026-10-07', name: '国庆节', holiday: true, wage: 1 };
      // 国庆调休
      holidays['2026-09-27'] = { date: '2026-09-27', name: '国庆节', holiday: false, wage: 1 }; // 周日上班
      holidays['2026-10-10'] = { date: '2026-10-10', name: '国庆节', holiday: false, wage: 1 }; // 周六上班

      return holidays;
    }

    // 2027年节假日数据（预估版，国务院未正式发布）
    if (year === 2027) {
      // 元旦：1月1日是周五，放假1月1-3日（周五-周日）
      holidays['2027-01-01'] = { date: '2027-01-01', name: '元旦', holiday: true, wage: 1 };
      holidays['2027-01-02'] = { date: '2027-01-02', name: '元旦', holiday: true, wage: 1 };
      holidays['2027-01-03'] = { date: '2027-01-03', name: '元旦', holiday: true, wage: 1 };
      
      // 春节：农历正月初一是2月6日（周六），放假除夕到初六
      holidays['2027-02-05'] = { date: '2027-02-05', name: '春节', holiday: true, wage: 1 }; // 除夕
      holidays['2027-02-06'] = { date: '2027-02-06', name: '春节', holiday: true, wage: 3 }; // 初一
      holidays['2027-02-07'] = { date: '2027-02-07', name: '春节', holiday: true, wage: 3 }; // 初二
      holidays['2027-02-08'] = { date: '2027-02-08', name: '春节', holiday: true, wage: 3 }; // 初三
      holidays['2027-02-09'] = { date: '2027-02-09', name: '春节', holiday: true, wage: 1 }; // 初四
      holidays['2027-02-10'] = { date: '2027-02-10', name: '春节', holiday: true, wage: 1 }; // 初五
      holidays['2027-02-11'] = { date: '2027-02-11', name: '春节', holiday: true, wage: 1 }; // 初六
      // 春节调休
      holidays['2027-01-31'] = { date: '2027-01-31', name: '春节', holiday: false, wage: 1 }; // 周日上班
      holidays['2027-02-13'] = { date: '2027-02-13', name: '春节', holiday: false, wage: 1 }; // 周六上班
      
      // 清明节：4月5日是周一，放假4月3-5日（周六-周一）
      holidays['2027-04-03'] = { date: '2027-04-03', name: '清明节', holiday: true, wage: 1 };
      holidays['2027-04-04'] = { date: '2027-04-04', name: '清明节', holiday: true, wage: 1 };
      holidays['2027-04-05'] = { date: '2027-04-05', name: '清明节', holiday: true, wage: 3 };
      // 无需调休
      
      // 劳动节：5月1日是周六，放假5月1-5日
      holidays['2027-05-01'] = { date: '2027-05-01', name: '劳动节', holiday: true, wage: 3 };
      holidays['2027-05-02'] = { date: '2027-05-02', name: '劳动节', holiday: true, wage: 1 };
      holidays['2027-05-03'] = { date: '2027-05-03', name: '劳动节', holiday: true, wage: 1 };
      holidays['2027-05-04'] = { date: '2027-05-04', name: '劳动节', holiday: true, wage: 1 };
      holidays['2027-05-05'] = { date: '2027-05-05', name: '劳动节', holiday: true, wage: 1 };
      // 劳动节调休
      holidays['2027-04-25'] = { date: '2027-04-25', name: '劳动节', holiday: false, wage: 1 }; // 周日上班
      holidays['2027-05-08'] = { date: '2027-05-08', name: '劳动节', holiday: false, wage: 1 }; // 周六上班
      
      // 端午节：农历五月初五是6月5日（周六），放假6月5-7日
      holidays['2027-06-05'] = { date: '2027-06-05', name: '端午节', holiday: true, wage: 3 };
      holidays['2027-06-06'] = { date: '2027-06-06', name: '端午节', holiday: true, wage: 1 };
      holidays['2027-06-07'] = { date: '2027-06-07', name: '端午节', holiday: true, wage: 1 };
      // 无需调休
      
      // 中秋节：农历八月十五是9月15日（周三），放假9月15-17日
      holidays['2027-09-15'] = { date: '2027-09-15', name: '中秋节', holiday: true, wage: 3 };
      holidays['2027-09-16'] = { date: '2027-09-16', name: '中秋节', holiday: true, wage: 1 };
      holidays['2027-09-17'] = { date: '2027-09-17', name: '中秋节', holiday: true, wage: 1 };
      // 中秋调休
      holidays['2027-09-19'] = { date: '2027-09-19', name: '中秋节', holiday: false, wage: 1 }; // 周日上班
      
      // 国庆节：10月1日是周五，放假10月1-7日
      holidays['2027-10-01'] = { date: '2027-10-01', name: '国庆节', holiday: true, wage: 3 };
      holidays['2027-10-02'] = { date: '2027-10-02', name: '国庆节', holiday: true, wage: 3 };
      holidays['2027-10-03'] = { date: '2027-10-03', name: '国庆节', holiday: true, wage: 3 };
      holidays['2027-10-04'] = { date: '2027-10-04', name: '国庆节', holiday: true, wage: 1 };
      holidays['2027-10-05'] = { date: '2027-10-05', name: '国庆节', holiday: true, wage: 1 };
      holidays['2027-10-06'] = { date: '2027-10-06', name: '国庆节', holiday: true, wage: 1 };
      holidays['2027-10-07'] = { date: '2027-10-07', name: '国庆节', holiday: true, wage: 1 };
      // 国庆调休
      holidays['2027-09-26'] = { date: '2027-09-26', name: '国庆节', holiday: false, wage: 1 }; // 周日上班
      holidays['2027-10-09'] = { date: '2027-10-09', name: '国庆节', holiday: false, wage: 1 }; // 周六上班

      return holidays;
    }

    return null;
  }

  // 获取农历信息
  private getLunarInfo(date: Date): { day: string; month: string; jieQi: string | null; festival: string | null } {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    
    // 农历日
    const lunarDay = lunar.getDayInChinese();
    
    // 农历月（中文月份名：正、二、三...）
    const lunarMonth = lunar.getMonthInChinese();
    
    // 节气
    const jieQi = lunar.getJieQi();
    
    // 农历节日
    const festivals = lunar.getFestivals();
    const festival = festivals && festivals.length > 0 ? festivals[0] : null;
    
    return {
      day: lunarDay,
      month: lunarMonth,
      jieQi: jieQi || null,
      festival: festival || null
    };
  }

  // 获取农历显示文本（用于日历格子，优先显示节气/节日，否则显示农历日）
  private getLunarDisplayText(date: Date): string {
    const lunarInfo = this.getLunarInfo(date);
    
    // 优先显示节气
    if (lunarInfo.jieQi) {
      return lunarInfo.jieQi;
    }
    
    // 其次显示农历节日
    if (lunarInfo.festival) {
      return lunarInfo.festival;
    }
    
    // 初一显示月份（如"正月"、"二月"）
    if (lunarInfo.day === '初一') {
      return lunarInfo.month + '月';
    }
    
    // 其他显示农历日（如"初二"、"十五"、"廿三"）
    return lunarInfo.day;
  }

  // 获取完整农历文本（用于任务面板，显示月份+日期）
  private getLunarFullText(date: Date): string {
    const lunarInfo = this.getLunarInfo(date);
    
    // 节气：显示月份+节气
    if (lunarInfo.jieQi) {
      return lunarInfo.month + '月 ' + lunarInfo.jieQi;
    }
    
    // 农历节日：显示月份+节日
    if (lunarInfo.festival) {
      return lunarInfo.month + '月' + lunarInfo.day + ' ' + lunarInfo.festival;
    }
    
    // 其他：显示月份+日期（如"二月廿一"）
    return lunarInfo.month + '月' + lunarInfo.day;
  }

  // 判断是否是节气日
  private isJieQiDay(date: Date): boolean {
    const lunarInfo = this.getLunarInfo(date);
    return lunarInfo.jieQi !== null;
  }

  // 获取指定日期的节假日信息
  private getHolidayInfo(date: Date): HolidayInfo | null {
    const yearStr = date.getFullYear().toString();
    const dateKey = this.formatDate(date);
    
    // 如果没有这一年的缓存，尝试加载
    if (!this.holidayCache[yearStr]) {
      this.loadHolidaysForYear(date.getFullYear());
      return null;
    }

    return this.holidayCache[yearStr][dateKey] || null;
  }

  // 判断是否是实际工作日（考虑调休）
  private isActualWorkday(date: Date): boolean {
    const holidayInfo = this.getHolidayInfo(date);
    
    // 如果有节假日数据
    if (holidayInfo) {
      // 如果是假日（包括法定假日和普通假日）
      if (holidayInfo.holiday) {
        return false;
      }
      // 如果是调休工作日（周末需要上班）
      return true;
    }
    
    // 没有节假日数据时，默认周一到周五是工作日
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  // 判断是否是法定假日（三倍工资）
  private isLegalHoliday(date: Date): boolean {
    const holidayInfo = this.getHolidayInfo(date);
    return holidayInfo?.wage === 3;
  }

  // 获取节假日显示名称
  private getHolidayDisplayName(date: Date): string | null {
    const holidayInfo = this.getHolidayInfo(date);
    if (!holidayInfo) return null;
    
    if (holidayInfo.holiday) {
      return holidayInfo.name;
    } else if (!holidayInfo.holiday) {
      return `补班(${holidayInfo.name})`;
    }
    
    return null;
  }

  // 从 localStorage 加载任务
  private loadTasks(): DateTasks {
    const saved = localStorage.getItem('dailyPlannerTasks');
    return saved ? JSON.parse(saved) : {};
  }

  // 保存任务到 localStorage
  private saveTasks(): void {
    localStorage.setItem('dailyPlannerTasks', JSON.stringify(this.tasks));
  }

  // 加载主题设置
  private loadTheme(): BackgroundTheme {
    const saved = localStorage.getItem('dailyPlannerTheme');
    return saved ? saved as BackgroundTheme : 'blue';
  }

  // 保存主题设置
  private saveTheme(theme: BackgroundTheme): void {
    localStorage.setItem('dailyPlannerTheme', theme);
  }

  // 加载主题模式（明/暗）
  private loadThemeMode(): ThemeMode {
    const saved = localStorage.getItem('dailyPlannerThemeMode');
    return saved ? saved as ThemeMode : 'light';
  }

  // 保存主题模式
  private saveThemeMode(mode: ThemeMode): void {
    localStorage.setItem('dailyPlannerThemeMode', mode);
  }

  // 应用主题模式到页面
  private applyThemeMode(): void {
    if (this.themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // 切换主题模式
  private toggleThemeMode(): void {
    this.themeMode = this.themeMode === 'light' ? 'dark' : 'light';
    this.saveThemeMode(this.themeMode);
    this.applyThemeMode();
    this.render();
  }

  // 加载视图模式
  private loadViewMode(): ViewMode {
    const saved = localStorage.getItem('dailyPlannerViewMode');
    return saved ? saved as ViewMode : 'month';
  }

  // 保存视图模式
  private saveViewMode(mode: ViewMode): void {
    localStorage.setItem('dailyPlannerViewMode', mode);
  }

  // 切换视图模式
  private setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.saveViewMode(mode);
    this.render();
  }

  // 加载纪念日
  private loadAnniversaries(): Anniversary[] {
    const saved = localStorage.getItem('dailyPlannerAnniversaries');
    return saved ? JSON.parse(saved) : [];
  }

  // 保存纪念日
  private saveAnniversaries(): void {
    localStorage.setItem('dailyPlannerAnniversaries', JSON.stringify(this.anniversaries));
  }

  // 切换主题
  private setTheme(theme: BackgroundTheme): void {
    this.currentTheme = theme;
    this.saveTheme(theme);
    this.showThemeMenu = false;
    this.render();
  }

  // 切换主题菜单显示/隐藏
  private toggleThemeMenu(): void {
    this.showThemeMenu = !this.showThemeMenu;

    // 打开主题菜单时，关闭其他弹窗并清除悬停状态
    if (this.showThemeMenu) {
      this.showStatsModal = false;
      this.showCopyModal = false;
      this.hoveredDate = null;
    }

    this.render();
  }

  // 格式化日期为 YYYY-MM-DD
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 获取当前时间 HH:MM
  private getCurrentTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // 获取当前显示日期的任务
  private getDisplayDate(): Date | null {
    // 优先使用选中的日期，如果没有则使用悬停的日期
    return this.selectedDate || this.hoveredDate;
  }

  // 获取选中日期的任务
  private getSelectedDateTasks(): Task[] {
    const displayDate = this.getDisplayDate();
    if (!displayDate) return [];
    const dateKey = this.formatDate(displayDate);
    return this.tasks[dateKey] || [];
  }

  // 获取本月的统计数据
  private getMonthlyStats(): MonthlyStats {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    let total = 0;
    let completed = 0;

    if (this.viewMode === 'month') {
      // 月视图：统计整月
      const lastDay = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= lastDay; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = this.tasks[dateKey] || [];

        total += dayTasks.length;
        completed += dayTasks.filter(task => task.completed).length;
      }
    } else if (this.viewMode === 'week') {
      // 周视图：统计本周（周一开始）
      const weekStart = new Date(this.currentDate);
      const dayOfWeek = weekStart.getDay();
      const adjustedDayOfWeek = (dayOfWeek + 6) % 7;
      weekStart.setDate(weekStart.getDate() - adjustedDayOfWeek);

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = this.formatDate(date);
        const dayTasks = this.tasks[dateKey] || [];

        total += dayTasks.length;
        completed += dayTasks.filter(task => task.completed).length;
      }
    } else {
      // 日视图：统计当天
      const dateKey = this.formatDate(this.currentDate);
      const dayTasks = this.tasks[dateKey] || [];

      total = dayTasks.length;
      completed = dayTasks.filter(task => task.completed).length;
    }

    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, percentage };
  }

  // 获取当前视图的所有任务（根据筛选条件）
  private getFilteredMonthlyTasks(): Array<{ date: string; task: Task }> {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const allTasks: Array<{ date: string; task: Task }> = [];

    let dateKeys: string[] = [];

    if (this.viewMode === 'month') {
      // 月视图：获取整月日期
      const lastDay = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= lastDay; day++) {
        dateKeys.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    } else if (this.viewMode === 'week') {
      // 周视图：获取本周日期（周一开始）
      const weekStart = new Date(this.currentDate);
      const dayOfWeek = weekStart.getDay();
      const adjustedDayOfWeek = (dayOfWeek + 6) % 7;
      weekStart.setDate(weekStart.getDate() - adjustedDayOfWeek);

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        dateKeys.push(this.formatDate(date));
      }
    } else {
      // 日视图：获取当天日期
      dateKeys.push(this.formatDate(this.currentDate));
    }

    dateKeys.forEach(dateKey => {
      const dayTasks = this.tasks[dateKey] || [];

      dayTasks.forEach(task => {
        if (this.monthlyFilter === 'all') {
          allTasks.push({ date: dateKey, task });
        } else if (this.monthlyFilter === 'completed' && task.completed) {
          allTasks.push({ date: dateKey, task });
        } else if (this.monthlyFilter === 'pending' && !task.completed) {
          allTasks.push({ date: dateKey, task });
        }
      });
    });

    return allTasks;
  }

  // 添加任务
  private addTask(text: string, priority: TaskPriority = 'normal', tags: string[] = []): void {
    // 验证：不允许添加空任务或只有空格的任务
    if (!text || text.trim() === '') {
      alert('请输入任务内容');
      return;
    }

    if (!this.selectedDate) return;
    
    const dateKey = this.formatDate(this.selectedDate);
    
    if (!this.tasks[dateKey]) {
      this.tasks[dateKey] = [];
    }
    this.tasks[dateKey].push({
      id: Date.now().toString(),
      text: text.trim(), // 去除首尾空格
      completed: false,
      date: dateKey,
      time: this.getCurrentTime(),
      priority: priority,
      tags: tags
    });
    this.saveTasks();
    this.render(); // 重新渲染整个页面
  }

  // 更新任务优先级
  private updateTaskPriority(taskId: string, priority: TaskPriority): void {
    if (!this.selectedDate) return;
    const dateKey = this.formatDate(this.selectedDate);
    if (this.tasks[dateKey]) {
      const task = this.tasks[dateKey].find(t => t.id === taskId);
      if (task) {
        task.priority = priority;
        this.saveTasks();
        this.render(); // 重新渲染整个页面以更新周视图颜色
      }
    }
  }

  // 删除任务
  private deleteTask(taskId: string): void {
    if (!this.selectedDate) return;
    const dateKey = this.formatDate(this.selectedDate);
    if (this.tasks[dateKey]) {
      this.tasks[dateKey] = this.tasks[dateKey].filter(task => task.id !== taskId);
      this.saveTasks();
      this.render(); // 重新渲染整个页面
    }
  }

  // 切换任务完成状态
  private toggleTask(taskId: string): void {
    if (!this.selectedDate) return;
    const dateKey = this.formatDate(this.selectedDate);
    if (this.tasks[dateKey]) {
      const task = this.tasks[dateKey].find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        this.saveTasks();
        // 播放提示音
        if (task.completed) {
          this.playNotificationSound('success');
        }
        this.render(); // 重新渲染整个页面
      }
    }
  }

  // 打开复制任务弹窗
  private openCopyModal(taskId: string): void {
    if (!this.selectedDate) return;
    const dateKey = this.formatDate(this.selectedDate);
    if (this.tasks[dateKey]) {
      const task = this.tasks[dateKey].find(t => t.id === taskId);
      if (task) {
        this.copyingTask = task;
        this.selectedCopyDates = new Set();
        this.showCopyModal = true;

        // 关闭其他弹窗并清除悬停状态
        this.showStatsModal = false;
        this.showThemeMenu = false;
        this.hoveredDate = null;

        this.render();
      }
    }
  }

  // 关闭复制任务弹窗
  private closeCopyModal(): void {
    this.showCopyModal = false;
    this.copyingTask = null;
    this.selectedCopyDates = new Set();
    this.render();
  }

  // 切换复制的日期选中状态
  private toggleCopyDate(date: string): void {
    if (this.selectedCopyDates.has(date)) {
      this.selectedCopyDates.delete(date);
    } else {
      this.selectedCopyDates.add(date);
    }
    this.render();
  }

  // 全选/取消全选本月日期
  private toggleAllMonthDates(selectAll: boolean): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    this.selectedCopyDates.clear();

    if (selectAll) {
      for (let day = 1; day <= lastDay; day++) {
        const dateKey = this.formatDate(new Date(year, month, day));
        // 跳过当前选中的日期（避免重复）
        if (this.selectedDate && this.formatDate(this.selectedDate) !== dateKey) {
          this.selectedCopyDates.add(dateKey);
        }
      }
    }

    this.render();
  }

  // 全选工作日（考虑调休）
  private selectWorkdays(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    this.selectedCopyDates.clear();

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day);
      // 使用 isActualWorkday 方法，考虑调休情况
      const isWorkday = this.isActualWorkday(date);

      if (isWorkday) {
        const dateKey = this.formatDate(date);
        // 跳过当前选中的日期（避免重复）
        if (this.selectedDate && this.formatDate(this.selectedDate) !== dateKey) {
          this.selectedCopyDates.add(dateKey);
        }
      }
    }

    this.render();
  }

  // 确认复制任务
  private confirmCopyTask(): void {
    if (!this.copyingTask || this.selectedCopyDates.size === 0) {
      alert('请至少选择一个日期');
      return;
    }

    // 复制任务到选中的日期
    this.selectedCopyDates.forEach(date => {
      if (!this.tasks[date]) {
        this.tasks[date] = [];
      }
      this.tasks[date].push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: this.copyingTask!.text,
        completed: false,
        date,
        time: this.getCurrentTime(),
        priority: this.copyingTask!.priority,
        tags: this.copyingTask!.tags || []
      });
    });

    this.saveTasks();
    this.closeCopyModal();
    this.updateTaskPanel();
    this.updateCalendarIndicators();
  }

  // 拖拽任务开始
  private draggedTaskId: string | null = null;

  private onTaskDragStart(event: DragEvent, taskId: string): void {
    this.draggedTaskId = taskId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', taskId);
    }
  }

  // 拖拽任务到日期
  private onDateDrop(event: DragEvent, targetDate: Date): void {
    event.preventDefault();
    if (!this.draggedTaskId || !this.selectedDate) return;

    const sourceDateKey = this.formatDate(this.selectedDate);
    const targetDateKey = this.formatDate(targetDate);

    if (sourceDateKey === targetDateKey) return;

    // 找到并移动任务
    const taskIndex = this.tasks[sourceDateKey]?.findIndex(t => t.id === this.draggedTaskId);
    if (taskIndex === undefined || taskIndex === -1) return;

    const task = this.tasks[sourceDateKey].splice(taskIndex, 1)[0];
    task.date = targetDateKey;

    if (!this.tasks[targetDateKey]) {
      this.tasks[targetDateKey] = [];
    }
    this.tasks[targetDateKey].push(task);

    this.saveTasks();
    this.draggedTaskId = null;
    this.updateTaskPanel();
    this.updateCalendarIndicators();
  }

  // 搜索任务
  private searchTasks(query: string): Array<{ date: string; task: Task }> {
    const results: Array<{ date: string; task: Task }> = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(this.tasks).forEach(([date, tasks]) => {
      tasks.forEach(task => {
        if (task.text.toLowerCase().includes(lowerQuery)) {
          results.push({ date, task });
        }
      });
    });

    // 按日期倒序排列
    results.sort((a, b) => b.date.localeCompare(a.date));
    return results.slice(0, 50); // 最多返回50条
  }

  // 切换搜索面板
  private toggleSearchPanel(): void {
    this.showSearchPanel = !this.showSearchPanel;
    if (!this.showSearchPanel) {
      this.searchQuery = '';
    }
    this.render();
  }

  // 执行搜索（不重新渲染整个面板，只更新结果列表）
  private performSearch(query: string): void {
    this.searchQuery = query;
    this.updateSearchResults();
  }

  // 更新搜索结果（DOM 操作，避免输入框失焦）
  private updateSearchResults(): void {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    const isDark = this.themeMode === 'dark';
    const textClass = isDark ? 'text-gray-200' : 'text-gray-700';
    const results = this.searchQuery ? this.searchTasks(this.searchQuery) : [];

    if (results.length > 0) {
      resultsContainer.innerHTML = results.map(({ date, task }) => `
        <div class="flex items-center gap-3 p-3 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg cursor-pointer transition-colors"
             onclick="planner.jumpToDate('${date}')">
          <input type="checkbox" ${task.completed ? 'checked' : ''} class="pointer-events-none" disabled>
          <span class="flex-1 ${task.completed ? 'line-through text-gray-400' : textClass}">${task.text}</span>
          <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${date}</span>
          <span class="text-xs px-2 py-1 rounded ${getPriorityConfig(task.priority).bgColor} ${getPriorityConfig(task.priority).color}">${getPriorityConfig(task.priority).shortLabel}</span>
        </div>
      `).join('');
    } else if (this.searchQuery) {
      resultsContainer.innerHTML = `<p class="text-center text-gray-400 py-8">未找到匹配的任务</p>`;
    } else {
      resultsContainer.innerHTML = `<p class="text-center text-gray-400 py-8">输入关键词搜索任务</p>`;
    }
  }

  // 跳转到日期
  private jumpToDate(dateStr: string): void {
    const date = new Date(dateStr);
    this.currentDate = new Date(date);
    this.selectedDate = new Date(date);
    this.showSearchPanel = false;
    this.searchQuery = '';
    this.loadHolidaysForYear(date.getFullYear());
    this.render();
  }

  // 导出数据为JSON
  private exportToJSON(): void {
    const data = {
      version: APP_VERSION,
      tasks: this.tasks,
      anniversaries: this.anniversaries,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-planner-${this.formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 从 JSON 导入数据
  private importFromJSON(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          
          // 验证数据格式
          if (!data.tasks || typeof data.tasks !== 'object') {
            alert('无效的数据文件：缺少任务数据');
            return;
          }

          // 确认是否覆盖现有数据
          const confirmMsg = '导入将覆盖现有数据，是否继续？\n\n建议先导出当前数据备份。';
          if (!confirm(confirmMsg)) return;

          // 导入数据
          this.tasks = data.tasks || {};
          this.anniversaries = data.anniversaries || [];
          this.saveTasks();
          this.saveAnniversaries();
          
          // 清除节假日缓存，重新加载
          this.holidayCache = {};
          this.loadHolidaysForYear(this.currentDate.getFullYear());
          
          alert('数据导入成功！');
          this.render();
        } catch (error) {
          alert('数据导入失败：文件格式错误');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // 导出数据为CSV
  private exportToCSV(): void {
    let csv = '日期,任务内容,状态,优先级,时间\n';
    
    Object.entries(this.tasks).forEach(([date, tasks]) => {
      tasks.forEach(task => {
        const status = task.completed ? '已完成' : '未完成';
        const priorityLabel = getPriorityConfig(task.priority).label;
        csv += `${date},"${task.text}",${status},${priorityLabel},${task.time}\n`;
      });
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-planner-${this.formatDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 获取年度统计
  private getYearlyStats(): { total: number; completed: number; byMonth: { month: number; total: number; completed: number }[] } {
    const year = this.currentDate.getFullYear();
    let total = 0;
    let completed = 0;
    const byMonth: { month: number; total: number; completed: number }[] = [];

    for (let month = 0; month < 12; month++) {
      let monthTotal = 0;
      let monthCompleted = 0;
      const lastDay = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= lastDay; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = this.tasks[dateKey] || [];
        monthTotal += dayTasks.length;
        monthCompleted += dayTasks.filter(t => t.completed).length;
      }

      byMonth.push({ month: month + 1, total: monthTotal, completed: monthCompleted });
      total += monthTotal;
      completed += monthCompleted;
    }

    return { total, completed, byMonth };
  }

  // 添加纪念日
  private addAnniversary(name: string, month: number, day: number, type: 'birthday' | 'anniversary' | 'custom', isLunar: boolean = false): void {
    this.anniversaries.push({
      id: Date.now().toString(),
      name,
      month,
      day,
      type,
      isLunar
    });
    this.saveAnniversaries();
    this.render();
  }

  // 处理添加纪念日（带验证）
  private handleAddAnniversary(): void {
    const nameInput = document.getElementById('anniversaryName') as HTMLInputElement;
    const monthInput = document.getElementById('anniversaryMonth') as HTMLInputElement;
    const dayInput = document.getElementById('anniversaryDay') as HTMLInputElement;
    const typeSelect = document.getElementById('anniversaryType') as HTMLSelectElement;
    const calendarSelect = document.getElementById('anniversaryCalendar') as HTMLSelectElement;

    const name = nameInput.value.trim();
    const month = parseInt(monthInput.value);
    const day = parseInt(dayInput.value);
    const type = typeSelect.value as 'birthday' | 'anniversary' | 'custom';
    const isLunar = calendarSelect.value === 'lunar';

    // 验证输入
    if (!name) {
      alert('请输入纪念日名称');
      nameInput.focus();
      return;
    }

    if (isNaN(month) || month < 1 || month > 12) {
      alert('请输入有效的月份（1-12）');
      monthInput.focus();
      return;
    }

    if (isNaN(day) || day < 1 || day > 31) {
      alert('请输入有效的日期（1-31）');
      dayInput.focus();
      return;
    }

    // 公历日期验证
    if (!isLunar) {
      const testDate = new Date(2024, month - 1, day);
      if (testDate.getMonth() !== month - 1) {
        alert('该日期不存在，请检查月份和日期');
        return;
      }
    } else {
      // 农历日期验证（农历月份1-12，日期1-30）
      if (day > 30) {
        alert('农历日期最大为30天');
        return;
      }
    }

    this.addAnniversary(name, month, day, type, isLunar);

    // 清空输入框
    nameInput.value = '';
    monthInput.value = '';
    dayInput.value = '';
    typeSelect.value = 'birthday';
    calendarSelect.value = 'solar';
  }

  // 删除纪念日
  private deleteAnniversary(id: string): void {
    this.anniversaries = this.anniversaries.filter(a => a.id !== id);
    this.saveAnniversaries();
    this.render();
  }

  // 检查日期是否匹配纪念日（支持农历）
  private checkAnniversaryMatch(date: Date, anniversary: Anniversary): boolean {
    if (anniversary.isLunar) {
      // 农历纪念日：将当前日期转换为农历进行比较
      const solar = Solar.fromDate(date);
      const lunar = solar.getLunar();
      return lunar.getMonth() === anniversary.month && lunar.getDay() === anniversary.day;
    } else {
      // 公历纪念日：直接比较月日
      return date.getMonth() + 1 === anniversary.month && date.getDate() === anniversary.day;
    }
  }

  // 获取匹配当前日期的纪念日列表
  private getMatchingAnniversaries(date: Date): Anniversary[] {
    return this.anniversaries.filter(a => this.checkAnniversaryMatch(date, a));
  }

  // 切换月份
  private changeMonth(delta: number): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    if (this.selectedDate) {
      this.selectedDate = new Date(this.currentDate);
    }
    // 加载新月份对应年份的节假日数据
    this.loadHolidaysForYear(this.currentDate.getFullYear());
    this.showMonthPicker = false;
    this.render();
  }

  // 切换月份选择器显示
  private toggleMonthPicker(): void {
    this.showMonthPicker = !this.showMonthPicker;
    if (this.showMonthPicker) {
      // 打开选择器时初始化选中年份
      this.selectedPickerYear = this.currentDate.getFullYear();
      this.yearRangeOffset = 0;
    }
    this.render();
  }

  // 选择年份（只更新选择器中的年份，不关闭）
  private selectPickerYear(year: number): void {
    this.selectedPickerYear = year;
    this.render();
  }

  // 选择月份（真正改变日历并关闭选择器）
  private selectPickerMonth(month: number): void {
    this.currentDate = new Date(this.selectedPickerYear, month, 1);
    if (this.selectedDate) {
      this.selectedDate = new Date(this.selectedPickerYear, month, 1);
    }
    this.loadHolidaysForYear(this.selectedPickerYear);
    this.showMonthPicker = false;
    this.render();
  }

  // 生成年份选择器
  private generateYearSelectorHTML(currentYear: number, isDark: boolean): string {
    const years: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      years.push(y);
    }
    
    return `
      <div class="flex items-center gap-2 mb-3">
        <button onclick="planner.shiftYearRange(-10)"
                class="p-1 ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} rounded transition-colors">
          <svg class="w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
          </svg>
        </button>
        <div class="flex gap-1 flex-1 justify-center">
          ${years.slice(0, 5).map(y => `
            <button onclick="planner.selectYearAndMonth(${y}, ${this.currentDate.getMonth()})"
                    class="px-2 py-1 text-sm rounded transition-colors ${y === currentYear 
                      ? 'bg-blue-500 text-white' 
                      : (isDark ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-700')}">
              ${y}
            </button>
          `).join('')}
        </div>
        <button onclick="planner.shiftYearRange(10)"
                class="p-1 ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'} rounded transition-colors">
          <svg class="w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7m-8-14l7 7-7 7"/>
          </svg>
        </button>
      </div>
    `;
  }

  // 跳转到今天
  private jumpToToday(): void {
    const today = new Date();
    
    // 根据视图模式设置 currentDate
    if (this.viewMode === 'month') {
      // 月视图：设置为月份第一天
      this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      // 周视图和日视图：设置为今天
      this.currentDate = new Date(today);
    }
    
    this.selectedDate = new Date(today);
    this.hoveredDate = null;
    this.loadHolidaysForYear(today.getFullYear());
    this.render();
  }

  // 编辑任务
  private editTask(taskId: string, newText: string): void {
    if (!this.selectedDate) return;
    const dateKey = this.formatDate(this.selectedDate);
    if (this.tasks[dateKey]) {
      const task = this.tasks[dateKey].find(t => t.id === taskId);
      if (task && newText.trim()) {
        task.text = newText.trim();
        this.saveTasks();
        this.render();
      }
    }
  }

  // 开始编辑任务（显示编辑输入框）
  private startEditTask(taskId: string): void {
    if (!this.selectedDate) return;
    const dateKey = this.formatDate(this.selectedDate);
    if (this.tasks[dateKey]) {
      const task = this.tasks[dateKey].find(t => t.id === taskId);
      if (task) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
          const textSpan = taskElement.querySelector('.task-text');
          if (textSpan) {
            const currentText = task.text;
            const isDark = this.themeMode === 'dark';
            textSpan.innerHTML = `
              <input type="text" 
                     class="flex-1 px-2 py-1 border ${isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-700'} rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                     value="${currentText.replace(/"/g, '&quot;')}"
                     onkeydown="if(event.key === 'Enter') { planner.editTask('${taskId}', this.value); } else if(event.key === 'Escape') { planner.render(); }"
                     onblur="planner.editTask('${taskId}', this.value)"
                     autofocus>
            `;
            const input = textSpan.querySelector('input');
            if (input) {
              input.focus();
              input.select();
            }
          }
        }
      }
    }
  }

  // 选择日期（点击固定显示）
  private selectDate(date: Date): void {
    // 清除悬停定时器
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    this.selectedDate = new Date(date);
    this.hoveredDate = null; // 清除悬停状态，避免混淆
    this.render(); // 重新渲染整个页面，确保面板显示正确的日期和任务
  }

  // 鼠标悬停日期（临时显示）
  private hoverDate(date: Date): void {
    // 弹窗打开时，不响应悬停事件
    if (this.showStatsModal || this.showCopyModal || this.showThemeMenu) return;

    // 只有当没有固定选择的日期时，悬停才生效
    if (!this.selectedDate) {
      // 清除之前的悬停定时器
      if (this.hoverTimer !== null) {
        clearTimeout(this.hoverTimer);
      }

      // 设置新的悬停定时器，延迟300ms显示面板
      this.hoverTimer = window.setTimeout(() => {
        this.hoveredDate = new Date(date);
        this.updateTaskPanel();
      }, 300);
    }
  }

  // 更新任务面板内容（不重建整个页面）
  private updateTaskPanel(): void {
    const displayDate = this.getDisplayDate();
    if (!displayDate) {
      // 如果没有显示日期，隐藏面板
      const taskPanel = document.querySelector('.task-panel');
      if (taskPanel) {
        taskPanel.classList.remove('show');
      }
      return;
    }

    // 找到任务面板元素
    const taskPanel = document.querySelector('.task-panel');
    if (!taskPanel) return;

    // 更新面板内容
    const tasks = this.getSelectedDateTasks();
    const dateStr = this.formatDate(displayDate);
    const lunarText = this.getLunarFullText(displayDate);
    const holidayInfo = this.getHolidayInfo(displayDate);
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
    const taskBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
    const taskHover = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100';

    let tasksList = '';
    tasks.forEach(task => {
      // 确保 priority 有值，默认为 normal
      const taskPriority: TaskPriority = (task.priority || 'normal') as TaskPriority;
      const priority = getPriorityConfig(taskPriority);
      const priorityBg = isDark ? priority.darkBg : priority.bgColor;
      const priorityColor = isDark ? priority.darkColor : priority.color;
      const borderColor = priority.borderColor;
      
      // 生成标签显示（名称为主）
      const taskTags = (task.tags || []).map(tagId => {
        const tag = this.getTagById(tagId);
        if (tag) {
          return `<span class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${tag.color} ${tag.textColor}"><span class="text-sm">${tag.icon}</span><span class="font-medium">${tag.name}</span></span>`;
        }
        return '';
      }).join('');

      // 如果没有标签，显示添加标签按钮
      const tagsDisplay = taskTags.length > 0 ? taskTags : `<button onclick="event.stopPropagation(); planner.showQuickTagSelector('${task.id}')" class="text-xs text-gray-400 hover:text-blue-500 hover:underline cursor-pointer">+ 添加标签</button>`;
      
      tasksList += `
        <div class="p-3 ${taskBg} ${taskHover} rounded-lg group transition-colors border-l-4 ${borderColor} ${task.completed ? 'task-completed' : ''}"
             draggable="true"
             ondragstart="planner.onTaskDragStart(event, '${task.id}')"
             ondblclick="planner.startEditTask('${task.id}')"
             data-task-id="${task.id}">
          <div class="flex items-center gap-3">
            <input type="checkbox"
                   ${task.completed ? 'checked' : ''}
                   onchange="planner.toggleTask('${task.id}')"
                   class="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer task-checkbox">
            <span class="task-text flex-1 ${task.completed ? 'line-through text-gray-400' : isDark ? 'text-gray-200' : 'text-gray-700'} cursor-pointer" title="双击编辑">${task.text}</span>
            <select onchange="planner.updateTaskPriority('${task.id}', this.value)"
                    class="text-xs px-2 py-1 rounded ${priorityBg} ${priorityColor} border-0 cursor-pointer whitespace-nowrap">
              <option value="urgent-important" ${taskPriority === 'urgent-important' ? 'selected' : ''}>🔴紧急重要</option>
              <option value="important" ${taskPriority === 'important' ? 'selected' : ''}>🟡重要不急</option>
              <option value="urgent" ${taskPriority === 'urgent' ? 'selected' : ''}>🟠紧急不重要</option>
              <option value="normal" ${taskPriority === 'normal' ? 'selected' : ''}>⚪不重要不急</option>
            </select>
            <span class="text-xs text-gray-400">${task.time}</span>
            <button onclick="planner.openCopyModal('${task.id}')"
                    class="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-all"
                    title="复制到其他日期">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
            <button onclick="planner.deleteTask('${task.id}')"
                    class="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex gap-1 mt-1.5 ml-8">${tagsDisplay}</div>
        </div>
      `;
    });

    // 检查是否有纪念日
    const todayAnniversaries = this.getMatchingAnniversaries(displayDate);
    
    let anniversaryHtml = '';
    if (todayAnniversaries.length > 0) {
      anniversaryHtml = `
        <div class="mb-3 p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
          ${todayAnniversaries.map(a => `
            <span class="text-pink-600 dark:text-pink-400 text-sm">🎉 ${a.name} (${a.type === 'birthday' ? '生日' : a.type === 'anniversary' ? '纪念日' : '自定义'})</span>
          `).join('')}
        </div>
      `;
    }

    // 更新面板内容
    taskPanel.innerHTML = `
      <div class="p-6 flex flex-col max-h-[60vh]">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold ${textClass}">${dateStr} 的任务</h2>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-gray-400 dark:text-gray-500">农历 ${lunarText}</span>
              ${holidayInfo ? (holidayInfo.holiday ? 
                `<span class="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded">${holidayInfo.name}</span>` : 
                `<span class="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded">调休上班</span>`) : ''}
            </div>
          </div>
          ${this.selectedDate ? `
            <button onclick="planner.closeTaskPanel()"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          ` : ''}
        </div>
        ${anniversaryHtml}
        <div class="mb-4">
          <div class="flex gap-2">
            <input type="text"
                   id="taskInput"
                   placeholder="添加新任务..."
                   class="flex-1 px-4 py-2 border ${inputBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'text-gray-100 placeholder-gray-400' : ''}"
                   onkeypress="if(event.key === 'Enter') planner.handleAddTask()">
            <select id="prioritySelect" class="px-3 py-2 border ${inputBg} rounded-lg ${isDark ? 'text-gray-100' : ''}">
              <option value="urgent-important">🔴紧急重要</option>
              <option value="important">🟡重要不急</option>
              <option value="urgent">🟠紧急不重要</option>
              <option value="normal" selected>⚪不重要不急</option>
            </select>
            <button onclick="planner.handleAddTask()"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              添加
            </button>
          </div>
        </div>
        <div class="flex-1 space-y-2 overflow-y-auto min-h-[300px]">
          ${tasks.length > 0 ? tasksList : '<p class="text-gray-400 text-center py-8">暂无任务</p>'}
        </div>
      </div>
    `;

    // 确保面板显示
    requestAnimationFrame(() => {
      if (!taskPanel.classList.contains('show')) {
        taskPanel.classList.add('show');
      }
    });
  }

  // 更新日历指示器颜色
  private updateCalendarIndicators(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= lastDay; day++) {
      const dateKey = this.formatDate(new Date(year, month, day));
      const dayTasks = this.tasks[dateKey] || [];

      // 找到对应的日期元素
      const dateElement = document.querySelector(`[data-date="${dateKey}"]`);
      if (dateElement) {
        // 找到或创建指示器元素
        let indicator = dateElement.querySelector('.task-indicator');
        if (!indicator && dayTasks.length > 0) {
          indicator = document.createElement('div');
          indicator.className = 'task-indicator absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full';
          dateElement.appendChild(indicator);
        }

        // 更新指示器颜色
        if (indicator) {
          if (dayTasks.length === 0) {
            indicator.remove();
          } else {
            const completedTasks = dayTasks.filter(task => task.completed).length;
            if (completedTasks === dayTasks.length) {
              indicator.className = 'task-indicator absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500';
            } else {
              indicator.className = 'task-indicator absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500';
            }
          }
        }
      }
    }
  }

  // 鼠标离开日期
  private leaveDate(): void {
    // 弹窗打开时，不响应离开事件
    if (this.showStatsModal || this.showCopyModal || this.showThemeMenu) return;

    // 清除悬停定时器
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    // 只有当没有固定选择的日期时，离开才生效
    if (!this.selectedDate) {
      this.hoveredDate = null;

      // 隐藏任务面板
      const taskPanel = document.querySelector('.task-panel');
      if (taskPanel) {
        taskPanel.classList.remove('show');
      }
    } else {
      // 如果有选中的日期，确保面板保持显示
      const taskPanel = document.querySelector('.task-panel');
      if (taskPanel && !taskPanel.classList.contains('show')) {
        taskPanel.classList.add('show');
      }
    }
  }

  // 关闭任务面板
  private closeTaskPanel(): void {
    this.selectedDate = null;
    this.hoveredDate = null;

    // 隐藏任务面板
    const taskPanel = document.querySelector('.task-panel');
    if (taskPanel) {
      taskPanel.classList.remove('show');
    }
  }

  // 显示/隐藏统计弹窗
  private toggleStatsModal(): void {
    this.showStatsModal = !this.showStatsModal;

    // 当打开统计弹窗时，清除悬停状态并关闭其他弹窗
    if (this.showStatsModal) {
      if (!this.selectedDate) {
        this.hoveredDate = null;
      }
      // 关闭其他弹窗
      this.showCopyModal = false;
      this.showThemeMenu = false;
      this.showQuadrantView = false;
    }

    this.render();
  }

  // 显示/隐藏四象限视图
  private toggleQuadrantView(): void {
    this.showQuadrantView = !this.showQuadrantView;

    // 当打开四象限视图时，关闭其他弹窗
    if (this.showQuadrantView) {
      this.showStatsModal = false;
      this.showCopyModal = false;
      this.showThemeMenu = false;
      this.hoveredDate = null;
      // 初始化日期范围
      if (!this.quadrantStartDate || !this.quadrantEndDate) {
        const today = new Date();
        this.quadrantStartDate = this.formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        this.quadrantEndDate = this.formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      }
    }

    this.render();
  }

  // 设置四象限时间筛选类型
  private setQuadrantFilter(filter: 'year' | 'month' | 'custom'): void {
    this.quadrantFilter = filter;
    const today = new Date();
    
    switch (filter) {
      case 'year':
        this.quadrantStartDate = this.formatDate(new Date(today.getFullYear(), 0, 1));
        this.quadrantEndDate = this.formatDate(new Date(today.getFullYear(), 11, 31));
        break;
      case 'month':
        this.quadrantStartDate = this.formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        this.quadrantEndDate = this.formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        break;
      // custom 不自动设置日期
    }
    
    this.render();
  }

  // 设置四象限自定义日期范围
  private setQuadrantDateRange(startOrEnd: 'start' | 'end', value: string): void {
    if (startOrEnd === 'start') {
      this.quadrantStartDate = value;
    } else {
      this.quadrantEndDate = value;
    }
    this.render();
  }

  // 获取四象限筛选后的任务
  private getQuadrantTasks(): { 
    urgentImportant: Task[];
    important: Task[];
    urgent: Task[];
    normal: Task[];
  } {
    const result = {
      urgentImportant: [] as Task[],
      important: [] as Task[],
      urgent: [] as Task[],
      normal: [] as Task[]
    };

    if (!this.quadrantStartDate || !this.quadrantEndDate) return result;

    const startDate = new Date(this.quadrantStartDate);
    const endDate = new Date(this.quadrantEndDate);

    Object.entries(this.tasks).forEach(([dateKey, tasks]) => {
      const taskDate = new Date(dateKey);
      if (taskDate >= startDate && taskDate <= endDate) {
        tasks.forEach(task => {
          const priority = task.priority || 'normal';
          switch (priority) {
            case 'urgent-important':
              result.urgentImportant.push({ ...task, date: dateKey });
              break;
            case 'important':
              result.important.push({ ...task, date: dateKey });
              break;
            case 'urgent':
              result.urgent.push({ ...task, date: dateKey });
              break;
            case 'normal':
              result.normal.push({ ...task, date: dateKey });
              break;
          }
        });
      }
    });

    // 每个象限内按日期排序
    const sortByDate = (a: Task, b: Task) => a.date.localeCompare(b.date);
    result.urgentImportant.sort(sortByDate);
    result.important.sort(sortByDate);
    result.urgent.sort(sortByDate);
    result.normal.sort(sortByDate);

    return result;
  }

  // 切换月度任务筛选条件
  private setMonthlyFilter(filter: MonthlyFilter): void {
    this.monthlyFilter = filter;
    this.render();
  }

  // 切换月度任务概览中任务的完成状态
  private toggleMonthlyTask(date: string, taskId: string): void {
    if (this.tasks[date]) {
      const task = this.tasks[date].find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        this.saveTasks();
        this.render();
      }
    }
  }

  // 删除月度任务概览中的任务
  private deleteMonthlyTask(date: string, taskId: string): void {
    if (this.tasks[date]) {
      this.tasks[date] = this.tasks[date].filter(task => task.id !== taskId);
      this.saveTasks();
      this.render();
    }
  }

  // 获取任务指示器颜色
  private getTaskIndicatorColor(day: number): string {
    const dateKey = this.formatDate(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day));
    const dayTasks = this.tasks[dateKey] || [];

    if (dayTasks.length === 0) {
      return 'hidden';
    }

    const completedTasks = dayTasks.filter(task => task.completed).length;

    if (completedTasks === dayTasks.length) {
      return 'bg-green-500';
    }

    return 'bg-orange-500';
  }

  // 生成月份选择器HTML
  private generateMonthPickerHTML(currentYear: number, currentMonth: number, isDark: boolean): string {
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const bgClass = isDark ? 'bg-gray-700' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const hoverClass = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100';
    
    // 使用选择器中选中的年份
    const pickerYear = this.selectedPickerYear || currentYear;
    
    // 生成年份选择
    const baseYear = pickerYear + this.yearRangeOffset;
    const years: number[] = [];
    for (let y = baseYear - 2; y <= baseYear + 2; y++) {
      years.push(y);
    }
    
    return `
      <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 ${bgClass} rounded-xl shadow-2xl p-4 z-50 min-w-[280px]"
           onclick="event.stopPropagation()">
        <!-- 年份选择 -->
        <div class="flex items-center justify-between mb-3">
          <button onclick="planner.yearRangeOffset -= 5; planner.render();"
                  class="p-1 ${hoverClass} rounded transition-colors">
            <svg class="w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="flex gap-1">
            ${years.map(y => `
              <button onclick="planner.selectPickerYear(${y})"
                      class="px-2 py-1 text-sm rounded transition-colors ${y === pickerYear 
                        ? 'bg-blue-500 text-white' 
                        : (isDark ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-700')}">
                ${y}
              </button>
            `).join('')}
          </div>
          <button onclick="planner.yearRangeOffset += 5; planner.render();"
                  class="p-1 ${hoverClass} rounded transition-colors">
            <svg class="w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        
        <!-- 月份选择 -->
        <div class="grid grid-cols-4 gap-2">
          ${monthNames.map((name, idx) => `
            <button onclick="planner.selectPickerMonth(${idx})"
                    class="py-2 px-3 text-sm rounded-lg transition-colors ${idx === currentMonth && pickerYear === currentYear
                      ? 'bg-blue-500 text-white' 
                      : (isDark ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-700')}">
              ${name}
            </button>
          `).join('')}
        </div>
        
        <!-- 快捷操作 -->
        <div class="flex gap-2 mt-3 pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}">
          <button onclick="planner.jumpToToday(); planner.showMonthPicker = false; planner.render();"
                  class="flex-1 py-2 text-sm ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors">
            今天
          </button>
          <button onclick="planner.showMonthPicker = false; planner.render();"
                  class="flex-1 py-2 text-sm ${isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'} ${textClass} rounded-lg transition-colors">
            取消
          </button>
        </div>
      </div>
    `;
  }

  // 生成日历HTML
  private generateCalendarHTML(): string {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const hoverClass = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // 调整：周一为每周第一天，周日为最后一天
    // getDay() 返回 0(周日), 1(周一), ..., 6(周六)
    // 转换为：周一=0, 周二=1, ..., 周日=6
    const startingDay = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const monthNames = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    const isSelectedDate = (day: number) => {
      if (!this.selectedDate) return false;
      return day === this.selectedDate.getDate() &&
             month === this.selectedDate.getMonth() &&
             year === this.selectedDate.getFullYear();
    };

    const isToday = (day: number) => {
      const today = new Date();
      return day === today.getDate() &&
             month === today.getMonth() &&
             year === today.getFullYear();
    };

    const hasTasks = (day: number) => {
      const dateKey = this.formatDate(new Date(year, month, day));
      return this.tasks[dateKey] && this.tasks[dateKey].length > 0;
    };

    let calendarDays = '';

    for (let i = 0; i < startingDay; i++) {
      calendarDays += '<div class="h-14"></div>';
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const selected = isSelectedDate(day) ? 'bg-blue-500 text-white hover:bg-blue-600' : hoverClass;
      const today = isToday(day) ? 'ring-2 ring-blue-500 ring-offset-2' : '';
      const indicatorColor = this.getTaskIndicatorColor(day);
      const dateKey = this.formatDate(date);
      const holidayInfo = this.getHolidayInfo(date);
      
      // 获取农历信息
      const lunarText = this.getLunarDisplayText(date);
      const isJieQi = this.isJieQiDay(date);
      
      // 节假日样式和标签
      let holidayClass = '';
      let holidayTag = '';
      
      if (holidayInfo) {
        if (holidayInfo.holiday) {
          // 法定假日或普通假日
          holidayClass = holidayInfo.wage === 3 ? 'font-bold' : '';
          holidayTag = `<span class="absolute -top-1 -right-1 text-[9px] bg-red-500 text-white px-1 rounded shadow-sm">${holidayInfo.name}</span>`;
        } else {
          // 调休工作日（周末需要上班）
          holidayClass = '';
          holidayTag = `<span class="absolute -top-1 -right-1 text-[9px] bg-orange-500 text-white px-1 rounded shadow-sm">班</span>`;
        }
      }
      
      // 农历样式：节气用绿色，节日用红色，普通农历日用灰色
      let lunarClass = isDark ? 'text-gray-500' : 'text-gray-400';
      let dayColorClass = isDark ? 'text-gray-200' : '';
      
      if (isJieQi) {
        lunarClass = 'text-green-400 font-medium';
      } else if (holidayInfo && holidayInfo.holiday) {
        dayColorClass = 'text-red-400';
        lunarClass = 'text-red-400';
      } else if (holidayInfo && !holidayInfo.holiday) {
        dayColorClass = 'text-orange-400';
      } else {
        // 默认周末显示红色
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dayColorClass = 'text-red-400';
          lunarClass = 'text-red-300';
        }
      }
      
      // 选中状态覆盖颜色
      if (isSelectedDate(day)) {
        dayColorClass = '';
        lunarClass = 'text-blue-100';
      }
      
      const tasksIndicator = indicatorColor !== 'hidden'
        ? `<div class="task-indicator absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 ${indicatorColor} rounded-full"></div>`
        : '';

      calendarDays += `
        <div class="calendar-day h-14 flex flex-col items-center justify-center cursor-pointer rounded-lg relative transition-colors ${selected} ${today} ${holidayClass}"
             data-date="${dateKey}"
             onmouseenter="planner.hoverDate(new Date(${year}, ${month}, ${day}))"
             onmouseleave="planner.leaveDate()"
             onclick="planner.selectDate(new Date(${year}, ${month}, ${day}))">
          <span class="text-sm ${dayColorClass}">${day}</span>
          <span class="text-[10px] ${lunarClass}">${lunarText}</span>
          ${holidayTag}
          ${tasksIndicator}
        </div>
      `;
    }

    return `
      <div class="${bgClass} rounded-xl shadow-lg p-6 w-full">
        <div class="flex items-center justify-between mb-6">
          <button onclick="planner.changeMonth(-1)"
                  class="p-2 ${hoverClass} rounded-lg transition-colors">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="relative">
            <h2 class="text-xl font-bold ${textClass} cursor-pointer hover:text-blue-500 transition-colors"
                onclick="planner.toggleMonthPicker()">
              ${year}年 ${monthNames[month]}
            </h2>
            ${this.showMonthPicker ? this.generateMonthPickerHTML(year, month, isDark) : ''}
          </div>
          <button onclick="planner.changeMonth(1)"
                  class="p-2 ${hoverClass} rounded-lg transition-colors">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div class="text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} py-2">一</div>
          <div class="text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} py-2">二</div>
          <div class="text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} py-2">三</div>
          <div class="text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} py-2">四</div>
          <div class="text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} py-2">五</div>
          <div class="text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} py-2 text-red-400">六</div>
          <div class="text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} py-2 text-red-400">日</div>
        </div>
        <div class="grid grid-cols-7 gap-1">
          ${calendarDays}
        </div>
      </div>
    `;
  }

  // 生成任务面板HTML
  private generateTaskPanelHTML(): string {
    const displayDate = this.getDisplayDate();
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
    const taskBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
    const taskHover = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100';
    
    if (!displayDate) {
      return `
        <div class="task-panel fixed bottom-0 left-0 right-0 ${bgClass} shadow-2xl z-40 max-w-4xl mx-auto rounded-t-2xl">
          <div class="p-6 flex flex-col max-h-[100vh]">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold ${textClass}">任务面板</h2>
            </div>
            <div class="flex-1 flex items-center justify-center text-gray-400">
              <p>选择一个日期查看任务</p>
            </div>
          </div>
        </div>
      `;
    }

    const tasks = this.getSortedTasks(this.getSelectedDateTasks());
    const dateStr = this.formatDate(displayDate);
    const lunarText = this.getLunarFullText(displayDate);
    const holidayInfo = this.getHolidayInfo(displayDate);

    // 排序选项
    const sortOptions: Record<TaskSortBy, string> = {
      'priority': '按优先级',
      'status': '按状态',
      'time': '按时间',
      'text': '按名称'
    };
    const sortSelect = `
      <select onchange="planner.setTaskSortBy(this.value)"
              class="text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200'} border cursor-pointer">
        ${Object.entries(sortOptions).map(([value, label]) => 
          `<option value="${value}" ${this.taskSortBy === value ? 'selected' : ''}>${label}</option>`
        ).join('')}
      </select>
    `;

    // 标签筛选选择器
    const allTags = this.getAllTags();
    const tagFilterSelect = `
      <select onchange="planner.selectedTagFilter = this.value; planner.render();"
              class="text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200'} border cursor-pointer">
        <option value="" ${!this.selectedTagFilter ? 'selected' : ''}>全部标签</option>
        ${allTags.map(tag => 
          `<option value="${tag.id}" ${this.selectedTagFilter === tag.id ? 'selected' : ''}>${tag.icon} ${tag.name}</option>`
        ).join('')}
      </select>
    `;

    let tasksList = '';
    tasks.forEach(task => {
      // 确保 priority 有值，默认为 normal
      const taskPriority: TaskPriority = (task.priority || 'normal') as TaskPriority;
      const priority = getPriorityConfig(taskPriority);
      const priorityBg = isDark ? priority.darkBg : priority.bgColor;
      const priorityColor = isDark ? priority.darkColor : priority.color;
      const borderColor = priority.borderColor;
      
      // 获取任务的标签显示HTML
      let taskTagsHTML = '';
      if (task.tags && task.tags.length > 0) {
        const taskTags = task.tags.map(tagId => {
          const tag = this.getTagById(tagId);
          if (tag) {
            return `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${tag.color} ${tag.textColor}">${tag.icon} ${tag.name}</span>`;
          }
          return '';
        }).filter(Boolean).join('');
        if (taskTags) {
          taskTagsHTML = `<div class="flex flex-wrap gap-1 mt-1">${taskTags}</div>`;
        }
      }
      
      tasksList += `
        <div class="flex items-center gap-3 p-3 ${taskBg} ${taskHover} rounded-lg group transition-colors border-l-4 ${borderColor} ${task.completed ? 'task-completed' : ''}"
             draggable="true"
             ondragstart="planner.onTaskDragStart(event, '${task.id}')"
             ondblclick="planner.startEditTask('${task.id}')"
             data-task-id="${task.id}">
          <input type="checkbox"
                 ${task.completed ? 'checked' : ''}
                 onchange="planner.toggleTask('${task.id}')"
                 class="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer task-checkbox mt-0.5">
          <div class="flex-1 min-w-0">
            <span class="task-text block ${task.completed ? 'line-through text-gray-400' : isDark ? 'text-gray-200' : 'text-gray-700'} cursor-pointer" title="双击编辑">${task.text}</span>
            ${taskTagsHTML}
          </div>
          <select onchange="planner.updateTaskPriority('${task.id}', this.value)"
                  class="text-xs px-2 py-1 rounded ${priorityBg} ${priorityColor} border-0 cursor-pointer whitespace-nowrap">
            <option value="urgent-important" ${taskPriority === 'urgent-important' ? 'selected' : ''}>🔴紧急重要</option>
            <option value="important" ${taskPriority === 'important' ? 'selected' : ''}>🟡重要不急</option>
            <option value="urgent" ${taskPriority === 'urgent' ? 'selected' : ''}>🟠紧急不重要</option>
            <option value="normal" ${taskPriority === 'normal' ? 'selected' : ''}>⚪不重要不急</option>
          </select>
          <span class="text-xs text-gray-400">${task.time}</span>
          <button onclick="planner.openCopyModal('${task.id}')"
                  class="opacity-0 group-hover:opacity-100 p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-all"
                  title="复制到其他日期">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
          <button onclick="planner.deleteTask('${task.id}')"
                  class="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
    });

    // 检查是否有纪念日
    const todayAnniversaries = this.getMatchingAnniversaries(displayDate);
    
    let anniversaryHtml = '';
    if (todayAnniversaries.length > 0) {
      anniversaryHtml = `
        <div class="mb-3 p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
          ${todayAnniversaries.map(a => `
            <span class="text-pink-600 dark:text-pink-400 text-sm">🎉 ${a.name} (${a.type === 'birthday' ? '生日' : a.type === 'anniversary' ? '纪念日' : '自定义'})</span>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="task-panel fixed bottom-0 left-0 right-0 ${bgClass} shadow-2xl z-40 max-w-4xl mx-auto rounded-t-2xl">
        <div class="p-6 flex flex-col max-h-[100vh]">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-xl font-bold ${textClass}">${dateStr} 的任务</h2>
                ${sortSelect}
                ${tagFilterSelect}
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-gray-400 dark:text-gray-500">农历 ${lunarText}</span>
                ${holidayInfo ? (holidayInfo.holiday ? 
                  `<span class="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded">${holidayInfo.name}</span>` : 
                  `<span class="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded">调休上班</span>`) : ''}
              </div>
            </div>
            ${this.selectedDate ? `
              <button onclick="planner.closeTaskPanel()"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            ` : ''}
          </div>
          ${anniversaryHtml}
          <div class="mb-4">
            <div class="flex gap-2 mb-2">
              <input type="text"
                     id="taskInput"
                     placeholder="添加新任务..."
                     class="flex-1 px-4 py-2 border ${inputBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'text-gray-100 placeholder-gray-400' : ''}"
                     onkeypress="if(event.key === 'Enter') planner.handleAddTask()">
              <select id="prioritySelect" class="px-3 py-2 border ${inputBg} rounded-lg ${isDark ? 'text-gray-100' : ''}">
                <option value="urgent-important">🔴紧急重要</option>
                <option value="important">🟡重要不急</option>
                <option value="urgent">🟠紧急不重要</option>
                <option value="normal" selected>⚪不重要不急</option>
              </select>
              <button onclick="planner.handleAddTask()"
                      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                添加
              </button>
            </div>
            <!-- 标签选择器 -->
            <div class="flex flex-wrap gap-1 items-center">
              <span class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mr-1">标签：</span>
              ${this.getAllTags().map(tag => `
                <button type="button"
                        data-tag-id="${tag.id}"
                        onclick="planner.toggleTagSelection('${tag.id}')"
                        class="tag-select-btn text-xs px-2 py-1 rounded-full transition-all ${tag.color} ${tag.textColor} hover:opacity-80 ${this.selectedTagsForTask.has(tag.id) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}">
                  ${tag.icon} ${tag.name}${this.selectedTagsForTask.has(tag.id) ? ' ✓' : ''}
                </button>
              `).join('')}
              <button onclick="planner.toggleTagManager()"
                      class="text-xs px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}">
                ⚙️ 管理
              </button>
            </div>
          </div>
          <div class="flex-1 space-y-2 overflow-y-auto min-h-[300px]">
            ${tasks.length > 0 ? tasksList : '<p class="text-gray-400 text-center py-8">暂无任务</p>'}
          </div>
        </div>
      </div>
    `;
  }

  // 生成更新弹窗 HTML
  private generateUpdateModalHTML(): string {
    if (!this.showUpdateModal) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.closeUpdateModal()">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-md"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold ${textClass}">🔄 软件更新</h2>
            <button onclick="planner.closeUpdateModal()"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            ${this.checkingForUpdate ? `
              <div class="text-center py-8">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p class="${textClass}">正在检查更新...</p>
              </div>
            ` : this.updateDownloaded ? `
              <div class="text-center py-4">
                <div class="text-6xl mb-4">✅</div>
                <h3 class="text-lg font-semibold ${textClass} mb-2">更新已准备就绪</h3>
                <p class="${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4">
                  版本 ${this.updateInfo?.version || '新版本'} 已下载完成
                </p>
                <button onclick="planner.installUpdate()"
                        class="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                  立即重启并安装
                </button>
                <button onclick="planner.closeUpdateModal()"
                        class="w-full py-2 mt-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${textClass} rounded-lg transition-colors">
                  稍后提醒
                </button>
              </div>
            ` : this.downloadProgress ? `
              <div class="text-center py-4">
                <h3 class="text-lg font-semibold ${textClass} mb-4">正在下载更新...</h3>
                <div class="w-full bg-gray-200 rounded-full h-4 mb-2 ${isDark ? 'bg-gray-700' : ''}">
                  <div class="bg-blue-500 h-4 rounded-full transition-all" style="width: ${this.downloadProgress.percent}%"></div>
                </div>
                <p class="${isDark ? 'text-gray-400' : 'text-gray-600'}">${this.downloadProgress.percent.toFixed(1)}%</p>
              </div>
            ` : this.updateAvailable && this.updateInfo ? `
              <div class="text-center py-4">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-lg font-semibold ${textClass} mb-2">发现新版本</h3>
                <p class="${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1">
                  最新版本: <span class="font-medium ${textClass}">${this.updateInfo.version}</span>
                </p>
                <p class="${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4 text-sm">
                  发布日期: ${this.updateInfo.releaseDate ? new Date(this.updateInfo.releaseDate).toLocaleDateString('zh-CN') : '未知'}
                </p>
                ${this.updateInfo.releaseNotes ? `
                  <div class="${cardBg} rounded-lg p-3 mb-4 text-left max-h-32 overflow-y-auto">
                    <p class="text-sm ${textClass}">${this.updateInfo.releaseNotes}</p>
                  </div>
                ` : ''}
                <button onclick="planner.downloadUpdate()"
                        class="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                  立即下载
                </button>
                <button onclick="planner.closeUpdateModal()"
                        class="w-full py-2 mt-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${textClass} rounded-lg transition-colors">
                  稍后更新
                </button>
              </div>
            ` : `
              <div class="text-center py-4">
                <p class="${isDark ? 'text-gray-400' : 'text-gray-600'}">检查更新中...</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // 生成复制任务弹窗HTML
  private generateCopyModalHTML(): string {
    if (!this.showCopyModal || !this.copyingTask) return '';

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const currentDateKey = this.selectedDate ? this.formatDate(this.selectedDate) : '';

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    // 生成本月日期列表
    let dateList = '';
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = this.selectedCopyDates.has(dateKey);
      const isCurrentDay = dateKey === currentDateKey;
      const dayTasks = this.tasks[dateKey] || [];
      const dayOfWeek = date.getDay();
      const weekDayName = weekDays[dayOfWeek];
      
      // 获取节假日信息
      const holidayInfo = this.getHolidayInfo(date);
      const isActualWorkday = this.isActualWorkday(date);
      
      // 确定日期标签和颜色
      let dayLabel = `周${weekDayName}`;
      let dayLabelColor = 'text-gray-500';
      let specialTag = '';
      
      if (holidayInfo) {
        if (holidayInfo.holiday) {
          // 假日
          dayLabelColor = 'text-red-500 font-medium';
          specialTag = `<span class="text-[10px] bg-red-100 text-red-600 px-1 rounded ml-1">${holidayInfo.name}</span>`;
        } else {
          // 调休工作日
          dayLabelColor = 'text-orange-500 font-medium';
          specialTag = `<span class="text-[10px] bg-orange-100 text-orange-600 px-1 rounded ml-1">补班</span>`;
        }
      } else {
        // 没有节假日数据时，使用默认的周末颜色
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dayLabelColor = 'text-red-400';
        }
      }

      dateList += `
        <button onclick="event.stopPropagation(); planner.toggleCopyDate('${dateKey}')"
                class="flex items-center gap-2 p-2 rounded-lg ${isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'} ${isCurrentDay ? 'opacity-50 cursor-not-allowed' : ''}"
                ${isCurrentDay ? 'disabled' : ''}>
          <div class="w-5 h-5 rounded border-2 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'} flex items-center justify-center">
            ${isSelected ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}
          </div>
          <div class="flex-1 text-left">
            <div class="text-sm font-medium">
              ${day}日 
              <span class="text-xs ${dayLabelColor}">${dayLabel}</span>
              ${specialTag}
            </div>
            <div class="text-xs text-gray-400">${dayTasks.length}个任务${!isActualWorkday && dayOfWeek >= 1 && dayOfWeek <= 5 ? ' · 休息日' : ''}${isActualWorkday && (dayOfWeek === 0 || dayOfWeek === 6) ? ' · 工作日' : ''}</div>
          </div>
        </button>
      `;
    }

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.closeCopyModal()">
        <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">复制任务到其他日期</h2>
            <button onclick="planner.closeCopyModal()"
                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="mb-6 p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-gray-700">
              <span class="font-semibold">任务内容：</span>
              ${this.copyingTask.text}
            </p>
          </div>

          <div class="mb-4">
            <div class="grid grid-cols-3 gap-2 mb-4">
              <button onclick="planner.toggleAllMonthDates(true)"
                      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                全选本月
              </button>
              <button onclick="planner.selectWorkdays()"
                      class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">
                全选工作日
              </button>
              <button onclick="planner.toggleAllMonthDates(false)"
                      class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
                取消全选
              </button>
            </div>
            <p class="text-sm text-gray-500 mb-2">
              已选择 <span class="font-semibold text-blue-600">${this.selectedCopyDates.size}</span> 个日期
              <span class="text-xs text-gray-400 ml-2">（节假日/补班会自动识别，全选工作日会排除休息日并包含调休日）</span>
            </p>
          </div>

          <div class="grid grid-cols-4 gap-2 mb-6 max-h-64 overflow-y-auto">
            ${dateList}
          </div>

          <div class="flex gap-3">
            <button onclick="planner.closeCopyModal()"
                    class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
              取消
            </button>
            <button onclick="planner.confirmCopyTask()"
                    class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              确认复制
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 生成标签管理弹窗HTML
  private generateTagManagerHTML(): string {
    if (!this.showTagManager) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
    const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';

    // 获取排序后的所有标签
    const sortedTags = this.getAllTags();

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.toggleTagManager()">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold ${textClass}">🏷️ 标签管理</h2>
            <button onclick="planner.toggleTagManager()"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- 添加新标签 -->
          <div class="mb-6 p-4 ${cardBg} rounded-lg">
            <h3 class="text-sm font-semibold ${textClass} mb-3">添加自定义标签</h3>
            <div class="flex gap-2 mb-2">
              <input type="text" id="newTagName" placeholder="标签名称"
                     class="flex-1 px-3 py-2 border ${inputBg} rounded-lg text-sm ${isDark ? 'text-gray-100' : ''}">
              <button type="button" onclick="planner.toggleIconPicker()"
                      class="w-16 px-2 py-2 border ${inputBg} rounded-lg text-xl text-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                      title="点击选择图标">
                <span id="selectedIconDisplay">${this.selectedIcon}</span>
              </button>
              <input type="hidden" id="newTagIcon" value="${this.selectedIcon}">
            </div>
            <div class="flex gap-1 mb-3">
              <span class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">颜色：</span>
              ${['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-red-100', 'bg-yellow-100', 'bg-pink-100', 'bg-orange-100', 'bg-indigo-100', 'bg-cyan-100', 'bg-teal-100'].map((color, idx) => `
                <button type="button" onclick="document.getElementById('newTagColor').value = '${color}'; document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('ring-2')); this.classList.add('ring-2');"
                        class="color-btn w-6 h-6 rounded-full ${color} border border-gray-300 ${idx === 0 ? 'ring-2 ring-blue-500' : ''}"
                        data-color="${color}"></button>
              `).join('')}
              <input type="hidden" id="newTagColor" value="bg-blue-100">
            </div>
            <button onclick="planner.handleAddTag()"
                    class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
              添加标签
            </button>
          </div>

          ${this.generateIconPickerHTML()}

          <!-- 标签管理（所有标签，可拖拽排序，可删除） -->
          <div class="mb-4">
            <h3 class="text-sm font-semibold ${textClass} mb-2">所有标签 <span class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">(拖拽调整顺序，点击 × 删除)</span></h3>
            <div id="tag-sort-container" class="flex flex-wrap gap-2 p-3 ${cardBg} rounded-lg min-h-[60px]"
                 ondragover="event.stopPropagation(); event.preventDefault();"
                 ondrop="event.stopPropagation(); event.preventDefault();">
              ${sortedTags.length > 0 ? sortedTags.map(tag => `
                <span class="tag-sort-item inline-flex items-center gap-1 px-3 py-1.5 rounded-full ${tag.color} ${tag.textColor} cursor-move select-none group relative"
                      draggable="true"
                      data-tag-id="${tag.id}"
                      ondragstart="planner.onTagDragStart(event, '${tag.id}')"
                      ondragover="event.stopPropagation(); event.preventDefault(); this.classList.add('ring-2', 'ring-blue-400');"
                      ondragleave="this.classList.remove('ring-2', 'ring-blue-400');"
                      ondrop="planner.onTagDrop(event, '${tag.id}')"
                      ondragend="event.stopPropagation(); this.classList.remove('ring-2', 'ring-blue-400');">
                  ${tag.icon} ${tag.name}
                  <button onclick="event.stopPropagation(); planner.deleteTag('${tag.id}')"
                          class="ml-1 w-4 h-4 rounded-full bg-black bg-opacity-20 hover:bg-opacity-40 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="删除标签">×</button>
                </span>
              `).join('') : `<span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">暂无标签，请添加</span>`}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 生成图标选择器弹窗
  private generateIconPickerHTML(): string {
    if (!this.showIconPicker) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
    
    // 对图标进行分类
    const categories = [
      { name: '工作', icons: ICON_OPTIONS.slice(0, 20) },
      { name: '学习', icons: ICON_OPTIONS.slice(20, 40) },
      { name: '生活', icons: ICON_OPTIONS.slice(40, 60) },
      { name: '健康', icons: ICON_OPTIONS.slice(60, 80) },
      { name: '财务', icons: ICON_OPTIONS.slice(80, 100) },
      { name: '社交', icons: ICON_OPTIONS.slice(100, 120) },
      { name: '出行', icons: ICON_OPTIONS.slice(120, 140) },
      { name: '购物', icons: ICON_OPTIONS.slice(140, 160) },
      { name: '娱乐', icons: ICON_OPTIONS.slice(160, 180) },
      { name: '自然', icons: ICON_OPTIONS.slice(180, 200) },
      { name: '其他', icons: ICON_OPTIONS.slice(200) }
    ];

    return `
      <div class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60]"
           onclick="planner.showIconPicker = false; planner.render();">
        <div class="${bgClass} rounded-xl shadow-2xl p-4 w-80 max-h-[70vh] overflow-hidden"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium ${textClass}">选择图标</span>
            <button onclick="planner.showIconPicker = false; planner.render();"
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <svg class="w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="overflow-y-auto max-h-[55vh] space-y-3">
            ${categories.map(cat => `
              <div>
                <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1">${cat.name}</div>
                <div class="grid grid-cols-10 gap-1">
                  ${cat.icons.map(icon => `
                    <button onclick="planner.selectIcon('${icon}')"
                            class="w-7 h-7 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-600 rounded ${this.selectedIcon === icon ? 'bg-blue-100 dark:bg-blue-900 ring-1 ring-blue-500' : ''}"
                            title="${icon}">
                      ${icon}
                    </button>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // 生成快速标签选择器
  private generateQuickTagSelectorHTML(): string {
    if (!this.quickTagTaskId) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    
    // 获取当前任务的标签
    let currentTags: string[] = [];
    if (this.selectedDate) {
      const dateKey = this.formatDate(this.selectedDate);
      const task = (this.tasks[dateKey] || []).find(t => t.id === this.quickTagTaskId);
      if (task) currentTags = task.tags || [];
    }
    
    const allTags = this.getAllTags();

    return `
      <div class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
           onclick="planner.quickTagTaskId = ''; planner.render();">
        <div class="${bgClass} rounded-xl shadow-2xl p-4 w-72"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium ${textClass}">选择标签</span>
            <button onclick="planner.quickTagTaskId = ''; planner.render();"
                    class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <svg class="w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            ${allTags.map(tag => `
              <button onclick="planner.toggleTaskTag('${tag.id}')"
                      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${tag.color} ${tag.textColor} ${currentTags.includes(tag.id) ? 'ring-2 ring-offset-1 ring-blue-500' : ''} hover:opacity-80 transition-opacity">
                ${tag.icon} ${tag.name} ${currentTags.includes(tag.id) ? '✓' : ''}
              </button>
            `).join('')}
          </div>
          <div class="mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}">
            <button onclick="planner.quickTagTaskId = ''; planner.render();"
                    class="w-full py-2 text-sm ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${textClass} rounded-lg transition-colors">
              完成
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 处理添加标签
  private handleAddTag(): void {
    const nameInput = document.getElementById('newTagName') as HTMLInputElement;
    const colorInput = document.getElementById('newTagColor') as HTMLInputElement;

    const name = nameInput.value.trim();
    const icon = this.selectedIcon || '🏷️';
    const color = colorInput.value;

    if (!name) {
      alert('请输入标签名称');
      return;
    }

    this.addCustomTag(name, color, icon);
    nameInput.value = '';
    this.selectedIcon = '🏷️';  // 重置为默认图标
  }

  // 生成月度统计弹窗HTML
  private generateStatsModalHTML(): string {
    if (!this.showStatsModal) return '';
    const stats = this.getMonthlyStats();
    const filteredTasks = this.getFilteredMonthlyTasks();

    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (stats.percentage / 100) * circumference;

    let tasksOverview = '';
    const recentTasks = filteredTasks; // 显示所有任务

    recentTasks.forEach(({ date, task }) => {
      tasksOverview += `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
          <input type="checkbox"
                 ${task.completed ? 'checked' : ''}
                 onchange="planner.toggleMonthlyTask('${date}', '${task.id}')"
                 class="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer">
          <span class="flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'} truncate">${task.text}</span>
          <span class="text-xs text-gray-400">${date.slice(5)}</span>
          <button onclick="planner.deleteMonthlyTask('${date}', '${task.id}')"
                  class="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-100 rounded transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
    });

    if (recentTasks.length === 0) {
      tasksOverview = '<p class="text-gray-400 text-center py-4 text-sm">暂无任务</p>';
    }

    const getCardClass = (filterType: MonthlyFilter) => {
      const baseClass = 'stats-card rounded-lg p-4 text-center cursor-pointer ';
      if (this.monthlyFilter === filterType) {
        return baseClass + 'ring-4 ring-blue-300 ring-opacity-50 shadow-lg';
      }
      return baseClass;
    };

    const statsTitle = this.viewMode === 'month' ? '本月任务统计' : this.viewMode === 'week' ? '本周任务统计' : '今日任务统计';
    const overviewTitle = this.viewMode === 'month' ? '本月任务概览' : this.viewMode === 'week' ? '本周任务概览' : '今日任务概览';

    return `
      <div class="modal-backdrop fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.toggleStatsModal()">
        <div class="stats-modal bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">${statsTitle}</h2>
            <button onclick="planner.toggleStatsModal()"
                    class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-3 gap-4 mb-6">
            <div onclick="planner.setMonthlyFilter('all')"
                    class="${getCardClass('all')} bg-gradient-to-br from-blue-50 to-blue-100">
              <div class="text-2xl font-bold text-blue-600">${stats.total}</div>
              <div class="text-xs text-gray-600 mt-1">总任务数</div>
            </div>
            <div onclick="planner.setMonthlyFilter('completed')"
                    class="${getCardClass('completed')} bg-gradient-to-br from-green-50 to-green-100">
              <div class="text-2xl font-bold text-green-600">${stats.completed}</div>
              <div class="text-xs text-gray-600 mt-1">已完成</div>
            </div>
            <div onclick="planner.setMonthlyFilter('pending')"
                    class="${getCardClass('pending')} bg-gradient-to-br from-orange-50 to-orange-100">
              <div class="text-2xl font-bold text-orange-600">${stats.pending}</div>
              <div class="text-xs text-gray-600 mt-1">未完成</div>
            </div>
          </div>

          <div class="flex items-center justify-center mb-6">
            <div class="relative">
              <svg width="120" height="120" class="transform -rotate-90">
                <circle cx="60" cy="60" r="45" stroke="#e5e7eb" stroke-width="8" fill="none"/>
                <circle cx="60" cy="60" r="45" stroke="#10b981" stroke-width="8" fill="none"
                        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                        class="transition-all duration-500 ease-in-out"/>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-2xl font-bold text-gray-800">${stats.percentage}%</span>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3">${overviewTitle}</h3>
            <div class="space-y-2 max-h-96 overflow-y-auto">
              ${tasksOverview}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 更多菜单显示状态
  private showMoreMenu: boolean = false;

  // ==================== 自动更新状态 ====================
  private updateAvailable: boolean = false;
  private updateInfo: { version: string; releaseDate?: string; releaseNotes?: string } | null = null;
  private updateDownloaded: boolean = false;
  private downloadProgress: { percent: number } | null = null;
  private showUpdateModal: boolean = false;
  private checkingForUpdate: boolean = false;
  private isManualCheck: boolean = false;  // 是否是手动检查更新
  private isAlwaysOnTop: boolean = false;  // 窗口是否置顶

  private toggleMoreMenu(): void {
    this.showMoreMenu = !this.showMoreMenu;
    this.render();
  }

  // 生成更多菜单
  private generateMoreMenuHTML(): string {
    if (!this.showMoreMenu) return '';
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
    const textClass = isDark ? 'text-gray-200' : 'text-gray-700';
    const hoverClass = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

    return `
      <div class="fixed inset-0 z-40" onclick="planner.toggleMoreMenu()">
        <div class="absolute right-4 top-20 ${bgClass} rounded-lg shadow-xl border py-2 min-w-[160px]" onclick="event.stopPropagation()">
          <button onclick="planner.showYearlyStats = true; planner.showMoreMenu = false; planner.render();"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            年度统计
          </button>
          <button onclick="planner.showAnniversaryModal = true; planner.showMoreMenu = false; planner.render();"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"/>
            </svg>
            纪念日管理
          </button>
          <button onclick="planner.showReminderSettings = true; planner.showMoreMenu = false; planner.render();"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            提醒设置
          </button>
          <div class="border-t ${isDark ? 'border-gray-700' : ''} my-1"></div>
          <button onclick="planner.importFromJSON(); planner.showMoreMenu = false;"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            导入数据
          </button>
          <button onclick="planner.exportToJSON()"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            导出 JSON
          </button>
          <button onclick="planner.exportToCSV()"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            导出 CSV
          </button>
          <div class="border-t ${isDark ? 'border-gray-700' : ''} my-1"></div>
          <button onclick="planner.checkForUpdate(); planner.showMoreMenu = false;"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            检查更新
          </button>
          <div class="border-t ${isDark ? 'border-gray-700' : ''} my-1"></div>
          <div class="px-4 py-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} text-center">
            每日规划 v${APP_VERSION}
          </div>
        </div>
      </div>
    `;
  }

  // 生成四象限视图HTML
  private generateQuadrantViewHTML(): string {
    if (!this.showQuadrantView) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const quadrantTasks = this.getQuadrantTasks();

    // 生成单个象限的任务列表
    const generateQuadrantTasks = (tasks: Task[], priority: TaskPriority, colorClass: string): string => {
      const config = PRIORITY_CONFIG[priority];
      const completedCount = tasks.filter(t => t.completed).length;
      
      return `
        <div class="rounded-xl p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} border-2 ${config.borderColor} border-opacity-30">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full ${config.bgColor}"></span>
              <h3 class="font-semibold ${textClass}">${config.label}</h3>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="${isDark ? 'text-gray-400' : 'text-gray-500'}">${tasks.length}个任务</span>
              ${tasks.length > 0 ? `<span class="px-2 py-0.5 rounded ${config.bgColor} ${config.color}">${completedCount}/${tasks.length}完成</span>` : ''}
            </div>
          </div>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            ${tasks.length > 0 ? tasks.map(task => `
              <div class="flex items-center gap-2 p-2 rounded ${isDark ? 'bg-gray-600 hover:bg-gray-550' : 'bg-white hover:bg-gray-100'} transition-colors cursor-pointer group"
                   onclick="planner.jumpToDate('${task.date}')">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                       class="w-4 h-4 rounded cursor-pointer"
                       onclick="event.stopPropagation()">
                <span class="flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : textClass} truncate">${task.text}</span>
                <span class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">${task.date}</span>
              </div>
            `).join('') : `<p class="text-center ${isDark ? 'text-gray-500' : 'text-gray-400'} py-4 text-sm">暂无任务</p>`}
          </div>
        </div>
      `;
    };

    // 时间筛选按钮
    const filterButtons = `
      <div class="flex items-center gap-2 mb-4 flex-wrap">
        <button onclick="planner.setQuadrantFilter('year')"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${this.quadrantFilter === 'year' 
                  ? 'bg-blue-500 text-white' 
                  : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}">
          本年度
        </button>
        <button onclick="planner.setQuadrantFilter('month')"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${this.quadrantFilter === 'month' 
                  ? 'bg-blue-500 text-white' 
                  : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}">
          本月度
        </button>
        <button onclick="planner.setQuadrantFilter('custom')"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${this.quadrantFilter === 'custom' 
                  ? 'bg-blue-500 text-white' 
                  : (isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}">
          自定义
        </button>
        ${this.quadrantFilter === 'custom' ? `
          <div class="flex items-center gap-2 ml-2">
            <input type="date" value="${this.quadrantStartDate}" 
                   onchange="planner.setQuadrantDateRange('start', this.value)"
                   class="px-3 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} text-sm">
            <span class="${isDark ? 'text-gray-400' : 'text-gray-500'}">至</span>
            <input type="date" value="${this.quadrantEndDate}" 
                   onchange="planner.setQuadrantDateRange('end', this.value)"
                   class="px-3 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300'} text-sm">
          </div>
        ` : ''}
      </div>
    `;

    // 统计数据
    const totalTasks = quadrantTasks.urgentImportant.length + quadrantTasks.important.length + 
                       quadrantTasks.urgent.length + quadrantTasks.normal.length;
    const totalCompleted = quadrantTasks.urgentImportant.filter(t => t.completed).length +
                          quadrantTasks.important.filter(t => t.completed).length +
                          quadrantTasks.urgent.filter(t => t.completed).length +
                          quadrantTasks.normal.filter(t => t.completed).length;

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.toggleQuadrantView()">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-xl font-bold ${textClass}">四象限任务分析</h2>
              <p class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1">
                时间范围：${this.quadrantStartDate} 至 ${this.quadrantEndDate}
                | 共 ${totalTasks} 个任务，已完成 ${totalCompleted} 个
              </p>
            </div>
            <button onclick="planner.toggleQuadrantView()"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          ${filterButtons}

          <!-- 四象限矩阵 -->
          <div class="grid grid-cols-2 gap-4">
            <!-- 紧急重要 -->
            ${generateQuadrantTasks(quadrantTasks.urgentImportant, 'urgent-important', 'red')}
            
            <!-- 重要不急 -->
            ${generateQuadrantTasks(quadrantTasks.important, 'important', 'yellow')}
            
            <!-- 紧急不重要 -->
            ${generateQuadrantTasks(quadrantTasks.urgent, 'urgent', 'orange')}
            
            <!-- 不重要不急 -->
            ${generateQuadrantTasks(quadrantTasks.normal, 'normal', 'gray')}
          </div>

          <!-- 提示信息 -->
          <div class="mt-4 p-3 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg">
            <p class="text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}">
              💡 <strong>四象限法则</strong>：优先处理"紧急重要"的任务，合理安排"重要不急"的任务，委托或快速处理"紧急不重要"的任务，考虑是否需要"不重要不急"的任务。点击任务可跳转到对应日期。
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // 生成搜索面板
  private generateSearchPanelHTML(): string {
    if (!this.showSearchPanel) return '';
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300';
    const textClass = isDark ? 'text-gray-200' : 'text-gray-700';

    const results = this.searchQuery ? this.searchTasks(this.searchQuery) : [];

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-start justify-center z-50 pt-20"
           onclick="planner.showSearchPanel = false; planner.searchQuery = ''; planner.render();">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[70vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          <div class="flex items-center gap-3 mb-4">
            <input type="text"
                   placeholder="搜索任务..."
                   value="${this.searchQuery}"
                   oninput="planner.performSearch(this.value)"
                   class="flex-1 px-4 py-3 border ${inputBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                   autofocus>
            <button onclick="planner.showSearchPanel = false; planner.searchQuery = ''; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div id="searchResults" class="space-y-2">
            ${results.length > 0 ? results.map(({ date, task }) => `
              <div class="flex items-center gap-3 p-3 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg cursor-pointer transition-colors"
                   onclick="planner.jumpToDate('${date}')">
                <input type="checkbox" ${task.completed ? 'checked' : ''} class="pointer-events-none" disabled>
                <span class="flex-1 ${task.completed ? 'line-through text-gray-400' : textClass}">${task.text}</span>
                <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${date}</span>
                <span class="text-xs px-2 py-1 rounded ${getPriorityConfig(task.priority).bgColor} ${getPriorityConfig(task.priority).color}">${getPriorityConfig(task.priority).shortLabel}</span>
              </div>
            `).join('') : this.searchQuery ? `<p class="text-center text-gray-400 py-8">未找到匹配的任务</p>` : `<p class="text-center text-gray-400 py-8">输入关键词搜索任务</p>`}
          </div>
        </div>
      </div>
    `;
  }

  // 生成年度统计弹窗
  private generateYearlyStatsHTML(): string {
    if (!this.showYearlyStats) return '';
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const stats = this.getYearlyStats();
    const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.showYearlyStats = false; planner.render();">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold ${textClass}">${this.currentDate.getFullYear()}年任务统计</h2>
            <button onclick="planner.showYearlyStats = false; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-blue-600">${stats.total}</div>
              <div class="text-xs text-gray-600 dark:text-gray-400">总任务数</div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-green-600">${stats.completed}</div>
              <div class="text-xs text-gray-600 dark:text-gray-400">已完成</div>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-purple-600">${percentage}%</div>
              <div class="text-xs text-gray-600 dark:text-gray-400">完成率</div>
            </div>
          </div>

          <div class="space-y-2">
            ${stats.byMonth.map(m => `
              <div class="flex items-center gap-3">
                <span class="w-12 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${monthNames[m.month - 1]}</span>
                <div class="flex-1 h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                       style="width: ${m.total > 0 ? (m.completed / m.total * 100) : 0}%"></div>
                </div>
                <span class="w-20 text-sm text-right ${isDark ? 'text-gray-300' : 'text-gray-600'}">${m.completed}/${m.total}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // 纪念日弹窗状态
  private showAnniversaryModal: boolean = false;

  // 生成纪念日管理弹窗
  private generateAnniversaryModalHTML(): string {
    if (!this.showAnniversaryModal) return '';
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300';

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.showAnniversaryModal = false; planner.render();">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold ${textClass}">纪念日管理</h2>
            <button onclick="planner.showAnniversaryModal = false; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="mb-6 p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <input type="text" id="anniversaryName" placeholder="纪念日名称"
                     class="col-span-2 px-3 py-2 border ${inputBg} rounded-lg">
              <input type="number" id="anniversaryMonth" placeholder="月" min="1" max="12"
                     class="px-3 py-2 border ${inputBg} rounded-lg">
              <input type="number" id="anniversaryDay" placeholder="日" min="1" max="31"
                     class="px-3 py-2 border ${inputBg} rounded-lg">
              <select id="anniversaryType" class="px-3 py-2 border ${inputBg} rounded-lg">
                <option value="birthday">生日</option>
                <option value="anniversary">纪念日</option>
                <option value="custom">自定义</option>
              </select>
              <select id="anniversaryCalendar" class="px-3 py-2 border ${inputBg} rounded-lg">
                <option value="solar">公历</option>
                <option value="lunar">农历</option>
              </select>
            </div>
            <button onclick="planner.handleAddAnniversary()"
                    class="w-full px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
              添加纪念日
            </button>
          </div>

          <div class="space-y-2">
            ${this.anniversaries.length > 0 ? this.anniversaries.map(a => `
              <div class="flex items-center justify-between p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg">
                <div>
                  <span class="font-medium ${textClass}">${a.name}</span>
                  <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} ml-2">${a.isLunar ? '农历' : ''}${a.month}月${a.day}日</span>
                  <span class="text-xs px-2 py-0.5 rounded-full ml-2 ${a.type === 'birthday' ? 'bg-pink-100 text-pink-600' : a.type === 'anniversary' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}">${a.type === 'birthday' ? '生日' : a.type === 'anniversary' ? '纪念日' : '自定义'}</span>
                </div>
                <button onclick="planner.deleteAnniversary('${a.id}')"
                        class="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            `).join('') : `<p class="text-center text-gray-400 py-4">暂无纪念日</p>`}
          </div>
        </div>
      </div>
    `;
  }

  // 生成提醒设置弹窗
  private generateReminderSettingsHTML(): string {
    if (!this.showReminderSettings) return '';
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';

    const isElectron = !!window.electronAPI;

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.showReminderSettings = false; planner.render();">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-md"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold ${textClass}">🔔 提醒设置</h2>
            <button onclick="planner.showReminderSettings = false; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          ${!isElectron ? `
            <div class="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <p class="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ 提醒功能仅在桌面应用中可用，请打包成桌面应用后使用此功能。
              </p>
            </div>
          ` : ''}

          <div class="space-y-4">
            <!-- 纪念日提醒 -->
            <div class="p-4 ${cardBg} rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🎉</span>
                  <span class="font-medium ${textClass}">纪念日提醒</span>
                </div>
                <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">提前 ${this.reminderConfig.anniversary} 天</span>
              </div>
              <p class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">生日、纪念日等将在指定天数前提醒</p>
            </div>

            <!-- 高优先级任务 -->
            <div class="p-4 ${cardBg} rounded-lg border-l-4 border-red-500">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🔴</span>
                  <span class="font-medium ${textClass}">高优先级任务</span>
                </div>
                <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">提前 ${this.reminderConfig.high} 天</span>
              </div>
              <p class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">未完成的高优先级任务将提前7天提醒</p>
            </div>

            <!-- 中优先级任务 -->
            <div class="p-4 ${cardBg} rounded-lg border-l-4 border-yellow-500">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🟡</span>
                  <span class="font-medium ${textClass}">中优先级任务</span>
                </div>
                <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">提前 ${this.reminderConfig.medium} 天</span>
              </div>
              <p class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">未完成的中优先级任务将提前5天提醒</p>
            </div>

            <!-- 低优先级任务 -->
            <div class="p-4 ${cardBg} rounded-lg border-l-4 border-green-500">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🟢</span>
                  <span class="font-medium ${textClass}">低优先级任务</span>
                </div>
                <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">提前 ${this.reminderConfig.low} 天</span>
              </div>
              <p class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">未完成的低优先级任务将提前3天提醒</p>
            </div>
          </div>

          ${isElectron ? `
            <div class="mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}">
              <button onclick="planner.testNotification()"
                      class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                🔔 测试通知
              </button>
              <p class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center mt-2">
                点击测试通知按钮，检查系统通知是否正常工作
              </p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // 生成周视图（时间轴式）
  private generateWeekViewHTML(): string {
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
    const hoverBg = isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

    // 获取本周的日期（周一开始）
    const weekStart = new Date(this.currentDate);
    const dayOfWeek = weekStart.getDay();
    const adjustedDayOfWeek = (dayOfWeek + 6) % 7;
    weekStart.setDate(weekStart.getDate() - adjustedDayOfWeek);

    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    const today = new Date();
    const todayStr = this.formatDate(today);

    // 时间范围：6:00 - 22:00
    const startHour = 6;
    const endHour = 22;
    const hourHeight = 60; // 每小时高度 60px

    // 生成时间轴
    let timeAxisHTML = '<div class="w-14 flex-shrink-0"></div>'; // 左上角空白
    for (let hour = startHour; hour <= endHour; hour++) {
      const displayHour = hour.toString().padStart(2, '0');
      timeAxisHTML += `
        <div class="h-[${hourHeight}px] flex items-start justify-end pr-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}">
          ${displayHour}:00
        </div>
      `;
    }

    // 生成每天的列
    let daysColumnsHTML = '';
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = this.formatDate(date);
      const isToday = dateKey === todayStr;
      const dayTasks = this.tasks[dateKey] || [];
      const lunarText = this.getLunarDisplayText(date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      // 头部
      const headerHTML = `
        <div class="h-16 flex flex-col items-center justify-center border-b ${borderColor} ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
          <div class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">周${weekDays[i]}</div>
          <div class="text-xl font-bold ${isToday ? 'text-blue-500' : textClass}">${date.getDate()}</div>
          <div class="text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}">${lunarText}</div>
        </div>
      `;

      // 生成时间格子和任务块
      let timeSlotsHTML = '';
      for (let hour = startHour; hour < endHour; hour++) {
        timeSlotsHTML += `
          <div class="h-[${hourHeight}px] border-b ${borderColor} relative cursor-pointer ${hoverBg}"
               onclick="planner.selectDateWithTime(new Date(${year}, ${month}, ${day}, ${hour}))">
          </div>
        `;
      }

      // 生成任务块
      let taskBlocksHTML = '';
      dayTasks.forEach(task => {
        if (task.time) {
          const timeParts = task.time.split(':');
          const taskHour = parseInt(timeParts[0]);
          const taskMinute = parseInt(timeParts[1] || '0');
          
          // 只显示在时间范围内的任务
          if (taskHour >= startHour && taskHour < endHour) {
            const topOffset = (taskHour - startHour) * hourHeight + (taskMinute / 60) * hourHeight;
            const taskHeight = 50; // 任务块默认高度
            const taskPriority = (task.priority || 'normal') as TaskPriority;
            const priorityConfig = PRIORITY_CONFIG[taskPriority] || PRIORITY_CONFIG['normal'];
            
            taskBlocksHTML += `
              <div class="absolute left-1 right-1 p-1 rounded text-xs ${priorityConfig.bgColor} ${priorityConfig.color} border-l-2 ${priorityConfig.borderColor} ${task.completed ? 'opacity-50 line-through' : ''} cursor-pointer overflow-hidden"
                   style="top: ${topOffset + 64}px; height: ${taskHeight}px;"
                   onclick="event.stopPropagation(); planner.selectDate(new Date(${year}, ${month}, ${day}));">
                <div class="font-medium truncate">${task.text}</div>
                <div class="text-[10px] opacity-70">${task.time}</div>
              </div>
            `;
          }
        }
      });

      daysColumnsHTML += `
        <div class="flex-1 min-w-[100px] ${bgClass} rounded-lg shadow overflow-hidden relative ${isToday ? 'ring-2 ring-blue-500' : ''}">
          ${headerHTML}
          <div class="relative">
            ${timeSlotsHTML}
            ${taskBlocksHTML}
          </div>
        </div>
      `;
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return `
      <div class="${bgClass} rounded-xl shadow-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <button onclick="planner.currentDate.setDate(planner.currentDate.getDate() - 7); planner.render();"
                  class="p-2 ${hoverBg} rounded-lg transition-colors">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 class="text-lg font-bold ${textClass}">
            ${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日
          </h2>
          <button onclick="planner.currentDate.setDate(planner.currentDate.getDate() + 7); planner.render();"
                  class="p-2 ${hoverBg} rounded-lg transition-colors">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div class="flex gap-1 overflow-x-auto">
          <!-- 时间轴 -->
          <div class="w-14 flex-shrink-0 ${bgClass} rounded-lg">
            <div class="h-16 border-b ${borderColor}"></div>
            <div class="relative">
              ${Array.from({length: endHour - startHour}, (_, i) => {
                const hour = startHour + i;
                const displayHour = hour.toString().padStart(2, '0');
                return `<div class="h-[${hourHeight}px] flex items-start justify-end pr-2 pt-0 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}">${displayHour}:00</div>`;
              }).join('')}
            </div>
          </div>
          <!-- 日期列 -->
          ${daysColumnsHTML}
        </div>
      </div>
    `;
  }

  // 选择日期并设置时间
  private selectDateWithTime(date: Date): void {
    this.selectedDate = date;
    this.hoveredDate = date;
    this.showTaskPanel = true;
    this.preselectedTime = this.formatTimeHM(date);
    this.render();
  }

  // 格式化时间为 HH:MM
  private formatTimeHM(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // 生成日视图
  private generateDayViewHTML(): string {
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300';

    const date = this.currentDate;
    const dateKey = this.formatDate(date);
    const dayTasks = this.tasks[dateKey] || [];
    const lunarText = this.getLunarFullText(date);
    const holidayInfo = this.getHolidayInfo(date);
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    // 检查纪念日
    const todayAnniversaries = this.getMatchingAnniversaries(date);

    return `
      <div class="${bgClass} rounded-xl shadow-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <button onclick="planner.currentDate.setDate(planner.currentDate.getDate() - 1); planner.render();"
                  class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="text-center">
            <h2 class="text-2xl font-bold ${textClass}">${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 周${weekDays[date.getDay()]}</h2>
            <p class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">农历 ${lunarText} ${holidayInfo ? (holidayInfo.holiday ? `· ${holidayInfo.name}` : '· 调休上班') : ''}</p>
          </div>
          <button onclick="planner.currentDate.setDate(planner.currentDate.getDate() + 1); planner.render();"
                  class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        ${todayAnniversaries.length > 0 ? `
          <div class="mb-4 p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
            ${todayAnniversaries.map(a => `<span class="text-pink-600 dark:text-pink-400">🎉 ${a.name}</span>`).join(' ')}
          </div>
        ` : ''}

        <div class="mb-4">
          <div class="flex gap-2">
            <input type="text" id="dayTaskInput" placeholder="添加新任务..."
                   class="flex-1 px-4 py-2 border ${inputBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                   onkeypress="if(event.key === 'Enter') planner.addDayTask()">
            <select id="dayPrioritySelect" class="px-3 py-2 border ${inputBg} rounded-lg">
              <option value="urgent-important">🔴紧急重要</option>
              <option value="important">🟡重要不急</option>
              <option value="urgent">🟠紧急不重要</option>
              <option value="normal" selected>⚪不重要不急</option>
            </select>
            <button onclick="planner.addDayTask()"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              添加
            </button>
          </div>
        </div>

        <div class="space-y-2">
          ${dayTasks.length > 0 ? dayTasks.map(task => {
            const taskPriority: TaskPriority = (task.priority || 'normal') as TaskPriority;
            const priorityConfig = getPriorityConfig(taskPriority);
            return `
            <div class="flex items-center gap-3 p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg border-l-4 ${priorityConfig.borderColor}">
              <input type="checkbox" ${task.completed ? 'checked' : ''} 
                     onchange="planner.toggleDayTask('${task.id}')"
                     class="w-5 h-5 rounded">
              <span class="flex-1 ${task.completed ? 'line-through text-gray-400' : textClass}">${task.text}</span>
              <span class="text-xs text-gray-400">${task.time}</span>
              <button onclick="planner.deleteDayTask('${task.id}')"
                      class="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          `;}).join('') : `<p class="text-center text-gray-400 py-8">暂无任务</p>`}
        </div>
      </div>
    `;
  }

  // 日视图添加任务
  private addDayTask(): void {
    const input = document.getElementById('dayTaskInput') as HTMLInputElement;
    const priority = document.getElementById('dayPrioritySelect') as HTMLSelectElement;
    if (input && input.value.trim()) {
      const dateKey = this.formatDate(this.currentDate);
      if (!this.tasks[dateKey]) {
        this.tasks[dateKey] = [];
      }
      this.tasks[dateKey].push({
        id: Date.now().toString(),
        text: input.value.trim(),
        completed: false,
        date: dateKey,
        time: this.getCurrentTime(),
        priority: priority.value as TaskPriority,
        tags: []
      });
      this.saveTasks();
      input.value = '';
      this.render();
    }
  }

  // 日视图切换任务状态
  private toggleDayTask(taskId: string): void {
    const dateKey = this.formatDate(this.currentDate);
    const task = this.tasks[dateKey]?.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveTasks();
      this.render();
    }
  }

  // 日视图删除任务
  private deleteDayTask(taskId: string): void {
    const dateKey = this.formatDate(this.currentDate);
    if (this.tasks[dateKey]) {
      this.tasks[dateKey] = this.tasks[dateKey].filter(t => t.id !== taskId);
      this.saveTasks();
      this.render();
    }
  }

  // 渲染整个应用
  private render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const theme = backgroundThemes[this.currentTheme];

    // 生成主题选项
    const themeOptions = Object.entries(backgroundThemes).map(([key, value]) => `
      <button onclick="planner.setTheme('${key}')"
              class="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${this.currentTheme === key ? this.themeMode === 'dark' ? 'bg-gray-700' : 'bg-gray-100' : ''}">
        <div class="w-6 h-6 rounded-full bg-gradient-to-br ${value.from} ${value.to}"></div>
        <span class="${this.themeMode === 'dark' ? 'text-gray-200' : ''}">${value.name}</span>
        ${this.currentTheme === key ? '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' : ''}
      </button>
    `).join('');

    const isDark = this.themeMode === 'dark';

    // 根据深色模式选择背景颜色
    const bgFrom = isDark ? theme.darkFrom : theme.from;
    const bgTo = isDark ? theme.darkTo : theme.to;

    // 窗口控制栏（仅在 Electron 环境中显示）
    const windowControls = window.electronAPI ? `
      <div class="fixed top-0 left-0 right-0 h-8 ${isDark ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-sm flex items-center justify-between px-2 z-[100] select-none" style="-webkit-app-region: drag;">
        <div class="flex items-center gap-2" style="-webkit-app-region: no-drag;">
          <img src="/icon.png" class="w-4 h-4" alt="每日规划">
          <span class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}">每日规划 v${APP_VERSION}</span>
        </div>
        <div class="flex items-center gap-1" style="-webkit-app-region: no-drag;">
          <button onclick="planner.toggleAlwaysOnTop()" 
                  class="w-8 h-6 flex items-center justify-center hover:${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded transition-colors group"
                  title="窗口置顶 (Ctrl+Shift+P)">
            <svg class="w-3 h-3 ${this.isAlwaysOnTop ? (isDark ? 'text-blue-400' : 'text-blue-500') : (isDark ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-500 group-hover:text-gray-700')}" fill="${this.isAlwaysOnTop ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
            </svg>
          </button>
          <button onclick="planner.minimizeToTray()" 
                  class="w-8 h-6 flex items-center justify-center hover:${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded transition-colors group"
                  title="最小化到托盘">
            <svg class="w-3 h-3 ${isDark ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-500 group-hover:text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
            </svg>
          </button>
          <button onclick="planner.toggleMaximize()" 
                  class="w-8 h-6 flex items-center justify-center hover:${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded transition-colors group"
                  title="最大化/还原">
            <svg class="w-3 h-3 ${isDark ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-500 group-hover:text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" stroke-width="2"/>
            </svg>
          </button>
          <button onclick="planner.closeToTray()" 
                  class="w-8 h-6 flex items-center justify-center hover:bg-red-500 rounded transition-colors group"
                  title="关闭到托盘">
            <svg class="w-3 h-3 ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-white'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    ` : '';

    app.innerHTML = `
      ${windowControls}
      <div class="min-h-screen bg-gradient-to-br ${bgFrom} ${bgTo} ${window.electronAPI ? 'pt-10' : 'py-8'} px-4 transition-colors" tabindex="0" id="main-container">
        <div class="max-w-4xl mx-auto">
          <div class="flex items-center justify-between mb-6 relative z-50 flex-wrap gap-2">
            <h1 class="text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}">${this.viewMode === 'month' ? '每日规划' : this.viewMode === 'week' ? '周规划' : '日规划'}</h1>
            <div class="flex items-center gap-2 flex-wrap">
              <button onclick="planner.jumpToToday()"
                      class="px-3 py-2 ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors shadow-md text-sm font-medium"
                      title="跳转到今天">
                今天
              </button>
              <div class="flex rounded-lg overflow-hidden shadow-md">
                <button onclick="planner.setViewMode('month')"
                        class="px-3 py-2 text-sm font-medium transition-colors ${this.viewMode === 'month' ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'}">
                  月
                </button>
                <button onclick="planner.setViewMode('week')"
                        class="px-3 py-2 text-sm font-medium transition-colors border-l ${isDark ? 'border-gray-600' : 'border-gray-200'} ${this.viewMode === 'week' ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'}">
                  周
                </button>
                <button onclick="planner.setViewMode('day')"
                        class="px-3 py-2 text-sm font-medium transition-colors border-l ${isDark ? 'border-gray-600' : 'border-gray-200'} ${this.viewMode === 'day' ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'}">
                  日
                </button>
              </div>
              <button onclick="planner.showSearchPanel = true; planner.render();"
                      class="p-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'} rounded-lg transition-colors shadow-md"
                      title="搜索任务">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </button>
              <div class="relative">
                <button onclick="planner.toggleThemeMenu()"
                        class="p-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'} rounded-lg transition-colors shadow-md"
                        title="主题设置">
                  <svg class="w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                  </svg>
                </button>
                ${this.showThemeMenu ? `
                  <div class="absolute right-0 top-full mt-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-lg shadow-xl border py-2 min-w-[180px] z-50">
                    <div class="px-3 py-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} border-b ${isDark ? 'border-gray-700' : ''}">主题颜色</div>
                    ${themeOptions}
                    <div class="border-t ${isDark ? 'border-gray-700' : ''} mt-1 pt-1">
                      <button onclick="planner.toggleThemeMode()"
                              class="flex items-center gap-3 px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        ${isDark ? `
                          <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                          </svg>
                          <span class="${isDark ? 'text-gray-200' : ''}">浅色模式</span>
                        ` : `
                          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                          </svg>
                          <span>深色模式</span>
                        `}
                      </button>
                    </div>
                  </div>
                ` : ''}
              </div>
              <div class="relative">
                <button onclick="planner.toggleMoreMenu()"
                        class="p-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'} rounded-lg transition-colors shadow-md"
                        title="更多功能"
                        id="moreMenuBtn">
                  <svg class="w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                </button>
              </div>
              <button onclick="planner.toggleQuadrantView()"
                      class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-md text-sm font-medium">
                四象限
              </button>
              <button onclick="planner.toggleStatsModal()"
                      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md text-sm font-medium">
                统计
              </button>
            </div>
          </div>
          ${this.viewMode === 'month' ? this.generateCalendarHTML() : this.viewMode === 'week' ? this.generateWeekViewHTML() : this.generateDayViewHTML()}
        </div>
      </div>
      ${this.generateTaskPanelHTML()}
      ${this.generateCopyModalHTML()}
      ${this.generateQuadrantViewHTML()}
      ${this.generateStatsModalHTML()}
      ${this.generateSearchPanelHTML()}
      ${this.generateMoreMenuHTML()}
      ${this.generateYearlyStatsHTML()}
      ${this.generateAnniversaryModalHTML()}
      ${this.generateReminderSettingsHTML()}
      ${this.generateTagManagerHTML()}
      ${this.generateQuickTagSelectorHTML()}
      ${this.generateUpdateModalHTML()}
    `;

    // 使用 requestAnimationFrame 确保 DOM 渲染完成后再添加动画类
    requestAnimationFrame(() => {
      // 任务面板动画 - 只在没有弹窗打开时显示
      const taskPanel = document.querySelector('.task-panel');
      const hasOpenModal = this.showStatsModal || this.showCopyModal || this.showThemeMenu;

      if (taskPanel && (this.selectedDate || this.hoveredDate) && !hasOpenModal) {
        taskPanel.classList.add('show');
      }

      // 统计弹窗动画
      const statsModal = document.querySelector('.stats-modal');
      const modalBackdrop = document.querySelector('.modal-backdrop');
      if (this.showStatsModal) {
        if (statsModal) statsModal.classList.add('show');
        if (modalBackdrop) modalBackdrop.classList.add('show');
      }
    });
  }
}

export function initApp(): void {
  const plannerInstance = new DailyPlanner();
  (window as any).planner = plannerInstance;
  
  // 键盘快捷键
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const planner = (window as any).planner;
    if (!planner) return;
    
    // 如果正在输入框中，不处理快捷键（除了 Escape）
    const activeElement = document.activeElement;
    const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'SELECT';
    
    // Escape - 关闭面板/弹窗
    if (e.key === 'Escape') {
      e.preventDefault();
      // 直接调用关闭逻辑
      planner.showStatsModal = false;
      planner.showCopyModal = false;
      planner.copyingTask = null;
      planner.selectedCopyDates = new Set();
      planner.showThemeMenu = false;
      planner.showSearchPanel = false;
      planner.searchQuery = '';
      planner.showYearlyStats = false;
      planner.showAnniversaryModal = false;
      planner.showMoreMenu = false;
      if (planner.selectedDate) {
        planner.selectedDate = null;
        planner.hoveredDate = null;
      }
      planner.render();
      return;
    }
    
    // 如果在输入框中，不处理其他快捷键
    if (isInputFocused) return;
    
    // Enter - 聚焦到任务输入框
    if (e.key === 'Enter') {
      e.preventDefault();
      const taskInput = document.getElementById('taskInput') as HTMLInputElement;
      if (taskInput) {
        taskInput.focus();
        taskInput.select();
      }
      return;
    }
    
    // 方向键 - 导航日期
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (planner.viewMode === 'month') {
        if (planner.selectedDate) {
          const newDate = new Date(planner.selectedDate);
          newDate.setDate(newDate.getDate() - 1);
          planner.selectDate(newDate);
          if (newDate.getMonth() !== planner.currentDate.getMonth()) {
            planner.currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
          }
        } else {
          const today = new Date();
          planner.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
          planner.selectedDate = new Date(today);
          planner.hoveredDate = null;
          planner.loadHolidaysForYear(today.getFullYear());
        }
      } else {
        planner.currentDate.setDate(planner.currentDate.getDate() - 1);
      }
      planner.render();
      return;
    }
    
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (planner.viewMode === 'month') {
        if (planner.selectedDate) {
          const newDate = new Date(planner.selectedDate);
          newDate.setDate(newDate.getDate() + 1);
          planner.selectDate(newDate);
          if (newDate.getMonth() !== planner.currentDate.getMonth()) {
            planner.currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
          }
        } else {
          const today = new Date();
          planner.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
          planner.selectedDate = new Date(today);
          planner.hoveredDate = null;
          planner.loadHolidaysForYear(today.getFullYear());
        }
      } else {
        planner.currentDate.setDate(planner.currentDate.getDate() + 1);
      }
      planner.render();
      return;
    }
    
    // 上键 - 向前7天（上周）
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (planner.viewMode === 'month') {
        if (planner.selectedDate) {
          const newDate = new Date(planner.selectedDate);
          newDate.setDate(newDate.getDate() - 7);
          planner.selectDate(newDate);
          if (newDate.getMonth() !== planner.currentDate.getMonth()) {
            planner.currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
            planner.loadHolidaysForYear(newDate.getFullYear());
          }
        } else {
          const today = new Date();
          planner.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
          planner.selectedDate = new Date(today);
          planner.hoveredDate = null;
          planner.loadHolidaysForYear(today.getFullYear());
        }
      } else if (planner.viewMode === 'week') {
        planner.currentDate.setDate(planner.currentDate.getDate() - 7);
      } else {
        planner.currentDate.setDate(planner.currentDate.getDate() - 7);
      }
      planner.render();
      return;
    }
    
    // 下键 - 向后7天（下周）
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (planner.viewMode === 'month') {
        if (planner.selectedDate) {
          const newDate = new Date(planner.selectedDate);
          newDate.setDate(newDate.getDate() + 7);
          planner.selectDate(newDate);
          if (newDate.getMonth() !== planner.currentDate.getMonth()) {
            planner.currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
            planner.loadHolidaysForYear(newDate.getFullYear());
          }
        } else {
          const today = new Date();
          planner.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
          planner.selectedDate = new Date(today);
          planner.hoveredDate = null;
          planner.loadHolidaysForYear(today.getFullYear());
        }
      } else if (planner.viewMode === 'week') {
        planner.currentDate.setDate(planner.currentDate.getDate() + 7);
      } else {
        planner.currentDate.setDate(planner.currentDate.getDate() + 7);
      }
      planner.render();
      return;
    }
    
    // T - 跳转到今天
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      const today = new Date();
      // 根据视图模式设置 currentDate
      if (planner.viewMode === 'month') {
        planner.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
      } else {
        // 周视图和日视图：设置为今天
        planner.currentDate = new Date(today);
      }
      planner.selectedDate = new Date(today);
      planner.hoveredDate = null;
      planner.loadHolidaysForYear(today.getFullYear());
      planner.render();
      return;
    }
    
    // / - 打开搜索
    if (e.key === '/') {
      e.preventDefault();
      planner.showSearchPanel = true;
      planner.render();
      setTimeout(() => {
        const searchInput = document.querySelector('[placeholder="搜索任务..."]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }, 100);
      return;
    }
  });
}
