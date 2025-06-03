const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chathaiAPI', {
  runChathai: (excelPath) => ipcRenderer.invoke('run-chathai', excelPath)
});