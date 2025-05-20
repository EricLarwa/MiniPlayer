// preload.js - This file exposes selected Electron APIs to the renderer
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
interface ElectronIpcRenderer {
  send: (channel: string, data?: unknown) => void;
  on: (channel: string, func: (...args: unknown[]) => void) => (() => void) | undefined;
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
        const validChannels = ['start-auth'];
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, data);
        }
      },
      on: (channel: string, func: (...args: unknown[]) => void): (() => void) | undefined => {
        const validChannels = ['auth-callback'];
        if (validChannels.includes(channel)) {
          // Deliberately strip event as it includes `sender` 
          const subscription = (event: Electron.IpcRendererEvent, ...args: unknown[]) => func(...args);
          ipcRenderer.on(channel, subscription);
          
          // Return a function to remove the listener
          return () => {
            ipcRenderer.removeListener(channel, subscription);
          };
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