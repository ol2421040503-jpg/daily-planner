# 每日规划 v1.4.4 发布说明

## 发布日期
2024-03-24

## 更新内容

### 截图功能优化
- 截图按钮添加快捷键提示：**📷 截图(Ctrl+B)**
- Web 环境下显示友好的替代方案提示
- 使用 Electron desktopCapturer API 实现真正的截图
- 支持拖拽框选任意区域
- 实时显示选择区域尺寸
- 支持 ESC 键取消截图

## 使用方法

### 桌面版截图
1. 点击 **📷 截图(Ctrl+B)** 按钮，或按 **Ctrl+B**
2. 屏幕变成半透明遮罩
3. 按住鼠标拖动选择截图区域
4. 松开鼠标，点击 **"确定"** 保存
5. 截图自动插入到当前步骤

### Web 版替代方案
1. 按 **Win+Shift+S** 系统截图
2. 点击 **"上传图片"** 粘贴

## 本地构建

```bash
# Windows 环境执行
pnpm install
pnpm run electron:build
```

### 输出文件
- `dist-electron/daily-planner-setup-1.4.4.exe`
- `dist-electron/latest.yml`

## 发布流程

### GitHub Release
1. 上传 exe 和 latest.yml
2. 创建 tag: `v1.4.4`

### Gitee Release
1. 上传相同文件

---
*此版本由 Vibe Coding 自动生成*
