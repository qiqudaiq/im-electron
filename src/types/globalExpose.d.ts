import { Platform } from "@openim/wasm-client-sdk";

export type DataPath = "public" | "emojiData" | "sdkResources" | "logsPath";


export interface IElectronAPI {
  getDataPath: (key: DataPath) => string;
  getVersion: () => string;
  getPlatform: () => Platform;
  getSystemVersion: () => string;
  subscribe: (channel: string, callback: (...args: any[]) => void) => () => void;
  subscribeOnce: (channel: string, callback: (...args: any[]) => void) => void;
  unsubscribeAll: (channel: string) => void;
  ipcInvoke: <T = unknown>(channel: string, ...arg: any) => Promise<T>;
  ipcSendSync: <T = unknown>(channel: string, ...arg: any) => T;
  saveFileToDisk: (params: { file: File; sync?: boolean }) => Promise<string>;
  getFileByPath: (filePath: string) => Promise<File | null>;
  openNewWindow: (options: { url: string; width?: number; height?: number }) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: IElectronAPI;
    electronClipboard?: {
      writeImage: (imagePath: string) => Promise<void>;
      writeText: (text: string) => void;
    };
    electronDesktopCapturer?: {
      getSources: (options: { types: string[]; thumbnailSize?: { width: number; height: number } }) => Promise<any[]>;
    };
    electronGetUserMedia?: (constraints: any) => Promise<MediaStream>;
    userClick: (userID?: string, groupID?: string) => void;
    editRevoke: (clientMsgID: string) => void;
    screenshotPreview: (results: string) => void;
  }
}

declare module "i18next" {
  interface TFunction {
    (key: string, options?: object): string;
  }
}
