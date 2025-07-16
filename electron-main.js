const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // Preload script for IPC
    }
  });

  // Next.js local sunucusunu başlatmışsan şunu kullan:
  win.loadURL('http://localhost:3000');
  // Eğer build edilmiş statik dosyaları kullanacaksan:
  // win.loadFile(path.join(__dirname, 'frontend/out/index.html'));
}

// IPC handler to get printers
ipcMain.handle('get-printers', (event) => {
  const win = BrowserWindow.getFocusedWindow();
  return win.webContents.getPrinters();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); 