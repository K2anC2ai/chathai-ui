const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const { shell } = require('electron');

// Handle Squirrel events (Windows installer) - prevent auto-launch after install
if (require('electron-squirrel-startup')) {
  app.quit();
  process.exit(0);
}

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

ipcMain.handle('run-chathai', async (event, selectedPath, mode, options = {}) => {
  return new Promise((resolve, reject) => {
    let chathaiCli;
    if (app.isPackaged) {
      chathaiCli = path.join(process.resourcesPath, 'Chathai_OnDev', 'bin', 'chathai.js');
    } else {
      chathaiCli = path.join(__dirname, 'resources', 'Chathai_OnDev', 'bin', 'chathai.js');
    }
    const projectDir = getProjectDirFromArgv();
    const outputDir = options.outputDir && options.outputDir.trim()
      ? options.outputDir.trim()
      : 'cypress/e2e';
    const ddtEnabled = !!options.ddtEnabled;
    const fixtureName = (options.fixtureName || '').trim();
    let cliCmd;
    if (mode === 'directory') {
      if (!selectedPath) {
        // No argument: use default template dir
        cliCmd = `node "${chathaiCli}" generate --project-dir "${projectDir}" --output-dir "${outputDir}"`;
      } else {
        // Use only the directory name (relative to projectDir)
        const dirName = path.isAbsolute(selectedPath)
          ? path.relative(projectDir, selectedPath)
          : selectedPath;
        cliCmd = `node "${chathaiCli}" generate "${dirName}" --project-dir "${projectDir}" --output-dir "${outputDir}"`;
      }
    } else {
      // Single file mode
      const resolvedExcelPath = path.isAbsolute(selectedPath)
        ? selectedPath
        : path.join(projectDir, selectedPath);
      cliCmd = `node "${chathaiCli}" generate "${resolvedExcelPath}" --project-dir "${projectDir}" --output-dir "${outputDir}"`;
    }
    if (ddtEnabled) {
      cliCmd += fixtureName ? ` --ddt ${fixtureName}` : ` --ddt`;
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

ipcMain.handle('validate-excel', async (event, excelPath) => {
  return new Promise((resolve, reject) => {
    let chathaiCli;
    if (app.isPackaged) {
      chathaiCli = path.join(process.resourcesPath, 'Chathai_OnDev', 'bin', 'chathai.js');
    } else {
      chathaiCli = path.join(__dirname, 'resources', 'Chathai_OnDev', 'bin', 'chathai.js');
    }
    const projectDir = getProjectDirFromArgv();
    const resolvedExcelPath = path.isAbsolute(excelPath) ? excelPath : path.join(projectDir, excelPath);
    const cliCmd = `node "${chathaiCli}" --validate "${resolvedExcelPath}"`;
    exec(cliCmd, { cwd: projectDir }, (error, stdout, stderr) => {
      if (error) return reject(stderr || error.message);
      resolve(stdout);
    });
  });
});

ipcMain.handle('create-template', async (event, fileName) => {
  try {
    const projectDir = getProjectDirFromArgv();
    const configPath = path.join(projectDir, '.chathai-config.json');
    let templateDir = 'xlsxtemplate';
    if (fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (cfg.defaultTemplateDir) templateDir = cfg.defaultTemplateDir;
      } catch {}
    }
    const destDir = path.join(projectDir, templateDir);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const defaultTplRelative = path.join('Chathai_OnDev', 'xlsxtemplate', 'chathai-templateV.1.0.0.xlsx');
    const srcTemplate = app.isPackaged
      ? path.join(process.resourcesPath, defaultTplRelative)
      : path.join(__dirname, 'resources', defaultTplRelative);

    const safeName = (fileName && fileName.trim()) ? fileName.trim() : 'my-template.xlsx';
    const destPath = path.join(destDir, safeName.endsWith('.xlsx') ? safeName : `${safeName}.xlsx`);
    fs.copyFileSync(srcTemplate, destPath);
    return `✅ Template created at ${destPath}`;
  } catch (e) {
    return Promise.reject(e.message || String(e));
  }
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

// Run tests (all or single spec) and return structured results + screenshot paths
ipcMain.handle('run-tests-with-report', async (event, specPathOrNull) => {
  return new Promise((resolve, reject) => {
    const args = ['cypress', 'run', '--config', 'video=true'];
    if (specPathOrNull) args.push('--spec', specPathOrNull);
    const cypress = spawn('npx', args, { cwd: projectDir, shell: true });
    let output = '';
    cypress.stdout.on('data', (data) => {
      output += data.toString();
      event.sender.send('cypress-log', data.toString());
    });
    cypress.stderr.on('data', (data) => {
      output += data.toString();
      event.sender.send('cypress-log', data.toString());
    });
    cypress.on('close', () => {
      // Parse specs/tests (reuse logic similar to export-report)
      const specRegex = /Running:\s+([^\s]+\.cy\.js)[\s\S]+?(?=Running:|^\s*\(Run Finished\))/gm;
      let match;
      const specs = [];
      while ((match = specRegex.exec(output)) !== null) {
        const specName = match[1].trim();
        const specBlock = match[0];
        const tests = [];
        const symRe = /^\s{4}([√×\-✓✖])\s(.+?)(?:\s+\(([\d.]+m?s)\))?\s*$/gm;
        let t;
        while ((t = symRe.exec(specBlock)) !== null) {
          const [, icon, name, dur] = t;
          let status = icon === '√' || icon === '✓' ? 'pass' : icon === '×' || icon === '✖' ? 'fail' : 'skip';
          tests.push({ name: name.trim(), status, duration: dur || '', error: '' });
        }
        const numFailRe = /^\s+\d+\)\s(.+?)\s*$/gm;
        let nf;
        while ((nf = numFailRe.exec(specBlock)) !== null) {
          const name = nf[1].trim();
          if (!tests.find(x => x.name === name)) tests.push({ name, status: 'fail', duration: '', error: '' });
        }
        // Hook failures
        const failRegex = /^\s*\d+\)\s(.+?)\s+"(.+?)" hook for "(.+?)"/gm;
        let f;
        while ((f = failRegex.exec(specBlock)) !== null) {
          const suite = f[1].trim();
          const hook = f[2].trim();
          const testName = f[3].trim();
          tests.push({ name: `${suite} [${hook} hook for "${testName}"]`, status: 'fail', duration: '', error: '' });
        }
        specs.push({ specName, tests });
      }
      // Find screenshots
      function findAllScreenshots(dir) {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        for (const file of fs.readdirSync(dir)) {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) results = results.concat(findAllScreenshots(full));
          else if (file.endsWith('.png')) results.push(full);
        }
        return results;
      }
      const screenshotsDir = path.join(projectDir, 'cypress', 'screenshots');
      const screenshotsAbs = findAllScreenshots(screenshotsDir);
      const screenshotsRel = screenshotsAbs.map(p => path.relative(projectDir, p).replace(/\\/g, '/'));
      const screenshotsUris = screenshotsAbs.map(p => 'file://' + p.replace(/\\/g, '/'));
      // Find videos
      function findAllVideos(dir) {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        for (const file of fs.readdirSync(dir)) {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) results = results.concat(findAllVideos(full));
          else if (file.endsWith('.mp4')) results.push(full);
        }
        return results;
      }
      const videosDir = path.join(projectDir, 'cypress', 'videos');
      const videosAbs = findAllVideos(videosDir);
      const videosRel = videosAbs.map(p => path.relative(projectDir, p).replace(/\\/g, '/'));
      const videosUris = videosAbs.map(p => 'file://' + p.replace(/\\/g, '/'));
      resolve({ output, specs, screenshots: screenshotsRel, screenshotUris: screenshotsUris, videos: videosRel, videoUris: videosUris });
    });
    cypress.on('error', (err) => reject(err.message));
  });
});

ipcMain.handle('open-docs', async () => {
  await shell.openExternal('https://docs.chathai.site');
});

ipcMain.handle('export-report', async (event) => {
  return new Promise((resolve, reject) => {
    const projectDir = getProjectDirFromArgv();
    const screenshotsDir = path.join(projectDir, 'cypress', 'screenshots');
    const videosDir = path.join(projectDir, 'cypress', 'videos');
    const htmlReport = path.join(projectDir, 'chathai-report.html');

    const cypress = spawn('npx', ['cypress', 'run', '--spec', 'cypress/e2e/*.cy.js', '--config', 'video=true'], {
      cwd: projectDir,
      shell: true
    });

    let stdout = '';
    let stderr = '';
    cypress.stdout.on('data', data => stdout += data.toString());
    cypress.stderr.on('data', data => stderr += data.toString());

    cypress.on('close', () => {
      const output = stdout + stderr;

      // Helper function to recursively find files
      function findAllFiles(dir, ext) {
        let results = [];
        if (!fs.existsSync(dir)) return results;
        for (const file of fs.readdirSync(dir)) {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) {
            results = results.concat(findAllFiles(full, ext));
          } else if (file.endsWith(ext)) {
            results.push(full);
          }
        }
        return results;
      }

      // Parse summary statistics
      const summaryMatch = stdout.match(/Tests:\s+(\d+).*?Passing:\s+(\d+).*?Failing:\s+(\d+).*?Pending:\s+(\d+).*?Skipped:\s+(\d+)/s);
      const totals = {
        tests: summaryMatch ? parseInt(summaryMatch[1]) || 0 : 0,
        passing: summaryMatch ? parseInt(summaryMatch[2]) || 0 : 0,
        failing: summaryMatch ? parseInt(summaryMatch[3]) || 0 : 0,
        pending: summaryMatch ? parseInt(summaryMatch[4]) || 0 : 0,
        skipped: summaryMatch ? parseInt(summaryMatch[5]) || 0 : 0
      };

      // Parse duration
      const durMatch = stdout.match(/Duration:\s+([^\n]+)/);
      const duration = durMatch ? durMatch[1].trim() : null;

      // Parse spec files and tests
      const specRegex = /Running:\s+([^\s]+\.cy\.js)[\s\S]+?(?=Running:|^\s*\(Run Finished\))/gm;
      let match;
      const specs = [];
      while ((match = specRegex.exec(stdout)) !== null) {
        const specName = match[1].trim();
        const specBlock = match[0];
        const tests = [];
        
        // Parse tests with symbols (support both √ and ✓)
        const symRe = /^\s{4}([√×\-✓✖])\s(.+?)(?:\s+\(([\d.]+m?s)\))?\s*$/gm;
        let t;
        while ((t = symRe.exec(specBlock)) !== null) {
          const [, icon, name, dur] = t;
          let status = 'unknown';
          if (icon === '√' || icon === '✓') status = 'pass';
          else if (icon === '×' || icon === '✖') status = 'fail';
          else if (icon === '-') status = 'skip';
          tests.push({ name: name.trim(), status, duration: dur || '' });
        }

        // Parse numbered failures
        const numFailRe = /^\s+\d+\)\s(.+?)\s*$/gm;
        let nf;
        while ((nf = numFailRe.exec(specBlock)) !== null) {
          const name = nf[1].trim();
          if (!tests.find(x => x.name === name)) {
            tests.push({ name, status: 'fail', duration: '' });
          }
        }

        // Parse Mocha-style hook failures
        const failRegex = /^\s*\d+\)\s(.+?)\s+"(.+?)" hook for "(.+?)"/gm;
        let failMatch;
        while ((failMatch = failRegex.exec(specBlock)) !== null) {
          const suite = failMatch[1].trim();
          const hook = failMatch[2].trim();
          const testName = failMatch[3].trim();
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

      // Find screenshots and videos
      const screenshots = findAllFiles(screenshotsDir, '.png');
      const videos = findAllFiles(videosDir, '.mp4');

      // Prepare relative paths for media
      const screenshotPaths = screenshots.map(s => {
        const relPath = path.relative(projectDir, s).replace(/\\/g, '/');
        return { path: relPath, name: path.basename(s) };
      });

      const videoPaths = videos.map(v => {
        const relPath = path.relative(projectDir, v).replace(/\\/g, '/');
        return { path: relPath, name: path.basename(v) };
      });

      // Helper to escape HTML
      function escapeHtml(text) {
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      // Build HTML report
      let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Chathai Test Report</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f8; color: #222; margin: 0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px rgba(30,40,60,0.07); padding: 32px; }
    h1 { color: #f5a86a; margin-bottom: 24px; }
    .summary { display: flex; gap: 20px; margin-bottom: 32px; flex-wrap: wrap; }
    .summary-card { flex: 1; min-width: 150px; background: #f8f9fa; padding: 16px; border-radius: 8px; text-align: center; }
    .summary-card h3 { margin: 0 0 8px 0; font-size: 0.9em; color: #666; }
    .summary-card .value { font-size: 2em; font-weight: bold; }
    .summary-card.passing .value { color: #2ecc40; }
    .summary-card.failing .value { color: #e74c3c; }
    .summary-card.skipped .value { color: #f5a86a; }
    .spec-block { margin-bottom: 32px; border-bottom: 1px solid #eee; padding-bottom: 24px; }
    .spec-title { font-size: 1.3em; font-weight: 600; margin-bottom: 12px; color: #f5a86a; }
    .test-row { display: flex; align-items: flex-start; margin-bottom: 18px; }
    .test-status { font-size: 1.4em; width: 32px; text-align: center; }
    .test-name { font-weight: 500; flex: 1; }
    .test-pass { color: #2ecc40; }
    .test-fail { color: #e74c3c; }
    .test-skip { color: #f5a86a; }
    .section { margin-top: 32px; }
    .section h2 { color: #f5a86a; margin-bottom: 16px; }
    .media-grid { display: flex; gap: 16px; flex-wrap: wrap; }
    .media-item { border: 1px solid #eee; border-radius: 6px; padding: 8px; max-width: 300px; }
    .media-item img, .media-item video { max-width: 100%; border-radius: 4px; }
    .media-item .name { font-size: 0.85em; margin-top: 8px; word-break: break-all; }
    pre { background:#23272e; color:#e8eaf0; padding:16px; border-radius:6px; overflow:auto; max-height:400px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Chathai Test Report</h1>
    <div class="summary">
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${totals.tests}</div>
      </div>
      <div class="summary-card passing">
        <h3>Passing</h3>
        <div class="value">${totals.passing}</div>
      </div>
      <div class="summary-card failing">
        <h3>Failing</h3>
        <div class="value">${totals.failing}</div>
      </div>
      <div class="summary-card skipped">
        <h3>Skipped</h3>
        <div class="value">${totals.skipped}</div>
      </div>
      ${duration ? `<div class="summary-card"><h3>Duration</h3><div class="value" style="font-size:1.2em;">${duration}</div></div>` : ''}
    </div>
    
    ${specs.length === 0 ? '<div>No test results found.</div>' : specs.map(spec => `
      <div class="spec-block">
        <div class="spec-title">${spec.specName}</div>
        ${spec.tests.length > 0 ? spec.tests.map(test => {
          const icon = test.status === 'pass' ? '✔️' : test.status === 'fail' ? '❌' : '⏭️';
          const statusClass = test.status === 'pass' ? 'test-pass' : test.status === 'fail' ? 'test-fail' : 'test-skip';
          return `
            <div class="test-row">
              <div class="test-status ${statusClass}">${icon}</div>
              <div class="test-name">
                ${test.name}
                ${test.duration ? `<span style="color:#888; font-size:0.9em; margin-left:12px;">${test.duration}</span>` : ''}
              </div>
            </div>
          `;
        }).join('') : '<div>No tests found in this spec.</div>'}
      </div>
    `).join('')}
    
    ${screenshotPaths.length > 0 ? `
      <div class="section">
        <h2>Screenshots (${screenshotPaths.length})</h2>
        <div class="media-grid">
          ${screenshotPaths.map(s => `
            <div class="media-item">
              <img src="${s.path}" alt="${s.name}" />
              <div class="name">${s.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    ${videoPaths.length > 0 ? `
      <div class="section">
        <h2>Videos (${videoPaths.length})</h2>
        <div class="media-grid">
          ${videoPaths.map(v => `
            <div class="media-item">
              <video src="${v.path}" controls style="max-width:100%;"></video>
              <div class="name">${v.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <div class="section">
      <h2>Console Output</h2>
      <pre>${escapeHtml(stdout + '\n\n=== STDERR ===\n\n' + stderr)}</pre>
    </div>
  </div>
</body>
</html>`;
      
      fs.writeFileSync(htmlReport, html, 'utf-8');
      resolve('✅ Report generated: chathai-report.html');
    });
  });
});