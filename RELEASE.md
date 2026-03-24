# 每日规划 v1.4.9 发布说明

## 发布日期
2024-03-24

## 重要更新

### 系统兼容性
- **降级 Electron 到 22.3.27，重新支持 Windows 7！**
- 支持系统：Windows 7 SP1 / Windows 10 / Windows 11

## 更新内容

### 多图片支持
- 知识库步骤支持多图片
- 上传或截图会添加到末尾而不是覆盖
- 每张图片单独删除

### 截图功能
- 使用 Canvas 绘制截图选择界面
- 选中区域清晰显示
- 截图自动复制到剪贴板

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
- `dist-electron/daily-planner-setup-1.4.9.exe`

---
*此版本由 Vibe Coding 自动生成*
