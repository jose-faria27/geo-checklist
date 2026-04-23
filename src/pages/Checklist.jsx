import React, { useEffect, useState } from "react";
import "./Checklist.css";
import { LuSun, LuMoon } from "react-icons/lu";
import * as FiIcons from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { HiOutlinePencilAlt } from "react-icons/hi";

import logoLight from "../assets/logo.png";
import logoDark from "../assets/logo2.png";

const Checklist = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(document.body.classList.contains("dark-theme"));
  const [taskNumber, setTaskNumber] = useState("");

  // Estado que armazenará os dados vindos do PostgreSQL
  const [cardsData, setCardsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca o número da tarefa no LocalStorage
    const saved = localStorage.getItem("taskNumber");
    if (saved) setTaskNumber(saved);

    // Função para buscar dados do Backend (Node + Postgres)
    const fetchCards = async () => {
      try {
        // Substitua pela URL da sua API Node
        const response = await fetch("http://localhost:5000/api/cards");
        const data = await response.json();
        setCardsData(data);
      } catch (error) {
        console.error("Erro ao carregar dados do banco:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.body.classList.toggle("dark-theme", next);
  };

  // Função para renderizar o ícone baseado na string vinda do DB (ex: "FiFilePlus")
  const renderIcon = (iconName) => {
    const IconComponent = FiIcons[iconName];
    // Retorna o ícone encontrado ou um ícone padrão caso falhe
    return IconComponent ? <IconComponent size={28} /> : <FiIcons.FiPackage size={28} />;
  };

  return (
    <div className={`checklist-page ${darkMode ? "dark" : ""}`} id="checklist">
      <header className="ch-header">
        <div className="ch-left">
          <img
            src={darkMode ? logoDark : logoLight}
            alt="Logo da Empresa"
            className="ch-logo"
          />
        </div>

        <div className="ch-center">
          <h1>Check List Inspeção</h1>
          <p className="task-number">
            Número da Tarefa:
            <span className="number">{taskNumber}</span>

            <button
              className="edit-task"
              title="Alterar número da tarefa"
              aria-label="Alterar número da tarefa"
              onClick={() => navigate("/")}
            >
              <HiOutlinePencilAlt />
            </button>
          </p>
          <p className="choose">Escolha o checklist que deseja realizar</p>
        </div>

        <div className="ch-right">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Alternar tema">
            {darkMode ? <LuSun className="icon" /> : <LuMoon className="icon" />}
          </button>
        </div>
      </header>

      <main className="ch-main">
        {loading ? (
          <p style={{ textAlign: "center" }}>Carregando opções...</p>
        ) : (
          <div className="cards-grid">
            {cardsData.map((c) => (
              <article
                key={c.id}
                className="card"
                role="button"
                tabIndex={0}
                onClick={() => {
                  // Ajustado para usar o nome da coluna no banco (route_path)
                  if (c.route_path) navigate(c.route_path);
                }}
              >
                <div className="card-icon">
                  {/* Agora o ícone é renderizado dinamicamente pelo nome string */}
                  {renderIcon(c.icon_name)}
                </div>
                <div className="card-body">
                  {/* Ajustado para usar nomes de colunas do SQL (title/description) */}
                  <h3>{c.title}</h3>
                  <p className="desc">{c.description}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Checklist;