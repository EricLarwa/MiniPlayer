import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { join } from 'path';
import { URL } from 'url';
import * as path from 'path';
import * as fs from 'fs';

ipcMain.on('open-auth-popup', (event, authUrl) => {
  const authWindow = new BrowserWindow({
    width: 450,
    height: 730,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  authWindow.loadURL(authUrl);
});


let mainWindow: BrowserWindow | null = null;

// Debug logging function
function log(...args: any[]) {
  console.log('[Electron Main]', ...args);
  
  // Optional: Log to file for persistent debugging
  const logPath = path.join(app.getPath('userData'), 'electron-debug.log');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - ${args.join(' ')}\n`);
}

// Register the custom protocol
if (process.defaultApp) {
  log('Running in development mode');
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('spotify-auth', process.execPath, [
      process.argv[1],
      join(__dirname),
    ]);
  }
} else {
  log('Running in production mode');
  app.setAsDefaultProtocolClient('spotify-auth');
}

function createWindow() {
  log('Creating main window');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      // Add this to see console.log from renderer process
      devTools: true,
    },
    // Show loading state while waiting for content
    backgroundColor: '#2e2c29',
  });

  // Debugging: log server URL
  const serverUrl = 'http://localhost:5173';
  log(`Attempting to load: ${serverUrl}`);

  // In development mode, load the dev server URL
  mainWindow.loadURL(serverUrl)
    .then(() => {
      log('Successfully loaded the app');
      mainWindow?.webContents.openDevTools(); // Always open DevTools for debugging
    })
    .catch((err) => {
      log('Failed to load the app:', err);
      
      // Show error in window
      mainWindow?.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Error Loading App</title></head>
          <body style="background: #333; color: #fff; font-family: sans-serif; padding: 2rem;">
            <h1>Error Loading Application</h1>
            <p>Could not connect to development server at ${serverUrl}</p>
            <pre>${err.toString()}</pre>
            <p>Make sure Vite dev server is running with: <code>npm run dev</code></p>
            <button onclick="window.location.reload()">Try Again</button>
          </body>
        </html>
      `);
    });

  // Debug navigation events
  mainWindow.webContents.on('did-start-loading', () => {
    log('Started loading a page');
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    log('Finished loading page');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log('Failed to load:', errorCode, errorDescription);
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    log('External link clicked:', url);
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Intercept navigation events to handle OAuth redirect
  mainWindow.webContents.on('will-navigate', (event, url) => {
    log('Navigation detected:', url);
    
    if (url.startsWith('http://127.0.0.1:5173/callback') || 
        url.startsWith('http://localhost:5173/callback')) {
      event.preventDefault();
      log('Intercepted callback URL');
      
      // Extract the code from the URL
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      
      // Send the code to the renderer process
      if (code && mainWindow) {
        log('Sending auth code to renderer');
        mainWindow.webContents.send('auth-callback', { code });
      }
    }
  });
}

// Handle the custom protocol
app.on('open-url', (event, url) => {
  event.preventDefault();
  log('Custom protocol URL received:', url);
  
  if (url.startsWith('spotify-auth://')) {
    // Extract the authorization code
    const urlParts = new URL(url);
    const code = urlParts.searchParams.get('code');
    
    log('Auth code extracted:', code ? '[PRESENT]' : '[MISSING]');
    
    if (code && mainWindow) {
      mainWindow.webContents.send('auth-callback', { code });
    }
  }
});

// Enable remote debugging message passing
ipcMain.on('renderer-log', (event, ...args) => {
  log('From Renderer:', ...args);
});

app.whenReady().then(() => {
  log('App is ready, creating window');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      log('Reactivating app, creating new window');
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    log('Quitting app');
    app.quit();
  }
});