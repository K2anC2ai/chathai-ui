const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('chathaiAPI', {
  runChathai: (selectedPath, mode) => ipcRenderer.invoke('run-chathai', selectedPath, mode),
  setDefaultTemplateDir: (dir) => ipcRenderer.invoke('setDefaultTemplateDir', dir),
  getDefaultTemplateDir: () => ipcRenderer.invoke('getDefaultTemplateDir'),
  listTemplateFiles: () => ipcRenderer.invoke('listTemplateFiles'),
  runCypressTest: (specPath) => ipcRenderer.invoke('run-cypress-test', specPath),
  onCypressLog: (callback) => ipcRenderer.on('cypress-log', (_, data) => callback(data)),
  runAllCypressTests: () => ipcRenderer.invoke('run-all-cypress-tests'),
  openDocs: () => ipcRenderer.invoke('open-docs')
});