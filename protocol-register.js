const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

const getElectronExePath = () => {
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
  
  try {
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

const getAppPath = () => {
  return path.join(__dirname, 'electron', 'main.js');
};

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
    if (process.platform === 'win32') {
      const Registry = require('winreg');
      
      const protocolKey = new Registry({
        hive: Registry.HKCU,
        key: '\\Software\\Classes\\spotify-auth'
      });
      
      protocolKey.create(() => {
        protocolKey.set('', Registry.REG_SZ, 'URL:Spotify Auth Protocol', () => {
          protocolKey.set('URL Protocol', Registry.REG_SZ, '', () => {
            
            const commandKey = new Registry({
              hive: Registry.HKCU,
              key: '\\Software\\Classes\\spotify-auth\\shell\\open\\command'
            });
            
            commandKey.create(() => {
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

if (require.main === module) {
  registerProtocolHandler();
}

module.exports = { registerProtocolHandler };