import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // We can add secure API exposure here later
});