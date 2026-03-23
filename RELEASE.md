# 每日规划 v1.4.1 发布说明

## 发布日期
2024-03-24

## 新增功能

### 1. 知识库搜索功能
- 支持搜索指南标题和步骤内容
- 实时搜索，输入即过滤
- 高亮显示匹配的关键词
- 显示匹配内容摘要

### 2. 图片压缩功能
- 图片自动压缩（70%质量，最大1920x1080）
- 导出为ZIP格式（最高压缩级别）
- 支持ZIP/JSON双格式导入

### 3. 文件存储系统
- 知识库数据存储到文件系统
- 无存储大小限制，解决localStorage配额问题

## 问题修复

### 1. 任务面板浮现问题
- 打开其他功能时自动关闭任务面板
- 完善面板互斥逻辑

### 2. 提醒功能优化
- 支持当天任务提醒
- 支持当天纪念日提醒
- 优化提醒消息显示

### 3. 图片交互优化
- 双击放大图片
- hover显示删除按钮
- 放大弹窗增加删除功能

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
- `dist-electron/daily-planner-setup-1.4.1.exe` - Windows安装包

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
