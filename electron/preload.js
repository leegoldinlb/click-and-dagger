// The game needs no Node/Electron APIs (no fs, no IPC) — contextIsolation
// stays on with nodeIntegration off. The single flag below is the one thing
// the page genuinely can't work out for itself: that it's running as the
// desktop app rather than in a browser tab, which is what lets it drop the
// browser-only windowed/fullscreen toggle and just always fill the screen.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('CLICKDAGGER_DESKTOP', true);
