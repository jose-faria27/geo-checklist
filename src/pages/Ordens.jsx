import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Novos.css";
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiHelpCircle, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { LuSun, LuMoon } from "react-icons/lu";

export default function Ordens() {
  const navigate = useNavigate();
  const location = useLocation();

  // Recebe a aba ativa do state da navegação (vindo de Novos.jsx)
  const abaAtivaFromState = location.state?.abaAtiva || "";
  const tituloPaginaFromState = location.state?.tituloPagina || "";
  const itensNaoNovosFromState = location.state?.itensNaoNovos || []; // Itens marcados como "não" do Novos.jsx

  const tituloPagina = tituloPaginaFromState || "Checklist de Ordens";
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
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // 1. CARREGAR MENUS DE ORDENS (quando o componente monta)
  useEffect(() => {
    const carregarMenus = async () => {
      if (!abaAtivaFromState) return;

      try {
        const tituloPath = encodeURIComponent(abaAtivaFromState);
        const response = await fetch(`http://localhost:5000/api/menus-ordens/${tituloPath}`);
        const dataMenus = await response.json();

        if (dataMenus.menus && dataMenus.menus.length > 0) {
          setListaAbas(dataMenus.menus);
          // Define a aba ativa como o primeiro menu da lista
          setAbaAtiva(dataMenus.menus[0]);
        } else {
          // Se não houver menus, ainda assim permite usar sem filtro de menu
          setListaAbas([]);
          setAbaAtiva("");
        }
      } catch (error) {
        console.error("Erro ao carregar menus de ordens:", error);
      }
    };

    carregarMenus();
  }, [abaAtivaFromState]);

  // 2. CARREGAR PERGUNTAS DE ORDENS (filtrado por titulo e menu)
  const fetchPerguntas = useCallback(async () => {
    if (!abaAtivaFromState) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const tituloPath = encodeURIComponent(abaAtivaFromState);
      
      // Se houver menu selecionado, filtra por ele também
      let url = `http://localhost:5000/api/perguntas-ordens/${tituloPath}`;
      if (abaAtiva) {
        const menuPath = encodeURIComponent(abaAtiva);
        url += `/${menuPath}`;
      }

      const response = await fetch(url);
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
      console.error("Erro ao carregar perguntas de ordens:", error);
    } finally {
      setLoading(false);
    }
  }, [abaAtivaFromState, abaAtiva]);

  useEffect(() => {
    fetchPerguntas();
  }, [fetchPerguntas]);

  // Redirecionar se não tiver aba ativa
  useEffect(() => {
    if (!abaAtivaFromState) {
      alert("Nenhuma aba selecionada. Redirecionando...");
      navigate("/checklist");
    }
  }, [abaAtivaFromState, navigate]);

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

  // Função para finalizar o checklist de ordens
  const handleFinalizarChecklist = async () => {
    setSalvando(true);
    try {
      const itensNaoOrdens = getItensNao(); // Itens marcados como "não" do Ordens.jsx
      
      // Combinar itens do Novos.jsx com itens do Ordens.jsx
      // Adiciona prefixo para identificar a origem de cada item
      const itensNaoNovosFormatados = itensNaoNovosFromState.map(item => `[Novos] ${item}`);
      const itensNaoOrdensFormatados = itensNaoOrdens.map(item => `[Ordens] ${item}`);
      
      // Combina todos os itens em um único array
      const todosItensNao = [...itensNaoNovosFormatados, ...itensNaoOrdensFormatados];
      
      const dadosParaEnviar = {
        tarefa: taskId,
        pagina: tituloPagina,
        resultado: todosItensNao, // Array com todos os itens marcados como "não" (Novos + Ordens)
        titulo: abaAtivaFromState // Usa o título (aba ativa) para identificar
      };

      const response = await fetch('http://localhost:5000/api/finalizar-checklist-ordens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnviar)
      });

      const resultado = await response.json();

      if (response.ok) {
        console.log('Checklist de ordens salvo com sucesso!', resultado);
        setModalFinalizar(false);
        alert('Checklist de ordens finalizado e salvo com sucesso!');
        navigate("/checklist");
      } else {
        console.error('Erro ao salvar checklist de ordens:', resultado.error);
        alert('Erro ao salvar checklist de ordens: ' + (resultado.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao finalizar checklist de ordens:', error);
      alert('Erro ao finalizar checklist de ordens. Por favor, tente novamente.');
    } finally {
      setSalvando(false);
    }
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
          <p className="task-id" style={{ fontSize: '0.9em', marginTop: '5px', opacity: 0.8 }}>
            Categoria: {abaAtivaFromState}
          </p>
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

      {listaAbas.length > 0 && (
        <div className="abas-container">
          {listaAbas.map((nome, index) => (
            <button
              key={index}
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
      )}

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


      {/* BOTÃO FINALIZAR CHECKLIST DE ORDENS */}
      <div className="finalizar-wrapper">
        <button
          className={`btn-finalizar ${progresso === 100 ? "ativo" : ""}`}
          disabled={progresso !== 100}
          onClick={() => {
            if (progresso === 100) {
              setModalFinalizar(true);
            }
          }}
        >
          Finalizar Checklist
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

      {/* Modal de Finalização */}
      {modalFinalizar && (
        <div className="modal-overlay" onClick={() => !salvando && setModalFinalizar(false)}>
          <div className="modal-finalizar" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => !salvando && setModalFinalizar(false)}
              disabled={salvando}
            >
              ✕
            </button>
            <h2>Finalizar Checklist de Ordens</h2>
            <p className="modal-texto">
              Você está prestes a finalizar o checklist de ordens <strong>{tituloPagina}</strong>.
              <br />
              <strong>Categoria:</strong> {abaAtivaFromState}
              {(() => {
                const itensNaoOrdens = getItensNao();
                const totalItensNao = itensNaoNovosFromState.length + itensNaoOrdens.length;
                
                if (totalItensNao > 0) {
                  return (
                    <>
                      <br /><br />
                      <strong>Itens marcados como "Não" ({totalItensNao}):</strong>
                      {itensNaoNovosFromState.length > 0 && (
                        <>
                          <br /><br />
                          <strong style={{ fontSize: '0.95em' }}>Do Checklist Inicial ({itensNaoNovosFromState.length}):</strong>
                          <ul className="itens-nao-lista">
                            {itensNaoNovosFromState.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {itensNaoOrdens.length > 0 && (
                        <>
                          <br />
                          <strong style={{ fontSize: '0.95em' }}>Do Checklist de Ordens ({itensNaoOrdens.length}):</strong>
                          <ul className="itens-nao-lista">
                            {itensNaoOrdens.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  );
                }
                return (
                  <>
                    <br /><br />
                    <strong>Todos os itens foram marcados como "Sim".</strong>
                  </>
                );
              })()}
            </p>
            <div className="modal-buttons">
              <button
                className="btn-modal-cancelar"
                onClick={() => setModalFinalizar(false)}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                className="btn-modal-confirmar"
                onClick={handleFinalizarChecklist}
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : 'Confirmar Finalização'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}