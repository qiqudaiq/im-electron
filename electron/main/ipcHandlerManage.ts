import { BrowserWindow, Menu, app, dialog, ipcMain, desktopCapturer } from "electron";
import {
  clearCache,
  closeWindow,
  minimize,
  showWindow,
  splashEnd,
  updateMaximize,
} from "./windowManage";
import { t } from "i18next";
import { IpcRenderToMain } from "../constants";
import { getStore } from "./storeManage";
import { changeLanguage } from "../i18n";
import fs from "fs";
import path from "path";

const store = getStore();

export const setIpcMainListener = () => {
  // 获取屏幕源 - 用于屏幕共享，在主进程中处理缩略图转换
  ipcMain.handle("get-desktop-sources", async (_, options) => {
    console.log('[IPC] get-desktop-sources called with options:', options);
    try {
      const sources = await desktopCapturer.getSources(options);
      console.log('[IPC] desktopCapturer.getSources returned:', sources?.length, 'sources');
      
      // 在主进程中安全地转换缩略图为base64
      const processedSources = sources.map(source => {
        let thumbnailDataURL = '';
        if (source.thumbnail) {
          try {
            thumbnailDataURL = source.thumbnail.toDataURL();
          } catch (error) {
            console.warn('[IPC] 缩略图转换失败:', source.name, error);
          }
        }
        
        return {
          id: source.id,
          name: source.name,
          display_id: source.display_id,
          thumbnailDataURL, // 已转换的base64字符串
          // 不传递原始的thumbnail对象，避免序列化问题
        };
      });
      
      console.log('[IPC] 处理后的屏幕源:', processedSources?.length, '个，包含缩略图');
      return processedSources;
    } catch (error) {
      console.error('[IPC] desktopCapturer.getSources error:', error);
      throw error;
    }
  });

  // 获取屏幕流 - 这个API在主进程中不能直接实现
  // 因为getUserMedia必须在渲染进程中调用
  // 所以我们返回成功标志，让渲染进程自己调用getUserMedia
  ipcMain.handle('get-screen-stream', async (_, { sourceId, constraints }) => {
    console.log('[IPC] get-screen-stream called with sourceId:', sourceId);
    
    // 主进程无法直接获取MediaStream
    // 返回sourceId给渲染进程，让它自己调用getUserMedia
    return {
      success: true,
      sourceId,
      message: '请在渲染进程中使用navigator.mediaDevices.getUserMedia'
    };
  });

  ipcMain.handle(IpcRenderToMain.clearSession, () => {
    clearCache();
  });

  // window manage  
  ipcMain.handle("changeLanguage", (_, locale) => {
    // 只保存语言设置，不重启应用
    store.set("language", locale);
    console.log('[LanguageChange] Language saved:', locale);
    return { success: true };
  });
  ipcMain.handle("main-win-ready", () => {
    splashEnd();
  });
  ipcMain.handle(IpcRenderToMain.showMainWindow, () => {
    showWindow();
  });
  ipcMain.handle(IpcRenderToMain.minimizeWindow, () => {
    minimize();
  });
  ipcMain.handle(IpcRenderToMain.maxmizeWindow, () => {
    updateMaximize();
  });
  ipcMain.handle(IpcRenderToMain.closeWindow, () => {
    closeWindow();
  });
  ipcMain.handle(IpcRenderToMain.showMessageBox, (_, options) => {
    return dialog
      .showMessageBox(BrowserWindow.getFocusedWindow(), options)
      .then((res) => res.response);
  });

  // data transfer
  ipcMain.handle(IpcRenderToMain.setKeyStore, (_, { key, data }) => {
    store.set(key, data);
  });
  ipcMain.handle(IpcRenderToMain.getKeyStore, (_, { key }) => {
    return store.get(key);
  });
  ipcMain.on(IpcRenderToMain.getKeyStoreSync, (e, { key }) => {
    e.returnValue = store.get(key);
  });
  ipcMain.handle(IpcRenderToMain.showInputContextMenu, () => {
    const menu = Menu.buildFromTemplate([
      {
        label: t("system.copy"),
        type: "normal",
        role: "copy",
        accelerator: "CommandOrControl+c",
      },
      {
        label: t("system.paste"),
        type: "normal",
        role: "paste",
        accelerator: "CommandOrControl+v",
      },
      {
        label: t("system.selectAll"),
        type: "normal",
        role: "selectAll",
        accelerator: "CommandOrControl+a",
      },
    ]);
    menu.popup({
      window: BrowserWindow.getFocusedWindow()!,
    });
  });
  ipcMain.on(IpcRenderToMain.getDataPath, (e, key: string) => {
    switch (key) {
      case "public":
        e.returnValue = global.pathConfig.publicPath;
        break;
      case "sdkResources":
        e.returnValue = global.pathConfig.sdkResourcesPath;
        break;
      case "logsPath":
        e.returnValue = global.pathConfig.logsPath;
        break;
      default:
        e.returnValue = global.pathConfig.publicPath;
        break;
    }
  });

  // 错误日志保存处理器 - 保存到项目目录
  ipcMain.handle('save-error-log-to-project', async (_, { data, fileName }) => {
    try {
      // 获取项目根目录（__dirname是electron/main目录，需要向上两级到项目根目录）
      const projectRoot = path.resolve(__dirname, '../../');
      const errorLogsDir = path.join(projectRoot, 'error_logs');
      
      // 确保错误日志目录存在
      if (!fs.existsSync(errorLogsDir)) {
        fs.mkdirSync(errorLogsDir, { recursive: true });
      }
      
      // 保存错误日志文件 - 直接覆盖，因为data已经包含了合并后的所有错误
      const filePath = path.join(errorLogsDir, fileName);
      await fs.promises.writeFile(filePath, data, 'utf8');
      
      return { success: true, filePath };
    } catch (error) {
      console.error('保存错误日志失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 错误日志读取处理器 - 从项目目录读取
  ipcMain.handle('read-error-log-from-project', async (_, { fileName }) => {
    try {
      // 获取项目根目录
      const projectRoot = path.resolve(__dirname, '../../');
      const errorLogsDir = path.join(projectRoot, 'error_logs');
      const filePath = path.join(errorLogsDir, fileName);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { success: true, data: null };
      }
      
      // 读取文件内容
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      return { success: true, data: fileContent };
    } catch (error) {
      console.error('读取错误日志失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 写入SDK日志目录的应用程序错误日志
  ipcMain.handle('write-sdk-app-error-log', async (_, { logEntry, fileName }) => {
    try {
      // 获取SDK日志目录
      const sdkLogsPath = global.pathConfig.logsPath;
      if (!fs.existsSync(sdkLogsPath)) {
        fs.mkdirSync(sdkLogsPath, { recursive: true });
      }
      
      // 追加到SDK日志目录下的应用程序错误日志文件
      const logFilePath = path.join(sdkLogsPath, fileName);
      await fs.promises.appendFile(logFilePath, logEntry + '\n', 'utf8');
      
      return { success: true, filePath: logFilePath };
    } catch (error) {
      console.error('写入SDK应用程序错误日志失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取SDK日志目录中的应用程序错误日志统计
  ipcMain.handle('get-sdk-app-error-log-stats', async () => {
    try {
      const sdkLogsPath = global.pathConfig.logsPath;
      
      if (!fs.existsSync(sdkLogsPath)) {
        return { success: true, stats: { totalFiles: 0, totalErrors: 0, files: [] } };
      }
      
      const files = await fs.promises.readdir(sdkLogsPath);
      const errorFiles = files.filter(file => file.startsWith('APP_ERRORS_') && file.endsWith('.log'));
      
      let totalErrors = 0;
      const fileStats = [];
      
      for (const file of errorFiles) {
        try {
          const filePath = path.join(sdkLogsPath, file);
          const content = await fs.promises.readFile(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim() !== '');
          const errorCount = lines.length;
          totalErrors += errorCount;
          
          const stats = await fs.promises.stat(filePath);
          
          fileStats.push({
            fileName: file,
            errorCount,
            lastUpdated: stats.mtime.toISOString(),
            size: stats.size
          });
        } catch (error) {
          console.error(`读取错误日志文件失败: ${file}`, error);
        }
      }
      
      return {
        success: true,
        stats: {
          totalFiles: errorFiles.length,
          totalErrors,
          files: fileStats.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        }
      };
    } catch (error) {
      console.error('获取SDK应用程序错误日志统计失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 读取SDK日志目录中的应用程序错误日志内容
  ipcMain.handle('read-sdk-app-error-log', async (_, { fileName }) => {
    try {
      const sdkLogsPath = global.pathConfig.logsPath;
      const filePath = path.join(sdkLogsPath, fileName);
      
      if (!fs.existsSync(filePath)) {
        return { success: true, data: null };
      }
      
      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      return { success: true, data: { lines, count: lines.length } };
    } catch (error) {
      console.error('读取SDK应用程序错误日志失败:', error);
      return { success: false, error: error.message };
    }
  });
};
