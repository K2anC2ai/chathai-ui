const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('chathaiAPI', {
  runChathai: (selectedPath, mode, options) => ipcRenderer.invoke('run-chathai', selectedPath, mode, options),
  setDefaultTemplateDir: (dir) => ipcRenderer.invoke('setDefaultTemplateDir', dir),
  getDefaultTemplateDir: () => ipcRenderer.invoke('getDefaultTemplateDir'),
  listTemplateFiles: () => ipcRenderer.invoke('listTemplateFiles'),
  runCypressTest: (specPath) => ipcRenderer.invoke('run-cypress-test', specPath),
  onCypressLog: (callback) => ipcRenderer.on('cypress-log', (_, data) => callback(data)),
  runAllCypressTests: () => ipcRenderer.invoke('run-all-cypress-tests'),
  runTestsWithReport: (specPathOrNull) => ipcRenderer.invoke('run-tests-with-report', specPathOrNull),
  openDocs: () => ipcRenderer.invoke('open-docs'),
  exportReport: () => ipcRenderer.invoke('export-report'),
  validateExcel: (excelPath) => ipcRenderer.invoke('validate-excel', excelPath),
  createTemplate: (fileName) => ipcRenderer.invoke('create-template', fileName)
});