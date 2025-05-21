import {app, BrowserWindow, ipcMain} from 'electron';
import path from 'path';

console.log("Preload path:", path.join(__dirname, 'preload.js'));

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://localhost:5173'); // Vite dev server URL

}
app.whenReady().then(createWindow)

ipcMain.on('open-auth-popup', (event, authUrl) => {
  const authWindow = new BrowserWindow({
    width: 450,
    height: 7300,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  authWindow.loadURL(authUrl);
});