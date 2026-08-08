'use strict';
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Customizes the native "About Click and Dagger" panel (the role:'about'
// menu item below opens this) — otherwise it shows Electron's own generic
// name/icon/version instead of ours.
app.setAboutPanelOptions({
  applicationName: 'Click and Dagger',
  applicationVersion: app.getVersion(),
  version: app.getVersion(),
  copyright: 'Copyright Lee and Guy Goldin 2026',
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: true,
    title: 'Click and Dagger',
    icon: path.join(__dirname, 'icon.icns'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // The game/editor call window.open(...) (SAVE & PLAY, PLAY EPISODE) and use
  // target="_blank" links (HELP) expecting a normal browser's "new tab"
  // behavior. Electron has no tabs — left alone, each of these would spawn a
  // brand-new default-sized, non-fullscreen BrowserWindow with none of the
  // setup above, which is exactly the "opens in another window" bug and
  // breaks the always-fullscreen desktop experience. Redirect every such
  // navigation into this same window instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    win.loadURL(url);
    return { action: 'deny' };
  });

  const menu = Menu.buildFromTemplate([
    {
      label: 'Click and Dagger',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
