# 每日规划 v1.4.3 发布说明

## 发布日期
2024-03-24

## 新增功能

### 1. 真正的截图功能
- 使用 Electron desktopCapturer API 实现真正的截图
- 全屏截图选择区域，支持拖拽框选任意区域
- 实时显示选择区域尺寸
- 支持 ESC 键取消截图
- 截图完成后自动插入到知识库步骤中
- 支持高分辨率屏幕（Retina）

### 2. 截图功能提示优化
- 在 Web 环境中使用时，显示友好的替代方案提示
- 指导用户使用系统截图工具（Win+Shift+S）+ 粘贴作为替代

## 使用方法

### 桌面版截图
1. 在知识库编辑模式下，点击步骤的 **"截图"** 按钮
2. 或使用快捷键 **Ctrl+B**（Mac: Cmd+B）
3. 屏幕会变成半透明遮罩
4. 按住鼠标拖动选择要截图的区域
5. 松开鼠标后点击 **"确定"** 保存，或点击 **"取消"**
6. 按 **ESC** 键可随时取消截图

### Web 版替代方案
1. 按 **Win+Shift+S** 使用系统截图工具
2. 截图自动复制到剪贴板
3. 点击 **"上传图片"** 按钮粘贴

## 本地构建步骤

### 前置要求
- Node.js 24+
- pnpm 9.0+

### 构建命令

```bash
# 1. 安装依赖
pnpm install

# 2. 类型检查
pnpm run ts-check

# 3. 构建前端
pnpm run build

# 4. 打包Windows应用
pnpm run electron:build
```

### 输出文件
- `dist-electron/daily-planner-setup-1.4.3.exe` - Windows安装包

## 发布流程

### GitHub Release
1. 构建完成后，将exe文件上传到GitHub Release
2. 同时上传 `latest.yml` 文件（自动生成）
3. 填写版本说明

### Gitee Release（国内用户）
1. 将exe文件上传到Gitee Release
2. 同时上传 `latest.yml` 文件

## 自动更新配置
应用已配置自动更新，优先使用Gitee源（国内更快），失败回退GitHub。

---
*此版本由 Vibe Coding 自动生成*
