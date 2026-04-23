import React, { useState, useEffect } from "react";
import { FiSave, FiSearch, FiEdit3, FiX } from "react-icons/fi";
import "./AdminEditar.css";

export default function AdminEditar() {
  const [opcoes, setOpcoes] = useState({ cards: [], menus: [] });
  const [filtro, setFiltro] = useState({ id_card: "", menu: "" });
  const [perguntas, setPerguntas] = useState([]);
  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/form-options")
      .then(res => res.json())
      .then(data =>
        setOpcoes({
          cards: data.cards || [],
          menus: data.menus || []
        })
      );
  }, []);

  const buscarPerguntas = async () => {
    if (!filtro.id_card || !filtro.menu) {
      alert("Selecione o serviço e o menu.");
      return;
    }
    setLoading(true);
    const res = await fetch(
      `http://localhost:5000/api/perguntas-admin/${filtro.id_card}/${encodeURIComponent(filtro.menu)}`
    );
    const data = await res.json();
    setPerguntas(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const salvar = async e => {
    e.preventDefault();
    await fetch(`http://localhost:5000/api/perguntas/${editando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando)
    });
    setEditando(null);
    buscarPerguntas();
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Administração do Checklist</h1>
        <p>Edite e organize os formulários do sistema</p>
      </header>

      <section className="admin-filters">
        <div className="filter-group">
          <label>Serviço</label>
          <select
            value={filtro.id_card}
            onChange={e => setFiltro({ ...filtro, id_card: e.target.value })}
          >
            <option value="">Selecione</option>
            {opcoes.cards.map(c => (
              <option key={c.id} value={c.id}>{c.titulo}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Menu</label>
          <select
            value={filtro.menu}
            onChange={e => setFiltro({ ...filtro, menu: e.target.value })}
          >
            <option value="">Selecione</option>
            {opcoes.menus.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <button className="btn-primary" onClick={buscarPerguntas}>
          <FiSearch /> Buscar
        </button>
      </section>

      <section className="admin-list">
        {loading && <p className="loading">Carregando perguntas...</p>}

        {!loading && perguntas.map(p => (
          <div className="question-card" key={p.id}>
            <div>
              <h4>{p.pergunta_titulo}</h4>
              <span className="secao">{p.secao}</span>
            </div>
            <button className="btn-edit" onClick={() => setEditando(p)}>
              <FiEdit3 />
            </button>
          </div>
        ))}
      </section>

      {editando && (
        <div className="modal-overlay">
          <div className="modal">
            <header>
              <h2>Editar Pergunta</h2>
              <FiX onClick={() => setEditando(null)} />
            </header>

            <form onSubmit={salvar}>
              <label>Seção</label>
              <input
                value={editando.secao}
                onChange={e => setEditando({ ...editando, secao: e.target.value })}
              />

              <label>Título Curto</label>
              <input
                value={editando.pergunta_titulo}
                onChange={e =>
                  setEditando({ ...editando, pergunta_titulo: e.target.value })
                }
              />

              <label>Pergunta Completa</label>
              <textarea
                rows="3"
                value={editando.pergunta_completa}
                onChange={e =>
                  setEditando({ ...editando, pergunta_completa: e.target.value })
                }
              />

              <label>Ajuda</label>
              <textarea
                rows="4"
                value={editando.ajuda || ""}
                onChange={e =>
                  setEditando({ ...editando, ajuda: e.target.value })
                }
              />

              <button className="btn-save">
                <FiSave /> Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
