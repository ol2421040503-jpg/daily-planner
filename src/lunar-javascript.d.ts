declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar;
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getFestivals(): string[];
    toString(): string;
  }

  export class Lunar {
    getDayInChinese(): string;
    getMonthInChinese(): string;
    getYearInChinese(): string;
    getYearInGanZhi(): string;
    getJieQi(): string | null;
    getFestivals(): string[];
    getMonth(): number;
    getDay(): number;
    getYear(): number;
    toString(): string;
  }
}
