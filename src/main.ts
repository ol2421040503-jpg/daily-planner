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
import JSZip from 'jszip';

// ==================== 图片压缩配置 ====================
const IMAGE_COMPRESSION_CONFIG = {
  maxWidth: 1920,        // 最大宽度
  maxHeight: 1080,       // 最大高度
  quality: 0.7,          // 压缩质量 (0-1)
  mimeType: 'image/jpeg' // 输出格式
};

// ==================== 版本配置 ====================
const APP_VERSION = '1.4.9';
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

// 知识库步骤
interface KnowledgeStep {
  id: string;
  title: string;        // 步骤标题
  content: string;      // 步骤内容/操作说明
  imageUrl?: string;    // 图片URL（可选，兼容旧数据）
  images?: string[];    // 图片URL数组（支持多图）
  order: number;        // 排序顺序
}

// 知识库指南
interface KnowledgeGuide {
  id: string;
  name: string;         // 指南名称
  steps: KnowledgeStep[];  // 步骤列表
  createdAt: number;    // 创建时间
  updatedAt: number;    // 更新时间
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

// 周统计数据
interface WeeklyStats {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
  byDay: { date: string; dayName: string; total: number; completed: number }[];
  lastWeekPercentage: number;
  improvement: number; // 较上周提升百分比
  streakDays: number; // 连续打卡天数
}

// 年度统计数据扩展
interface YearlyStatsExtended {
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

type MonthlyFilter = 'all' | 'completed' | 'pending';

// 视图模式类型
type ViewMode = 'month' | 'week';

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
  private showWeeklySummary: boolean = false;  // 是否显示周总结
  private showMonthlySummary: boolean = false;  // 是否显示月总结
  // 总结导航偏移量（用于查看历史周期）
  private viewingWeekOffset: number = 0;   // 0=当前周，-1=上周，1=下周
  private viewingMonthOffset: number = 0;  // 0=当前月，-1=上月，1=下月
  private viewingYearOffset: number = 0;   // 0=当前年，-1=去年，1=明年
  // 总结文字存储（按年-周/年-月/年 格式存储）
  private summaryNotes: {
    weekly: Record<string, string>;   // key: "2024-W01" 格式
    monthly: Record<string, string>;  // key: "2024-01" 格式
    yearly: Record<string, string>;   // key: "2024" 格式
  } = { weekly: {}, monthly: {}, yearly: {} };
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
  private showShortcutHelp: boolean = false;  // 显示快捷键帮助弹窗
  private showContactInfo: boolean = false;  // 显示联系作者弹窗
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
  
  // 知识库相关
  private showKnowledgeBase: boolean = false;  // 显示知识库
  private knowledgeGuides: KnowledgeGuide[] = [];  // 所有指南
  private currentGuide: KnowledgeGuide | null = null;  // 当前编辑的指南
  private editingGuideId: string = '';  // 正在编辑的指南ID
  private knowledgeSearchKeyword: string = '';  // 知识库搜索关键词
  
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
    this.summaryNotes = this.loadSummaryNotes();  // 加载总结文字
    this.knowledgeGuides = [];  // 初始化为空，稍后异步加载
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
    this.initPasteListener();  // 初始化粘贴监听（用于截图）
    this.startDateAutoUpdate();  // 启动日期自动更新
    this.render();
    // 异步加载知识库
    this.initKnowledgeGuides();
  }
  
  // 异步初始化知识库
  private async initKnowledgeGuides(): Promise<void> {
    this.knowledgeGuides = await this.loadKnowledgeGuides();
    this.render();
  }

  // 加载任务排序配置
  private loadTaskSortBy(): TaskSortBy {
    const saved = localStorage.getItem('dailyPlannerTaskSortBy');
    return saved ? saved as TaskSortBy : 'priority';
  }

  // 初始化粘贴监听器（用于截图功能）
  private initPasteListener(): void {
    // 监听粘贴事件
    document.addEventListener('paste', (e) => {
      // 只有在编辑指南时才处理粘贴
      if (this.showKnowledgeBase && this.currentGuide) {
        // 如果有指定步骤ID，粘贴到指定步骤
        if (this.screenshotStepId) {
          this.handlePaste(e);
        } else {
          // 否则粘贴到当前活动的步骤（最后一个步骤或焦点的步骤）
          this.handlePasteToActiveStep(e);
        }
      }
    });
    
    // 监听Ctrl+B快捷键（真正的截图功能）
    document.addEventListener('keydown', (e) => {
      // Ctrl+B 或 Cmd+B（Mac）
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        // 只有在编辑指南时才触发
        if (this.showKnowledgeBase && this.currentGuide) {
          e.preventDefault();
          // 调用真正的截图功能
          this.startRealScreenshot();
        }
      }
    });
    
