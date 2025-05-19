import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onAuthCallback: (callback: (data: { code: string }) => void) => {
    const handler = (_event: any, data: { code: string }) => callback(data);
    ipcRenderer.on('auth-callback', handler);
    return () => {
      ipcRenderer.removeListener('auth-callback', handler);
    };
  }
});