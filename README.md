# 每日规划 - Daily Planner

一款简洁高效的桌面任务管理工具，帮助你用四象限法则规划每一天。

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![许可证](https://img.shields.io/badge/许可证-MIT-green)
![平台](https://img.shields.io/badge/平台-Windows-lightgrey)

## 功能特性

- 📅 **日历视图** - 直观的月/周/日视图，农历节假日显示
- 📊 **四象限分析** - 按紧急重要程度分类管理任务
- 🏷️ **标签分类** - 预设标签 + 自定义标签，拖拽排序
- 🌙 **深色模式** - 护眼的深色主题，5种背景主题可选
- 🔔 **智能提醒** - 纪念日提醒、任务到期提醒
- 💾 **本地存储** - 数据完全本地化，隐私安全
- 📥 **数据导入导出** - JSON 格式备份恢复

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **TypeScript** - 类型安全
- **Vite** - 快速构建
- **Tailwind CSS** - 现代化样式

## 安装

下载 Windows 安装包，双击安装即可。

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 打包 Electron 应用
pnpm electron:build
```

## 项目结构

```
├── electron/           # Electron 主进程
│   └── main.js        # 主进程入口
├── src/               # 渲染进程
│   ├── main.ts        # 主逻辑
│   └── index.css      # 样式
├── build/             # 构建资源
│   └── icon.ico       # 应用图标
└── package.json       # 项目配置
```

## 作者

**严辉村高斯林**

## 许可证

MIT License