    // 监听截图完成事件
    if (window.electronAPI) {
      window.electronAPI.onCompleteScreenshot((data) => {
        if (data.success && data.imageData) {
          // 如果有指定步骤ID，保存到指定步骤
          if (this.screenshotStepId) {
            this.updateStepImage(this.screenshotStepId, data.imageData);
            this.screenshotStepId = '';
          } else {
            // 否则保存到当前活动的步骤
            const activeStepId = this.getActiveStepId();
            if (activeStepId) {
              this.updateStepImage(activeStepId, data.imageData);
            }
          }
        }
      });
    }
  }

  // 启动真正的截图功能
  private async startRealScreenshot(): Promise<void> {
    // 检查是否在 Electron 环境中
    const isElectron = typeof window !== 'undefined' && 
                       typeof (window as any).process !== 'undefined' && 
                       (window as any).process.type === 'renderer';
    
    if (!window.electronAPI) {
      // 不在 Electron 环境中，提示用户使用替代方案
      this.showScreenshotFallbackTip();
      return;
    }
    
    try {
      const result = await window.electronAPI.startScreenshot();
      if (!result.success) {
        console.error('截图失败:', result.error);
        this.showScreenshotFallbackTip();
      }
    } catch (err) {
      console.error('启动截图失败:', err);
      this.showScreenshotFallbackTip();
    }
  }

  // 显示截图替代方案提示
  private showScreenshotFallbackTip(): void {
    // 创建提示弹窗
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">📸</span>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white">截图提示</h3>
        </div>
        <div class="space-y-3 text-gray-600 dark:text-gray-300">
          <p>截图功能需要在<strong>桌面版应用</strong>中使用。</p>
          <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 space-y-2">
            <p class="text-sm font-medium">📌 临时替代方案：</p>
            <ol class="text-sm list-decimal list-inside space-y-1">
              <li>按 <kbd class="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">Win+Shift+S</kbd> 截图</li>
              <li>截图会自动复制到剪贴板</li>
              <li>点击 <strong>"上传图片"</strong> 按钮粘贴</li>
            </ol>
          </div>
        </div>
        <button onclick="this.closest('.fixed').remove()" 
                class="mt-4 w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
          我知道了
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // 从剪贴板读取图片到指定步骤
  private async readClipboardImage(): Promise<void> {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              this.updateStepImage(this.screenshotStepId, base64);
              this.screenshotStepId = '';
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      // 如果没有图片，提示用户
      console.log('剪贴板中没有图片');
    } catch (err) {
      console.log('读取剪贴板失败，请尝试Ctrl+V粘贴:', err);
    }
  }

  // 获取当前活动的步骤ID（优先使用聚焦的步骤，否则返回最后一个步骤）
  private getActiveStepId(): string {
    if (!this.currentGuide || this.currentGuide.steps.length === 0) {
      return '';
    }
    // 如果有聚焦的步骤，返回它
    if (this.focusedStepId) {
      const stepExists = this.currentGuide.steps.some(s => s.id === this.focusedStepId);
      if (stepExists) {
        return this.focusedStepId;
      }
    }
    // 否则返回最后一个步骤的ID
    return this.currentGuide.steps[this.currentGuide.steps.length - 1].id;
  }
  
  // 设置当前聚焦的步骤
  public setFocusedStep(stepId: string): void {
    this.focusedStepId = stepId;
  }

  // 从剪贴板读取图片到当前活动的步骤
  private async readClipboardToActiveStep(): Promise<void> {
    const activeStepId = this.getActiveStepId();
    if (!activeStepId) {
      console.log('没有可用的步骤');
      return;
    }
    
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target?.result as string;
              this.updateStepImage(activeStepId, base64);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      console.log('剪贴板中没有图片');
    } catch (err) {
      console.log('读取剪贴板失败:', err);
    }
  }

  // 处理粘贴到当前活动的步骤
  private handlePasteToActiveStep(event: ClipboardEvent): void {
    const activeStepId = this.getActiveStepId();
    if (!activeStepId) return;
    
    const items = event.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            this.updateStepImage(activeStepId, base64);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
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
    // 只更新标签按钮样式，不重新渲染整个页面（避免输入框内容丢失）
    const btn = document.querySelector(`[data-tag-id="${tagId}"]`);
    if (btn) {
      if (this.selectedTagsForTask.has(tagId)) {
        btn.classList.add('ring-2', 'ring-blue-500', 'ring-offset-1');
        // 更新按钮文本
        const currentText = btn.textContent || '';
        if (!currentText.includes('✓')) {
          btn.textContent = currentText + ' ✓';
        }
      } else {
        btn.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-1');
        // 移除 ✓
        const currentText = btn.textContent || '';
        btn.textContent = currentText.replace(/\s*✓/g, '');
      }
    }
  }

  // 处理添加任务
  private handleAddTask(): void {
    const input = document.getElementById('taskInput') as HTMLTextAreaElement;
    const prioritySelect = document.getElementById('prioritySelect') as HTMLSelectElement;
    const timeSelect = document.getElementById('taskTimeInput') as HTMLSelectElement;
    const text = input?.value?.trim();
    const priority = prioritySelect?.value as TaskPriority || 'normal';
    const tags = Array.from(this.selectedTagsForTask);
    const time = timeSelect?.value || '';
    
    if (!text) return;
    
    this.addTask(text, priority, tags, time);
    
    // 清空输入和选择
    if (input) input.value = '';
    this.selectedTagsForTask.clear();
    this.preselectedTime = '';
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

  // 加载总结文字
  private loadSummaryNotes(): { weekly: Record<string, string>; monthly: Record<string, string>; yearly: Record<string, string> } {
    const saved = localStorage.getItem('dailyPlannerSummaryNotes');
    return saved ? JSON.parse(saved) : { weekly: {}, monthly: {}, yearly: {} };
  }

  // 保存总结文字
  private saveSummaryNotes(): void {
    localStorage.setItem('dailyPlannerSummaryNotes', JSON.stringify(this.summaryNotes));
  }

  // 保存周总结文字（带状态提示）
  public saveWeeklySummaryNoteWithStatus(note: string): void {
    const key = this.getWeekKey(this.viewingWeekOffset);
    this.summaryNotes.weekly[key] = note;
    this.saveSummaryNotes();
    this.showSaveStatus();
  }

  // 保存月总结文字（带状态提示）
  public saveMonthlySummaryNoteWithStatus(note: string): void {
    const key = this.getMonthKey(this.viewingMonthOffset);
    this.summaryNotes.monthly[key] = note;
    this.saveSummaryNotes();
    this.showSaveStatus();
  }

  // 保存年度总结文字（带状态提示）
  public saveYearlySummaryNoteWithStatus(note: string): void {
    const key = this.getYearKey(this.viewingYearOffset);
    this.summaryNotes.yearly[key] = note;
    this.saveSummaryNotes();
    this.showSaveStatus();
  }

  // 显示保存状态
  private showSaveStatus(): void {
    this.saveStatus = 'saved';
    this.render();
    // 2秒后清除状态
    setTimeout(() => {
      this.saveStatus = '';
      this.render();
    }, 2000);
  }

  // 生成保存状态HTML
  private generateSaveStatusHTML(): string {
    if (this.saveStatus === 'saved') {
      return `
        <div class="fixed top-4 right-4 z-[70] px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>已保存</span>
        </div>
      `;
    }
    return '';
  }

  // 加载知识库指南
  private async loadKnowledgeGuides(): Promise<KnowledgeGuide[]> {
    // 优先使用文件存储（Electron环境）
    if (window.electronAPI?.loadKnowledgeFile) {
      try {
        const data = await window.electronAPI.loadKnowledgeFile();
        console.log('[知识库] 从文件加载成功');
        return (data as KnowledgeGuide[]) || [];
      } catch (error) {
        console.error('[知识库] 从文件加载失败，回退到localStorage:', error);
      }
    }
    // 回退到localStorage
    const saved = localStorage.getItem('dailyPlannerKnowledgeGuides');
    return saved ? JSON.parse(saved) : [];
  }

  // 保存知识库指南
  private saveKnowledgeGuides(): void {
    // 异步保存，不阻塞UI
    (async () => {
      // 优先使用文件存储（Electron环境）
      if (window.electronAPI?.saveKnowledgeFile) {
        try {
          const result = await window.electronAPI.saveKnowledgeFile(this.knowledgeGuides);
          if (result.success) {
            console.log('[知识库] 保存到文件成功');
            return;
          } else {
            console.error('[知识库] 保存到文件失败:', result.error);
            throw new Error(result.error);
          }
        } catch (error) {
          console.error('[知识库] 保存到文件失败，尝试localStorage:', error);
        }
      }
      // 回退到localStorage
      try {
        localStorage.setItem('dailyPlannerKnowledgeGuides', JSON.stringify(this.knowledgeGuides));
      } catch (error) {
        console.error('[知识库] localStorage保存失败:', error);
        alert('存储空间不足！建议导出知识库备份后，清理一些图片。');
      }
    })();
  }

  // 导出知识库（ZIP格式，自动压缩）
  public async exportKnowledgeBase(): Promise<void> {
    const data = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      guides: this.knowledgeGuides,
      compressed: true
    };
    
    // 创建 ZIP 文件
    const zip = new JSZip();
    
    // 添加 JSON 数据
    const jsonStr = JSON.stringify(data, null, 2);
    zip.file('knowledge.json', jsonStr);
    
    // 添加说明文件
    const readme = `# 知识库备份

导出时间: ${new Date().toLocaleString()}
指南数量: ${this.knowledgeGuides.length}
版本: 2.0

## 导入说明
1. 在知识库页面点击"导入"按钮
2. 选择此 ZIP 文件
3. 选择合并或替换现有数据

## 数据格式
- knowledge.json: 知识库数据（包含图片的base64编码）
- 图片已在导出时自动压缩

## 兼容性
- 支持 v1.0 和 v2.0 格式的 JSON 文件导入
- 推荐使用 ZIP 格式以获得最佳压缩效果
`;
    zip.file('README.txt', readme);
    
    try {
      // 生成 ZIP 文件
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }  // 最高压缩级别
      });
      
      // 下载文件
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `知识库备份_${new Date().toLocaleDateString().replace(/\//g, '-')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      // 显示压缩效果
      const jsonSize = Math.round(jsonStr.length / 1024);
      const zipSize = Math.round(content.size / 1024);
      const ratio = Math.round((1 - zipSize / jsonSize) * 100);
      console.log(`[导出] JSON: ${jsonSize}KB, ZIP: ${zipSize}KB, 压缩率: ${ratio}%`);
    } catch (error) {
      console.error('[导出] ZIP压缩失败，回退到JSON格式:', error);
      // 回退到普通 JSON 导出
      this.exportKnowledgeBaseAsJson();
    }
  }
  
  // 导出知识库（JSON格式，备用）
  private exportKnowledgeBaseAsJson(): void {
    const data = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      guides: this.knowledgeGuides,
      compressed: true
    };
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `知识库备份_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  // 导入知识库（支持ZIP和JSON）
  public importKnowledgeBase(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        let data: { version: string; guides: KnowledgeGuide[]; compressed?: boolean };
        
        if (file.name.endsWith('.zip')) {
          // 处理 ZIP 文件
          const zip = await JSZip.loadAsync(file);
          const jsonFile = zip.file('knowledge.json');
          
          if (!jsonFile) {
            alert('ZIP文件中没有找到 knowledge.json');
            return;
          }
          
          const jsonStr = await jsonFile.async('string');
          data = JSON.parse(jsonStr);
          console.log('[导入] 从ZIP文件导入成功');
        } else {
          // 处理 JSON 文件
          const reader = new FileReader();
          const jsonStr = await new Promise<string>((resolve, reject) => {
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
          });
          data = JSON.parse(jsonStr);
        }
        
        // 验证数据格式
        if (!data.guides || !Array.isArray(data.guides)) {
          alert('无效的知识库文件格式');
          return;
        }
        
        // 询问用户是覆盖还是合并
        const merge = confirm(`检测到 ${data.guides.length} 个指南。\n\n点击"确定"合并到现有知识库\n点击"取消"替换现有知识库`);
        
        if (merge) {
          // 合并：添加新指南，跳过已存在的
          const existingIds = new Set(this.knowledgeGuides.map(g => g.id));
          const newGuides = data.guides.filter((g: KnowledgeGuide) => !existingIds.has(g.id));
          this.knowledgeGuides.push(...newGuides);
          alert(`成功导入 ${newGuides.length} 个新指南`);
        } else {
          // 替换
          this.knowledgeGuides = data.guides;
          alert(`成功导入 ${data.guides.length} 个指南`);
        }
        
        this.saveKnowledgeGuides();
        this.render();
      } catch (err) {
        alert('导入失败：文件格式错误');
        console.error('导入失败:', err);
      }
    };
    
    input.click();
  }

  // 创建新指南
  public createNewGuide(): void {
    const newGuide: KnowledgeGuide = {
      id: Date.now().toString(),
      name: '新指南',
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.knowledgeGuides.push(newGuide);
    this.saveKnowledgeGuides();
    this.editingGuideId = newGuide.id;
    this.currentGuide = newGuide;
    this.render();
  }

  // 打开指南编辑
  public openGuideEdit(guideId: string): void {
    const guide = this.knowledgeGuides.find(g => g.id === guideId);
    if (guide) {
      this.currentGuide = { ...guide, steps: [...guide.steps] };
      this.editingGuideId = guideId;
      this.render();
    }
  }

  // 保存当前指南
  public saveCurrentGuide(): void {
    if (!this.currentGuide) return;
    const index = this.knowledgeGuides.findIndex(g => g.id === this.currentGuide!.id);
    if (index >= 0) {
      this.currentGuide.updatedAt = Date.now();
      this.knowledgeGuides[index] = { ...this.currentGuide };
      this.saveKnowledgeGuides();
    }
  }

  // 保存指南（带状态提示）
  public saveGuideWithStatus(): void {
    // 先保存所有编辑区域的内容
    if (this.currentGuide) {
      this.currentGuide.steps.forEach(step => {
        this.saveStepContentFromEditable(step.id);
      });
    }
    this.saveCurrentGuide();
    this.showSaveStatus();
  }

  // 删除指南
  public deleteGuide(guideId: string): void {
    this.knowledgeGuides = this.knowledgeGuides.filter(g => g.id !== guideId);
    this.saveKnowledgeGuides();
    this.render();
  }

  // 添加步骤
  public addStepToGuide(): void {
    if (!this.currentGuide) return;
    const newStep: KnowledgeStep = {
      id: Date.now().toString(),
      title: '',
      content: '',
      order: this.currentGuide.steps.length
    };
    this.currentGuide.steps.push(newStep);
    this.saveCurrentGuide();
    this.render();
  }

  // 删除步骤
  public deleteStep(stepId: string): void {
    if (!this.currentGuide) return;
    this.currentGuide.steps = this.currentGuide.steps.filter(s => s.id !== stepId);
    // 重新排序
    this.currentGuide.steps.forEach((s, i) => s.order = i);
    this.saveCurrentGuide();
    this.render();
  }

  // 移动步骤
  public moveStep(stepId: string, direction: 'up' | 'down'): void {
    if (!this.currentGuide) return;
    const index = this.currentGuide.steps.findIndex(s => s.id === stepId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.currentGuide.steps.length) return;
    
    // 交换位置
    [this.currentGuide.steps[index], this.currentGuide.steps[newIndex]] = 
    [this.currentGuide.steps[newIndex], this.currentGuide.steps[index]];
    
    // 更新排序
    this.currentGuide.steps.forEach((s, i) => s.order = i);
    this.saveCurrentGuide();
    this.render();
  }

  // 更新步骤内容
  public updateStepContent(stepId: string, field: 'title' | 'content', value: string): void {
    if (!this.currentGuide) return;
    const step = this.currentGuide.steps.find(s => s.id === stepId);
    if (step) {
      step[field] = value;
      this.saveCurrentGuide();
    }
  }

  // 从 contenteditable 保存步骤内容
  public saveStepContentFromEditable(stepId: string): void {
    const editor = document.getElementById(`step-content-${stepId}`);
    if (!editor || !this.currentGuide) return;
    
    const step = this.currentGuide.steps.find(s => s.id === stepId);
    if (step) {
      // 克隆编辑器
      const clone = editor.cloneNode(true) as HTMLElement;
      
      // 获取所有图片
      const imgs = clone.querySelectorAll('img');
      const images: string[] = [];
      imgs.forEach(img => {
        images.push(img.src);
        img.parentElement?.remove();
      });
      
      // 更新图片数组
      step.images = images.length > 0 ? images : undefined;
      
      // 获取纯文本内容（保留换行）
      step.content = clone.innerText || '';
      
      this.saveCurrentGuide();
    }
  }

  // 从 textarea 保存步骤内容（兼容旧调用）
  public saveStepTextarea(stepId: string): void {
    this.saveStepContentFromEditable(stepId);
  }

  // 输入时处理（用于实时保存焦点状态）
  public onStepContentInput(stepId: string): void {
    this.setFocusedStep(stepId);
  }

  // 放大图片
  public enlargeImage(imageUrl: string, stepId?: string): void {
    this.enlargedImageUrl = imageUrl;
    this.enlargedImageStepId = stepId || '';
    this.render();
  }
  
  // 关闭图片放大
  public closeEnlargedImage(): void {
    this.enlargedImageUrl = '';
    this.enlargedImageStepId = '';
    this.render();
  }
  
  // 从放大弹窗删除图片
  public deleteEnlargedImage(): void {
    if (this.enlargedImageStepId && this.enlargedImageUrl) {
      this.removeImageByUrl(this.enlargedImageStepId, this.enlargedImageUrl);
      this.enlargedImageUrl = '';
      this.enlargedImageStepId = '';
      this.render();
    }
  }
  
  // 根据索引删除图片
  public removeImageByIndex(stepId: string, index: number): void {
    if (!this.currentGuide) return;
    const step = this.currentGuide.steps.find(s => s.id === stepId);
    if (step && step.images && index < step.images.length) {
      step.images.splice(index, 1);
      if (step.images.length === 0) {
        step.images = undefined;
      }
      this.saveCurrentGuide();
      this.render();
    }
  }
  
  // 根据 URL 删除图片
  public removeImageByUrl(stepId: string, imageUrl: string): void {
    if (!this.currentGuide) return;
    const step = this.currentGuide.steps.find(s => s.id === stepId);
    if (step && step.images) {
      step.images = step.images.filter(img => img !== imageUrl);
      if (step.images.length === 0) {
        step.images = undefined;
      }
      this.saveCurrentGuide();
    }
  }

  // 从编辑区域删除图片（直接更新数据并重新渲染）
  public removeStepImageFromEditor(stepId: string): void {
    if (this.currentGuide) {
      const step = this.currentGuide.steps.find(s => s.id === stepId);
      if (step) {
        step.imageUrl = undefined;
        this.saveCurrentGuide();
        this.render();
      }
    }
  }

  // 更新步骤图片数据（仅数据，不操作DOM）
  private updateStepImageData(stepId: string, imageUrl: string): void {
    if (!this.currentGuide) return;
    const step = this.currentGuide.steps.find(s => s.id === stepId);
    if (step) {
      step.imageUrl = imageUrl;
      this.saveCurrentGuide();
      this.render();
    }
  }

  // 更新指南名称
  public updateGuideName(name: string): void {
    if (!this.currentGuide) return;
    this.currentGuide.name = name;
    this.saveCurrentGuide();
  }

  // 返回知识库列表
  public backToGuideList(): void {
    this.currentGuide = null;
    this.editingGuideId = '';
    this.render();
  }
  
  // 关闭知识库
  public closeKnowledgeBase(): void {
    this.showKnowledgeBase = false;
    this.currentGuide = null;
    this.editingGuideId = '';
    this.knowledgeSearchKeyword = '';  // 清除搜索关键词
    // 注意：不恢复 selectedDate，因为用户已经主动关闭了知识库
    this.render();
  }
  
  // 搜索知识库
  public searchKnowledgeGuides(keyword: string): void {
    this.knowledgeSearchKeyword = keyword;
    this.render();
  }
  
  // 清除搜索
  public clearKnowledgeSearch(): void {
    this.knowledgeSearchKeyword = '';
    this.render();
  }
  
  // 获取过滤后的指南列表
  private getFilteredKnowledgeGuides(): KnowledgeGuide[] {
    const keyword = this.knowledgeSearchKeyword.trim().toLowerCase();
    if (!keyword) {
      return this.knowledgeGuides;
    }
    
    return this.knowledgeGuides.filter(guide => {
      // 匹配标题
      if (guide.name.toLowerCase().includes(keyword)) {
        return true;
      }
      // 匹配步骤标题或内容
      return guide.steps.some(step => 
        (step.title && step.title.toLowerCase().includes(keyword)) ||
        (step.content && step.content.toLowerCase().includes(keyword))
      );
    });
  }
  
  // 获取指南匹配信息（显示匹配的内容摘要）
  private getGuideMatchInfo(guide: KnowledgeGuide): string | null {
    const keyword = this.knowledgeSearchKeyword.trim().toLowerCase();
    if (!keyword) {
      return null;
    }
    
    // 如果标题匹配，不需要显示额外信息
    if (guide.name.toLowerCase().includes(keyword)) {
      return null;
    }
    
    // 查找匹配的步骤
    const matchedSteps = guide.steps.filter(step => 
      (step.title && step.title.toLowerCase().includes(keyword)) ||
      (step.content && step.content.toLowerCase().includes(keyword))
    );
    
    if (matchedSteps.length === 0) {
      return null;
    }
    
    // 返回第一个匹配的步骤信息
    const step = matchedSteps[0];
    const matchText = step.title || step.content || '';
    const truncatedText = matchText.length > 50 ? matchText.substring(0, 50) + '...' : matchText;
    return `匹配：${truncatedText}`;
  }
  
  // 高亮关键词
  private highlightKeyword(text: string, keyword: string): string {
    if (!keyword.trim()) {
      return text;
    }
    
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600 px-0.5 rounded">$1</mark>');
  }

  // 获取周标识（如 "2024-W01"），支持偏移量
  private getWeekKey(offset: number = 0): string {
    const date = new Date();
    date.setDate(date.getDate() + offset * 7); // 偏移周数
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - oneJan.getTime()) / 86400000);
    const weekNum = Math.ceil((days + oneJan.getDay() + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  }

  // 获取指定周的日期范围（用于显示）
  private getWeekDateRange(offset: number = 0): { start: string; end: string; year: number; weekNum: number } {
    const date = new Date();
    date.setDate(date.getDate() + offset * 7);
    
    // 获取本周一
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    
    // 获取本周日
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - oneJan.getTime()) / 86400000);
    const weekNum = Math.ceil((days + oneJan.getDay() + 1) / 7);
    
    return {
      start: this.formatDate(monday),
      end: this.formatDate(sunday),
      year,
      weekNum
    };
  }

  // 获取月标识（如 "2024-01"），支持偏移量
  private getMonthKey(offset: number = 0): string {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // 获取指定月的信息
  private getMonthInfo(offset: number = 0): { year: number; month: number; key: string } {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return {
      year,
      month,
      key: `${year}-${String(month).padStart(2, '0')}`
    };
  }

  // 获取年标识（如 "2024"），支持偏移量
  private getYearKey(offset: number = 0): string {
    return String(this.currentDate.getFullYear() + offset);
  }

  // 保存周总结文字
  public saveWeeklySummaryNote(note: string): void {
    const key = this.getWeekKey(this.viewingWeekOffset);
    this.summaryNotes.weekly[key] = note;
    this.saveSummaryNotes();
  }

  // 保存月总结文字
  public saveMonthlySummaryNote(note: string): void {
    const key = this.getMonthKey(this.viewingMonthOffset);
    this.summaryNotes.monthly[key] = note;
    this.saveSummaryNotes();
  }

  // 保存年度总结文字
  public saveYearlySummaryNote(note: string): void {
    const key = this.getYearKey(this.viewingYearOffset);
    this.summaryNotes.yearly[key] = note;
    this.saveSummaryNotes();
  }

  // 导航周总结
  public navigateWeeklySummary(direction: number): void {
    this.viewingWeekOffset += direction;
    this.render();
  }

  // 导航月总结
  public navigateMonthlySummary(direction: number): void {
    this.viewingMonthOffset += direction;
    this.render();
  }

  // 导航年度总结
  public navigateYearlySummary(direction: number): void {
    this.viewingYearOffset += direction;
    this.render();
  }

  // 生成年份选项
  private generateYearOptions(currentYear: number): string {
    const thisYear = new Date().getFullYear();
    let options = '';
    for (let y = thisYear - 5; y <= thisYear + 1; y++) {
      options += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}年</option>`;
    }
    return options;
  }

  // 生成周数选项
  private generateWeekOptions(currentWeek: number): string {
    let options = '';
    for (let w = 1; w <= 53; w++) {
      options += `<option value="${w}" ${w === currentWeek ? 'selected' : ''}>第${w}周</option>`;
    }
    return options;
  }

  // 生成月份选项
  private generateMonthOptions(currentMonth: number): string {
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    let options = '';
    for (let m = 1; m <= 12; m++) {
      options += `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${monthNames[m - 1]}</option>`;
    }
    return options;
  }

  // 计算周偏移量（从年份和周数）
  private calculateWeekOffset(year: number, weekNum: number): number {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // 获取当前周数
    const oneJan = new Date(currentYear, 0, 1);
    const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
    const currentWeekNum = Math.ceil((days + oneJan.getDay() + 1) / 7);
    
    // 计算目标周与当前周的差值
    const weeksDiff = (year - currentYear) * 52 + (weekNum - currentWeekNum);
    return weeksDiff;
  }

  // 从选择器跳转到指定周
  public jumpToWeekFromSelect(): void {
    const yearSelect = document.getElementById('weekYearSelect') as HTMLSelectElement;
    const weekSelect = document.getElementById('weekNumSelect') as HTMLSelectElement;
    if (yearSelect && weekSelect) {
      const year = parseInt(yearSelect.value);
      const weekNum = parseInt(weekSelect.value);
      this.viewingWeekOffset = this.calculateWeekOffset(year, weekNum);
      this.render();
    }
  }

  // 计算月偏移量
  private calculateMonthOffset(year: number, month: number): number {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return (year - currentYear) * 12 + (month - currentMonth);
  }

  // 从选择器跳转到指定月
  public jumpToMonthFromSelect(): void {
    const yearSelect = document.getElementById('monthYearSelect') as HTMLSelectElement;
    const monthSelect = document.getElementById('monthNumSelect') as HTMLSelectElement;
    if (yearSelect && monthSelect) {
      const year = parseInt(yearSelect.value);
      const month = parseInt(monthSelect.value);
      this.viewingMonthOffset = this.calculateMonthOffset(year, month);
      this.render();
    }
  }

  // 从选择器跳转到指定年
  public jumpToYearFromSelect(): void {
    const yearSelect = document.getElementById('yearSelect') as HTMLSelectElement;
    if (yearSelect) {
      const year = parseInt(yearSelect.value);
      this.viewingYearOffset = year - new Date().getFullYear();
      this.render();
    }
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
    
    // 如果切换到周视图，跳转到选中日期所在的周
    if (mode === 'week' && this.selectedDate) {
      this.currentDate = new Date(this.selectedDate);
    }
    
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
  private addTask(text: string, priority: TaskPriority = 'normal', tags: string[] = [], customTime?: string): void {
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
      time: customTime || this.getCurrentTime(),
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

  // 获取周统计数据（详细版）
  private getWeeklyStats(offset: number = 0): WeeklyStats {
    const today = new Date();
    // 应用周偏移
    today.setDate(today.getDate() + offset * 7);
    
    const dayOfWeek = today.getDay();
    const adjustedDayOfWeek = (dayOfWeek + 6) % 7; // 周一为第一天
    
    // 本周开始日期（周一）
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - adjustedDayOfWeek);
    
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const byDay: { date: string; dayName: string; total: number; completed: number }[] = [];
    
    let total = 0;
    let completed = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateKey = this.formatDate(date);
      const dayTasks = this.tasks[dateKey] || [];
      
      const dayTotal = dayTasks.length;
      const dayCompleted = dayTasks.filter(t => t.completed).length;
      
      byDay.push({
        date: dateKey,
        dayName: dayNames[i],
        total: dayTotal,
        completed: dayCompleted
      });
      
      total += dayTotal;
      completed += dayCompleted;
    }
    
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // 计算上周数据（相对于当前查看的周）
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    
    let lastWeekTotal = 0;
    let lastWeekCompleted = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(lastWeekStart);
      date.setDate(lastWeekStart.getDate() + i);
      const dateKey = this.formatDate(date);
      const dayTasks = this.tasks[dateKey] || [];
      lastWeekTotal += dayTasks.length;
      lastWeekCompleted += dayTasks.filter(t => t.completed).length;
    }
    
    const lastWeekPercentage = lastWeekTotal > 0 ? Math.round((lastWeekCompleted / lastWeekTotal) * 100) : 0;
    const improvement = percentage - lastWeekPercentage;
    
    // 连续打卡天数
    const streakDays = this.getStreakDays();
    
    return {
      total,
      completed,
      pending,
      percentage,
      byDay,
      lastWeekPercentage,
      improvement,
      streakDays
    };
  }

  // 获取连续打卡天数
  private getStreakDays(): number {
    const today = this.formatDate(new Date());
    let streak = 0;
    let checkDate = new Date();
    
    // 从今天开始往前检查
    while (true) {
      const dateKey = this.formatDate(checkDate);
      const dayTasks = this.tasks[dateKey] || [];
      const hasCompletedTask = dayTasks.some(t => t.completed);
      
      if (hasCompletedTask) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateKey === today) {
        // 今天还没完成任务，继续检查昨天
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  // 获取最长连续打卡天数
  private getLongestStreak(): number {
    const allDates = Object.keys(this.tasks).sort();
    if (allDates.length === 0) return 0;
    
    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;
    
    for (const dateKey of allDates) {
      const dayTasks = this.tasks[dateKey] || [];
      const hasCompletedTask = dayTasks.some(t => t.completed);
      
      if (hasCompletedTask) {
        const currentDate = new Date(dateKey);
        
        if (prevDate) {
          const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        
        prevDate = currentDate;
        longestStreak = Math.max(longestStreak, currentStreak);
      }
    }
    
    return longestStreak;
  }

  // 获取扩展的年度统计
  private getYearlyStatsExtended(offset: number = 0): YearlyStatsExtended {
    const year = this.currentDate.getFullYear() + offset;
    let total = 0;
    let completed = 0;
    let totalDays = 0;
    let daysWithTasks = 0;
    
    const byMonth: { month: number; total: number; completed: number; percentage: number }[] = [];
    let busiestMonth: { month: number; count: number } | null = null;
    let mostProductiveMonth: { month: number; rate: number } | null = null;
    
    for (let month = 0; month < 12; month++) {
      let monthTotal = 0;
      let monthCompleted = 0;
      const lastDay = new Date(year, month + 1, 0).getDate();
      
      for (let day = 1; day <= lastDay; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = this.tasks[dateKey] || [];
        monthTotal += dayTasks.length;
        monthCompleted += dayTasks.filter(t => t.completed).length;
        
        if (dayTasks.length > 0) {
          daysWithTasks++;
        }
        totalDays++;
      }
      
      const monthPercentage = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
      byMonth.push({ month: month + 1, total: monthTotal, completed: monthCompleted, percentage: monthPercentage });
      
      total += monthTotal;
      completed += monthCompleted;
      
      // 更新最忙碌月份
      if (!busiestMonth || monthTotal > busiestMonth.count) {
        busiestMonth = { month: month + 1, count: monthTotal };
      }
      
      // 更新最高效月份（至少有5个任务才计入）
      if (monthTotal >= 5 && (!mostProductiveMonth || monthPercentage > mostProductiveMonth.rate)) {
        mostProductiveMonth = { month: month + 1, rate: monthPercentage };
      }
    }
    
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgDailyTasks = daysWithTasks > 0 ? Math.round(total / daysWithTasks * 10) / 10 : 0;
    
    return {
      total,
      completed,
      pending,
      percentage,
      byMonth,
      busiestMonth,
      mostProductiveMonth,
      streakDays: this.getStreakDays(),
      longestStreak: this.getLongestStreak(),
      avgDailyTasks
    };
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
    this.showTaskPanel = true; // 显示右侧侧边栏
    this.preselectedTime = ''; // 清空预选时间
    
    // 关闭其他面板和弹窗
    this.showKnowledgeBase = false;
    this.showStatsModal = false;
    this.showWeeklySummary = false;
    this.showMonthlySummary = false;
    this.showYearlyStats = false;
    this.showCopyModal = false;
    this.showThemeMenu = false;
    this.showQuadrantView = false;
    this.currentGuide = null;
    
    this.render(); // 重新渲染整个页面，确保面板显示正确的日期和任务
  }

  // 鼠标悬停日期（临时显示）
  private hoverDate(date: Date): void {
    // 弹窗打开时，不响应悬停事件
    if (this.showStatsModal || this.showCopyModal || this.showThemeMenu || 
        this.showKnowledgeBase || this.showWeeklySummary || this.showMonthlySummary || 
        this.showYearlyStats || this.showQuadrantView) return;

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
    this.showTaskPanel = false;
    this.render();
  }

  // 显示/隐藏统计弹窗
  private toggleStatsModal(): void {
    this.showStatsModal = !this.showStatsModal;

    // 当打开统计弹窗时，清除悬停状态并关闭其他弹窗/面板
    if (this.showStatsModal) {
      this.hoveredDate = null;
      // 关闭其他弹窗
      this.showCopyModal = false;
      this.showThemeMenu = false;
      this.showQuadrantView = false;
      // 关闭任务面板并清除选中日期
      this.showTaskPanel = false;
      this.selectedDate = null;
      // 关闭知识库
      this.showKnowledgeBase = false;
      this.currentGuide = null;
    }

    this.render();
  }

  // 显示/隐藏四象限视图
  private toggleQuadrantView(): void {
    this.showQuadrantView = !this.showQuadrantView;

    // 当打开四象限视图时，关闭其他弹窗和面板
    if (this.showQuadrantView) {
      this.showStatsModal = false;
      this.showCopyModal = false;
      this.showThemeMenu = false;
      this.hoveredDate = null;
      // 关闭任务面板并清除选中日期
      this.showTaskPanel = false;
      this.selectedDate = null;
      // 关闭知识库
      this.showKnowledgeBase = false;
      this.currentGuide = null;
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

  // 生成日历HTML（任务可视化）
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
    const startingDay = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const monthNames = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    const isSelectedDate = (d: Date) => {
      if (!this.selectedDate) return false;
      return d.getDate() === this.selectedDate.getDate() &&
             d.getMonth() === this.selectedDate.getMonth() &&
             d.getFullYear() === this.selectedDate.getFullYear();
    };

    const isToday = (d: Date) => {
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    // 获取日期的任务列表
    const getDayTasks = (d: Date): Task[] => {
      const dateKey = this.formatDate(d);
      return this.tasks[dateKey] || [];
    };

    // 生成日期格子的函数
    const generateDayCell = (d: Date, isCurrentMonth: boolean): string => {
      const dateKey = this.formatDate(d);
      const today = isToday(d);
      const selected = isSelectedDate(d);
      const dayTasks = getDayTasks(d);
      const holidayInfo = this.getHolidayInfo(d);
      
      // 获取农历信息
      const lunarText = this.getLunarDisplayText(d);
      const isJieQi = this.isJieQiDay(d);
      
      // 日期数字样式
      let dayNumClass = isDark ? 'text-gray-200' : 'text-gray-800';
      let lunarClass = isDark ? 'text-gray-500' : 'text-gray-400';
      let bgOpacity = '';
      
      // 非当前月的日期样式
      if (!isCurrentMonth) {
        dayNumClass = isDark ? 'text-gray-500' : 'text-gray-400';
        lunarClass = isDark ? 'text-gray-600' : 'text-gray-300';
        bgOpacity = isDark ? 'bg-gray-800/30' : 'bg-gray-50/50';
      } else if (today) {
        dayNumClass = 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold';
        lunarClass = 'text-blue-400';
      } else if (holidayInfo && holidayInfo.holiday) {
        dayNumClass = 'text-red-500 font-medium';
        lunarClass = 'text-red-400';
      } else if (holidayInfo && !holidayInfo.holiday) {
        dayNumClass = 'text-orange-500';
        lunarClass = 'text-orange-400';
      } else {
        // 默认周末显示红色
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dayNumClass = 'text-red-400';
          lunarClass = 'text-red-300';
        }
      }
      
      // 节假日标签
      let holidayTag = '';
      if (holidayInfo && isCurrentMonth) {
        if (holidayInfo.holiday) {
          holidayTag = `<span class="absolute top-1 right-1 text-[9px] bg-red-500 text-white px-1 rounded">${holidayInfo.name}</span>`;
        } else {
          holidayTag = `<span class="absolute top-1 right-1 text-[9px] bg-orange-500 text-white px-1 rounded">班</span>`;
        }
      }
      
      // 生成任务列表（最多显示3个，多的显示 +X more）
      let tasksHTML = '';
      const maxVisible = 3;
      const visibleTasks = dayTasks.slice(0, maxVisible);
      const hiddenCount = dayTasks.length - maxVisible;
      
      visibleTasks.forEach(task => {
        const taskPriority = (task.priority || 'normal') as TaskPriority;
        const dotColor = taskPriority === 'urgent-important' ? 'bg-red-500' :
                        taskPriority === 'important' ? 'bg-yellow-500' :
                        taskPriority === 'urgent' ? 'bg-orange-500' : 'bg-gray-400';
        
        tasksHTML += `
          <div class="text-[11px] truncate ${task.completed ? 'line-through opacity-50' : ''} ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-1 px-1 py-0.5 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} cursor-pointer"
               onclick="event.stopPropagation(); planner.selectDate(new Date(${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()}))">
            <span class="w-1.5 h-1.5 ${dotColor} rounded-full flex-shrink-0"></span>
            <span class="truncate">${task.text}</span>
          </div>
        `;
      });
      
      if (hiddenCount > 0) {
        tasksHTML += `
          <div class="text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'} px-1">
            +${hiddenCount} more
          </div>
        `;
      }

      return `
        <div class="min-h-[100px] ${bgClass} ${bgOpacity} rounded-lg shadow cursor-pointer transition-all hover:shadow-md ${today ? 'ring-2 ring-blue-500' : ''} ${selected ? 'ring-2 ring-blue-400' : ''} relative overflow-hidden"
             data-date="${dateKey}"
             onmouseenter="planner.hoverDate(new Date(${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()}))"
             onmouseleave="planner.leaveDate()"
             onclick="planner.selectDate(new Date(${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()}))">
          <!-- 日期头部 -->
          <div class="flex items-start justify-between p-1">
            <div class="flex flex-col">
              <span class="${today ? dayNumClass : 'text-sm font-medium ' + dayNumClass}">${d.getDate()}</span>
              <span class="text-[9px] ${lunarClass} ${isJieQi ? 'text-green-400 font-medium' : ''}">${lunarText}</span>
            </div>
            ${!today && isCurrentMonth ? holidayTag : ''}
          </div>
          <!-- 任务列表 -->
          <div class="px-1 pb-1 space-y-0.5">
            ${tasksHTML}
          </div>
        </div>
      `;
    };

    let calendarDays = '';

    // 上个月的日期填充
    const prevMonth = new Date(year, month, 0); // 上个月最后一天
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      calendarDays += generateDayCell(date, false);
    }

    // 当前月的日期
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      calendarDays += generateDayCell(date, true);
    }

    // 下个月的日期填充（补齐到42天，6行）
    const totalCells = startingDay + totalDays;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      calendarDays += generateDayCell(date, false);
    }

    return `
      <div class="${bgClass} rounded-xl shadow-lg p-4 w-full">
        <div class="flex items-center justify-between mb-4">
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

  // 生成任务面板HTML（右侧侧边栏）
  private generateTaskPanelHTML(): string {
    const displayDate = this.getDisplayDate();
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
    const taskBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
    const taskHover = isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100';
    
    if (!displayDate) {
      return '';
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
        <div class="flex items-start gap-2 p-2 ${taskBg} ${taskHover} rounded-lg group transition-colors border-l-4 ${borderColor} ${task.completed ? 'task-completed' : ''}"
             draggable="true"
             ondragstart="planner.onTaskDragStart(event, '${task.id}')"
             ondblclick="planner.startEditTask('${task.id}')"
             data-task-id="${task.id}">
          <input type="checkbox"
                 ${task.completed ? 'checked' : ''}
                 onchange="planner.toggleTask('${task.id}')"
                 class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer task-checkbox mt-1 flex-shrink-0">
          <div class="flex-1 min-w-0">
            <span class="task-text block text-sm ${task.completed ? 'line-through text-gray-400' : isDark ? 'text-gray-200' : 'text-gray-700'} cursor-pointer whitespace-pre-wrap" title="双击编辑">${task.text}</span>
            ${taskTagsHTML}
          </div>
          <div class="flex flex-col items-end gap-1 flex-shrink-0">
            <span class="text-[10px] text-gray-400">${task.time}</span>
            <select onchange="planner.updateTaskPriority('${task.id}', this.value)"
                    class="text-[10px] px-1 py-0.5 rounded ${priorityBg} ${priorityColor} border-0 cursor-pointer">
              <option value="urgent-important" ${taskPriority === 'urgent-important' ? 'selected' : ''}>🔴</option>
              <option value="important" ${taskPriority === 'important' ? 'selected' : ''}>🟡</option>
              <option value="urgent" ${taskPriority === 'urgent' ? 'selected' : ''}>🟠</option>
              <option value="normal" ${taskPriority === 'normal' ? 'selected' : ''}>⚪</option>
            </select>
          </div>
          <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="planner.openCopyModal('${task.id}')"
                    class="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                    title="复制到其他日期">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
            <button onclick="planner.deleteTask('${task.id}')"
                    class="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    });

    // 检查是否有纪念日
    const todayAnniversaries = this.getMatchingAnniversaries(displayDate);
    
    let anniversaryHtml = '';
    if (todayAnniversaries.length > 0) {
      anniversaryHtml = `
        <div class="mb-2 p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
          ${todayAnniversaries.map(a => `
            <span class="text-pink-600 dark:text-pink-400 text-xs">🎉 ${a.name}</span>
          `).join('')}
        </div>
      `;
    }

    return `
      <!-- 右侧侧边栏任务面板 -->
      <div class="task-panel fixed top-0 right-0 h-full w-80 ${bgClass} shadow-2xl z-40 transform transition-transform duration-300 ${this.showTaskPanel ? 'translate-x-0' : 'translate-x-full'}">
        <div class="h-full flex flex-col ${window.electronAPI ? 'pt-10' : 'pt-4'}">
          <!-- 头部 -->
          <div class="px-4 pb-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-lg font-bold ${textClass}">${dateStr}</h2>
              <button onclick="planner.closeTaskPanel()"
                      class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="${isDark ? 'text-gray-400' : 'text-gray-500'}">农历 ${lunarText}</span>
              ${holidayInfo ? (holidayInfo.holiday ? 
                `<span class="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded">${holidayInfo.name}</span>` : 
                `<span class="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded">调休</span>`) : ''}
              <div class="flex-1"></div>
              ${sortSelect}
              ${tagFilterSelect}
            </div>
          </div>
          
          ${anniversaryHtml}
          
          <!-- 添加任务区域 -->
          <div class="px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
            <textarea id="taskInput"
                      placeholder="添加新任务...&#10;支持多行输入&#10;按 Ctrl+Enter 添加"
                      rows="3"
                      class="w-full px-3 py-2 border ${inputBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'text-gray-100 placeholder-gray-400' : 'text-gray-800 placeholder-gray-400'} text-sm resize-none"
                      onkeydown="if(event.key === 'Enter' && event.ctrlKey) planner.handleAddTask()"></textarea>
            <div class="flex items-center gap-2 mt-2">
              <select id="taskTimeInput" class="flex-1 px-2 py-1.5 text-xs border ${inputBg} rounded-lg ${isDark ? 'text-gray-100' : ''}">
                <option value="">不设置时间</option>
                ${Array.from({length: 24}, (_, h) => 
                  Array.from({length: 4}, (_, m) => {
                    const hour = h.toString().padStart(2, '0');
                    const min = (m * 15).toString().padStart(2, '0');
                    const selected = this.preselectedTime === `${hour}:${min}`;
                    return `<option value="${hour}:${min}" ${selected ? 'selected' : ''}>${hour}:${min}</option>`;
                  }).join('')
                ).join('')}
              </select>
              <select id="prioritySelect" class="flex-1 px-2 py-1.5 text-xs border ${inputBg} rounded-lg ${isDark ? 'text-gray-100' : ''}">
                <option value="urgent-important">🔴 紧急重要</option>
                <option value="important">🟡 重要不急</option>
                <option value="urgent">🟠 紧急不重要</option>
                <option value="normal" selected>⚪ 普通</option>
              </select>
              <button onclick="planner.handleAddTask()"
                      class="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
                添加
              </button>
            </div>
            <!-- 标签选择器 -->
            <div class="flex flex-wrap gap-1 mt-2 items-center">
              <span class="text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}">标签：</span>
              ${this.getAllTags().slice(0, 6).map(tag => `
                <button type="button"
                        data-tag-id="${tag.id}"
                        onclick="event.stopPropagation(); planner.toggleTagSelection('${tag.id}')"
                        class="text-[10px] px-1.5 py-0.5 rounded-full transition-all ${tag.color} ${tag.textColor} hover:opacity-80 ${this.selectedTagsForTask.has(tag.id) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}">
                  ${tag.icon}${this.selectedTagsForTask.has(tag.id) ? ' ✓' : ''}
                </button>
              `).join('')}
              ${this.getAllTags().length > 6 ? `
                <button onclick="planner.toggleTagManager()"
                        class="text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}">
                  +${this.getAllTags().length - 6}
                </button>
              ` : ''}
            </div>
          </div>
          
          <!-- 任务列表 -->
          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            ${tasks.length > 0 ? tasksList : `<p class="text-gray-400 text-center py-8 text-sm">暂无任务</p>`}
          </div>
          
          <!-- 底部统计 -->
          <div class="px-4 py-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">
            共 ${tasks.length} 个任务，已完成 ${tasks.filter(t => t.completed).length} 个
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

  // 生成快捷键帮助弹窗
  private generateShortcutHelpHTML(): string {
    if (!this.showShortcutHelp) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const keyBg = isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700';

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.showShortcutHelp = false; planner.render();">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-md"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold ${textClass}">⌨️ 快捷键</h2>
            <button onclick="planner.showShortcutHelp = false; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div class="text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide">应用内快捷键</div>
            
            <div class="flex items-center justify-between py-2">
              <span class="${textClass}">搜索任务</span>
              <kbd class="px-2 py-1 rounded ${keyBg} text-sm font-mono">/</kbd>
            </div>
            
            <div class="flex items-center justify-between py-2">
              <span class="${textClass}">添加任务</span>
              <kbd class="px-2 py-1 rounded ${keyBg} text-sm font-mono">Ctrl + Enter</kbd>
            </div>
            
            <div class="flex items-center justify-between py-2">
              <span class="${textClass}">关闭弹窗</span>
              <kbd class="px-2 py-1 rounded ${keyBg} text-sm font-mono">Esc</kbd>
            </div>

            <div class="border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} my-3"></div>
            <div class="text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide">全局快捷键</div>
            
            <div class="flex items-center justify-between py-2">
              <span class="${textClass}">显示/隐藏窗口</span>
              <kbd class="px-2 py-1 rounded ${keyBg} text-sm font-mono">Ctrl + Shift + P</kbd>
            </div>
            
            <div class="flex items-center justify-between py-2">
              <span class="${textClass}">快速添加任务</span>
              <kbd class="px-2 py-1 rounded ${keyBg} text-sm font-mono">Ctrl + Shift + N</kbd>
            </div>
            
            <div class="flex items-center justify-between py-2">
              <span class="${textClass}">跳转到今天</span>
              <kbd class="px-2 py-1 rounded ${keyBg} text-sm font-mono">Ctrl + Shift + T</kbd>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 生成联系作者弹窗
  private generateContactInfoHTML(): string {
    if (!this.showContactInfo) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const labelClass = isDark ? 'text-gray-400' : 'text-gray-500';
    const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.showContactInfo = false; planner.render();">
        <div class="${bgClass} rounded-xl shadow-2xl p-6 w-full max-w-sm"
             onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold ${textClass}">👤 联系作者</h2>
            <button onclick="planner.showContactInfo = false; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <div class="text-center py-4">
              <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span class="text-3xl">👨‍💻</span>
              </div>
              <h3 class="text-lg font-semibold ${textClass}">严辉村高斯林</h3>
              <p class="text-sm ${labelClass}">每日规划 作者</p>
            </div>

            <div class="space-y-3">
              <div class="flex items-center gap-3 p-3 ${cardBg} rounded-lg">
                <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-xs ${labelClass}">电话 / 微信</p>
                  <p class="font-medium ${textClass}">19373108815</p>
                </div>
              </div>

              <div class="flex items-center gap-3 p-3 ${cardBg} rounded-lg">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-xs ${labelClass}">邮箱</p>
                  <p class="font-medium ${textClass}">2421040503@qq.com</p>
                </div>
              </div>
            </div>

            <div class="pt-2 text-center">
              <p class="text-xs ${labelClass}">感谢使用每日规划！欢迎反馈建议 🙏</p>
            </div>
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

    const statsTitle = this.viewMode === 'month' ? '本月任务统计' : '本周任务统计';
    const overviewTitle = this.viewMode === 'month' ? '本月任务概览' : '本周任务概览';

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
        <div class="absolute right-4 top-20 ${bgClass} rounded-lg shadow-xl border py-2 min-w-[200px]" onclick="event.stopPropagation()">
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
          <button onclick="planner.showShortcutHelp = true; planner.showMoreMenu = false; planner.render();"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            快捷键
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
          <button onclick="planner.showContactInfo = true; planner.showMoreMenu = false; planner.render();"
                  class="flex items-center gap-2 px-4 py-2 w-full ${textClass} ${hoverClass} transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            联系作者
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

  // 生成搜索面板（下拉面板，非弹窗）
  private generateSearchPanelHTML(): string {
    if (!this.showSearchPanel) return '';
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300';
    const textClass = isDark ? 'text-gray-200' : 'text-gray-700';

    const results = this.searchQuery ? this.searchTasks(this.searchQuery) : [];

    return `
      <div class="absolute left-4 top-20 ${bgClass} rounded-xl shadow-2xl border p-4 w-[400px] max-h-[60vh] overflow-y-auto z-50"
           onclick="event.stopPropagation()">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text"
                 placeholder="搜索任务..."
                 value="${this.searchQuery}"
                 oninput="planner.performSearch(this.value)"
                 class="flex-1 px-3 py-2 border ${inputBg} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                 autofocus>
          <button onclick="planner.showSearchPanel = false; planner.searchQuery = ''; planner.render();"
                  class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg class="w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div id="searchResults" class="space-y-1">
          ${results.length > 0 ? results.map(({ date, task }) => `
            <div class="flex items-center gap-2 p-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg cursor-pointer transition-colors text-sm"
                 onclick="planner.jumpToDate('${date}')">
              <input type="checkbox" ${task.completed ? 'checked' : ''} class="pointer-events-none" disabled>
              <span class="flex-1 truncate ${task.completed ? 'line-through text-gray-400' : textClass}">${task.text}</span>
              <span class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">${date}</span>
              <span class="text-xs px-1.5 py-0.5 rounded ${getPriorityConfig(task.priority).bgColor} ${getPriorityConfig(task.priority).color}">${getPriorityConfig(task.priority).shortLabel}</span>
            </div>
          `).join('') : this.searchQuery ? `<p class="text-center text-gray-400 py-4 text-sm">未找到匹配的任务</p>` : `<p class="text-center text-gray-400 py-4 text-sm">输入关键词搜索任务</p>`}
        </div>
      </div>
    `;
  }

  // 生成年度统计弹窗
  // 生成总结按钮区域（日历下方）
  private generateSummaryButtonsHTML(): string {
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-700/50' : 'bg-gray-50';
    const textClass = isDark ? 'text-gray-300' : 'text-gray-600';
    
    // 获取快速统计数据
    const weeklyStats = this.getWeeklyStats();
    const weeklyRate = weeklyStats.percentage;
    
    return `
      <div class="mt-4 p-4 ${bgClass} rounded-xl">
        <div class="flex items-center justify-center gap-3">
          <button onclick="event.stopPropagation(); planner.openWeeklySummary();"
                  class="flex-1 flex flex-col items-center gap-1 p-3 rounded-lg ${isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} shadow-sm transition-all group">
            <div class="flex items-center gap-2">
              <span class="text-lg">📊</span>
              <span class="text-sm font-medium ${textClass}">周总结</span>
            </div>
            <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">${weeklyRate}% 完成</div>
          </button>
          <button onclick="event.stopPropagation(); planner.openMonthlySummary();"
                  class="flex-1 flex flex-col items-center gap-1 p-3 rounded-lg ${isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} shadow-sm transition-all group">
            <div class="flex items-center gap-2">
              <span class="text-lg">📈</span>
              <span class="text-sm font-medium ${textClass}">月总结</span>
            </div>
            <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">本月表现</div>
          </button>
          <button onclick="event.stopPropagation(); planner.openYearlyStats();"
                  class="flex-1 flex flex-col items-center gap-1 p-3 rounded-lg ${isDark ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-100'} shadow-sm transition-all group">
            <div class="flex items-center gap-2">
              <span class="text-lg">🎊</span>
              <span class="text-sm font-medium ${textClass}">年度总结</span>
            </div>
            <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">年度回顾</div>
          </button>
        </div>
        <!-- 知识库入口 -->
        <div class="mt-3 pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}">
          <button onclick="event.stopPropagation(); planner.openKnowledgeBase();"
                  class="w-full flex items-center justify-center gap-2 p-3 rounded-lg ${isDark ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500' : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400'} text-white shadow-md transition-all">
            <span class="text-lg">📚</span>
            <span class="text-sm font-medium">个人知识库</span>
            <span class="text-xs opacity-75">(${this.knowledgeGuides.length})</span>
          </button>
        </div>
      </div>
    `;
  }
  
  // 打开知识库（关闭其他面板）
  public openKnowledgeBase(): void {
    this.showKnowledgeBase = true;
    this.knowledgeSearchKeyword = '';  // 清除搜索关键词
    // 关闭任务面板并清除选中日期
    this.showTaskPanel = false;
    this.selectedDate = null;
    this.hoveredDate = null;
    // 关闭其他弹窗
    this.showStatsModal = false;
    this.showCopyModal = false;
    this.showThemeMenu = false;
    this.showQuadrantView = false;
    this.showWeeklySummary = false;
    this.showMonthlySummary = false;
    this.showYearlyStats = false;
    this.currentGuide = null;
    this.render();
  }
  
  // 打开周总结（关闭其他面板）
  public openWeeklySummary(): void {
    this.showWeeklySummary = true;
    this.showTaskPanel = false;
    this.selectedDate = null;
    this.hoveredDate = null;
    this.closeOtherPanels();
    this.render();
  }
  
  // 打开月总结（关闭其他面板）
  public openMonthlySummary(): void {
    this.showMonthlySummary = true;
    this.showTaskPanel = false;
    this.selectedDate = null;
    this.hoveredDate = null;
    this.closeOtherPanels();
    this.render();
  }
  
  // 打开年度总结（关闭其他面板）
  public openYearlyStats(): void {
    this.showYearlyStats = true;
    this.showTaskPanel = false;
    this.selectedDate = null;
    this.hoveredDate = null;
    this.closeOtherPanels();
    this.render();
  }
  
  // 关闭其他所有面板和弹窗
  private closeOtherPanels(): void {
    this.showKnowledgeBase = false;
    this.showStatsModal = false;
    this.showCopyModal = false;
    this.showThemeMenu = false;
    this.showQuadrantView = false;
    this.currentGuide = null;
  }

  // 生成知识库弹窗 HTML
  private generateKnowledgeBaseHTML(): string {
    if (!this.showKnowledgeBase) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-800';
    
    // 如果正在编辑某个指南，显示编辑页面
    if (this.currentGuide) {
      return this.generateGuideEditorHTML(isDark, bgClass, textClass, inputBg);
    }
    
    // 否则显示指南列表页面
    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.closeKnowledgeBase();">
        <div class="${bgClass} rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          
          <!-- 标题 -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <span class="text-3xl">📚</span>
              <div>
                <h2 class="text-xl font-bold ${textClass}">个人知识库</h2>
                <p class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">管理你的步骤指南和教程</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <!-- 导入按钮 -->
              <button onclick="planner.importKnowledgeBase()"
                      class="p-2 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-lg transition-colors"
                      title="导入知识库">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
              </button>
              <!-- 导出按钮 -->
              <button onclick="planner.exportKnowledgeBase()"
                      class="p-2 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-lg transition-colors"
                      title="导出知识库">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
              </button>
              <button onclick="planner.closeKnowledgeBase();"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 搜索框 -->
          <div class="mb-4">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" 
                     placeholder="搜索指南标题或步骤内容..." 
                     value="${this.knowledgeSearchKeyword}"
                     oninput="planner.searchKnowledgeGuides(this.value)"
                     class="w-full pl-10 pr-10 py-2.5 ${inputBg} border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
              ${this.knowledgeSearchKeyword ? `
                <button onclick="planner.clearKnowledgeSearch()"
                        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                  <svg class="w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              ` : ''}
            </div>
          </div>
          
          <!-- 新建指南按钮 -->
          <button onclick="planner.createNewGuide()"
                  class="w-full mb-4 p-4 border-2 border-dashed ${isDark ? 'border-gray-600 hover:border-purple-500 hover:bg-gray-700' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'} rounded-xl transition-all flex items-center justify-center gap-2">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span class="${isDark ? 'text-gray-300' : 'text-gray-600'}">创建新指南</span>
          </button>
          
          <!-- 指南列表 -->
          ${(() => {
            const filteredGuides = this.getFilteredKnowledgeGuides();
            const hasKeyword = this.knowledgeSearchKeyword.trim().length > 0;
            
            if (this.knowledgeGuides.length === 0) {
              return `
                <div class="text-center py-12">
                  <div class="text-6xl mb-4">📖</div>
                  <p class="${isDark ? 'text-gray-400' : 'text-gray-500'}">还没有任何指南</p>
                  <p class="text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-2">点击上方按钮创建你的第一个指南，或导入已有知识库</p>
                </div>
              `;
            }
            
            if (hasKeyword && filteredGuides.length === 0) {
              return `
                <div class="text-center py-12">
                  <div class="text-6xl mb-4">🔍</div>
                  <p class="${isDark ? 'text-gray-400' : 'text-gray-500'}">没有找到匹配的内容</p>
                  <p class="text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-2">尝试其他关键词</p>
                </div>
              `;
            }
            
            return `
              ${hasKeyword ? `
                <div class="mb-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">
                  找到 ${filteredGuides.length} 个匹配的指南
                </div>
              ` : ''}
              <div class="space-y-3">
                ${filteredGuides.map(guide => {
                  // 获取匹配的内容摘要
                  const matchInfo = this.getGuideMatchInfo(guide);
                  return `
                    <div class="p-4 ${isDark ? 'bg-gray-700 hover:bg-gray-650' : 'bg-gray-50 hover:bg-gray-100'} rounded-xl transition-all cursor-pointer group"
                         onclick="planner.openGuideEdit('${guide.id}')">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                          <span class="text-2xl flex-shrink-0">📋</span>
                          <div class="flex-1 min-w-0">
                            <h3 class="font-medium ${textClass} truncate">${this.highlightKeyword(guide.name, this.knowledgeSearchKeyword)}</h3>
                            <p class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${guide.steps.length} 个步骤 · 更新于 ${new Date(guide.updatedAt).toLocaleDateString()}</p>
                            ${matchInfo ? `
                              <p class="text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'} mt-1 truncate">
                                ${matchInfo}
                              </p>
                            ` : ''}
                          </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                          <button onclick="event.stopPropagation(); planner.deleteGuide('${guide.id}')"
                                  class="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all">
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                          <svg class="w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          })()}
        </div>
      </div>
      ${this.generateEnlargedImageHTML()}
    `;
  }

  // 生成图片放大弹窗 HTML
  private generateEnlargedImageHTML(): string {
    if (!this.enlargedImageUrl) return '';
    
    return `
      <div class="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
           onclick="planner.closeEnlargedImage();">
        <div class="relative max-w-[90vw] max-h-[90vh]">
          <img src="${this.enlargedImageUrl}" 
               class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
               onclick="event.stopPropagation();">
          <!-- 关闭按钮 -->
          <button onclick="planner.closeEnlargedImage();"
                  class="absolute -top-3 -right-3 p-2 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors">
            <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <!-- 删除按钮（仅当有stepId时显示） -->
          ${this.enlargedImageStepId ? `
            <button onclick="planner.deleteEnlargedImage();"
                    class="absolute -top-3 -left-3 p-2 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-colors"
                    title="删除图片">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          ` : ''}
          <!-- 提示文字 -->
          <p class="text-center text-white text-sm mt-3 opacity-70">点击任意位置关闭${this.enlargedImageStepId ? ' · 左上角删除' : ''}</p>
        </div>
      </div>
    `;
  }

  // 生成指南编辑器 HTML
  private generateGuideEditorHTML(isDark: boolean, bgClass: string, textClass: string, inputBg: string): string {
    if (!this.currentGuide) return '';
    
    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.closeKnowledgeBase();">
        <div class="${bgClass} rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          
          <!-- 顶部导航 -->
          <div class="flex items-center justify-between mb-6">
            <button onclick="planner.backToGuideList()"
                    class="flex items-center gap-2 px-3 py-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              <span class="${isDark ? 'text-gray-300' : 'text-gray-600'}">返回列表</span>
            </button>
            <div class="flex items-center gap-2">
              <button onclick="planner.saveGuideWithStatus()"
                      class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                保存指南
              </button>
              <button onclick="planner.closeKnowledgeBase();"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 指南名称 -->
          <div class="mb-6">
            <label class="block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2">指南名称</label>
            <input type="text" 
                   value="${this.currentGuide.name}"
                   onchange="planner.updateGuideName(this.value)"
                   class="w-full px-4 py-3 text-lg font-medium rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-purple-500"
                   placeholder="输入指南名称...">
          </div>
          
          <!-- 指南步骤 -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold ${textClass}">指南步骤</h3>
              <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${this.currentGuide.steps.length} 个步骤</span>
            </div>
            
            ${this.currentGuide.steps.length === 0 ? `
              <div class="text-center py-8 ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-xl">
                <div class="text-4xl mb-2">📝</div>
                <p class="${isDark ? 'text-gray-400' : 'text-gray-500'}">还没有步骤</p>
                <p class="text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}">点击下方按钮添加步骤</p>
              </div>
            ` : `
              <div class="space-y-4" id="stepsContainer">
                ${this.currentGuide.steps.map((step, index) => `
                  <div class="p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl border ${isDark ? 'border-gray-600' : 'border-gray-200'} cursor-move"
                       draggable="true"
                       ondragstart="planner.handleDragStart(event, '${step.id}')"
                       ondragover="planner.handleDragOver(event)"
                       ondrop="planner.handleDrop(event, '${step.id}')"
                       ondragend="planner.handleDragEnd(event)"
                       onclick="planner.setFocusedStep('${step.id}')"
                       data-step-id="${step.id}">
                    <!-- 步骤头部 -->
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-3">
                        <!-- 拖拽手柄 -->
                        <div class="cursor-grab ${isDark ? 'text-gray-500' : 'text-gray-400'} hover:${isDark ? 'text-gray-300' : 'text-gray-600'}">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
                          </svg>
                        </div>
                        <!-- 步骤序号 -->
                        <span class="step-number w-8 h-8 flex items-center justify-center ${isDark ? 'bg-purple-600' : 'bg-purple-500'} text-white text-sm font-bold rounded-full">${index + 1}</span>
                        <!-- 标题输入 -->
                        <input type="text"
                               value="${step.title}"
                               onchange="planner.updateStepContent('${step.id}', 'title', this.value)"
                               onfocus="planner.setFocusedStep('${step.id}')"
                               class="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border ${inputBg} focus:outline-none focus:ring-2 focus:ring-purple-500"
                               placeholder="标题">
                      </div>
                      <div class="flex items-center gap-1">
                        <button onclick="planner.deleteStep('${step.id}')"
                                class="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors">
                          <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <!-- 操作说明和图片（图文混排编辑区域） -->
                    <div class="ml-11">
                      <!-- contenteditable 编辑区域，支持图文混排和换行 -->
                      <div contenteditable="true"
                           id="step-content-${step.id}"
                           data-step-id="${step.id}"
                           class="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border ${isDark ? 'border-gray-600 bg-gray-800 text-gray-100' : 'border-gray-200 bg-white text-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-500 overflow-auto"
                           style="white-space: pre-wrap; word-wrap: break-word;"
                           onfocus="planner.setFocusedStep('${step.id}')"
                           onblur="planner.saveStepContentFromEditable('${step.id}')"
                           oninput="planner.onStepContentInput('${step.id}')"
                           placeholder="输入操作说明...（支持换行）">${step.content || ''}${(() => {
                             // 合并旧的单图和新数组图
                             const allImages: string[] = [];
                             if (step.imageUrl) allImages.push(step.imageUrl);
                             if (step.images && step.images.length > 0) {
                               step.images.forEach(img => {
                                 if (!allImages.includes(img)) allImages.push(img);
                               });
                             }
                             return allImages.map((img, idx) => `<div class="inline-block relative mt-2 mr-2"><img src="${img}" class="inline-image" data-image-id="${step.id}" data-image-index="${idx}" style="max-width:100%;max-height:200px;border-radius:8px;cursor:pointer;" onclick="event.stopPropagation();" ondblclick="event.stopPropagation(); planner.enlargeImage('${img}', '${step.id}')"><button class="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 transition-opacity image-delete-btn" style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;" onclick="event.stopPropagation(); planner.removeImageByIndex('${step.id}', ${idx})" title="删除图片"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>`).join('');
                           })()}</div>
                      
                      <!-- 图片操作按钮 -->
                      <div class="mt-2 flex gap-2">
                        <button onclick="planner.triggerImageUpload('${step.id}')"
                                class="px-2 py-1 text-xs ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'} rounded transition-colors flex items-center gap-1">
                          <span>🖼️</span>
                          <span>上传图片</span>
                        </button>
                        <button onclick="planner.triggerScreenshot('${step.id}')"
                                class="px-2 py-1 text-xs ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'} rounded transition-colors flex items-center gap-1">
                          <span>📷</span>
                          <span>截图(Ctrl+B)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
          
          <!-- 添加步骤按钮 -->
          <button onclick="planner.addStepToGuide()"
                  class="w-full p-4 border-2 border-dashed ${isDark ? 'border-gray-600 hover:border-purple-500 hover:bg-gray-700' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'} rounded-xl transition-all flex items-center justify-center gap-2">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span class="${isDark ? 'text-gray-300' : 'text-gray-600'}">添加步骤</span>
          </button>
        </div>
      </div>
      ${this.generateEnlargedImageHTML()}
    `;
  }

  // 拖拽相关
  private draggedStepId: string = '';

  public handleDragStart(event: DragEvent, stepId: string): void {
    this.draggedStepId = stepId;
    const target = event.target as HTMLElement;
    target.classList.add('opacity-50');
    event.dataTransfer!.effectAllowed = 'move';
  }

  public handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  public handleDrop(event: DragEvent, targetStepId: string): void {
    event.preventDefault();
    if (!this.currentGuide || this.draggedStepId === targetStepId) return;
    
    const draggedIndex = this.currentGuide.steps.findIndex(s => s.id === this.draggedStepId);
    const targetIndex = this.currentGuide.steps.findIndex(s => s.id === targetStepId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // 移动步骤
    const [draggedStep] = this.currentGuide.steps.splice(draggedIndex, 1);
    this.currentGuide.steps.splice(targetIndex, 0, draggedStep);
    
    // 更新排序
    this.currentGuide.steps.forEach((s, i) => s.order = i);
    this.saveCurrentGuide();
    this.render();
  }

  public handleDragEnd(event: DragEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove('opacity-50');
    this.draggedStepId = '';
  }

  // 触发图片上传
  public triggerImageUpload(stepId: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          this.updateStepImage(stepId, base64);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  // 更新步骤图片（添加到数组末尾）
  private async updateStepImage(stepId: string, imageUrl: string): Promise<void> {
    if (!this.currentGuide) return;
    
    const step = this.currentGuide.steps.find(s => s.id === stepId);
    if (!step) return;
    
    // 先压缩图片
    const compressedImage = await this.compressImage(imageUrl);
    
    // 获取编辑区域
    const editor = document.getElementById(`step-content-${stepId}`);
    if (editor) {
      // 先保存当前文字内容
      const clone = editor.cloneNode(true) as HTMLElement;
      const existingImgs = clone.querySelectorAll('img');
      existingImgs.forEach(img => img.parentElement?.remove());
      step.content = clone.innerText || '';
      
      // 在编辑区域末尾插入新图片
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'inline-block relative mt-2 mr-2';
      const imgIndex = (step.images?.length || 0);
      imgWrapper.innerHTML = `
        <img src="${compressedImage}" class="inline-image" data-image-id="${stepId}" data-image-index="${imgIndex}" style="max-width:100%;max-height:200px;border-radius:8px;cursor:pointer;" onclick="event.stopPropagation();" ondblclick="event.stopPropagation(); planner.enlargeImage('${compressedImage}', '${stepId}')">
        <button class="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 transition-opacity image-delete-btn" style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;" onclick="event.stopPropagation(); planner.removeImageByIndex('${stepId}', ${imgIndex})" title="删除图片">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      `;
      editor.appendChild(imgWrapper);
    }
    
    // 添加到图片数组
    if (!step.images) {
      step.images = [];
    }
    step.images.push(compressedImage);
    
    // 兼容旧数据：如果有旧的 imageUrl，迁移到 images 数组
    if (step.imageUrl && !step.images.includes(step.imageUrl)) {
      step.images.unshift(step.imageUrl);
      step.imageUrl = undefined;
    }
    
    this.saveCurrentGuide();
    console.log('图片已添加到步骤:', stepId, '当前图片数:', step.images.length);
  }
  
  // 压缩图片
  private compressImage(base64: string): Promise<string> {
    return new Promise((resolve) => {
      // 如果不是 base64 图片，直接返回
      if (!base64.startsWith('data:image')) {
        resolve(base64);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        // 计算压缩后的尺寸
        let width = img.width;
        let height = img.height;
        
        // 如果图片尺寸超过限制，按比例缩放
        if (width > IMAGE_COMPRESSION_CONFIG.maxWidth || height > IMAGE_COMPRESSION_CONFIG.maxHeight) {
          const ratio = Math.min(
            IMAGE_COMPRESSION_CONFIG.maxWidth / width,
            IMAGE_COMPRESSION_CONFIG.maxHeight / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // 创建 canvas 进行压缩
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(base64);
          return;
        }
        
        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为压缩后的 base64
        const compressedBase64 = canvas.toDataURL(
          IMAGE_COMPRESSION_CONFIG.mimeType,
          IMAGE_COMPRESSION_CONFIG.quality
        );
        
        // 计算压缩比
        const originalSize = Math.round(base64.length / 1024);
        const compressedSize = Math.round(compressedBase64.length / 1024);
        const ratio_percent = Math.round((1 - compressedSize / originalSize) * 100);
        console.log(`[图片压缩] ${originalSize}KB -> ${compressedSize}KB (压缩 ${ratio_percent}%)`);
        
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        console.error('[图片压缩] 加载图片失败');
        resolve(base64);
      };
      
      img.src = base64;
    });
  }
  
  // 保存当前编辑区域中的值（兼容旧的调用）
  private saveCurrentTextareaValue(stepId: string): void {
    this.saveStepContentFromEditable(stepId);
  }

  // 移除步骤图片
  public removeStepImage(stepId: string): void {
    this.removeStepImageFromEditor(stepId);
  }

  // 触发截图（监听粘贴事件）
  public triggerScreenshot(stepId: string): void {
    // 设置当前步骤ID，截图完成后保存到此步骤
    this.screenshotStepId = stepId;
    
    // 直接启动截图功能
    this.startRealScreenshot();
  }

  // 截图步骤ID（临时存储）
  private screenshotStepId: string = '';
  
  // 当前聚焦的步骤ID（用于粘贴图片）
  private focusedStepId: string = '';
  
  // 图片放大弹窗
  private enlargedImageUrl: string = '';
  private enlargedImageStepId: string = '';  // 放大图片对应的步骤ID
  
  // 保存状态提示
  private saveStatus: string = '';  // 'saving' | 'saved' | ''

  // 处理粘贴图片
  public handlePaste(event: ClipboardEvent): void {
    if (!this.screenshotStepId) return;
    
    const items = event.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            this.updateStepImage(this.screenshotStepId, base64);
            this.screenshotStepId = '';
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }

  // 生成周总结弹窗 HTML
  private generateWeeklySummaryHTML(): string {
    if (!this.showWeeklySummary) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const stats = this.getWeeklyStats(this.viewingWeekOffset);
    
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (stats.percentage / 100) * circumference;
    
    // 计算每日最大任务数用于柱状图
    const maxDailyTasks = Math.max(...stats.byDay.map(d => d.total), 1);
    
    // 激励文案
    const getMotivationText = () => {
      if (stats.percentage >= 90) return { text: '🎉 本周表现卓越！你是个效率达人！', emoji: '🏆' };
      if (stats.percentage >= 70) return { text: '👏 本周表现优秀！继续保持！', emoji: '💪' };
      if (stats.percentage >= 50) return { text: '💪 本周表现良好，还有提升空间！', emoji: '📈' };
      return { text: '🚀 下周加油！相信你可以做得更好！', emoji: '⭐' };
    };
    const motivation = getMotivationText();
    
    // 获取当前查看周的信息
    const weekInfo = this.getWeekDateRange(this.viewingWeekOffset);
    const weekTitle = this.viewingWeekOffset === 0 ? '本周总结' : 
                      this.viewingWeekOffset === -1 ? '上周总结' : 
                      this.viewingWeekOffset === 1 ? '下周总结' : 
                      `第${weekInfo.weekNum}周总结`;
    
    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.showWeeklySummary = false; planner.viewingWeekOffset = 0; planner.render();">
        <div class="${bgClass} rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          
          <!-- 标题与导航 -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <!-- 左箭头 -->
              <button onclick="planner.navigateWeeklySummary(-1)"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="text-center min-w-[120px]">
                <h2 class="text-xl font-bold ${textClass}">📊 ${weekTitle}</h2>
                <p class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${stats.byDay[0].date} ~ ${stats.byDay[6].date}</p>
              </div>
              <!-- 右箭头 -->
              <button onclick="planner.navigateWeeklySummary(1)"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <button onclick="planner.showWeeklySummary = false; planner.viewingWeekOffset = 0; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <!-- 周期选择器 -->
          <div class="flex items-center gap-2 mb-4 p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg">
            <label class="text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}">跳转到:</label>
            <select id="weekYearSelect" onchange="planner.jumpToWeekFromSelect()"
                    class="flex-1 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}">
              ${this.generateYearOptions(weekInfo.year)}
            </select>
            <select id="weekNumSelect" onchange="planner.jumpToWeekFromSelect()"
                    class="flex-1 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}">
              ${this.generateWeekOptions(weekInfo.weekNum)}
            </select>
          </div>
          
          <!-- 核心数据区 -->
          <div class="flex items-center gap-6 mb-6">
            <!-- 环形进度条 -->
            <div class="relative flex-shrink-0">
              <svg width="140" height="140" class="transform -rotate-90">
                <circle cx="70" cy="70" r="60" stroke="${isDark ? '#374151' : '#e5e7eb'}" stroke-width="10" fill="none"/>
                <circle cx="70" cy="70" r="60" stroke="url(#gradient)" stroke-width="10" fill="none"
                        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                        class="transition-all duration-700 ease-in-out"/>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#10b981"/>
                    <stop offset="100%" style="stop-color:#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-bold ${textClass}">${stats.percentage}%</span>
                <span class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">完成率</span>
              </div>
            </div>
            
            <!-- 统计卡片 -->
            <div class="flex-1 grid grid-cols-2 gap-3">
              <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-3 text-center">
                <div class="text-2xl font-bold text-blue-600">${stats.total}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">总任务</div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-3 text-center">
                <div class="text-2xl font-bold text-green-600">${stats.completed}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">已完成</div>
              </div>
              <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-3 text-center">
                <div class="text-2xl font-bold text-orange-600">${stats.pending}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">未完成</div>
              </div>
              <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-3 text-center">
                <div class="text-2xl font-bold text-purple-600">${stats.streakDays}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">连续打卡</div>
              </div>
            </div>
          </div>
          
          <!-- 每日趋势柱状图 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold ${textClass} mb-3">📅 每日完成趋势</h3>
            <div class="flex items-end justify-between gap-2 h-24 px-2">
              ${stats.byDay.map(day => {
                const height = day.total > 0 ? Math.max((day.completed / maxDailyTasks) * 100, 8) : 8;
                const isToday = day.date === this.formatDate(new Date());
                return `
                  <div class="flex flex-col items-center flex-1">
                    <div class="w-full flex flex-col items-center justify-end h-20">
                      <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1">${day.completed}/${day.total}</div>
                      <div class="w-full max-w-[30px] rounded-t-md transition-all duration-300 ${isToday ? 'bg-gradient-to-t from-blue-500 to-blue-400' : 'bg-gradient-to-t from-green-500 to-green-400'}"
                           style="height: ${height}%"></div>
                    </div>
                    <span class="text-xs mt-1 ${isToday ? 'font-bold text-blue-500' : isDark ? 'text-gray-400' : 'text-gray-500'}">${day.dayName}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <!-- 对比上周 -->
          <div class="mb-4 p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}">
            <div class="flex items-center justify-between">
              <span class="text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}">📈 较上周对比</span>
              <span class="font-bold ${stats.improvement >= 0 ? 'text-green-500' : 'text-red-500'}">
                ${stats.improvement >= 0 ? '+' : ''}${stats.improvement}%
              </span>
            </div>
            <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1">
              上周完成率: ${stats.lastWeekPercentage}%
            </div>
          </div>
          
          <!-- 激励文案 -->
          <div class="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center">
            <div class="text-2xl mb-1">${motivation.emoji}</div>
            <div class="font-medium">${motivation.text}</div>
          </div>
          
          <!-- 周总结文字区域 -->
          <div class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold ${textClass}">📝 ${this.viewingWeekOffset === 0 ? '本周' : '该周'}感想</h3>
              <button onclick="const textarea = document.getElementById('weekly-note-textarea'); planner.saveWeeklySummaryNoteWithStatus(textarea.value);"
                      class="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                保存
              </button>
            </div>
            <textarea 
              id="weekly-note-textarea"
              class="w-full h-24 p-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="写下这周的总结感想..."
            >${this.summaryNotes.weekly[this.getWeekKey(this.viewingWeekOffset)] || ''}</textarea>
          </div>
          
          <!-- 成就徽章 -->
          ${stats.streakDays >= 7 ? `
            <div class="mt-4 flex items-center justify-center gap-2">
              <span class="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">🔥 坚持一周</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // 生成月总结弹窗 HTML
  private generateMonthlySummaryHTML(): string {
    if (!this.showMonthlySummary) return '';
    
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    
    // 使用偏移量计算年份和月份
    const monthInfo = this.getMonthInfo(this.viewingMonthOffset);
    const year = monthInfo.year;
    const month = monthInfo.month - 1; // 转换为0-based
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    
    // 统计本月数据
    let total = 0;
    let completed = 0;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dailyData: { day: number; total: number; completed: number }[] = [];
    
    for (let day = 1; day <= lastDay; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = this.tasks[dateKey] || [];
      const dayTotal = dayTasks.length;
      const dayCompleted = dayTasks.filter(t => t.completed).length;
      
      dailyData.push({ day, total: dayTotal, completed: dayCompleted });
      total += dayTotal;
      completed += dayCompleted;
    }
    
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // 计算上月数据
    const lastMonth = month === 0 ? 11 : month - 1;
    const lastMonthYear = month === 0 ? year - 1 : year;
    let lastMonthTotal = 0;
    let lastMonthCompleted = 0;
    const lastMonthLastDay = new Date(lastMonthYear, lastMonth + 1, 0).getDate();
    
    for (let day = 1; day <= lastMonthLastDay; day++) {
      const dateKey = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTasks = this.tasks[dateKey] || [];
      lastMonthTotal += dayTasks.length;
      lastMonthCompleted += dayTasks.filter(t => t.completed).length;
    }
    
    const lastMonthPercentage = lastMonthTotal > 0 ? Math.round((lastMonthCompleted / lastMonthTotal) * 100) : 0;
    const improvement = percentage - lastMonthPercentage;
    
    const circumference = 2 * Math.PI * 60;
    const offset = circumference - (percentage / 100) * circumference;
    
    // 日历热力图
    const heatmapHTML = this.generateHeatmapHTML(year, month, dailyData, isDark);
    
    // 激励文案
    const getMotivationText = () => {
      if (percentage >= 90) return { text: '🏆 本月表现卓越！你是效率冠军！', color: 'from-yellow-400 to-orange-500' };
      if (percentage >= 70) return { text: '👏 本月表现优秀！继续保持！', color: 'from-green-400 to-blue-500' };
      if (percentage >= 50) return { text: '💪 本月表现良好，下月继续加油！', color: 'from-blue-400 to-purple-500' };
      return { text: '🚀 下个月，你一定可以做得更好！', color: 'from-purple-400 to-pink-500' };
    };
    const motivation = getMotivationText();
    // 月总结标题
    const monthTitle = this.viewingMonthOffset === 0 ? '本月总结' : 
                       this.viewingMonthOffset === -1 ? '上月总结' : 
                       this.viewingMonthOffset === 1 ? '下月总结' : 
                       `${monthNames[month]}总结`;
    
    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.showMonthlySummary = false; planner.viewingMonthOffset = 0; planner.render();">
        <div class="${bgClass} rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          
          <!-- 标题与导航 -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <!-- 左箭头 -->
              <button onclick="planner.navigateMonthlySummary(-1)"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="text-center min-w-[120px]">
                <h2 class="text-xl font-bold ${textClass}">📊 ${monthTitle}</h2>
                <p class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${year}年</p>
              </div>
              <!-- 右箭头 -->
              <button onclick="planner.navigateMonthlySummary(1)"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <button onclick="planner.showMonthlySummary = false; planner.viewingMonthOffset = 0; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <!-- 月份选择器 -->
          <div class="flex items-center gap-2 mb-4 p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg">
            <label class="text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}">跳转到:</label>
            <select id="monthYearSelect" onchange="planner.jumpToMonthFromSelect()"
                    class="flex-1 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}">
              ${this.generateYearOptions(year)}
            </select>
            <select id="monthNumSelect" onchange="planner.jumpToMonthFromSelect()"
                    class="flex-1 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}">
              ${this.generateMonthOptions(monthInfo.month)}
            </select>
          </div>
          
          <!-- 核心数据区 -->
          <div class="flex items-center gap-6 mb-6">
            <!-- 环形进度条 -->
            <div class="relative flex-shrink-0">
              <svg width="140" height="140" class="transform -rotate-90">
                <circle cx="70" cy="70" r="60" stroke="${isDark ? '#374151' : '#e5e7eb'}" stroke-width="10" fill="none"/>
                <circle cx="70" cy="70" r="60" stroke="url(#gradientMonth)" stroke-width="10" fill="none"
                        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                        class="transition-all duration-700 ease-in-out"/>
                <defs>
                  <linearGradient id="gradientMonth" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#8b5cf6"/>
                    <stop offset="100%" style="stop-color:#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-bold ${textClass}">${percentage}%</span>
                <span class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">完成率</span>
              </div>
            </div>
            
            <!-- 统计卡片 -->
            <div class="flex-1 grid grid-cols-2 gap-3">
              <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-3 text-center">
                <div class="text-2xl font-bold text-blue-600">${total}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">总任务</div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-3 text-center">
                <div class="text-2xl font-bold text-green-600">${completed}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">已完成</div>
              </div>
              <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-3 text-center">
                <div class="text-2xl font-bold text-orange-600">${pending}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">未完成</div>
              </div>
              <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-3 text-center">
                <div class="text-2xl font-bold text-purple-600">${Math.round(total / lastDay * 10) / 10}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">日均任务</div>
              </div>
            </div>
          </div>
          
          <!-- 日历热力图 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold ${textClass} mb-3">📅 任务日历</h3>
            ${heatmapHTML}
          </div>
          
          <!-- 对比上月 -->
          <div class="mb-4 p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}">
            <div class="flex items-center justify-between">
              <span class="text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}">📈 较上月对比</span>
              <span class="font-bold ${improvement >= 0 ? 'text-green-500' : 'text-red-500'}">
                ${improvement >= 0 ? '+' : ''}${improvement}%
              </span>
            </div>
            <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1">
              上月完成率: ${lastMonthPercentage}%
            </div>
          </div>
          
          <!-- 激励文案 -->
          <div class="p-4 rounded-xl bg-gradient-to-r ${motivation.color} text-white text-center">
            <div class="font-medium">${motivation.text}</div>
          </div>
          
          <!-- 月总结文字区域 -->
          <div class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold ${textClass}">📝 ${this.viewingMonthOffset === 0 ? '本月' : '该月'}感想</h3>
              <button onclick="const textarea = document.getElementById('monthly-note-textarea'); planner.saveMonthlySummaryNoteWithStatus(textarea.value);"
                      class="px-3 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                保存
              </button>
            </div>
            <textarea 
              id="monthly-note-textarea"
              class="w-full h-24 p-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="写下这个月的总结感想..."
            >${this.summaryNotes.monthly[this.getMonthKey(this.viewingMonthOffset)] || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  // 生成日历热力图
  private generateHeatmapHTML(year: number, month: number, dailyData: { day: number; total: number; completed: number }[], isDark: boolean): string {
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // 周一为第一天
    
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    
    let html = `
      <div class="grid grid-cols-7 gap-1 text-center mb-1">
        ${weekDays.map(d => `<div class="text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}">${d}</div>`).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1">
    `;
    
    // 填充空白格
    for (let i = 0; i < adjustedFirstDay; i++) {
      html += `<div class="aspect-square"></div>`;
    }
    
    // 填充日期
    dailyData.forEach(({ day, total, completed }) => {
      let bgColor = isDark ? 'bg-gray-700' : 'bg-gray-100';
      if (total > 0) {
        const rate = completed / total;
        if (rate === 1) bgColor = 'bg-green-500';
        else if (rate >= 0.7) bgColor = 'bg-green-400';
        else if (rate >= 0.5) bgColor = 'bg-yellow-400';
        else if (rate > 0) bgColor = 'bg-orange-400';
      }
      
      const today = new Date();
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      
      html += `
        <div class="aspect-square rounded-sm ${bgColor} ${isToday ? 'ring-2 ring-blue-500' : ''} flex items-center justify-center text-xs ${total > 0 ? 'text-white' : isDark ? 'text-gray-500' : 'text-gray-400'}"
             title="${day}日: ${completed}/${total} 完成">
          ${day}
        </div>
      `;
    });
    
    html += `</div>`;
    
    // 图例
    html += `
      <div class="flex items-center justify-end gap-2 mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">
        <span>少</span>
        <div class="flex gap-1">
          <div class="w-3 h-3 rounded-sm ${isDark ? 'bg-gray-700' : 'bg-gray-200'}"></div>
          <div class="w-3 h-3 rounded-sm bg-orange-400"></div>
          <div class="w-3 h-3 rounded-sm bg-yellow-400"></div>
          <div class="w-3 h-3 rounded-sm bg-green-400"></div>
          <div class="w-3 h-3 rounded-sm bg-green-500"></div>
        </div>
        <span>多</span>
      </div>
    `;
    
    return html;
  }

  // 生成年度统计弹窗 HTML
  private generateYearlyStatsHTML(): string {
    if (!this.showYearlyStats) return '';
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    const stats = this.getYearlyStatsExtended(this.viewingYearOffset);
    const currentYear = this.currentDate.getFullYear() + this.viewingYearOffset;

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    
    const circumference = 2 * Math.PI * 70;
    const offset = circumference - (stats.percentage / 100) * circumference;
    
    // 计算每月最大任务数用于柱状图
    const maxMonthlyTasks = Math.max(...stats.byMonth.map(m => m.total), 1);
    
    // 激励文案
    const getMotivationText = () => {
      if (stats.percentage >= 80) return { text: `🏆 ${currentYear}年，你完成了${stats.completed}个任务，效率爆表！`, badges: ['效率达人', '任务终结者'] };
      if (stats.percentage >= 60) return { text: `👏 ${currentYear}年，你完成了${stats.completed}个任务，表现出色！`, badges: ['坚持之星'] };
      if (stats.percentage >= 40) return { text: `💪 ${currentYear}年，你完成了${stats.completed}个任务，继续加油！`, badges: ['努力向前'] };
      return { text: `🚀 ${currentYear}年过去了，新的一年你一定可以做得更好！`, badges: ['新起点'] };
    };
    const motivation = getMotivationText();
    
    // 年度标题
    const yearTitle = this.viewingYearOffset === 0 ? '本年度总结' : 
                      this.viewingYearOffset === -1 ? '去年总结' : 
                      this.viewingYearOffset === 1 ? '明年总结' : 
                      `${currentYear}年度总结`;

    return `
      <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
           onclick="planner.showYearlyStats = false; planner.viewingYearOffset = 0; planner.render();">
        <div class="${bgClass} rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
             onclick="event.stopPropagation()">
          
          <!-- 标题与导航 -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <!-- 左箭头 -->
              <button onclick="planner.navigateYearlySummary(-1)"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="text-center min-w-[150px]">
                <h2 class="text-2xl font-bold ${textClass}">🎊 ${yearTitle}</h2>
                <p class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${currentYear}年</p>
              </div>
              <!-- 右箭头 -->
              <button onclick="planner.navigateYearlySummary(1)"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <button onclick="planner.showYearlyStats = false; planner.viewingYearOffset = 0; planner.render();"
                    class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <!-- 年份选择器 -->
          <div class="flex items-center gap-2 mb-4 p-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg">
            <label class="text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}">跳转到:</label>
            <select id="yearSelect" onchange="planner.jumpToYearFromSelect()"
                    class="flex-1 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-600 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'}">
              ${this.generateYearOptions(currentYear)}
            </select>
          </div>

          <!-- 核心数据区 -->
          <div class="flex items-center gap-6 mb-6">
            <!-- 环形进度条 -->
            <div class="relative flex-shrink-0">
              <svg width="160" height="160" class="transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="${isDark ? '#374151' : '#e5e7eb'}" stroke-width="12" fill="none"/>
                <circle cx="80" cy="80" r="70" stroke="url(#gradientYear)" stroke-width="12" fill="none"
                        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                        class="transition-all duration-1000 ease-in-out"/>
                <defs>
                  <linearGradient id="gradientYear" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#f59e0b"/>
                    <stop offset="50%" style="stop-color:#8b5cf6"/>
                    <stop offset="100%" style="stop-color:#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-4xl font-bold ${textClass}">${stats.percentage}%</span>
                <span class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">年度完成率</span>
              </div>
            </div>
            
            <!-- 统计卡片 -->
            <div class="flex-1 grid grid-cols-2 gap-3">
              <div class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 text-center">
                <div class="text-3xl font-bold text-blue-600">${stats.total.toLocaleString()}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">总任务数</div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 text-center">
                <div class="text-3xl font-bold text-green-600">${stats.completed.toLocaleString()}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">已完成</div>
              </div>
              <div class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4 text-center">
                <div class="text-3xl font-bold text-orange-600">${stats.pending.toLocaleString()}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">未完成</div>
              </div>
              <div class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 text-center">
                <div class="text-3xl font-bold text-purple-600">${stats.avgDailyTasks}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">日均任务</div>
              </div>
            </div>
          </div>
          
          <!-- 亮点数据 -->
          <div class="grid grid-cols-3 gap-3 mb-6">
            <div class="p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} text-center">
              <div class="text-lg font-bold text-red-500">${stats.busiestMonth ? monthNames[stats.busiestMonth.month - 1] : '-'}</div>
              <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">最忙碌月份 ${stats.busiestMonth ? `(${stats.busiestMonth.count}任务)` : ''}</div>
            </div>
            <div class="p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} text-center">
              <div class="text-lg font-bold text-green-500">${stats.mostProductiveMonth ? monthNames[stats.mostProductiveMonth.month - 1] : '-'}</div>
              <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">最高效月份 ${stats.mostProductiveMonth ? `(${stats.mostProductiveMonth.rate}%)` : ''}</div>
            </div>
            <div class="p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} text-center">
              <div class="text-lg font-bold text-yellow-500">${stats.longestStreak}天</div>
              <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}">最长连续打卡</div>
            </div>
          </div>

          <!-- 月度趋势柱状图 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold ${textClass} mb-3">📊 月度任务趋势</h3>
            <div class="flex items-end justify-between gap-2 h-32 px-2">
              ${stats.byMonth.map(m => {
                const height = m.total > 0 ? Math.max((m.total / maxMonthlyTasks) * 100, 5) : 5;
                const rate = m.percentage;
                let barColor = 'from-gray-400 to-gray-500';
                if (rate >= 80) barColor = 'from-green-400 to-green-500';
                else if (rate >= 50) barColor = 'from-yellow-400 to-yellow-500';
                else if (rate >= 30) barColor = 'from-orange-400 to-orange-500';
                return `
                  <div class="flex flex-col items-center flex-1">
                    <div class="w-full flex flex-col items-center justify-end h-28">
                      <div class="text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1">${m.total}</div>
                      <div class="w-full max-w-[35px] rounded-t-md transition-all duration-300 bg-gradient-to-t ${barColor}"
                           style="height: ${height}%"></div>
                    </div>
                    <span class="text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}">${m.month}月</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- 月度详情 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold ${textClass} mb-3">📅 月度详情</h3>
            <div class="space-y-2">
              ${stats.byMonth.map(m => `
                <div class="flex items-center gap-3">
                  <span class="w-12 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">${monthNames[m.month - 1]}</span>
                  <div class="flex-1 h-5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
                         style="width: ${m.percentage}%"></div>
                  </div>
                  <span class="w-16 text-sm text-right ${isDark ? 'text-gray-300' : 'text-gray-600'}">${m.completed}/${m.total}</span>
                  <span class="w-12 text-xs text-right ${m.percentage >= 70 ? 'text-green-500' : m.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}">${m.percentage}%</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- 激励文案 -->
          <div class="p-4 rounded-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white text-center mb-4">
            <div class="text-lg font-medium">${motivation.text}</div>
          </div>
          
          <!-- 成就徽章 -->
          <div class="flex items-center justify-center gap-2 flex-wrap">
            ${motivation.badges.map(badge => `
              <span class="px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded-full text-sm font-medium shadow-sm">
                🏅 ${badge}
              </span>
            `).join('')}
            ${stats.longestStreak >= 30 ? `<span class="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 rounded-full text-sm font-medium shadow-sm">🔥 坚持一个月</span>` : ''}
            ${stats.longestStreak >= 100 ? `<span class="px-3 py-1.5 bg-gradient-to-r from-red-100 to-red-200 text-red-800 rounded-full text-sm font-medium shadow-sm">💎 坚持百日</span>` : ''}
            ${stats.total >= 1000 ? `<span class="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-full text-sm font-medium shadow-sm">📊 千任务达成</span>` : ''}
          </div>
          
          <!-- 年度总结文字区域 -->
          <div class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold ${textClass}">📝 ${this.viewingYearOffset === 0 ? '本年度' : '该年度'}感想</h3>
              <button onclick="const textarea = document.getElementById('yearly-note-textarea'); planner.saveYearlySummaryNoteWithStatus(textarea.value);"
                      class="px-3 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                保存
              </button>
            </div>
            <textarea 
              id="yearly-note-textarea"
              class="w-full h-24 p-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="写下这一年的总结感想..."
            >${this.summaryNotes.yearly[this.getYearKey(this.viewingYearOffset)] || ''}</textarea>
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

  // 生成周视图
  private generateWeekViewHTML(): string {
    const isDark = this.themeMode === 'dark';
    const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';

    // 获取本周的日期（周一开始）
    const weekStart = new Date(this.currentDate);
    const dayOfWeek = weekStart.getDay();
    // getDay(): 0=周日, 1=周一, ..., 6=周六
    // 转换为：周一=0, 周二=1, ..., 周日=6
    const adjustedDayOfWeek = (dayOfWeek + 6) % 7;
    weekStart.setDate(weekStart.getDate() - adjustedDayOfWeek);

    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    const today = new Date();

    let weekDaysHTML = '';
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = this.formatDate(date);
      const isToday = date.toDateString() === today.toDateString();
      const dayTasks = this.tasks[dateKey] || [];
      const lunarText = this.getLunarDisplayText(date);
      // 使用年月日数值创建日期，避免时区问题
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      weekDaysHTML += `
        <div class="flex-1 ${bgClass} rounded-lg shadow-lg p-3 ${isToday ? 'ring-2 ring-blue-500' : ''} min-w-[120px] cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
             onclick="planner.selectDate(new Date(${year}, ${month}, ${day}))"
             ondragover="event.preventDefault()"
             ondrop="planner.onDateDrop(event, new Date(${year}, ${month}, ${day}))">
          <div class="text-center mb-2 pb-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
            <div class="text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}">周${weekDays[i]}</div>
            <div class="text-xl font-bold ${textClass}">${date.getDate()}</div>
            <div class="text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}">${lunarText}</div>
          </div>
          <div class="space-y-1 max-h-48 overflow-y-auto" onclick="planner.selectDate(new Date(${year}, ${month}, ${day}))">
            ${dayTasks.length > 0 ? dayTasks.map(task => {
              const taskPriority = (task.priority || 'normal') as TaskPriority;
              const priorityConfig = PRIORITY_CONFIG[taskPriority] || PRIORITY_CONFIG['normal'];
              return `
              <div class="p-2 rounded ${task.completed ? 'bg-gray-100 dark:bg-gray-700' : isDark ? 'bg-gray-700' : 'bg-gray-50'} border-l-2 ${priorityConfig.borderColor}"
                   onclick="planner.selectDate(new Date(${year}, ${month}, ${day}))">
                <div class="flex items-center gap-1">
                  <input type="checkbox" ${task.completed ? 'checked' : ''} 
                         onclick="event.stopPropagation(); planner.selectedDate = new Date(${year}, ${month}, ${day}); planner.toggleTask('${task.id}');"
                         class="w-3 h-3 rounded cursor-pointer">
                  <span class="text-xs ${task.completed ? 'line-through text-gray-400' : textClass} truncate">${task.text}</span>
                </div>
              </div>
            `}).join('') : `<p class="text-xs text-gray-400 text-center py-1">无任务</p>`}
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
                  class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 class="text-lg font-bold ${textClass}">
            ${weekStart.getMonth() + 1}月${weekStart.getDate()}日 - ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日
          </h2>
          <button onclick="planner.currentDate.setDate(planner.currentDate.getDate() + 7); planner.render();"
                  class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg class="w-5 h-5 ${isDark ? 'text-gray-300' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        <div class="flex gap-2 overflow-x-auto">
          ${weekDaysHTML}
        </div>
      </div>
    `;
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
          <img src="./icon.png" class="w-4 h-4" alt="每日规划">
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
            <h1 class="text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}">${this.viewMode === 'month' ? '每日规划' : '周规划'}</h1>
            <div class="flex items-center gap-2 flex-wrap">
              <button onclick="event.stopPropagation(); planner.jumpToToday()"
                      class="px-3 py-2 ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors shadow-md text-sm font-medium"
                      title="跳转到今天">
                今天
              </button>
              <div class="flex rounded-lg overflow-hidden shadow-md">
                <button onclick="event.stopPropagation(); planner.setViewMode('month')"
                        class="px-3 py-2 text-sm font-medium transition-colors ${this.viewMode === 'month' ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'}">
                  月
                </button>
                <button onclick="event.stopPropagation(); planner.setViewMode('week')"
                        class="px-3 py-2 text-sm font-medium transition-colors border-l ${isDark ? 'border-gray-600' : 'border-gray-200'} ${this.viewMode === 'week' ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'}">
                  周
                </button>
              </div>
              <button onclick="event.stopPropagation(); planner.showSearchPanel = true; planner.render();"
                      class="p-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'} rounded-lg transition-colors shadow-md"
                      title="搜索任务">
                <svg class="w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </button>
              <div class="relative">
                <button onclick="event.stopPropagation(); planner.toggleThemeMenu()"
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
                <button onclick="event.stopPropagation(); planner.toggleMoreMenu()"
                        class="p-2 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'} rounded-lg transition-colors shadow-md"
                        title="更多功能"
                        id="moreMenuBtn">
                  <svg class="w-5 h-5 ${isDark ? 'text-gray-200' : 'text-gray-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                </button>
              </div>
              <button onclick="event.stopPropagation(); planner.toggleQuadrantView()"
                      class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-md text-sm font-medium">
                四象限
              </button>
              <button onclick="event.stopPropagation(); planner.toggleStatsModal()"
                      class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md text-sm font-medium">
                统计
              </button>
            </div>
          </div>
          ${this.viewMode === 'month' ? this.generateCalendarHTML() : this.generateWeekViewHTML()}
          
          <!-- 周月年总结入口 -->
          ${this.generateSummaryButtonsHTML()}
        </div>
      </div>
      ${this.generateTaskPanelHTML()}
      ${this.generateCopyModalHTML()}
      ${this.generateQuadrantViewHTML()}
      ${this.generateStatsModalHTML()}
      ${this.generateSearchPanelHTML()}
      ${this.generateMoreMenuHTML()}
      ${this.generateYearlyStatsHTML()}
      ${this.generateWeeklySummaryHTML()}
      ${this.generateMonthlySummaryHTML()}
      ${this.generateAnniversaryModalHTML()}
      ${this.generateReminderSettingsHTML()}
      ${this.generateTagManagerHTML()}
      ${this.generateQuickTagSelectorHTML()}
      ${this.generateUpdateModalHTML()}
      ${this.generateShortcutHelpHTML()}
      ${this.generateContactInfoHTML()}
      ${this.generateKnowledgeBaseHTML()}
      ${this.generateSaveStatusHTML()}
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
        // 周视图：设置为今天
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
