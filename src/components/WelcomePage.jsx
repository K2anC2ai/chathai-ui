import React from "react";

export default function WelcomePage({ onSelect }) {
  return (
    <div className="chathai-full-center">
      <h2 className="chathai-title">
        WELCOME TO CHATHAI<br />WHO ARE YOU?
      </h2>
      <p className="chathai-tagline">Automate. Test. Relax. — The Chathai Way.</p>
      <div className="chathai-btn-row">
        <button
          className="chathai-btn locked"
          disabled
        >
          IM NOT INTO ANY FRAMEWORK<br /><span className="chathai-btn-sub">NEWBY</span>
        </button>
        <button
          className="chathai-btn"
          onClick={() => onSelect("framework")}
        >
          IM SO familiar<br />with testing framework<br />
          <span className="chathai-btn-sub">U R A REAL TESTER</span>
        </button>
      </div>
      <div className="chathai-links">
        <a href="#">why do I have to choose this?</a>
        <a href="#">help us?</a>
      </div>
    </div>
  );
}