const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const configPath = path.join(__dirname, 'setup', 'config.json');
  if (!fs.existsSync(configPath)) {
    mainWindow.loadFile(path.join(__dirname, 'setup', 'setup.html'));
  } else {
    // Backend'i başlat
    backendProcess = spawn('node', [path.join(__dirname, 'backend', 'server.js')], {
      env: { ...process.env, CONFIG_PATH: configPath }
    });
    backendProcess.stdout.on('data', data => console.log(`[backend]: ${data}`));
    backendProcess.stderr.on('data', data => console.error(`[backend]: ${data}`));

    // Next.js build edilmişse:
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'out', 'index.html'));
    // Geliştirme için:
    // mainWindow.loadURL('http://localhost:3000');
  }
}



app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
}); 