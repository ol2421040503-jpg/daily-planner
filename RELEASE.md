# 每日规划 v1.4.5 发布说明

## 发布日期
2024-03-24

## 更新内容

### 文本框换行修复
- 知识库步骤文本框现在**支持回车换行**了
- 将 contenteditable div 改为 textarea，原生支持换行
- 图片显示在文本框下方，不再混在一起

## 使用方法

### 换行输入
- 在步骤内容框中直接按 **Enter** 即可换行
- 支持多行文本输入

### 截图功能
- 点击 **📷 截图(Ctrl+B)** 按钮，或按 **Ctrl+B**
- 框选区域后点击"确定"
- 图片会显示在文本框下方

## 本地构建

```bash
# Windows 环境执行
pnpm install
pnpm run electron:build
```

### 输出文件
- `dist-electron/daily-planner-setup-1.4.5.exe`
- `dist-electron/latest.yml`

## 发布流程

### GitHub Release
1. 上传 exe 和 latest.yml
2. 创建 tag: `v1.4.5`

### Gitee Release
1. 上传相同文件

---
*此版本由 Vibe Coding 自动生成*
