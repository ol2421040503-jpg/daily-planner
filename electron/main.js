/**
 * 每日规划 - Daily Planner
 * Electron 主进程
 * 
 * @author 严辉村高斯林
 * @license MIT
 */

const { app, BrowserWindow, Notification, ipcMain, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let tray = null;
let reminderInterval;

// 应用版本
const APP_VERSION = '1.0.0';

// 更新状态
let updateDownloaded = false;
let updateInfo = null;

// ==================== 单例模式 ====================
// 防止多个实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果已经有实例在运行，直接退出
  app.quit();
} else {
  // 当第二个实例启动时，聚焦到已有的窗口
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 提醒配置
const REMINDER_CONFIG = {
  anniversary: 3,      // 纪念日提前3天
  high: 7,             // 高优先级提前7天
  medium: 5,           // 中优先级提前5天
  low: 3               // 低优先级提前3天
};

// ==================== 自动更新 ====================

// 配置自动更新
function setupAutoUpdater() {
  // 自动更新配置
  autoUpdater.autoDownload = true;  // 自动下载更新
  autoUpdater.autoInstallOnAppQuit = true;  // 退出时自动安装
  
  // 检查更新出错
  autoUpdater.on('error', (error) => {
    console.error('自动更新错误:', error);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
  });
  
  // 检查到新版本（会自动开始下载）
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version);
    updateInfo = info;
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });
  
  // 没有新版本
  autoUpdater.on('update-not-available', () => {
    console.log('当前已是最新版本');
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available');
    }
  });
  
  // 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`下载进度: ${progressObj.percent.toFixed(1)}%`);
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });
  
  // 下载完成 - 发送系统通知提醒用户
  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新下载完成');
    updateDownloaded = true;
    // 发送系统通知
    sendNotification(
      '🔄 更新已准备就绪',
      `版本 ${info.version} 已下载完成，退出应用时将自动安装`,
      {}
    );
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version
      });
    }
  });
}

// 检查更新
let isManualCheck = false;  // 是否是手动检查

function checkForUpdate(manual = false) {
  if (process.env.NODE_ENV === 'development') {
    console.log('开发环境不检查更新');
    if (manual && mainWindow) {
      mainWindow.webContents.send('update-not-available');
    }
    return;
  }
  
  isManualCheck = manual;
  console.log('正在检查更新...' + (manual ? '（手动）' : '（自动）'));
  autoUpdater.checkForUpdates().catch(err => {
    console.error('检查更新失败:', err);
  });
}

// 下载更新
function downloadUpdate() {
  if (updateInfo) {
    console.log('开始下载更新...');
    autoUpdater.downloadUpdate();
  }
}

// 安装更新（重启应用）
function installUpdate() {
  if (updateDownloaded) {
    app.isQuitting = true;
    autoUpdater.quitAndInstall();
  }
}

// ==================== 原有功能 ====================
const sentReminders = new Set();
let isAlwaysOnTop = false;  // 窗口置顶状态

// 创建窗口
function createWindow() {
  // 图标路径：开发环境用 public，生产环境用 dist
  const iconPath = process.env.NODE_ENV === 'development' 
    ? path.join(__dirname, '../public/icon.png')
    : path.join(__dirname, '../dist/icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,  // 无边框窗口，自定义标题栏
    transparent: false,
    alwaysOnTop: false,  // 默认不置顶
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:daily-planner'  // 持久化存储，防止数据丢失
    },
    title: '每日规划',
    icon: iconPath,
    show: false  // 先隐藏，等加载完成后再显示
  });

  // 在开发环境中加载本地服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 页面加载完成后显示窗口并聚焦输入框
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    // 确保 webContents 完全加载后再发送聚焦事件
    mainWindow.webContents.on('did-finish-load', () => {
      // 延迟一点确保 DOM 完全渲染
      setTimeout(() => {
        mainWindow.webContents.send('window-ready');
      }, 100);
    });
  });

  // 点击关闭按钮时最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 窗口显示时更新任务栏进度
  mainWindow.on('show', () => {
    mainWindow.webContents.send('request-task-progress');
  });
}

