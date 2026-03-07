const { app, BrowserWindow, shell, Menu, Tray, dialog, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');

// The public URL of your frontend (Vercel deployment)
// Change this to your actual Vercel URL after deployment
const PRODUCTION_URL = 'https://ruraltrust-ai.vercel.app';
// Local dev URL (used when running with --dev flag)
const DEV_URL = 'http://localhost:3000';

let mainWindow;
let splashWindow;
let tray;
const isDev = process.argv.includes('--dev');

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 500,
        height: 350,
        frame: false,
        resizable: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    splashWindow.loadFile(path.join(__dirname, 'assets', 'splash.html'));
    splashWindow.center();
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        title: 'RuralTrust AI',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
        },
        titleBarStyle: 'default',
        backgroundColor: '#0f172a',
    });

    const appUrl = isDev ? DEV_URL : PRODUCTION_URL;

    mainWindow.loadURL(appUrl);

    // Show window when ready, close splash
    mainWindow.once('ready-to-show', () => {
        // Give splash a moment to show
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
                splashWindow = null;
            }
            mainWindow.show();
            mainWindow.focus();
        }, 2000);
    });

    // Handle load errors - show offline page
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            splashWindow = null;
        }
        mainWindow.loadFile(path.join(__dirname, 'assets', 'offline.html'));
        mainWindow.show();
    });

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    setupMenu();
}

function setupMenu() {
    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => mainWindow && mainWindow.reload(),
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
                    click: () => app.quit(),
                },
            ],
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Fullscreen',
                    accelerator: 'F11',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.setFullScreen(!mainWindow.isFullScreen());
                        }
                    },
                },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        if (mainWindow) {
                            const currentZoom = mainWindow.webContents.getZoomFactor();
                            mainWindow.webContents.setZoomFactor(Math.min(currentZoom + 0.1, 2.0));
                        }
                    },
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        if (mainWindow) {
                            const currentZoom = mainWindow.webContents.getZoomFactor();
                            mainWindow.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 0.5));
                        }
                    },
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => mainWindow && mainWindow.webContents.setZoomFactor(1.0),
                },
                { type: 'separator' },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'F12',
                    click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
                },
            ],
        },
        {
            label: 'Navigate',
            submenu: [
                {
                    label: 'Home',
                    click: () => mainWindow && mainWindow.loadURL(isDev ? DEV_URL : PRODUCTION_URL),
                },
                {
                    label: 'Back',
                    accelerator: 'Alt+Left',
                    click: () => mainWindow && mainWindow.webContents.canGoBack() && mainWindow.webContents.goBack(),
                },
                {
                    label: 'Forward',
                    accelerator: 'Alt+Right',
                    click: () => mainWindow && mainWindow.webContents.canGoForward() && mainWindow.webContents.goForward(),
                },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Open in Browser',
                    click: () => shell.openExternal(PRODUCTION_URL),
                },
                { type: 'separator' },
                {
                    label: 'About RuralTrust AI',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About RuralTrust AI',
                            message: 'RuralTrust AI',
                            detail: 'Version 1.0.0\nIntelligent Rural Complaint Management System\n\nPowered by AI for better rural governance.',
                            buttons: ['OK'],
                            icon: path.join(__dirname, 'assets', 'icon.png'),
                        });
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

// App lifecycle
app.whenReady().then(() => {
    createSplashWindow();
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new windows
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});
