import { contextBridge, ipcRenderer } from 'electron';
import { Minimize } from 'lucide-react';


contextBridge.exposeInMainWorld('electronAPI', {
  openAuthPopup: (url: string) => ipcRenderer.invoke('open-auth-popup', url),
  getImagePath: (imageName: string) => ipcRenderer.invoke('get-image-path', imageName),
  minimize: () => ipcRenderer.invoke('minimize-window'), // Changed from 'minimize' to 'minimize-window'
  close: () => ipcRenderer.invoke('close-window'), // Changed from 'close' to 'close-window'
});

ipcRenderer.on('spotify-auth-code', (_event, code) => {
  console.log('Received auth code in preload, forwarding to renderer:', code);
  window.postMessage({ type: 'spotify-auth', code: code }, '*');
});

console.log('Preload script loaded, exposed electronAPI with openAuthPopup method');