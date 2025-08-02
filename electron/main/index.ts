import { app, ipcMain, BrowserWindow, dialog } from "electron";
import { join } from "node:path";
import { createMainWindow } from "./windowManage";
import { createTray } from "./trayManage";
import { setIpcMainListener } from "./ipcHandlerManage";
import { setAppGlobalData, setAppListener, setSingleInstance } from "./appManage";
import createAppMenu from "./menuManage";
import { isLinux } from "../utils";
import { getLogger } from "../utils/log";
import { initI18n } from "../i18n";
import fs from "fs";
import path from "path";

// 保存主进程错误到本地文件
const saveMainProcessError = (type: string, error: any) => {
  try {
    const errorInfo = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      type: 'electron',
      level: 'error',
      processType: 'main',
      errorType: type,
      message: error?.message || String(error),
      stack: error?.stack,
      version: process.version,
      platform: process.platform,
      extra: {
        errorName: error?.name,
        code: error?.code,
        errno: error?.errno,
        syscall: error?.syscall,
        path: error?.path
      }
    };

    // 获取项目根目录并确保错误日志目录存在
    const projectRoot = path.resolve(__dirname, '../../');
    const errorLogsDir = path.join(projectRoot, 'error_logs');
    if (!fs.existsSync(errorLogsDir)) {
      fs.mkdirSync(errorLogsDir, { recursive: true });
    }

    // 保存错误日志文件
    const fileName = `main_process_errors_${new Date().toISOString().split('T')[0]}.json`;
    const filePath = path.join(errorLogsDir, fileName);

    let existingErrors = [];
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        existingErrors = data.errors || [];
      } catch {
        existingErrors = [];
      }
    }

    existingErrors.unshift(errorInfo);
    
    // 限制错误数量
    if (existingErrors.length > 1000) {
      existingErrors.splice(1000);
    }

    const errorData = {
      timestamp: new Date().toISOString(),
      count: existingErrors.length,
      errors: existingErrors
    };

    fs.writeFileSync(filePath, JSON.stringify(errorData, null, 2), 'utf8');
  } catch (saveError) {
    console.error('保存主进程错误失败:', saveError);
  }
};

// 全局捕获未处理异常，防止 Electron 弹框
process.on('uncaughtException', (error) => {
  console.error('主进程未捕获异常:', error);
  // 保存错误到本地文件
  saveMainProcessError('uncaughtException', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('主进程未处理的Promise拒绝:', reason);
  // 保存错误到本地文件
  saveMainProcessError('unhandledRejection', reason);
});

// 提高主进程和渲染进程最大可用内存到 4096MB
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// 配置日志
const logger = getLogger(join(app.getPath("userData"), `/FreeChatData/logs`));
logger.info('Application starting...');

// 重定向控制台输出到日志文件
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  originalConsoleLog.apply(console, args);
  logger.info(args.join(' '));
};

console.error = (...args) => {
  originalConsoleError.apply(console, args);
  logger.error(args.join(' '));
};

console.warn = (...args) => {
  originalConsoleWarn.apply(console, args);
  logger.warn(args.join(' '));
};

const init = () => {
  initI18n();
  createMainWindow();
  createAppMenu();
  createTray();
};

setAppGlobalData();
setIpcMainListener();
setSingleInstance();
setAppListener(init);

app.whenReady().then(() => {
  isLinux ? setTimeout(init, 300) : init();
});

ipcMain.handle('get-path', (event, name) => {
  return app.getPath(name); // 返回系统路径
});


ipcMain.handle('open-new-window', async (_, { url, width, height }) => {
  // const showMessage = (title: string, message: string) => {
  //   dialog.showMessageBox({
  //     type: 'info',
  //     title,
  //     message,
  //     buttons: ['确定']
  //   });
  // };

  // 判断是否为开发环境
  const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
  // showMessage('调试信息', `Opening new window with options: ${JSON.stringify({ url, width, height })}\nIs Development: ${isDev}`);
  
  // 获取主窗口
  const mainWindow = BrowserWindow.getAllWindows()[0];
  // showMessage('调试信息', `Main window: ${mainWindow ? 'exists' : 'not found'}`);
  
  // 创建新窗口
  const win = new BrowserWindow({
    width: width || 1600,
    height: height || 1000,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js')
    }
  });


    // 自定义 User-Agent
    // win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    //   details.requestHeaders['User-Agent'] = 'MyIMClient/1.0.0 ElectronApp';
    //   callback({ cancel: false, requestHeaders: details.requestHeaders });
    // });
  
  // 构建完整的 URL
  const baseUrl = process.env.VITE_DEV_SERVER_URL || 'file://' + join(__dirname, '../../dist/index.html');
  
  // 处理 URL 格式，移除开头的 /#/ 或 /
  const formattedUrl = url.replace(/^\/#\/|\//, '');
  const fullUrl = isDev
    ? `${baseUrl}${url}`
    : `file://${join(__dirname, '../../dist/index.html')}#/${formattedUrl}`;
  
  // showMessage('URL信息', `Base URL: ${baseUrl}\nFormatted URL: ${formattedUrl}\nFull URL: ${fullUrl}`);
  
  try {
    await win.loadURL(fullUrl);
    // showMessage('成功', 'URL loaded successfully');
    
    win.focus();
    
    win.on('closed', () => {
      mainWindow.focus();
    });
    
    return { success: true };
  } catch (error) {
    // showMessage('错误', `Failed to load URL: ${error}`);
    win.close();
    throw error;
  }
});
