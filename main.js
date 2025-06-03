const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

function getProjectDirFromArgv() {
  // Find the first argument that looks like an absolute path and is not the exe itself
  const exePath = process.execPath.toLowerCase();
  for (const arg of process.argv) {
    if (
      arg &&
      (arg.includes(':\\') || arg.startsWith('/')) && // Windows or Unix absolute path
      !arg.toLowerCase().endsWith('.exe') &&
      arg.toLowerCase() !== exePath
    ) {
      return arg;
    }
  }
  // fallback
  return process.cwd();
}

const projectDir = getProjectDirFromArgv();
console.log('Chathai UI: Using projectDir:', projectDir);
console.log('Chathai UI: projectDir =', projectDir);
console.log('Chathai UI: outputDir =', path.join(projectDir, 'cypress', 'e2e'));

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Detect dev mode by checking for the presence of the REACT_DEVELOPMENT env or process.defaultApp
  const isDev =
    process.env.ELECTRON_START_URL ||
    process.env.NODE_ENV === 'development' ||
    process.defaultApp ||
    /node_modules[\\/]electron[\\/]/.test(process.execPath);

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(app.getAppPath(), 'build', 'index.html'));
  }
}

app.whenReady().then(createWindow);

ipcMain.handle('run-chathai', async (event, excelPath) => {
  return new Promise((resolve, reject) => {
    let chathaiCli;
    if (app.isPackaged) {
      chathaiCli = path.join(process.resourcesPath, 'Chathai_OnDev', 'bin', 'chathai.js');
    } else {
      chathaiCli = path.join(__dirname, 'resources', 'Chathai_OnDev', 'bin', 'chathai.js');
    }
    // Use robust projectDir detection
    const projectDir = getProjectDirFromArgv();
    const outputDir = path.join(projectDir, 'cypress', 'e2e');
    const resolvedExcelPath = path.isAbsolute(excelPath) ? excelPath : path.join(projectDir, excelPath);
    exec(
      `node "${chathaiCli}" generate "${resolvedExcelPath}" "${outputDir}" --project-dir "${projectDir}"`,
      { cwd: projectDir },
      (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout);
      }
    );
  });
});

ipcMain.on('open-installed-app', (event, arg) => {
  exec(`"${arg}" "${projectDir}"`, { cwd: projectDir }, (err) => {
    if (err) {
      console.error('Failed to open the installed app:', err);
    }
  });
});