// 创建系统托盘
function createTray() {
  // 托盘图标路径：开发环境用 public，生产环境用 dist
  const iconPath = process.env.NODE_ENV === 'development' 
    ? path.join(__dirname, '../public/icon.png')
    : path.join(__dirname, '../dist/icon.png');
  
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示主窗口', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { 
      label: '添加任务', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('add-task-focus');
        }
      }
    },
    { type: 'separator' },
    { 
      label: '今日任务', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('jump-to-today');
        }
      }
    },
    { 
      label: '查看统计', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('show-stats');
        }
      }
    },
    { type: 'separator' },
    { 
      label: '检查更新...', 
      click: () => {
        checkForUpdate(true);  // 手动检查
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { 
      label: '开机自启动', 
      type: 'checkbox', 
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked,
          openAsHidden: false
        });
      }
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('每日规划');
  tray.setContextMenu(contextMenu);

  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 发送系统通知
function sendNotification(title, body, data = {}) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, '../public/icon.png'),
      silent: false
    });

    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        if (data.date) {
          mainWindow.webContents.send('navigate-to-date', data.date);
        }
      }
    });

    notification.show();
    return true;
  }
  return false;
}

// 检查纪念日提醒
function checkAnniversaryReminders(anniversaries) {
  const today = new Date();
  const reminders = [];

  anniversaries.forEach(anniversary => {
    let targetDate = new Date(today.getFullYear(), anniversary.month - 1, anniversary.day);
    
    if (targetDate < today) {
      targetDate = new Date(today.getFullYear() + 1, anniversary.month - 1, anniversary.day);
    }

    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays > 0 && diffDays <= REMINDER_CONFIG.anniversary) {
      const reminderKey = `anniversary-${anniversary.id}-${targetDate.toISOString().split('T')[0]}`;
      
      if (!sentReminders.has(reminderKey)) {
        reminders.push({
          type: 'anniversary',
          name: anniversary.name,
          daysLeft: diffDays,
          date: targetDate.toISOString().split('T')[0],
          reminderKey: reminderKey
        });
      }
    }
  });

  return reminders;
}

// 检查任务提醒
function checkTaskReminders(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reminders = [];

  Object.entries(tasks).forEach(([dateStr, dayTasks]) => {
    dayTasks.forEach(task => {
      if (task.completed) return;

      const taskDate = new Date(dateStr);
      taskDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
      const priority = task.priority || 'medium';
      const reminderDays = REMINDER_CONFIG[priority];

      if (diffDays > 0 && diffDays <= reminderDays) {
        const reminderKey = `task-${task.id}-${dateStr}`;
        
        if (!sentReminders.has(reminderKey)) {
          reminders.push({
            type: 'task',
            text: task.text,
            priority: priority,
            daysLeft: diffDays,
            date: dateStr,
            reminderKey: reminderKey
          });
        }
      }
    });
  });

  return reminders;
}

// 执行提醒检查
function performReminderCheck() {
  if (!mainWindow) return;
  mainWindow.webContents.send('request-reminder-data');
}

// 处理前端返回的提醒数据
function handleReminderData(data) {
  const { tasks, anniversaries } = data;
  
  const anniversaryReminders = checkAnniversaryReminders(anniversaries || []);
  const taskReminders = checkTaskReminders(tasks || {});

  anniversaryReminders.forEach(reminder => {
    const title = '🎉 纪念日提醒';
    const body = `${reminder.name} 将在 ${reminder.daysLeft} 天后到来`;
    sendNotification(title, body, { date: reminder.date });
    sentReminders.add(reminder.reminderKey);
  });

  taskReminders.forEach(reminder => {
    const priorityLabel = reminder.priority === 'high' ? '【高优先】' : 
                          reminder.priority === 'medium' ? '【中优先】' : '【低优先】';
    const title = `📋 任务提醒 ${priorityLabel}`;
    const body = `"${reminder.text}" 将在 ${reminder.daysLeft} 天后到期`;
    sendNotification(title, body, { date: reminder.date });
    sentReminders.add(reminder.reminderKey);
  });

  // 清理过期的提醒记录
  const today = new Date().toISOString().split('T')[0];
  const keysToRemove = [];
  sentReminders.forEach(key => {
    const dateMatch = key.match(/\d{4}-\d{2}-\d{2}/);
    if (dateMatch && dateMatch[0] < today) {
      keysToRemove.push(key);
    }
  });
  keysToRemove.forEach(key => sentReminders.delete(key));
}

