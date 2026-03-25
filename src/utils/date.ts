/**
 * 每日规划 - 日期工具函数
 * @author 严辉村高斯林
 * @license MIT
 */

import { Solar, Lunar } from 'lunar-javascript';

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取日期键（用于任务存储）
 */
export function getDateKey(date: Date): string {
  return formatDate(date);
}

/**
 * 获取农历信息
 */
export function getLunarInfo(date: Date): { 
  lunarDay: string; 
  lunarMonth: string; 
  lunarYear: string;
  lunarDateStr: string;
  lunarFestival: string;
  solarFestival: string;
  solarTerm: string;
  isHoliday: boolean;
} {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  
  return {
    lunarDay: lunar.getDayInChinese(),
    lunarMonth: lunar.getMonthInChinese(),
    lunarYear: lunar.getYearInGanZhi(),
    lunarDateStr: lunar.toString(),
    lunarFestival: lunar.getFestivals().join(' '),
    solarFestival: solar.getFestivals().join(' '),
    solarTerm: lunar.getJieQi() || '',
    isHoliday: lunar.getFestivals().length > 0 || solar.getFestivals().length > 0
  };
}

/**
 * 获取农历日期显示文本
 */
export function getLunarDisplayText(date: Date): string {
  const lunar = getLunarInfo(date);
  
  // 优先显示节日
  if (lunar.lunarFestival) {
    return lunar.lunarFestival;
  }
  if (lunar.solarFestival) {
    return lunar.solarFestival;
  }
  if (lunar.solarTerm) {
    return lunar.solarTerm;
  }
  
  // 显示农历日期
  const day = lunar.lunarDay;
  const month = lunar.lunarMonth;
  
  // 初一显示月份
  if (day === '初一') {
    return month;
  }
  
  return day;
}

/**
 * 获取星期几名称
 */
export function getWeekdayName(date: Date): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[date.getDay()];
}

/**
 * 获取星期几短名称
 */
export function getWeekdayShort(date: Date): string {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return weekdays[date.getDay()];
}

/**
 * 判断是否是今天
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}

/**
 * 判断是否是周末
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * 获取月份的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * 获取月份的第一天是星期几
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * 获取周数
 */
export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * 获取一周的日期范围
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return { start, end };
}

/**
 * 获取一周的所有日期
 */
export function getWeekDates(date: Date): Date[] {
  const { start } = getWeekRange(date);
  const dates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  
  return dates;
}

/**
 * 添加天数
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(date.getDate() + days);
  return result;
}

/**
 * 计算两个日期之间的天数差
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}

/**
 * 判断日期是否过期
 */
export function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const diff = daysBetween(date, today);
  
  if (diff === 0) return '今天';
  if (diff === 1) return date > today ? '明天' : '昨天';
  if (diff === 2) return date > today ? '后天' : '前天';
  
  if (diff <= 7) {
    return date > today ? `${diff}天后` : `${diff}天前`;
  }
  
  return formatDate(date);
}

/**
 * 获取月份名称
 */
export function getMonthName(month: number): string {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', 
                  '七月', '八月', '九月', '十月', '十一月', '十二月'];
  return months[month];
}

/**
 * 解析日期字符串
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
