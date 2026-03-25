# 每日规划 v1.6.5 发布说明

## 发布日期
2026-03-25

## 重要更新

### 全面替换 Emoji 为 SVG/CSS 图标
- **优先级选择器**：去掉 Emoji，使用纯文字 + 背景色区分
  - 紧急重要（红色背景）
  - 重要不急（黄色背景）
  - 紧急不重要（橙色背景）
  - 普通（灰色背景）
- **提醒设置弹窗**：优先级圆点使用 CSS 彩色圆点替代 Emoji
- **纪念日显示**：使用爱心 SVG 图标替代庆祝 Emoji
- **感想标题**：使用笔记 SVG 图标替代 Emoji
- **更新弹窗**：使用星星 SVG 图标替代庆祝 Emoji
- **知识库列表**：使用文档 SVG 图标替代 Emoji

### 兼容性说明
所有 SVG 和 CSS 图标在以下系统上都能正常显示彩色：
- ✅ Windows 7 SP1
- ✅ Windows 8/8.1
- ✅ Windows 10
- ✅ Windows 11
- ✅ macOS
- ✅ Linux

### 保留的 Emoji
以下位置的 Emoji 因是用户可选内容，暂时保留：
- 标签图标选择列表（用户可自由选择标签图标）
- 成就徽章（如 🏆🔥💎 等）

## 本地构建

```bash
pnpm install
pnpm run electron:build
```

---
*此版本由 Vibe Coding 自动生成*
