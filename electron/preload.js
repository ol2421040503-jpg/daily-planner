const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== 窗口控制 ====================
  
  // 最小化到托盘
  minimizeToTray: () => {
    ipcRenderer.send('window-minimize');
  },

  // 最大化/还原
  toggleMaximize: () => {
    ipcRenderer.send('window-maximize');
  },

  // 关闭到托盘
  closeToTray: () => {
    ipcRenderer.send('window-close');
  },

  // 显示窗口
  showWindow: () => {
    ipcRenderer.send('window-show');
  },

  // 检查是否最大化
  isMaximized: () => {
    return ipcRenderer.invoke('is-window-maximized');
  },

  // 切换窗口置顶
  toggleAlwaysOnTop: () => {
    return ipcRenderer.invoke('toggle-always-on-top');
  },

  // 获取窗口置顶状态
  isAlwaysOnTop: () => {
    return ipcRenderer.invoke('is-always-on-top');
  },

  // ==================== 通知相关 ====================
  
  // 发送通知
  sendNotification: (title, body, data) => {
    return ipcRenderer.invoke('send-notification', { title, body, data });
  },

  // 发送测试通知
  testNotification: () => {
    ipcRenderer.send('test-notification');
  },

  // ==================== 提醒相关 ====================
  
  // 发送提醒数据到主进程
  sendReminderData: (data) => {
    ipcRenderer.send('reminder-data', data);
  },

  // 获取提醒配置
  getReminderConfig: () => {
    return ipcRenderer.invoke('get-reminder-config');
  },

  // 监听主进程请求提醒数据
  onRequestReminderData: (callback) => {
    ipcRenderer.on('request-reminder-data', callback);
  },

  // 监听跳转到日期
  onNavigateToDate: (callback) => {
    ipcRenderer.on('navigate-to-date', (event, date) => {
      callback(date);
    });
  },

  // ==================== 任务进度相关 ====================
  
  // 发送任务进度到主进程（更新任务栏进度）
  sendTaskProgress: (data) => {
    ipcRenderer.send('task-progress', data);
  },

  // 请求任务进度
  onRequestTaskProgress: (callback) => {
    ipcRenderer.on('request-task-progress', callback);
  },

  // ==================== 快捷操作相关 ====================
  
  // 监听添加任务焦点
  onAddTaskFocus: (callback) => {
    ipcRenderer.on('add-task-focus', callback);
  },

  // 监听跳转到今天
  onJumpToToday: (callback) => {
    ipcRenderer.on('jump-to-today', callback);
  },

  // 监听显示统计
  onShowStats: (callback) => {
    ipcRenderer.on('show-stats', callback);
  },

  // 监听窗口准备完成
  onWindowReady: (callback) => {
    ipcRenderer.on('window-ready', callback);
  },

  // ==================== 应用设置相关 ====================
  
  // 获取应用版本
  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version');
  },

  // 获取开机自启动状态
  getAutoStartStatus: () => {
    return ipcRenderer.invoke('get-auto-start-status');
  },

  // 设置开机自启动
  setAutoStart: (enable) => {
    return ipcRenderer.invoke('set-auto-start', enable);
  },

  // ==================== 自动更新相关 ====================
  
  // 检查更新
  checkForUpdate: () => {
    return ipcRenderer.invoke('check-for-update');
  },

  // 下载更新
  downloadUpdate: () => {
    return ipcRenderer.invoke('download-update');
  },

  // 安装更新
  installUpdate: () => {
    return ipcRenderer.invoke('install-update');
  },

  // 监听：发现新版本
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },

  // 监听：没有新版本
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', () => callback());
  },

  // 监听：下载进度
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, progress) => callback(progress));
  },

  // 监听：下载完成
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },

  // 监听：更新错误
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error));
  },

  // ==================== 清理监听器 ====================
  
  // 移除所有监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // ==================== 文件存储 ====================
  
  // 保存知识库到文件
  saveKnowledgeFile: (data) => {
    return ipcRenderer.invoke('save-knowledge-file', data);
  },

  // 从文件加载知识库
  loadKnowledgeFile: () => {
    return ipcRenderer.invoke('load-knowledge-file');
  },

  // ==================== 截图功能 ====================
  
  // 开始截图
  startScreenshot: () => {
    return ipcRenderer.invoke('start-screenshot');
  },

  // 完成截图（由主进程调用）
  onCompleteScreenshot: (callback) => {
    ipcRenderer.on('screenshot-complete', (event, data) => callback(data));
  },

  // 取消截图
  cancelScreenshot: () => {
    return ipcRenderer.invoke('cancel-screenshot');
  }
});
