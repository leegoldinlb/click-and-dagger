// The game needs almost no Node/Electron APIs — contextIsolation stays on
// with nodeIntegration off, and the two things below are the whole bridge.
//
// CLICKDAGGER_DESKTOP: the one fact the page genuinely can't work out for
// itself — that it's running as the desktop app rather than in a browser tab,
// which is what lets it drop the browser-only windowed/fullscreen toggle and
// just always fill the screen.
//
// CLICKDAGGER_QUIT: the app runs fullscreen with no window chrome, so without
// this the only way out is the menu bar or Cmd-Q. A one-way send, not an
// invoke — there is no reply to wait for.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('CLICKDAGGER_DESKTOP', true);
contextBridge.exposeInMainWorld('CLICKDAGGER_QUIT', () => ipcRenderer.send('clickdagger:quit'));
