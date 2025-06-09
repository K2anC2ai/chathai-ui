const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');

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
    width: 1200,
    height: 720,
    useContentSize: true,
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

ipcMain.handle('run-chathai', async (event, selectedPath, mode) => {
  return new Promise((resolve, reject) => {
    let chathaiCli;
    if (app.isPackaged) {
      chathaiCli = path.join(process.resourcesPath, 'Chathai_OnDev', 'bin', 'chathai.js');
    } else {
      chathaiCli = path.join(__dirname, 'resources', 'Chathai_OnDev', 'bin', 'chathai.js');
    }
    const projectDir = getProjectDirFromArgv();
    const outputDir = path.join(projectDir, 'cypress', 'e2e');
    let cliCmd;
    if (mode === 'directory') {
      if (!selectedPath) {
        // No argument: use default template dir
        cliCmd = `node "${chathaiCli}" generate --project-dir "${projectDir}" --output-dir "cypress/e2e"`;
      } else {
        // Use only the directory name (relative to projectDir)
        const dirName = path.isAbsolute(selectedPath)
          ? path.relative(projectDir, selectedPath)
          : selectedPath;
        cliCmd = `node "${chathaiCli}" generate "${dirName}" --project-dir "${projectDir}" --output-dir "cypress/e2e"`;
      }
    } else {
      // Single file mode
      const resolvedExcelPath = path.isAbsolute(selectedPath)
        ? selectedPath
        : path.join(projectDir, selectedPath);
      cliCmd = `node "${chathaiCli}" generate "${resolvedExcelPath}" --project-dir "${projectDir}" --output-dir "cypress/e2e"`;
    }
    exec(
      cliCmd,
      { cwd: projectDir },
      (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout);
      }
    );
  });
});

ipcMain.handle('setDefaultTemplateDir', async (event, templateDir) => {
  return new Promise((resolve, reject) => {
    let chathaiCli;
    if (app.isPackaged) {
      chathaiCli = path.join(process.resourcesPath, 'Chathai_OnDev', 'bin', 'chathai.js');
    } else {
      chathaiCli = path.join(__dirname, 'resources', 'Chathai_OnDev', 'bin', 'chathai.js');
    }
    const projectDir = getProjectDirFromArgv();
    const cliCmd = `node "${chathaiCli}" --template-dir "${templateDir}"`;
    exec(
      cliCmd,
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

ipcMain.handle('getDefaultTemplateDir', async (event) => {
  // Read config.json from the project directory
  const projectDir = getProjectDirFromArgv();
  const configPath = path.join(projectDir, '.chathai-config.json');
  let defaultDir = 'xlsxtemplate';
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.defaultTemplateDir) {
        defaultDir = config.defaultTemplateDir;
      }
    } catch (e) {
      // ignore, fallback to xlsxtemplate
    }
  }
  return defaultDir;
});

ipcMain.handle('listTemplateFiles', async (event) => {
  const projectDir = getProjectDirFromArgv();
  const configPath = path.join(projectDir, '.chathai-config.json');
  let templateDir = 'xlsxtemplate';
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.defaultTemplateDir) {
        templateDir = config.defaultTemplateDir;
      }
    } catch (e) {
      // ignore, fallback to xlsxtemplate
    }
  }

  const fullTemplateDir = path.join(projectDir, templateDir);
  if (!fs.existsSync(fullTemplateDir)) {
    return [];
  }

  const files = fs.readdirSync(fullTemplateDir)
    .filter(file => file.endsWith('.xlsx'))
    .map(file => ({
      name: file,
      path: path.join(templateDir, file)
    }));

  return files;
});

ipcMain.handle('run-cypress-test', async (event, specPath) => {
  return new Promise((resolve, reject) => {
    // Use npx to run Cypress for the specific spec file
    const cypress = spawn('npx', ['cypress', 'run', '--spec', specPath], {
      cwd: projectDir, // Make sure projectDir is set correctly
      shell: true
    });

    let output = '';
    cypress.stdout.on('data', (data) => {
      output += data.toString();
      event.sender.send('cypress-log', data.toString()); // Stream log to renderer
    });
    cypress.stderr.on('data', (data) => {
      output += data.toString();
      event.sender.send('cypress-log', data.toString());
    });
    cypress.on('close', (code) => {
      resolve(output + `\nProcess exited with code ${code}`);
    });
    cypress.on('error', (err) => {
      reject(err.message);
    });
  });
});

ipcMain.handle('run-all-cypress-tests', async (event) => {
  return new Promise((resolve, reject) => {
    // Run all tests in cypress/e2e
    const cypress = spawn('npx', ['cypress', 'run', '--spec', 'cypress/e2e/*.cy.js'], {
      cwd: projectDir,
      shell: true
    });

    let output = '';
    cypress.stdout.on('data', (data) => {
      output += data.toString();
      event.sender.send('cypress-log', data.toString());
    });
    cypress.stderr.on('data', (data) => {
      output += data.toString();
      event.sender.send('cypress-log', data.toString());
    });
    cypress.on('close', (code) => {
      resolve(output + `\nProcess exited with code ${code}`);
    });
    cypress.on('error', (err) => {
      reject(err.message);
    });
  });
});