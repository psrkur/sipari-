const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('electronAPI', {
  saveConfig: (data) => {
    const configPath = path.join(__dirname, 'setup', 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  }
}); 