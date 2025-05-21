// preload.js - This file exposes selected Electron APIs to the renderer
import { contextBridge, ipcRenderer } from 'electron';

interface ElectronIpcRenderer {
  send: (channel: string, data?: unknown) => void;
  on: (channel: string, func: (...args: unknown[]) => void) => (() => void);
  off: (channel: string, func: (...args: unknown[]) => void) => void;
  removeListener: (channel: string, func: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

interface ElectronApi {
  ipcRenderer: ElectronIpcRenderer;
}

contextBridge.exposeInMainWorld('electronAPI', {
  openAuthPopup: (url: string) => ipcRenderer.send('open-auth-popup', url)
});

contextBridge.exposeInMainWorld(
  'electron',
  {
    ipcRenderer: {
      send: (channel: string, data?: unknown): void => {
        // Whitelist channels to ensure security
        const validChannels = ['start-auth', 'open-auth-popup'];
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data);
        }
      },
      on: (channel: string, func: (...args: unknown[]) => void): (() => void) => {
        const validChannels = ['auth-callback'];
        if (validChannels.includes(channel)) {
          const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => func(event, ...args);
          ipcRenderer.on(channel, subscription);

          return () => {
            ipcRenderer.removeListener(channel, subscription);
          }
        }
        return () => {};
      },

      off: (channel: string, func: (...args: unknown[]) => void): void => {
        const validChannels = ['auth-callback'];
        if (validChannels.includes(channel)) {
          ipcRenderer.off(channel, func);
        }
      },
      removeListener: (channel: string, func: (...args: unknown[]) => void): void => {
        const validChannels = ['auth-callback'];
        if (validChannels.includes(channel)) {
          ipcRenderer.removeListener(channel, func as any);
        }
      },
      // Remove all listeners for the specified channel
      removeAllListeners: (channel: string): void => {
        const validChannels = ['auth-callback'];
        if (validChannels.includes(channel)) {
          ipcRenderer.removeAllListeners(channel);
        }
      }
    } as ElectronIpcRenderer
  } as ElectronApi
);

console.log('Preload script loaded');
console.log("conetextzBridge?", typeof contextBridge);