// 更新任务栏进度
function updateTaskbarProgress(data) {
  if (mainWindow) {
    const { completed, total } = data;
    if (total > 0) {
      const progress = completed / total;
      mainWindow.setProgressBar(progress);
      
      // 更新托盘图标提示文字
      if (tray) {
        tray.setToolTip(`每日规划 - ${completed}/${total} 任务已完成`);
      }
    } else {
      mainWindow.setProgressBar(-1); // 无进度
      if (tray) {
        tray.setToolTip('每日规划');
      }
    }
  }
}

// 启动提醒定时器
function startReminderScheduler() {
  reminderInterval = setInterval(() => {
    performReminderCheck();
  }, 5 * 60 * 1000);

  setTimeout(() => {
    performReminderCheck();
  }, 3000);
}

// 停止提醒定时器
function stopReminderScheduler() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

// ==================== IPC 处理器 ====================

// 窗口控制
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.hide();  // 最小化到托盘
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.hide();  // 关闭到托盘
});

ipcMain.on('window-show', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.handle('is-window-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// 切换窗口置顶
ipcMain.handle('toggle-always-on-top', () => {
  if (mainWindow) {
    isAlwaysOnTop = !isAlwaysOnTop;
    mainWindow.setAlwaysOnTop(isAlwaysOnTop);
    return isAlwaysOnTop;
  }
  return false;
});

// 获取窗口置顶状态
ipcMain.handle('is-always-on-top', () => {
  return isAlwaysOnTop;
});

// 注册全局快捷键
function registerGlobalShortcuts() {
  // Ctrl+Shift+P: 显示/隐藏主窗口
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Ctrl+Shift+N: 快速添加任务
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('add-task-focus');
    }
  });

  // Ctrl+Shift+T: 跳转到今天
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('jump-to-today');
    }
  });
}

// 注销全局快捷键
function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
}

ipcMain.handle('send-notification', (event, { title, body, data }) => {
  return sendNotification(title, body, data);
});

ipcMain.on('reminder-data', (event, data) => {
  handleReminderData(data);
});

ipcMain.on('test-notification', (event) => {
  sendNotification('测试通知', '这是一条测试通知，提醒功能正常工作！');
});

ipcMain.handle('get-reminder-config', () => {
  return REMINDER_CONFIG;
});

ipcMain.on('task-progress', (event, data) => {
  updateTaskbarProgress(data);
});

ipcMain.handle('get-app-version', () => {
  return APP_VERSION;
});

ipcMain.handle('get-auto-start-status', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('set-auto-start', (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: false
  });
  return app.getLoginItemSettings().openAtLogin;
});

// ==================== 自动更新 IPC ====================

// 手动检查更新
ipcMain.handle('check-for-update', () => {
  checkForUpdate(true);
});

// 下载更新
ipcMain.handle('download-update', () => {
  downloadUpdate();
});

// 安装更新
ipcMain.handle('install-update', () => {
  installUpdate();
});

// ==================== 应用启动 ====================

app.whenReady().then(() => {
  createWindow();
  createTray();
  startReminderScheduler();
  setupAutoUpdater();  // 初始化自动更新
  registerGlobalShortcuts();  // 注册全局快捷键
  
  // 启动后延迟3秒检查更新（不阻塞启动）
  setTimeout(() => {
    checkForUpdate(false);
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  unregisterGlobalShortcuts();  // 注销全局快捷键
});

app.on('window-all-closed', () => {
  stopReminderScheduler();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopReminderScheduler();
});
