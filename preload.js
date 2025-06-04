const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chathaiAPI', {
  runChathai: (selectedPath, mode) => ipcRenderer.invoke('run-chathai', selectedPath, mode),
  setDefaultTemplateDir: (dir) => ipcRenderer.invoke('setDefaultTemplateDir', dir),
  getDefaultTemplateDir: () => ipcRenderer.invoke('getDefaultTemplateDir')
});