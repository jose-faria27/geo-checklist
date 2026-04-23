import React, { useState } from "react";
import "./Home.css";
import { LuSun, LuMoon } from "react-icons/lu";
import { useNavigate } from "react-router-dom"; // Importa navegação
import logoLight from "../assets/logo.png";   // Logo do tema claro
import logoDark from "../assets/logo2.png";   // Logo do tema escuro

const Home = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [taskNumber, setTaskNumber] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Hook para navegação

  const handleInputChange = (e) => {
    const value = e.target.value;

    // Permite apenas números
    if (/^\d*$/.test(value)) {
      setTaskNumber(value);
      setError("");
    } else {
      setError("Digite apenas números!");
    }
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.body.classList.toggle("dark-theme", newMode);
  };

  const handleContinue = () => {
    if (!taskNumber) {
      setError("Digite o número da tarefa para continuar!");
      return;
    }

    // Salva o número no localStorage
    localStorage.setItem("taskNumber", taskNumber);

    // Redireciona para página de checklist
    navigate("/checklist");
  };

  return (
    <div className={`home-container ${darkMode ? "dark" : ""}`}>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <img
            src={darkMode ? logoDark : logoLight}
            alt="Logo da empresa"
            className="logo"
          />
        </div>

        <div className="header-right">
          <button className="theme-toggle" onClick={toggleTheme}>
            {darkMode ? (
              <LuSun size={22} className="icon" />
            ) : (
              <LuMoon size={20} className="icon" />
            )}
          </button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="main-content">
        <h1 className="title">Check List Inspeção</h1>

        <p className="subtitle">
          Gerencie suas tarefas de forma profissional e organizada. <br />
          Acompanhe seu progresso e mantenha tudo sob controle.
        </p>

        <div className="input-box">
          <label>Digite o número da tarefa para começar *</label>
          <input
            type="text"
            placeholder="Número da tarefa..."
            value={taskNumber}
            onChange={handleInputChange}
          />
          {error && <p className="error">{error}</p>}
        </div>

        <button className="continue-btn" onClick={handleContinue}>
          Continuar <span>→</span>
        </button>
      </main>
    </div>
  );
};

export default Home;
