# 每日规划 v1.5.9 发布说明

## 发布日期
2026-03-24

## 更新内容

### 知识库优化
- **修复搜索闪烁问题**：修复个人知识库搜索框输入时页面闪烁的问题
- 搜索时只局部更新指南列表，不再重新渲染整个页面

### 性能优化
- 优化知识库搜索的渲染性能，减少不必要的 DOM 操作

## 系统要求

| 系统 | 支持 |
|------|------|
| Windows 7 SP1 | ✅ 支持 |
| Windows 8/8.1 | ✅ 支持 |
| Windows 10 | ✅ 支持 |
| Windows 11 | ✅ 支持 |

## 本地构建

```bash
# Windows 环境执行
pnpm install
pnpm run electron:build
```

### 输出文件
- `dist-electron/daily-planner-setup-1.5.9.exe`

---
*此版本由 Vibe Coding 自动生成*
