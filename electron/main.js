/**
 * 每日规划 - Daily Planner
 * Electron 主进程
 * 
 * @author 严辉村高斯林
 * @license MIT
 */

const { app, BrowserWindow, Notification, ipcMain, Tray, Menu, nativeImage, globalShortcut, desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let tray = null;
let reminderInterval;

// 应用版本
const APP_VERSION = '1.4.3';

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

// ==================== 文件存储 ====================
// 获取用户数据目录
const userDataPath = app.getPath('userData');
const knowledgeFilePath = path.join(userDataPath, 'knowledge-guides.json');

// 保存知识库到文件
function saveKnowledgeToFile(data) {
  try {
    fs.writeFileSync(knowledgeFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('保存知识库失败:', error);
    return { success: false, error: error.message };
  }
}

// 从文件加载知识库
function loadKnowledgeFromFile() {
  try {
    if (fs.existsSync(knowledgeFilePath)) {
      const data = fs.readFileSync(knowledgeFilePath, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('加载知识库失败:', error);
    return [];
  }
}

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
  
  // 优先使用 Gitee 更新源（国内用户更快）
  // 需要先在 Gitee Release 上传安装包
  const giteeFeedURL = 'https://gitee.com/europe-and-oceania/daily-planner/releases/download/latest';
  
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: giteeFeedURL
  });
  console.log('使用 Gitee 更新源:', giteeFeedURL);
  
  autoUpdater.checkForUpdates().catch(err => {
    console.error('Gitee 更新源失败:', err.message);
    // 回退到 GitHub
    console.log('尝试使用 GitHub 更新源...');
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'ol2421040503-jpg',
      repo: 'daily-planner'
    });
    autoUpdater.checkForUpdates().catch(err2 => {
      console.error('GitHub 更新源也失败:', err2.message);
    });
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
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
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
  today.setHours(0, 0, 0, 0);
  const reminders = [];

  anniversaries.forEach(anniversary => {
    let targetDate = new Date(today.getFullYear(), anniversary.month - 1, anniversary.day);
    targetDate.setHours(0, 0, 0, 0);
    
    if (targetDate < today) {
      targetDate = new Date(today.getFullYear() + 1, anniversary.month - 1, anniversary.day);
      targetDate.setHours(0, 0, 0, 0);
    }

    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    // 当天或提前N天内提醒
    const shouldRemind = diffDays === 0 || (diffDays > 0 && diffDays <= REMINDER_CONFIG.anniversary);

    if (shouldRemind) {
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

      // 当天或提前N天内提醒
      // diffDays = 0 表示今天，需要提醒
      // diffDays > 0 && diffDays <= reminderDays 表示提前N天内
      const shouldRemind = diffDays === 0 || (diffDays > 0 && diffDays <= reminderDays);

      if (shouldRemind) {
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
    const body = reminder.daysLeft === 0 
      ? `今天是 ${reminder.name}！` 
      : `${reminder.name} 将在 ${reminder.daysLeft} 天后到来`;
    sendNotification(title, body, { date: reminder.date });
    sentReminders.add(reminder.reminderKey);
  });

  taskReminders.forEach(reminder => {
    const priorityLabel = reminder.priority === 'high' ? '【高优先】' : 
                          reminder.priority === 'medium' ? '【中优先】' : '【低优先】';
    const title = `📋 任务提醒 ${priorityLabel}`;
    const body = reminder.daysLeft === 0 
      ? `"${reminder.text}" 今天到期！` 
      : `"${reminder.text}" 将在 ${reminder.daysLeft} 天后到期`;
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

// ==================== 文件存储 IPC ====================

// 保存知识库到文件
ipcMain.handle('save-knowledge-file', (event, data) => {
  return saveKnowledgeToFile(data);
});

// 从文件加载知识库
ipcMain.handle('load-knowledge-file', () => {
  return loadKnowledgeFromFile();
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

// ==================== 截图功能 ====================

let screenshotWindow = null;

// 开始截图
ipcMain.handle('start-screenshot', async () => {
  try {
    // 获取所有显示器
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // 获取屏幕截图
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: width * 2, height: height * 2 } // 高分辨率支持
    });
    
    if (sources.length === 0) {
      return { success: false, error: '无法获取屏幕截图' };
    }
    
    // 创建全屏透明窗口用于选择区域
    screenshotWindow = new BrowserWindow({
      fullscreen: true,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    
    // 获取所有显示器的截图
    const screenshots = sources.map(source => ({
      thumbnail: source.thumbnail.toDataURL(),
      displayId: source.display_id
    }));
    
    // 加载截图选择页面
    screenshotWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(generateScreenshotHTML(screenshots[0].thumbnail))}`);
    
    screenshotWindow.webContents.on('did-finish-load', () => {
      screenshotWindow.webContents.send('screenshot-ready', screenshots[0].thumbnail);
    });
    
    screenshotWindow.on('closed', () => {
      screenshotWindow = null;
    });
    
    return { success: true };
  } catch (error) {
    console.error('截图失败:', error);
    return { success: false, error: error.message };
  }
});

// 完成截图（裁剪并返回）
ipcMain.handle('complete-screenshot', async (event, { imageData, rect }) => {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
  }
  
  // 发送截图数据到主窗口的渲染进程
  if (mainWindow) {
    mainWindow.webContents.send('screenshot-complete', { success: true, imageData });
  }
  
  return { success: true, imageData };
});

// 取消截图
ipcMain.handle('cancel-screenshot', () => {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
  }
  return { success: true };
});

// 生成截图选择页面的 HTML
function generateScreenshotHTML(thumbnail) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          cursor: crosshair;
          overflow: hidden;
          background: transparent;
        }
        .screenshot-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-image: url('${thumbnail}');
          background-size: cover;
          background-position: top left;
        }
        .overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.3);
        }
        .selection {
          position: fixed;
          border: 2px solid #00a8ff;
          background: rgba(0, 168, 255, 0.1);
          display: none;
          pointer-events: none;
        }
        .toolbar {
          position: fixed;
          display: none;
          background: white;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          padding: 8px;
          gap: 8px;
          z-index: 1000;
        }
        .toolbar button {
          padding: 6px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .btn-confirm {
          background: #00a8ff;
          color: white;
        }
        .btn-cancel {
          background: #f0f0f0;
          color: #333;
        }
        .hint {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 18px;
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
          pointer-events: none;
          z-index: 100;
        }
        .size-info {
          position: fixed;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          pointer-events: none;
          z-index: 1000;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="screenshot-bg"></div>
      <div class="overlay"></div>
      <div class="hint">按住鼠标拖动选择截图区域，按 ESC 取消</div>
      <div class="selection"></div>
      <div class="size-info"></div>
      <div class="toolbar">
        <button class="btn-cancel" onclick="cancel()">取消</button>
        <button class="btn-confirm" onclick="confirm()">确定</button>
      </div>
      <script>
        const { ipcRenderer, desktopCapturer } = require('electron');
        const selection = document.querySelector('.selection');
        const toolbar = document.querySelector('.toolbar');
        const hint = document.querySelector('.hint');
        const sizeInfo = document.querySelector('.size-info');
        
        let isSelecting = false;
        let startX, startY;
        let rect = { x: 0, y: 0, width: 0, height: 0 };
        let scaleFactor = 1;
        
        // 获取屏幕缩放比例
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        scaleFactor = primaryDisplay.scaleFactor;
        
        document.addEventListener('mousedown', (e) => {
          isSelecting = true;
          startX = e.clientX;
          startY = e.clientY;
          selection.style.display = 'block';
          selection.style.left = startX + 'px';
          selection.style.top = startY + 'px';
          selection.style.width = '0px';
          selection.style.height = '0px';
          hint.style.display = 'none';
          sizeInfo.style.display = 'block';
        });
        
        document.addEventListener('mousemove', (e) => {
          if (!isSelecting) return;
          
          const currentX = e.clientX;
          const currentY = e.clientY;
          
          rect.x = Math.min(startX, currentX);
          rect.y = Math.min(startY, currentY);
          rect.width = Math.abs(currentX - startX);
          rect.height = Math.abs(currentY - startY);
          
          selection.style.left = rect.x + 'px';
          selection.style.top = rect.y + 'px';
          selection.style.width = rect.width + 'px';
          selection.style.height = rect.height + 'px';
          
          // 更新尺寸信息
          sizeInfo.textContent = Math.round(rect.width) + ' x ' + Math.round(rect.height);
          sizeInfo.style.left = (rect.x + rect.width / 2 - 30) + 'px';
          sizeInfo.style.top = (rect.y + rect.height + 10) + 'px';
        });
        
        document.addEventListener('mouseup', (e) => {
          if (!isSelecting) return;
          isSelecting = false;
          
          if (rect.width > 10 && rect.height > 10) {
            toolbar.style.display = 'flex';
            toolbar.style.left = (rect.x + rect.width - 150) + 'px';
            toolbar.style.top = (rect.y + rect.height + 10) + 'px';
          } else {
            resetSelection();
          }
        });
        
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            cancel();
          }
        });
        
        function resetSelection() {
          selection.style.display = 'none';
          toolbar.style.display = 'none';
          sizeInfo.style.display = 'none';
          hint.style.display = 'block';
          rect = { x: 0, y: 0, width: 0, height: 0 };
        }
        
        async function confirm() {
          if (rect.width < 10 || rect.height < 10) return;
          
          // 创建 canvas 裁剪图片
          const canvas = document.createElement('canvas');
          canvas.width = rect.width * scaleFactor;
          canvas.height = rect.height * scaleFactor;
          const ctx = canvas.getContext('2d');
          
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(
              img,
              rect.x * scaleFactor,
              rect.y * scaleFactor,
              rect.width * scaleFactor,
              rect.height * scaleFactor,
              0,
              0,
              canvas.width,
              canvas.height
            );
            
            const imageData = canvas.toDataURL('image/png');
            ipcRenderer.invoke('complete-screenshot', { imageData, rect });
          };
          img.src = document.querySelector('.screenshot-bg').style.backgroundImage.slice(5, -2);
        }
        
        function cancel() {
          ipcRenderer.invoke('cancel-screenshot');
        }
      </script>
    </body>
    </html>
  `;
}

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
