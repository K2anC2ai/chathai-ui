import React from "react";
import cypressLogo from "../assets/cypress-logo.svg"; // Download and place in src/assets/

export default function FrameworkSelect({ onSelect }) {
  return (
    <div className="chathai-full-center">
      <h2 className="chathai-title">Select Testing Framework</h2>
      <div className="framework-grid">
        <button className="framework-btn active" onClick={() => onSelect("generate")}>
          <img src={cypressLogo} alt="Cypress" />
          <span>Cypress</span>
        </button>
        <div className="framework-btn in-progress"><span>IN PROGRESS</span></div>
        <div className="framework-btn in-progress"><span>IN PROGRESS</span></div>
        <div className="framework-btn in-progress"><span>IN PROGRESS</span></div>
      </div>
    </div>
  );
}