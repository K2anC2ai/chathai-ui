import React from "react";
import chathaiLogo from "../assets/chathai-logo.png"; // Place your SVG logo here

export default function Header() {
  const handleDocClick = () => {
    window.chathaiAPI.openDocs();
  };

  return (
    <header className="chathai-header">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src={chathaiLogo} alt="Chathai Logo" style={{ height: 36 }} />
        <span className="chathai-brand">chathai framework</span>
      </div>
      <span className="chathai-doc-link" onClick={handleDocClick} style={{ cursor: 'pointer' }}>doc</span>
    </header>
  );
}