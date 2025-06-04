import React, { useState } from "react";
import Header from "./components/Header";
import WelcomePage from "./components/WelcomePage";
import FrameworkSelect from "./components/FrameworkSelect";
import GeneratePage from "./components/GeneratePage";
import "./styles/App.css";

function App() {
  const [page, setPage] = useState("welcome");

  return (
    <div className="chathai-bg">
      <Header />
      {page === "welcome" && <WelcomePage onSelect={setPage} />}
      {page === "framework" && <FrameworkSelect onSelect={setPage} />}
      {page === "generate" && <GeneratePage />}
    </div>
  );
}

export default App;