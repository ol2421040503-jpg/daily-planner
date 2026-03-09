declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
  }

  export class Lunar {
    getDayInChinese(): string;
    getMonthInChinese(): string;
    getJieQi(): string | null;
    getFestivals(): string[];
    getYearInChinese(): string;
    getMonth(): number;
    getDay(): number;
  }
}
