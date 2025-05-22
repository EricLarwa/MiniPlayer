import { app, BrowserWindow, session, ipcMain } from 'electron';
import * as path from 'path';
import { nativeImage } from 'electron';
import * as http from 'http';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserWindow | null = null;
let callbackServer: http.Server | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL("http://localhost:5173");

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (callbackServer) {
      callbackServer.close();
      callbackServer = null;
    }
  });
}

// create safe image paths
function getImagePath(imageName: string): string {
  const imageDir = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../../src/renderer/assets/imgs')
    : path.join(process.resourcesPath, 'assets/imgs');

  const imagePath = path.join(imageDir, imageName);

  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    return '';
  }

  const image = nativeImage.createFromPath(imagePath);
  if (image.isEmpty()) {
    console.error(`Failed to load image: ${imagePath}`);
    return '';
  }

  return image.toDataURL();
}

function startCallbackServer() {
  // Close any existing server
  if (callbackServer) {
    callbackServer.close();
  }

  callbackServer = http.createServer((req, res) => {
    console.log(`Callback server received request: ${req.url}`);
    
    if (req.url?.startsWith('/callback')) {
      // Parse
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      // Send response
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Spotify Authentication</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          </style>
          <script>
            window.onload = function() {
              if (${code ? 'true' : 'false'}) {
                // Send the code to the main window and close this window
                if (window.opener) {
                  window.opener.postMessage({ type: 'spotify-auth', code: "${code}" }, "*");
                }
                setTimeout(() => window.close(), 1000);
              }
            }
          </script>
        </head>
        <body>
          <h3>${code ? 'Authentication successful! You can close this window.' : 'Authentication failed. Please try again.'}</h3>
        </body>
        </html>
      `);
      
      // code to the main window
      if (code && mainWindow) {
        console.log('Sending auth code to main window');
        mainWindow.webContents.send('spotify-auth-code', code);
      }
      
      if (authWindow) {
        authWindow.close();
        authWindow = null;
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  callbackServer.listen(8888, '127.0.0.1', () => {
    console.log('Callback server listening on http://127.0.0.1:8888');
  });

  callbackServer.on('error', (err) => {
    console.error('Callback server error:', err);
  });
}

// open the auth popup window
function openAuthWindow(authUrl: string) {
  if (authWindow) {
    authWindow.close();
  }

  authWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    parent: mainWindow || undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  authWindow.loadURL(authUrl);
  
  authWindow.webContents.on('will-navigate', (event, url) => {
    console.log('Auth window will navigate to:', url);
  });
  
  authWindow.webContents.on('did-navigate', (event, url) => {
    console.log('Auth window did navigate to:', url);
  });

  authWindow.on('closed', () => {
    authWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  startCallbackServer();
  
  // Register IPC handler for opening auth popup
  ipcMain.handle('open-auth-popup', (event, authUrl) => {
    console.log('Received request to open auth popup with URL:', authUrl);
    openAuthWindow(authUrl);
    return true;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (callbackServer) {
    callbackServer.close();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    startCallbackServer();
  }
});

ipcMain.handle('get-image-path', (event, imageName) => {
  return getImagePath(imageName);
});

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});