const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    version: process.env.npm_package_version || '1.0.0',
});
