import fs from "fs";
import path from "path";
import { DataPath, IElectronAPI } from "./../../src/types/globalExpose.d";
import { contextBridge, ipcRenderer } from "electron";
import { isProd } from "../utils";
import "@openim/electron-client-sdk/lib/preload";
import { Platform } from "@openim/wasm-client-sdk";
import { clipboard, nativeImage } from 'electron';
// import sharp from 'sharp';
const getPlatform = () => {
  if (process.platform === "darwin") {
    return Platform.MacOSX;
  }
  if (process.platform === "win32") {
    return Platform.Windows;
  }
  return Platform.Linux;
};

const getDataPath = (key: DataPath) => {
  switch (key) {
    case "public":
      return isProd ? ipcRenderer.sendSync("getDataPath", "public") : "";
    case "sdkResources":
      return isProd ? ipcRenderer.sendSync("getDataPath", "sdkResources") : "";
    case "logsPath":
      return isProd ? ipcRenderer.sendSync("getDataPath", "logsPath") : "";
    default:
      return "";
  }
};

const subscribe = (channel: string, callback: (...args: any[]) => void) => {
  const subscription = (_, ...args) => callback(...args);
  ipcRenderer.on(channel, subscription);
  return () => ipcRenderer.removeListener(channel, subscription);
};

const subscribeOnce = (channel: string, callback: (...args: any[]) => void) => {
  ipcRenderer.once(channel, (_, ...args) => callback(...args));
};

const unsubscribeAll = (channel: string) => {
  ipcRenderer.removeAllListeners(channel);
};

const ipcInvoke = (channel: string, ...arg: any) => {
  return ipcRenderer.invoke(channel, ...arg);
};

const ipcSendSync = (channel: string, ...arg: any) => {
  return ipcRenderer.sendSync(channel, ...arg);
};

const getUniqueSavePath = (originalPath: string) => {
  let counter = 0;
  let savePath = originalPath;
  let fileDir = path.dirname(originalPath);
  let fileName = path.basename(originalPath);
  let fileExt = path.extname(originalPath);
  let baseName = path.basename(fileName, fileExt);

  while (fs.existsSync(savePath)) {
    counter++;
    fileName = `${baseName}(${counter})${fileExt}`;
    savePath = path.join(fileDir, fileName);
  }

  return savePath;
};

const getFileByPath = async (filePath: string) => {
  try {
    const filename = path.basename(filePath);
    const data = await fs.promises.readFile(filePath);
    return new File([data], filename);
  } catch (error) {
    console.error(error);
    return null;
  }
};

const saveFileToDisk = async ({
  file,
  sync,
}: {
  file: File;
  sync?: boolean;
}): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const saveDir = ipcRenderer.sendSync("getDataPath", "sdkResources");
  const savePath = path.join(saveDir, file.name);
  const uniqueSavePath = getUniqueSavePath(savePath);
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
  if (sync) {
    await fs.promises.writeFile(uniqueSavePath, Buffer.from(arrayBuffer));
  } else {
    fs.promises.writeFile(uniqueSavePath, Buffer.from(arrayBuffer));
  }
  return uniqueSavePath;
};

