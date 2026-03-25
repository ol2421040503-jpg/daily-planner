# 每日规划 v1.6.1 发布说明

## 发布日期
2026-03-25

## 重要修复

### 日期解析时区问题修复
- **修复通知面板日期显示错误**：今天创建的任务现在正确显示为"今天"，而不是"明天"
- 原因：`new Date("2026-03-25")` 按 UTC 时间解析，在中国时区(UTC+8)会变成前一天的 08:00:00

### 修复内容
- 添加 `parseLocalDate()` 函数正确解析日期字符串为本地时间
- 修复连续打卡天数计算
- 修复四象限日期范围过滤
- 修复任务到期天数计算
- 修复通知面板日期标签显示

## 技术细节

**问题代码：**
```javascript
const dateObj = new Date("2026-03-25"); // UTC 时间 00:00:00 = 北京时间前一天 08:00:00
```

**修复后：**
```javascript
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // 本地时间 00:00:00
}
```

## 系统要求

| 系统 | 支持 |
|------|------|
| Windows 7 SP1 | ✅ 支持 |
| Windows 8/8.1 | ✅ 支持 |
| Windows 10 | ✅ 支持 |
| Windows 11 | ✅ 支持 |

## 本地构建

```bash
pnpm install
pnpm run electron:build
```

---
*此版本由 Vibe Coding 自动生成*
