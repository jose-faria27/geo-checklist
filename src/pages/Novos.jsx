import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Novos.css";
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiHelpCircle, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { LuSun, LuMoon } from "react-icons/lu";

export default function Novos() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tituloPagina, setTituloPagina] = useState("Carregando...");
  const [listaAbas, setListaAbas] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState("");
  const [secoes, setSecoes] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [mapaAjuda, setMapaAjuda] = useState({});
  const [loading, setLoading] = useState(true);
  const [taskId] = useState(localStorage.getItem("taskNumber") || "---");
  const [secoesAbertas, setSecoesAbertas] = useState({});
  const [ajudaModal, setAjudaModal] = useState(null);
  const [darkMode, setDarkMode] = useState(document.body.classList.contains("dark-theme"));

  // 1. CARREGAR CONFIGURAÇÕES (TÍTULO E LISTA DE ABAS)
  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        const urlFormatada = encodeURIComponent(location.pathname);

        // Busca Título
        const respTitulo = await fetch(`http://localhost:5000/api/titulo-checklist/${urlFormatada}`);
        const dataTitulo = await respTitulo.json();
        setTituloPagina(dataTitulo.titulo);

        // Busca Menus (Ajustado para o novo formato de objeto do server)
        const respMenus = await fetch(`http://localhost:5000/api/menus-checklist/${urlFormatada}`);
        const dataMenus = await respMenus.json();

        // dataMenus agora é { menus: [...], defaultMenu: "..." }
        if (dataMenus.menus && dataMenus.menus.length > 0) {
          setListaAbas(dataMenus.menus);
          // Define a aba ativa como o primeiro menu da lista para carregar automaticamente
          setAbaAtiva(dataMenus.menus[0]);
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      }
    };
    carregarConfiguracoes();
  }, [location.pathname]);

  // 2. CARREGAR PERGUNTAS (Sempre que a aba ou a rota mudar)
  const fetchPerguntas = useCallback(async () => {
    if (!abaAtiva) return;

    setLoading(true);
    try {
      const urlPath = encodeURIComponent(location.pathname);
      const menuPath = encodeURIComponent(abaAtiva);

      const response = await fetch(`http://localhost:5000/api/perguntas/${urlPath}/${menuPath}`);
      const dados = await response.json();

      if (!Array.isArray(dados)) {
        setSecoes([]);
        return;
      }

      // Agrupamento por seção
      const estruturaAgrupada = dados.reduce((acc, item) => {
        const secaoExistente = acc.find(s => s.secao === item.secao);
        if (secaoExistente) {
          secaoExistente.perguntas.push(item.pergunta_completa);
        } else {
          acc.push({ secao: item.secao, perguntas: [item.pergunta_completa] });
        }
        return acc;
      }, []);

      // Mapeamento de ajuda
      const ajudas = {};
      dados.forEach(item => {
        if (item.ajuda) ajudas[item.pergunta_titulo] = item.ajuda;
      });

      setSecoes(estruturaAgrupada);
      setMapaAjuda(ajudas);

      // Abrir todas as seções por padrão
      const abertas = {};
      estruturaAgrupada.forEach((_, idx) => { abertas[idx] = false; });
      setSecoesAbertas(abertas);

    } catch (error) {
      console.error("Erro ao carregar perguntas:", error);
    } finally {
      setLoading(false);
    }
  }, [abaAtiva, location.pathname]);

  useEffect(() => {
    fetchPerguntas();
  }, [fetchPerguntas]);

  // FUNÇÕES AUXILIARES
  const getTituloPergunta = (texto) => texto ? texto.split("(")[0].trim() : "";

  const toggleTheme = () => {
    const isDark = !darkMode;
    setDarkMode(isDark);
    document.body.classList.toggle("dark-theme", isDark);
  };

  const handleToggleAnswer = (pergunta, resposta) => {
    setRespostas(prev => ({
      ...prev,
      [pergunta]: prev[pergunta] === resposta ? null : resposta
    }));
  };

  /* =========================
     STATUS DA SEÇÃO
  ========================== */
  const getStatusSecao = (secao) => {
    const respondidas = secao.perguntas.filter(
      p => respostas[p] === "sim" || respostas[p] === "nao"
    ).length;

    if (respondidas === 0) return "vazia";
    if (respondidas < secao.perguntas.length) return "parcial";
    return "completa";
  };

  const totalPerguntas = secoes.reduce(
    (acc, secao) => acc + secao.perguntas.length,
    0
  );

  const respondidas = secoes.reduce((acc, secao) => {
    const respondidasSecao = secao.perguntas.filter(
      p => respostas[p] === "sim" || respostas[p] === "nao"
    ).length;

    return acc + respondidasSecao;
  }, 0);

  const progresso = totalPerguntas > 0 ? Math.round((respondidas / totalPerguntas) * 100) : 0;

  // Função para coletar itens marcados como "não"
  const getItensNao = () => {
    const itensNao = [];
    secoes.forEach(secao => {
      secao.perguntas.forEach(pergunta => {
        if (respostas[pergunta] === "nao") {
          const tituloParaAjuda = getTituloPergunta(pergunta);
          itensNao.push(tituloParaAjuda || pergunta);
        }
      });
    });
    return itensNao;
  };

  return (
    <div className="container-novos">
      <div className="top-bar-actions">
        <button className="btn-voltar-top" onClick={() => navigate("/checklist")}>
          <FiArrowLeft size={20} /> Voltar
        </button>
        <button className="theme-toggle-top" onClick={toggleTheme}>
          {darkMode ? (
            <LuSun className="theme-icon" />
          ) : (
            <LuMoon className="theme-icon" />
          )}
        </button>
      </div>

      <div className="main-header">
        <div className="header-left">
          <h1 className="main-title">{tituloPagina}</h1>
          <p className="task-id">Tarefa: {taskId}</p>
        </div>
        <div className="header-right">
          <div className="progresso-box">
            <h2>{progresso}%</h2>
            <p>{respondidas} de {totalPerguntas}</p>
          </div>
        </div>
      </div>

      <div className="barra-progresso">
        <div className="barra-preenchida" style={{ width: `${progresso}%` }} />
      </div>

      <div className="abas-container">
        {listaAbas.map((nome, index) => (
          <button
            key={index}
            // Destaca a aba ativa
            className={abaAtiva === nome ? "aba ativa" : "aba"}
            onClick={() => {
              setRespostas({});
              setAbaAtiva(nome);
            }}
          >
            {nome}
          </button>
        ))}
      </div>

      <div className="legenda-checklist">
        <span className="legenda-item">
          <span className="legenda-bolinha sim"></span>
          <strong>Sim:</strong>
          <span className="legenda-descricao">
            Item correto e conforme o esperado
          </span>
        </span>

        <span className="legenda-item">
          <span className="legenda-bolinha nao"></span>
          <strong>Não:</strong>
          <span className="legenda-descricao">
            Item incorreto, incompleto ou ausente
          </span>
        </span>
      </div>


      <div className="conteudo">
        {loading ? (
          <div className="loading-state">Buscando perguntas no banco...</div>
        ) : secoes.length === 0 ? (
          <div className="loading-state">Nenhuma pergunta encontrada para esta categoria.</div>
        ) : (
          secoes.map((secaoItem, idx) => {
            const status = getStatusSecao(secaoItem);

            return (
              <div key={idx} className="secao-card">
                <div className="secao-header" onClick={() => setSecoesAbertas(p => ({ ...p, [idx]: !p[idx] }))}>
                  <div className="secao-titulo-wrapper">
                    <h2 className="secao-titulo">{secaoItem.secao}</h2>
                    {status === "parcial" && (
                      <FiAlertCircle className="secao-status alerta" />
                    )}
                    {status === "completa" && (
                      <FiCheckCircle className="secao-status completo" />
                    )}
                  </div>
                  {secoesAbertas[idx] ? <FiChevronUp /> : <FiChevronDown />}
                </div>

                {secoesAbertas[idx] && (
                  <div className="pergunta-lista">
                    {secaoItem.perguntas.map((pergunta, i) => {
                      const tituloParaAjuda = getTituloPergunta(pergunta);
                      return (
                        <div key={i} className="pergunta-card">
                          <div className="pergunta-texto">
                            <strong>{tituloParaAjuda}</strong>
                            {pergunta.includes("(") && (
                              <span> ({pergunta.split("(")[1]}</span>
                            )}
                            <FiHelpCircle
                              className="icone-ajuda"
                              onClick={() => setAjudaModal(tituloParaAjuda)}
                            />
                          </div>
                          <div className="opcoes">
                            <div className={`opcao-item ${respostas[pergunta] === "sim" ? "sim-ativo" : ""}`}
                              onClick={() => handleToggleAnswer(pergunta, "sim")}>
                              <div className="checkbox-custom sim"></div>
                            </div>
                            <div className={`opcao-item ${respostas[pergunta] === "nao" ? "nao-ativo" : ""}`}
                              onClick={() => handleToggleAnswer(pergunta, "nao")}>
                              <div className="checkbox-custom nao"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>


      {/* BOTÃO VERIFICAR CHECKLIST DE ORDENS */}
      <div className="finalizar-wrapper">
        <button
          className={`btn-finalizar ${progresso === 100 ? "ativo" : ""}`}
          disabled={progresso !== 100}
          onClick={() => {
            if (progresso === 100) {
              // Coletar itens marcados como "não" antes de navegar
              const itensNaoNovos = getItensNao();
              // Navegar para Ordens.jsx passando a aba ativa, título e itens marcados como "não"
              navigate("/ordens", { 
                state: { 
                  abaAtiva: abaAtiva, 
                  tituloPagina: tituloPagina,
                  itensNaoNovos: itensNaoNovos // Itens marcados como "não" do Novos.jsx
                } 
              });
            }
          }}
        >
          Verificar Checklist de Ordens
        </button>
      </div>


      {ajudaModal && (
        <div className="modal-overlay" onClick={() => setAjudaModal(null)}>
          <div className="modal-ajuda" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAjudaModal(null)}>✕</button>
            <h2>Ajuda</h2>
            <p className="ajuda-texto">{mapaAjuda[ajudaModal] || "Sem instruções adicionais."}</p>
          </div>
        </div>
      )}
    </div>
  );
}