const Api: IElectronAPI = {
  getDataPath,
  getVersion: () => process.version,
  getPlatform,
  getSystemVersion: process.getSystemVersion,
  subscribe,
  subscribeOnce,
  unsubscribeAll,
  ipcInvoke,
  ipcSendSync,
  getFileByPath,
  saveFileToDisk,
  openNewWindow: (options: { url: string; width?: number; height?: number }) =>
    ipcRenderer.invoke('open-new-window', options)
};
const loadImageFromUrl = async (url) => {
  // console.log('test_copy loadImageFromUrl', url);
  // const imgtype = url.split('.')[url.split('.').length - 1];
  // console.log('test_copy imgtype', imgtype);

  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  const image = nativeImage.createFromBuffer(Buffer.from(buffer));

  if (!url.toLowerCase().endsWith('.webp')) {
    // clipboard.writeImage(image);
    return image;
  }
  const pngDataUrl = image.toDataURL();
  const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, "");
  const pngBuffer = Buffer.from(base64Data, 'base64');

  //  const pngBuffer = await sharp(Buffer.from(buffer))
  //     .toFormat('png')
  //     .toBuffer();
  // const imgName = `${uuidv4()}_temp_image.png`;
  // // const appPath = `await ipcRenderer.invoke('get-path', 'temp')`;
  // const appPath = await ipcRenderer.invoke('get-path', 'temp');
  // console.log('test_copy loadImageFromUrl appPath');

  // const tempPath = path.join(appPath, imgName);
  // const img = await new Promise((resolve, reject) => { 
  //   setTimeout(() => { resolve(fs.writeFileSync(tempPath, Buffer.from(buffer))); }, 500);
  // });

  // return nativeImage.createFromPath(img);
  return nativeImage.createFromBuffer(Buffer.from(pngBuffer));
}

// contextBridge.exposeInMainWorld('electronAPI', {
//   getPath: (name) => ipcRenderer.invoke('get-path', name) // 通过IPC代理
// });

contextBridge.exposeInMainWorld("electronAPI", Api);

// 向渲染进程暴露安全的剪贴板方法
contextBridge.exposeInMainWorld('electronClipboard', {
  writeImage: async (imagePath) => {
    const image = await loadImageFromUrl(imagePath);
    clipboard.writeImage(image);
  },
  writeText: (text) => clipboard.writeText(text)
});

// 向渲染进程暴露屏幕共享API - 通过IPC调用主进程
contextBridge.exposeInMainWorld('electronDesktopCapturer', {
  getSources: async (options: any) => {
    try {
      const sources = await ipcRenderer.invoke('get-desktop-sources', options);
      return sources;
    } catch (error) {
      console.error('[Preload] IPC getSources error:', error);
      throw error;
    }
  }
});

// 确保navigator.mediaDevices在Electron中可用
const setupNavigatorMediaDevices = () => {
  
  // 确保navigator存在
  if (!window.navigator) {
    (window as any).navigator = {};
  }
  
  // 确保mediaDevices存在
  if (!window.navigator.mediaDevices) {
    (window.navigator as any).mediaDevices = {};
  }
  
  // 检查原生getUserMedia是否存在
  const originalGetUserMedia = (window.navigator as any).mediaDevices.getUserMedia;
  
  // 设置getUserMedia方法
  (window.navigator as any).mediaDevices.getUserMedia = async (constraints: any) => {
    
    // 如果是屏幕共享请求
    if (constraints?.video?.mandatory?.chromeMediaSource === 'desktop') {
      
      // 在Electron中，原生的getUserMedia应该支持desktop capture
      if (originalGetUserMedia) {
        return await originalGetUserMedia.call(window.navigator.mediaDevices, constraints);
      } else {
        // 如果没有原生getUserMedia，尝试使用webkitGetUserMedia
        const webkit = (window.navigator as any).webkitGetUserMedia;
        if (webkit) {
          return new Promise((resolve, reject) => {
            webkit.call(window.navigator, constraints, resolve, reject);
          });
        } else {
          throw new Error('getUserMedia not available in this Electron version');
        }
      }
    } else {
      // 非屏幕共享请求，使用原生方法
      if (originalGetUserMedia) {
        return await originalGetUserMedia.call(window.navigator.mediaDevices, constraints);
      } else {
        throw new Error('getUserMedia not available');
      }
    }
  };
  
};

// 立即设置，同时在DOM加载后再次确保
setupNavigatorMediaDevices();

// 在DOM加载完成后再次检查
document.addEventListener('DOMContentLoaded', () => {
  if (!window.navigator?.mediaDevices?.getUserMedia) {
    setupNavigatorMediaDevices();
  } 
});


