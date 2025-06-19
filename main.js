const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const { shell } = require('electron');

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

ipcMain.handle('open-docs', async () => {
  await shell.openExternal('https://docs.chathai.site');
});

ipcMain.handle('export-report', async (event) => {
  return new Promise((resolve, reject) => {
    const projectDir = getProjectDirFromArgv();
    const screenshotsDir = path.join(projectDir, 'cypress', 'screenshots');
    const htmlReport = path.join(projectDir, 'chathai-report.html');

    const cypress = spawn('npx', ['cypress', 'run', '--spec', 'cypress/e2e/*.cy.js'], {
      cwd: projectDir,
      shell: true
    });

    let output = '';
    cypress.stdout.on('data', data => output += data.toString());
    cypress.stderr.on('data', data => output += data.toString());

    cypress.on('close', () => {
      // Parse Cypress output for detailed results
      // 1. Find all spec files
      const specRegex = /Running:\s+([^\s]+\.cy\.js)[\s\S]+?(?=Running:|^\s*\(Run Finished\))/gm;
      let match;
      const specs = [];
      while ((match = specRegex.exec(output)) !== null) {
        const specName = match[1].trim();
        const specBlock = match[0];
        // Find all tests in this spec
        // 1. Parse normal test lines (passing/skipped)
        const testRegex = /^\s{4}([√×-])\s(.+)(?:\s+\(([\d.]+m?s)\))?/gm;
        const tests = [];
        let testMatch;
        while ((testMatch = testRegex.exec(specBlock)) !== null) {
          const [, statusIcon, testName, duration] = testMatch;
          let status = 'unknown';
          if (statusIcon === '√') status = 'pass';
          else if (statusIcon === '×') status = 'fail';
          else if (statusIcon === '-') status = 'skip';
          tests.push({
            name: testName.trim(),
            status,
            duration: duration || '',
            error: ''
          });
        }

        // 2. Parse Mocha-style hook failures (failures in before/after hooks)
        const failRegex = /^\s*\d+\)\s(.+?)\s+"(.+?)" hook for "(.+?)"/gm;
        let failMatch;
        while ((failMatch = failRegex.exec(specBlock)) !== null) {
          const suite = failMatch[1].trim();
          const hook = failMatch[2].trim();
          const testName = failMatch[3].trim();
          // Try to find error message after this line
          const errorMsgRegex = new RegExp(`"${hook}" hook for "${testName}":\\s*([\\s\\S]+?)(?=\\n\\s*\\d+\\)|\\n\\s*\\n|$)`);
          const errorMsgMatch = specBlock.match(errorMsgRegex);
          const error = errorMsgMatch ? errorMsgMatch[1].trim().split('\n')[0] : '';
          tests.push({
            name: `${suite} [${hook} hook for "${testName}"]`,
            status: 'fail',
            duration: '',
            error
          });
        }
        specs.push({ specName, tests });
      }

      // Recursively find all PNG screenshots
      function findAllScreenshots(dir) {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        for (const file of fs.readdirSync(dir)) {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) {
            results = results.concat(findAllScreenshots(full));
          } else if (file.endsWith('.png')) {
            results.push(full);
          }
        }
        return results;
      }
      const screenshots = findAllScreenshots(screenshotsDir);

      // Build HTML report
      let html = `
      <html>
      <head>
        <title>Chathai Test Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; color: #222; margin: 0; padding: 0; }
          .report-container { max-width: 900px; margin: 32px auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px rgba(30,40,60,0.07); padding: 32px; }
          .spec-block { margin-bottom: 32px; border-bottom: 1px solid #eee; padding-bottom: 24px; }
          .spec-title { font-size: 1.3em; font-weight: 600; margin-bottom: 12px; color: #f5a86a; }
          .test-row { display: flex; align-items: flex-start; margin-bottom: 18px; }
          .test-status { font-size: 1.4em; width: 32px; text-align: center; }
          .test-name { font-weight: 500; flex: 1; }
          .test-duration { color: #888; font-size: 0.95em; margin-left: 12px; }
          .test-error { color: #e74c3c; margin-top: 4px; font-size: 0.97em; }
          .test-screenshot { margin-top: 6px; }
          .test-screenshot img { max-width: 340px; border-radius: 6px; border: 1px solid #eee; box-shadow: 0 1px 4px rgba(0,0,0,0.06);}
          .test-pass { color: #2ecc40; }
          .test-fail { color: #e74c3c; }
          .test-skip { color: #f5a86a; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <h1>Chathai Test Report</h1>
      `;

      if (specs.length === 0) {
        html += '<div>No test results found.</div>';
      } else {
        for (const spec of specs) {
          html += `<div class="spec-block"><div class="spec-title">${spec.specName}</div>`;
          if (spec.tests.length === 0) {
            html += '<div>No tests found in this spec.</div>';
          } else {
            for (const test of spec.tests) {
              let statusIcon = '';
              let statusClass = '';
              if (test.status === 'pass') { statusIcon = '✔️'; statusClass = 'test-pass'; }
              else if (test.status === 'fail') { statusIcon = '❌'; statusClass = 'test-fail'; }
              else if (test.status === 'skip') { statusIcon = '⏭️'; statusClass = 'test-skip'; }
              else { statusIcon = '❓'; statusClass = ''; }

              // Try to find screenshot for failed test
              let screenshotHtml = '';
              if (test.status === 'fail') {
                let screenshot = null;
                const hookMatch = test.name.match(/^(.*?) \[(.*?) hook for "(.*?)"\]$/);
                if (hookMatch) {
                  // Use the original (not normalized) names with spaces
                  const suite = hookMatch[1];
                  const hook = hookMatch[2];
                  const testCase = hookMatch[3];
                  screenshot = screenshots.find(s => {
                    const fname = path.basename(s).toLowerCase();
                    return fname.includes(suite.toLowerCase())
                      && fname.includes(testCase.toLowerCase())
                      && fname.includes(`${hook.toLowerCase()} hook`)
                      && fname.includes('failed');
                  });
                  if (!screenshot) {
                    screenshot = screenshots.find(s => {
                      const fname = path.basename(s).toLowerCase();
                      return fname.includes(testCase.toLowerCase())
                        && fname.includes(`${hook.toLowerCase()} hook`)
                        && fname.includes('failed');
                    });
                  }
                } else {
                  // Normal test failure
                  screenshot = screenshots.find(s => {
                    const fname = path.basename(s).toLowerCase();
                    return fname.includes(test.name.toLowerCase());
                  });
                }
                if (screenshot) {
                  const relPath = path.relative(projectDir, screenshot).replace(/\\/g, '/');
                  screenshotHtml = `<div class="test-screenshot"><img src="${relPath}" alt="screenshot"/></div>`;
                }
              }

              html += `
                <div class="test-row">
                  <div class="test-status ${statusClass}">${statusIcon}</div>
                  <div class="test-name">
                    ${test.name}
                    ${test.duration ? `<span class="test-duration">${test.duration}</span>` : ''}
                    ${test.status === 'fail' && test.error ? `<div class="test-error">${test.error}</div>` : ''}
                    ${screenshotHtml}
                  </div>
                </div>
              `;
            }
          }
          html += `</div>`;
        }
      }

      html += `
        </div>
      </body>
      </html>
      `;
      fs.writeFileSync(htmlReport, html, 'utf-8');
      resolve('✅ Report generated: chathai-report.html');
    });
  });
});