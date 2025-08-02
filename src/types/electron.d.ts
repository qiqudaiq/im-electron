interface IElectronAPI {
  // ... existing types ...
  openNewWindow: (options: { url: string; width?: number; height?: number }) => Promise<void>;
} 