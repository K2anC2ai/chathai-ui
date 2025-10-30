import React, { useState, useEffect } from "react";
import './GeneratePage.css'; // Assuming you'll create this CSS file

export default function GeneratePage() {
  const [log, setLog] = useState('');
  const [selectedDir, setSelectedDir] = useState('');
  const [defaultDir, setDefaultDir] = useState('');
  const [templateFiles, setTemplateFiles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentView, setCurrentView] = useState('all'); // 'all' or 'single'
  const [selectedFile, setSelectedFile] = useState(null); // To store the selected file object
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // State to control sidebar visibility
  const [runLog, setRunLog] = useState('');
  const [testReport, setTestReport] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [screenshotUris, setScreenshotUris] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoUris, setVideoUris] = useState([]);
  const [ddtEnabled, setDdtEnabled] = useState(true);
  const [fixtureName, setFixtureName] = useState('ecommerce_ddt');
  const [outputDir, setOutputDir] = useState('cypress/e2e');
  const [newTemplateName, setNewTemplateName] = useState('my-template.xlsx');

  // On mount, fetch the real default template dir and template files
  useEffect(() => {
    window.chathaiAPI.getDefaultTemplateDir().then(setDefaultDir);
    window.chathaiAPI.listTemplateFiles().then(setTemplateFiles);
  }, []);

  useEffect(() => {
    window.chathaiAPI.onCypressLog((data) => {
      setRunLog(prev => prev + data);
    });
  }, []);

  const handleGenerate = async (filePath) => {
    setLog('Generating Cypress tests...');
    try {
      const result = await window.chathaiAPI.runChathai(filePath, 'file', {
        ddtEnabled,
        fixtureName,
        outputDir
      });
      setLog(result || '✅ Cypress tests generated!');
    } catch (err) {
      setLog('❌ Error: ' + err);
    }
  };

  const handleGenerateAll = async () => {
    if (templateFiles.length === 0) {
      setLog('❌ No template files available to generate tests.');
      return;
    }

    setIsGenerating(true);
    setLog('Generating tests for all templates...\n');

    for (const file of templateFiles) {
      try {
        setLog(prev => prev + `\nProcessing ${file.name}...`);
        const result = await window.chathaiAPI.runChathai(file.path, 'file', {
          ddtEnabled,
          fixtureName,
          outputDir
        });
        setLog(prev => prev + `\n✅ ${file.name}: ${result || 'Tests generated successfully!'}`);
      } catch (err) {
        setLog(prev => prev + `\n❌ ${file.name}: Error - ${err}`);
      }
    }

    setLog(prev => prev + '\n\n✅ All files processed!');
    setIsGenerating(false);
  };

  const handleRunAllTests = async () => {
    setLog('Running all Cypress tests...');
    setRunLog('');
    setTestReport([]);
    setScreenshots([]);
    try {
      const res = await window.chathaiAPI.runTestsWithReport(null);
      setLog('✅ All Cypress tests completed!');
      setRunLog(res.output);
      setTestReport(parseCypressOutput(res.output));
      setScreenshots(res.screenshots || []);
      setScreenshotUris(res.screenshotUris || []);
      setVideos(res.videos || []);
      setVideoUris(res.videoUris || []);
    } catch (err) {
      setLog('❌ Error running all tests: ' + err);
    }
  };

  const handleGenerateSingle = async () => {
     if (!selectedFile) return;
     setLog(`Generating test for ${selectedFile.name}...`);
     setIsGenerating(true);
     try {
       const result = await window.chathaiAPI.runChathai(selectedFile.path, 'file', {
         ddtEnabled,
         fixtureName,
         outputDir
       });
       setLog(result || `✅ Test generated for ${selectedFile.name}!`);
     } catch (err) {
       setLog('❌ Error generating test: ' + err);
     }
     setIsGenerating(false);
  };

   const handleRunSingleTest = async () => {
     if (!selectedFile) return;
     setRunLog('');
     setLog(`Running Cypress test for ${selectedFile.name}...`);
    try {
      const excelBaseName = selectedFile.name.replace(/\.xlsx$/i, '');
      const testFilePath = `cypress/e2e/${excelBaseName}.cy.js`;
      const res = await window.chathaiAPI.runTestsWithReport(testFilePath);
      setRunLog(res.output);
      setTestReport(parseCypressOutput(res.output));
      setScreenshots(res.screenshots || []);
      setScreenshotUris(res.screenshotUris || []);
      setVideos(res.videos || []);
      setVideoUris(res.videoUris || []);
      setLog(`✅ Cypress test run complete for ${selectedFile.name}`);
    } catch (err) {
       setLog('❌ Error running test: ' + err);
     }
  };

  const handleSetDefaultDir = async e => {
    const files = e.target.files;
    if (files.length > 0) {
      const filePath = files[0].path;
      const sep = filePath.includes('/') ? '/' : '\\';
      const dirPath = filePath.substring(0, filePath.lastIndexOf(sep));
      setSelectedDir(dirPath);
      setLog('Setting default template directory...');
      try {
        // Extract just the directory name from the full path
        const dirName = dirPath.split(sep).pop();
        const result = await window.chathaiAPI.setDefaultTemplateDir(dirName);
        setDefaultDir(dirPath);
        // Refresh template files list
        window.chathaiAPI.listTemplateFiles().then(setTemplateFiles);
        setLog(result || `✅ Default template directory set to: ${dirPath}`);
      } catch (err) {
        setLog('❌ Error: ' + err);
      }
    } else {
       // If user cancels directory selection
       setLog('Directory selection cancelled.');
    }
  };

  const handleFileClick = (file) => {
    setSelectedFile(file);
    setCurrentView('single');
    setLog(`Viewing details for ${file.name}`);
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const handleExportReport = async () => {
    setLog('Exporting report...');
    try {
      const result = await window.chathaiAPI.exportReport();
      setLog(result || '✅ Report exported!');
    } catch (err) {
      setLog('❌ Error exporting report: ' + err);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;
    setLog(`Validating ${selectedFile.name}...`);
    try {
      const out = await window.chathaiAPI.validateExcel(selectedFile.path);
      setLog(out || '✅ Validation complete');
    } catch (e) {
      setLog('❌ Validate error: ' + e);
    }
  };

  const handleCreateTemplate = async () => {
    setLog('Creating template...');
    try {
      const out = await window.chathaiAPI.createTemplate(newTemplateName);
      setLog(out || '✅ Template created');
      // refresh list
      const files = await window.chathaiAPI.listTemplateFiles();
      setTemplateFiles(files);
    } catch (e) {
      setLog('❌ Create template error: ' + e);
    }
  };

  const renderAllFilesView = () => {
    // Extract directory name from defaultDir
    const directoryName = defaultDir ? defaultDir.split(/[\/\\]/).pop() : 'No folder selected';

    return (
      <div className="main-content-panel">
        <div className="header-row">
          {/* The "select your folder" button is now in the sidebar */}
        </div>
        <div className="file-list-container">
          <h4 className="folder-name">{directoryName}</h4> {/* Display actual folder name */}
          <div className="file-list">
  {templateFiles.length > 0 ? (
    templateFiles.map((file, index) => (
      <div key={index} className="file-item" onClick={() => handleFileClick(file)}>
        <span className="filename-placeholder">📄</span> {file.name}
      </div>
    ))
    )  : (
    <p>No template files found in the default directory.</p>
  )}
</div>
        </div>
        <div className="button-row">
           <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
             <label><input type="checkbox" checked={ddtEnabled} onChange={e=>setDdtEnabled(e.target.checked)} /> DDT</label>
             <input className="chathai-input--sm" placeholder="fixture name" value={fixtureName} onChange={e=>setFixtureName(e.target.value)} />
             <input className="chathai-input--sm" placeholder="output dir" value={outputDir} onChange={e=>setOutputDir(e.target.value)} style={{minWidth:180}} />
           </div>
           <button
             className="chathai-btn chathai-btn--sm"
             onClick={handleGenerateAll}
             disabled={isGenerating}
           >
             {isGenerating ? 'Generating...' : 'generate all'}
           </button>
           <button
             className="chathai-btn chathai-btn--sm"
             onClick={handleRunAllTests}
             disabled={isGenerating} // Disable while generating
           >
             run all test
           </button>
           <button
  className="chathai-btn chathai-btn--sm"
  onClick={handleExportReport}
  disabled={isGenerating}
>
  Export Report
</button>
           <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:8}}>
             <input className="chathai-input--sm" placeholder="new-template.xlsx" value={newTemplateName} onChange={e=>setNewTemplateName(e.target.value)} />
             <button className="chathai-btn chathai-btn--sm" onClick={handleCreateTemplate} disabled={isGenerating}>create template</button>
           </div>
        </div>
        <div className="output-report-row">
  <section className="console-panel">
    <header className="console-panel-header">Console Output</header>
    <textarea
      className="console-panel-textarea"
      value={log}
      readOnly
      rows={8}
      spellCheck={false}
    />
    <textarea
      className="console-panel-textarea"
      value={runLog}
      readOnly
      rows={12}
      spellCheck={false}
    />
  </section>
  {testReport.length > 0 && (
    <section className="test-report-panel">
      <header className="test-report-header">Test Report</header>
      <table className="test-report-table-modern">
        <thead>
          <tr>
            <th style={{width: '32%'}}>File</th>
            <th style={{width: '12%', textAlign: 'center'}}>Passing</th>
            <th style={{width: '12%', textAlign: 'center'}}>Failing</th>
            <th style={{width: '12%', textAlign: 'center'}}>Skipped</th>
            <th style={{width: '32%'}}>Error</th>
          </tr>
        </thead>
        <tbody>
          {testReport.map((r, i) => (
            <tr key={i}>
              <td className="test-report-filename" title={r.file}>{r.file}</td>
              <td className="test-report-pass" style={{textAlign: 'center'}}>{r.passing}</td>
              <td className="test-report-fail" style={{textAlign: 'center'}}>{r.failing}</td>
              <td className="test-report-skip" style={{textAlign: 'center'}}>{r.skipped}</td>
              <td className="test-report-error">{r.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {screenshots.length > 0 && (
        <div style={{marginTop: 12}}>
          <div style={{fontWeight:600, marginBottom:6}}>Screenshots</div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            {screenshots.map((s,i) => (
              <div key={i} style={{border:'1px solid #eee', borderRadius:6, padding:6}}>
                <div style={{fontSize:'0.85em', marginBottom:4, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis'}} title={s}>{s}</div>
                <img src={screenshotUris[i] || s} alt="screenshot" style={{maxWidth:240, borderRadius:4}} />
              </div>
            ))}
          </div>
        </div>
      )}
      {videoUris.length > 0 && (
        <div style={{marginTop: 12}}>
          <div style={{fontWeight:600, marginBottom:6}}>Videos</div>
          <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
            {videoUris.map((v,i) => (
              <div key={i} style={{border:'1px solid #eee', borderRadius:6, padding:6, maxWidth:260}}>
                <div style={{fontSize:'0.85em', marginBottom:4, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis'}} title={videos[i]}>{videos[i]}</div>
                <video src={v} controls style={{maxWidth:240, borderRadius:4}} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )}
</div>
      </div>
    );
  };

  const renderSingleFileView = () => (
    <div className="main-content-panel">
      <div className="header-row">
        <button className="chathai-btn" onClick={() => setCurrentView('all')}>Back to All Files</button>
      </div>
      <div className="file-detail-row">
        <div className="file-detail-container">
          <div className="file-icon">📄</div>
          <h3>{selectedFile?.name || 'No file selected'}</h3>
          <p>xlsx template v.1.1.1.0</p>
          <div className="status-indicator success">SUCCESS!</div>
        </div>
        <div className="button-col">
          <div style={{display:'flex',gap:8,flexDirection:'column',marginBottom:8}}>
            <label><input type="checkbox" checked={ddtEnabled} onChange={e=>setDdtEnabled(e.target.checked)} /> DDT</label>
            <input placeholder="fixture name" value={fixtureName} onChange={e=>setFixtureName(e.target.value)} style={{padding:'6px 8px'}} />
            <input placeholder="output dir" value={outputDir} onChange={e=>setOutputDir(e.target.value)} style={{padding:'6px 8px'}} />
          </div>
          <button
            className="chathai-btn"
            onClick={handleGenerateSingle}
            disabled={isGenerating}
          >
            GENERATE TEST
          </button>
          <button
            className="chathai-btn"
            onClick={handleRunSingleTest}
            disabled={isGenerating}
          >
            RUN YOUR TEST
          </button>
          <button
            className="chathai-btn"
            onClick={handleValidate}
            disabled={isGenerating}
          >
            VALIDATE
          </button>
        </div>
      </div>
      <div className="console-output-card">
        <div className="console-title">Console Output</div>
        <textarea
          className="console-textarea"
          value={log}
          readOnly
          rows={6}
        />
        <textarea
          className="console-textarea"
          value={runLog}
          readOnly
          rows={6}
        />
      </div>
    </div>
  );

  function parseCypressOutput(output) {
  const report = [];
  // Find the summary table at the end
  const summaryRegex = /Spec\s+Tests\s+Passing\s+Failing\s+Pending\s+Skipped\s*\n([\s\S]+?)\n\s*[√×]/;
  const match = output.match(summaryRegex);
  if (match) {
    const lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Example line:
      // │ √  chathai-templateV.1.0.0-copy.cy.js       00:01        2        2        -        -        - │
      const parts = line.split(/\s{2,}/);
      if (parts.length >= 8) {
        const file = parts[1].replace(/^√\s+|×\s+/, '').trim();
        const passing = parts[4] !== '-' ? Number(parts[4]) : 0;
        const failing = parts[5] !== '-' ? Number(parts[5]) : 0;
        const skipped = parts[7] !== '-' ? Number(parts[7]) : 0;
        // Try to find error message for this file
        let error = '';
        const errorRegex = new RegExp(`${file}[\\s\\S]+?CypressError: ([\\s\\S]+?)(\\n\\s*\\n|$)`);
        const errorMatch = output.match(errorRegex);
        if (errorMatch) error = errorMatch[1].trim();
        report.push({ file, passing, failing, skipped, error });
      }
    }
  }
  return report;
}

  return (
    <div className="chathai-container">
      <div className={`sidebar ${isSidebarVisible ? '' : 'hidden'}`}> {/* Apply 'hidden' class when sidebar is not visible */}
        <div className="chathai-logo">Chathai Logo</div>
        <div className="chathai-framework">chathai framework</div>
        <button className="chathai-btn select-folder-btn" onClick={() => document.getElementById('select-folder-input').click()}>
           select your folder
        </button>
        <div className="current-dir-info">
          <div className="current-dir-label">Current default directory:</div>
          <div className="current-dir-path">{defaultDir}</div>
           {/* Hidden file input to trigger directory selection */}
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            onChange={handleSetDefaultDir}
            style={{ display: 'none' }} // Hide the actual input
            id="select-folder-input"
          />
        </div>
         {/* Add padding/margin to space elements */}
         <div style={{ marginTop: 'auto' }}>{/* This pushes the content below to the bottom if needed */}{/* Add other sidebar elements if any */}
        </div>
      </div>
      <div className={`main-content ${isSidebarVisible ? '' : 'sidebar-hidden'}`}> {/* Apply 'sidebar-hidden' class when sidebar is not visible */}
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
           {isSidebarVisible ? '<' : '>'} {/* Simple characters for show/hide, fixed linter error */}
        </button>
        {currentView === 'all' ? renderAllFilesView() : renderSingleFileView()}
      </div>
    </div>
  );
}