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

  // On mount, fetch the real default template dir and template files
  useEffect(() => {
    window.chathaiAPI.getDefaultTemplateDir().then(setDefaultDir);
    window.chathaiAPI.listTemplateFiles().then(setTemplateFiles);
  }, []);

  const handleGenerate = async (filePath) => {
    setLog('Generating Cypress tests...');
    try {
      const result = await window.chathaiAPI.runChathai(filePath, 'file');
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
        const result = await window.chathaiAPI.runChathai(file.path, 'file');
        setLog(prev => prev + `\n✅ ${file.name}: ${result || 'Tests generated successfully!'}`);
      } catch (err) {
        setLog(prev => prev + `\n❌ ${file.name}: Error - ${err}`);
      }
    }

    setLog(prev => prev + '\n\n✅ All files processed!');
    setIsGenerating(false);
  };

  const handleRunAllTests = () => {
    setLog('Run All Tests button clicked (functionality not yet implemented).');
    // TODO: Implement run all tests functionality
  };

  const handleGenerateSingle = async () => {
     if (!selectedFile) return;
     setLog(`Generating test for ${selectedFile.name}...`);
     setIsGenerating(true);
     try {
       const result = await window.chathaiAPI.runChathai(selectedFile.path, 'file');
       setLog(result || `✅ Test generated for ${selectedFile.name}!`);
     } catch (err) {
       setLog('❌ Error generating test: ' + err);
     }
     setIsGenerating(false);
  };

   const handleRunSingleTest = () => {
     if (!selectedFile) return;
     setLog(`Run Test button clicked for ${selectedFile.name} (functionality not yet implemented).`);
     // TODO: Implement run single test functionality
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
                   <span className="filename-placeholder">📄</span> {file.name} {/* Display actual filename and a simple icon */}
                 </div>
               ))
             ) : (
               <p>No template files found in the default directory.</p>
             )}
          </div>
        </div>
        <div className="button-row">
           <button
             className="chathai-btn"
             onClick={handleGenerateAll}
             disabled={isGenerating}
           >
             {isGenerating ? 'Generating...' : 'generate all'}
           </button>
           <button
             className="chathai-btn"
             onClick={handleRunAllTests}
             disabled={isGenerating} // Disable while generating
           >
             run all test
           </button>
        </div>
        <div className="console-placeholder">
           {/* Placeholder for test results console */}
           <p>[Console Output Area]</p>
           <pre className="chathai-log">{log}</pre>
        </div>
      </div>
    );
  };

  const renderSingleFileView = () => (
    <div className="main-content-panel">
      <div className="header-row">
         <button className="chathai-btn" onClick={() => setCurrentView('all')}>Back to All Files</button>
      </div>
      <div className="file-detail-container">
         {/* Placeholder for file details based on Image 2 */}
         <div className="file-icon">📄</div> {/* Using a simple file emoji as placeholder */}
         <h3>{selectedFile?.name || 'No file selected'}</h3>
         <p>xlsx template v.1.1.1.0</p> {/* Keep as placeholder for now */}
         <div className="status-indicator success">SUCCESS!</div> {/* Placeholder with success class */}
      </div>
       <div className="button-row">
         <button
           className="chathai-btn"
           onClick={handleGenerateSingle}
            disabled={isGenerating}
         >
           generate test
         </button>
         <button
           className="chathai-btn"
           onClick={handleRunSingleTest}
           disabled={isGenerating} // Disable while generating
         >
           Run your test
         </button>
      </div>
       <div className="console-placeholder">
         {/* Placeholder for test results console */}
         <p>[Console Output Area]</p>
         <pre className="chathai-log">{log}</pre>
      </div>
    </div>
  );

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