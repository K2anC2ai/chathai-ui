import React, { useState } from 'react';

function App() {
  const [excelFile, setExcelFile] = useState(null);
  const [filePath, setFilePath] = useState('');
  const [log, setLog] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setExcelFile(file);
    // Electron provides the real path
    setFilePath(file?.path || '');
  };

  const handleGenerate = async () => {
    if (!excelFile || !filePath) {
      setLog('Please select an Excel file.');
      return;
    }
    setLog('Generating Cypress tests...');
    try {
      const result = await window.chathaiAPI.runChathai(filePath);
      setLog(result || '✅ Cypress tests generated!');
    } catch (err) {
      setLog('❌ Error: ' + err);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Chathai UI</h1>
      <input type="file" accept=".xlsx" onChange={handleFileChange} />
      <button onClick={handleGenerate} style={{ marginLeft: 8 }}>
        Generate Cypress Tests
      </button>
      <pre style={{ marginTop: 24, background: '#222', color: '#fff', padding: 16 }}>
        {log}
      </pre>
    </div>
  );
}

export default App;