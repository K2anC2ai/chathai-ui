import React, { useState } from "react";

export default function GeneratePage() {
  const [mode, setMode] = useState('file'); // 'file' or 'directory'
  const [selectedPath, setSelectedPath] = useState('');
  const [log, setLog] = useState('');
  const [selectedDir, setSelectedDir] = useState('');
  const [defaultDir, setDefaultDir] = useState('');

  // On mount, fetch the real default template dir from backend
  React.useEffect(() => {
    window.chathaiAPI.getDefaultTemplateDir().then(setDefaultDir);
  }, []);

  const handleGenerate = async () => {
    setLog('Generating Cypress tests...');
    try {
      if (mode === 'directory') {
        // Always use the default directory
        const result = await window.chathaiAPI.runChathai('', 'directory');
        setLog(result || '✅ Cypress tests generated!');
      } else {
        if (!selectedPath) {
          setLog('Please select a file.');
          return;
        }
        const result = await window.chathaiAPI.runChathai(selectedPath, mode);
        setLog(result || '✅ Cypress tests generated!');
      }
    } catch (err) {
      setLog('❌ Error: ' + err);
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
        const result = await window.chathaiAPI.setDefaultTemplateDir(dirPath);
        setDefaultDir(dirPath);
        setLog(result || `✅ Default template directory set to: ${dirPath}`);
      } catch (err) {
        setLog('❌ Error: ' + err);
      }
    }
  };

  return (
    <div className="chathai-full-center">
      <h2 className="chathai-title">Chathai UI</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type="radio"
            checked={mode === 'file'}
            onChange={() => setMode('file')}
          />
          Single File
        </label>
        <label style={{ marginLeft: 16 }}>
          <input
            type="radio"
            checked={mode === 'directory'}
            onChange={() => setMode('directory')}
          />
          Directory (Batch)
        </label>
      </div>
      {mode === 'directory' && (
        <>
          <div style={{ marginBottom: 8 }}>
            <b>Current default directory:</b> {defaultDir}
          </div>
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            onChange={handleSetDefaultDir}
            style={{ marginBottom: 8 }}
          />
          <div style={{ marginBottom: 16, fontSize: '0.95em', color: '#888' }}>
            Select a directory above to set as the new default for batch generation.
          </div>
        </>
      )}
      {mode === 'file' && (
        <input
          type="file"
          accept={'.xlsx'}
          onChange={e => {
            const file = e.target.files[0];
            setSelectedPath(file?.path || '');
          }}
          style={{ marginBottom: 16 }}
        />
      )}
      <button
        className="chathai-btn"
        style={{ minWidth: 180 }}
        onClick={handleGenerate}
      >
        Generate Cypress Tests
      </button>
      <pre className="chathai-log">{log}</pre>
    </div>
  );
}