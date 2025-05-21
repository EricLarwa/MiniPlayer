import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose the function to open authentication popup
  openAuthPopup: (url: string) => ipcRenderer.invoke('open-auth-popup', url)
});

// Listen for the auth code from the main process and forward it to the renderer
ipcRenderer.on('spotify-auth-code', (_event, code) => {
  console.log('Received auth code in preload, forwarding to renderer:', code);
  
  // Post the code to the window as a message event
  window.postMessage({ type: 'spotify-auth', code: code }, '*');
});

console.log('Preload script loaded, exposed electronAPI with openAuthPopup method');