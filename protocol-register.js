const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

// Get the path to your electron.exe
// This should point to your installed electron executable
const getElectronExePath = () => {
  // For development, use the electron from node_modules
  const devElectronPath = path.join(
    __dirname, 
    'node_modules', 
    'electron', 
    'dist', 
    'electron.exe'
  );
  
  if (fs.existsSync(devElectronPath)) {
    return devElectronPath;
  }
  
  // Try to find installed electron
  try {
    // This assumes electron is in your PATH
    const electronPath = child_process.execSync('where electron').toString().trim();
    if (fs.existsSync(electronPath)) {
      return electronPath;
    }
  } catch (e) {
    console.log('Could not find electron in PATH');
  }
  
  console.error('Could not find electron.exe. Please install it or provide a path.');
  return null;
};

// Get the path to your app.js (main process)
const getAppPath = () => {
  // This should point to your main process file
  return path.join(__dirname, 'electron', 'main.js');
};

// Register protocol handler manually (for development)
const registerProtocolHandler = () => {
  const electronPath = getElectronExePath();
  const appPath = getAppPath();
  
  if (!electronPath) {
    console.error('Error: Could not find electron executable');
    process.exit(1);
  }
  
  console.log(`Using electron at: ${electronPath}`);
  console.log(`App path: ${appPath}`);
  
  try {
    // For Windows, add registry entries
    if (process.platform === 'win32') {
      const Registry = require('winreg');
      
      // Create the main protocol key
      const protocolKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\spotify-auth'
      });
      
      protocolKey.create(() => {
        protocolKey.set('', Registry.REG_SZ, 'URL:Spotify Auth Protocol', () => {
          protocolKey.set('URL Protocol', Registry.REG_SZ, '', () => {
            
            // Create the command key
            const commandKey = new Registry({
              hive: Registry.HKCU,
              key: '\\Software\\Classes\\spotify-auth\\shell\\open\\command'
            });
            
            commandKey.create(() => {
              // The command that will be executed when the protocol is activated
              const command = `"${electronPath}" "${appPath}" "%1"`;
              commandKey.set('', Registry.REG_SZ, command, () => {
                console.log('Protocol handler registered successfully!');
              });
            });
          });
        });
      });
    } else {
      console.log('Please run this on Windows to register the protocol.');
    }
  } catch (err) {
    console.error('Error registering protocol:', err);
  }
};

// Run immediately if this script is executed directly
if (require.main === module) {
  registerProtocolHandler();
}

module.exports = { registerProtocolHandler };