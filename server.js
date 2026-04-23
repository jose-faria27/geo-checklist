const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

// Log de Requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Função auxiliar para normalizar o path (tenta com e sem /checklist/)
const buscarPorPath = async (decodedUrl, queryCallback) => {
  const pathAlternativo = decodedUrl.startsWith('/checklist/') 
    ? decodedUrl.replace('/checklist/', '') 
    : `/checklist/${decodedUrl}`;
  return queryCallback(decodedUrl, pathAlternativo);
};

// --- ROTAS DO CHECKLIST (USUÁRIO) ---
app.get('/api/cards', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM db_checklist.cards_servicos ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Erro ao buscar cards.');
  }
});

app.get('/api/checklist/:url', async (req, res) => {
  const { url } = req.params;
  const decodedUrl = decodeURIComponent(url);
  try {
    const query = `
      SELECT 
        pc.id,
        cs.title AS titulo,
        pc.menu_origem,
        pc.secao,
        pc.pergunta_titulo,
        pc.pergunta_completa,
        pc.ajuda,
        pc.id_card
      FROM db_checklist.perguntas_checklist pc
      INNER JOIN db_checklist.cards_servicos cs ON pc.id_card = cs.id 
      WHERE cs.route_path = $1
      AND pc.ativo = TRUE
      ORDER BY pc.ordem ASC`;
    const result = await db.query(query, [decodedUrl]);
    res.json(result.rows);
    console.log("Buscando por route_path:", decodedUrl);
  } catch (err) {
    res.status(500).send('Erro ao buscar checklist.');
  }
});

// Rota para buscar título do checklist (captura qualquer path após /api/titulo-checklist/)
app.get(/^\/api\/titulo-checklist\/(.+)$/, async (req, res) => {
  const urlPath = req.params[0] || '';
  const decodedUrl = decodeURIComponent(urlPath);
  
  try {
    const result = await buscarPorPath(decodedUrl, async (path1, path2) => {
      const query = `
        SELECT cs.title AS titulo
        FROM db_checklist.cards_servicos cs
        WHERE cs.route_path = $1 OR cs.route_path = $2
        LIMIT 1`;
      return await db.query(query, [path1, path2]);
    });
    
    if (result.rows.length > 0) {
      res.json({ titulo: result.rows[0].titulo });
    } else {
      res.json({ titulo: "Checklist" });
    }
  } catch (err) {
    console.error("Erro ao buscar título:", err);
    res.status(500).json({ error: 'Erro ao buscar título.' });
  }
});

// Rota para buscar menus do checklist (captura qualquer path após /api/menus-checklist/)
app.get(/^\/api\/menus-checklist\/(.+)$/, async (req, res) => {
  const urlPath = req.params[0] || '';
  const decodedUrl = decodeURIComponent(urlPath);
  
  try {
    const result = await buscarPorPath(decodedUrl, async (path1, path2) => {
      const query = `
        SELECT DISTINCT pc.menu_origem
        FROM db_checklist.perguntas_checklist pc
        INNER JOIN db_checklist.cards_servicos cs ON pc.id_card = cs.id 
        WHERE (cs.route_path = $1 OR cs.route_path = $2) AND pc.menu_origem IS NOT NULL
        AND pc.ativo = TRUE
        ORDER BY pc.menu_origem ASC`;
      return await db.query(query, [path1, path2]);
    });
    
    const menus = result.rows.map(row => row.menu_origem);
    res.json({ menus, defaultMenu: menus[0] || null });
  } catch (err) {
    console.error("Erro ao buscar menus:", err);
    res.status(500).json({ error: 'Erro ao buscar menus.' });
  }
});

// Rota para buscar perguntas filtradas por URL e menu (captura path após /api/perguntas/)
app.get(/^\/api\/perguntas\/(.+)\/(.+)$/, async (req, res) => {
  const urlPath = req.params[0] || '';
  const menu = req.params[1] || '';
  const decodedUrl = decodeURIComponent(urlPath);
  const decodedMenu = decodeURIComponent(menu);
  
  try {
    const result = await buscarPorPath(decodedUrl, async (path1, path2) => {
      const query = `
        SELECT 
          pc.id,
          cs.title AS titulo,
          pc.menu_origem,
          pc.secao,
          pc.pergunta_titulo,
          pc.pergunta_completa,
          pc.ajuda,
          pc.id_card
        FROM db_checklist.perguntas_checklist pc
        INNER JOIN db_checklist.cards_servicos cs ON pc.id_card = cs.id 
        WHERE (cs.route_path = $1 OR cs.route_path = $2) AND pc.menu_origem = $3
        AND pc.ativo = TRUE
        ORDER BY pc.ordem ASC`;
      return await db.query(query, [path1, path2, decodedMenu]);
    });
    
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar perguntas:", err);
    res.status(500).json({ error: 'Erro ao buscar perguntas.' });
  }
});

// --- ROTAS DE ADMINISTRAÇÃO (EDIÇÃO) ---

// 1. Busca opções para preencher os dropdowns do Admin
app.get('/api/form-options', async (req, res) => {
  try {
    const cards = await db.query('SELECT id, title AS titulo FROM db_checklist.cards_servicos ORDER BY title ASC');
    const menus = await db.query('SELECT DISTINCT menu_origem FROM db_checklist.perguntas_checklist WHERE menu_origem IS NOT NULL AND pc.ativo = TRUE ORDER BY menu_origem ASC');
    const secoes = await db.query('SELECT DISTINCT secao FROM db_checklist.perguntas_checklist WHERE secao IS NOT NULL AND pc.ativo = TRUE ORDER BY secao ASC');

    res.json({
      cards: cards.rows,
      menus: menus.rows.map(r => r.menu_origem),
      secoes: secoes.rows.map(r => r.secao)
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar opções", details: err.message });
  }
});

// 2. Lista perguntas filtradas para o Admin
app.get('/api/perguntas-admin/:id_card/:menu', async (req, res) => {
  const { id_card, menu } = req.params;
  try {
    const query = `
      SELECT id, secao, pergunta_titulo, pergunta_completa, ajuda, menu_origem 
      FROM db_checklist.perguntas_checklist 
      WHERE id_card = $1 AND menu_origem = $2
      AND pc.ativo = TRUE
      ORDER BY id ASC`;
    const result = await db.query(query, [id_card, decodeURIComponent(menu)]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Salva a edição (Foco total na tabela perguntas_checklist)
app.put('/api/perguntas/:id', async (req, res) => {
  const { id } = req.params;
  const { pergunta_completa, pergunta_titulo, ajuda, secao, menu_origem } = req.body;
  
  try {
    const query = `
      UPDATE db_checklist.perguntas_checklist 
      SET pergunta_completa = $1, pergunta_titulo = $2, ajuda = $3, secao = $4, menu_origem = $5 
      WHERE id = $6`;
    const values = [pergunta_completa, pergunta_titulo, ajuda, secao, menu_origem, id];
    
    const result = await db.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ error: "Pergunta não encontrada" });
    
    res.json({ message: "Pergunta atualizada com sucesso!" });
  } catch (err) {
    console.error("Erro no Update:", err.message);
    res.status(500).json({ error: "Erro ao salvar no banco." });
  }
});

// 4. Finalizar checklist - Salva no banco db_qualidade.checklist_pedidos
app.post('/api/finalizar-checklist', async (req, res) => {
  const { tarefa, pagina, resultado, aba } = req.body;

  // Validação dos dados obrigatórios
  if (!tarefa || !pagina || !aba) {
    return res.status(400).json({ error: "Dados obrigatórios faltando: tarefa, pagina e aba são necessários." });
  }

  try {
    // Converter array de resultado para JSON string
    const resultadoJSON = Array.isArray(resultado) ? JSON.stringify(resultado) : resultado;

    const query = `
      INSERT INTO db_qualidade.checklist_pedidos (tarefa, pagina, resultado, aba, data_carga)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING tarefa, pagina, aba, data_carga`;

    const values = [tarefa, pagina, resultadoJSON, aba];
    
    const result = await db.query(query, values);
    
    console.log('Checklist salvo com sucesso:', result.rows[0]);
    res.json({ 
      message: "Checklist finalizado e salvo com sucesso!",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Erro ao salvar checklist:", err.message);
    res.status(500).json({ error: "Erro ao salvar checklist no banco de dados.", details: err.message });
  }
});

// 5.1. Buscar menus de ordens filtrado por titulo (ordenado pela coluna ordem)
app.get(/^\/api\/menus-ordens\/(.+)$/, async (req, res) => {
  const tituloPath = req.params[0] || '';
  const decodedTitulo = decodeURIComponent(tituloPath);
  
  try {
    // Agrupa por menu_origem e ordena pelo menor valor de ordem para cada menu
    const query = `
      SELECT menu_origem, MIN(ordem) as ordem
      FROM db_checklist.perguntas_ordens
      WHERE LOWER(TRIM(titulo)) = LOWER(TRIM($1)) AND menu_origem IS NOT NULL
      GROUP BY menu_origem
      ORDER BY MIN(ordem) ASC`;
    
    const result = await db.query(query, [decodedTitulo]);
    const menus = result.rows.map(row => row.menu_origem);
    
    res.json({ menus, defaultMenu: menus[0] || null });
  } catch (err) {
    console.error("Erro ao buscar menus de ordens:", err.message);
    // Se a coluna ordem não existir, tenta ordenar por menu_origem como fallback
    if (err.message.includes('ordem') || err.message.includes('column')) {
      try {
        console.log("[DEBUG] Coluna 'ordem' não encontrada, usando fallback...");
        const queryFallback = `
          SELECT DISTINCT menu_origem
          FROM db_checklist.perguntas_ordens
          WHERE LOWER(TRIM(titulo)) = LOWER(TRIM($1)) AND menu_origem IS NOT NULL
          ORDER BY menu_origem ASC`;
        
        const resultFallback = await db.query(queryFallback, [decodedTitulo]);
        const menusFallback = resultFallback.rows.map(row => row.menu_origem);
        return res.json({ menus: menusFallback, defaultMenu: menusFallback[0] || null });
      } catch (err2) {
        console.error("Erro no fallback:", err2.message);
      }
    }
    res.status(500).json({ error: 'Erro ao buscar menus de ordens.', details: err.message });
  }
});

// 5.2. Buscar perguntas de ordens filtrado por titulo e menu
app.get(/^\/api\/perguntas-ordens\/(.+)\/(.+)$/, async (req, res) => {
  const tituloPath = req.params[0] || '';
  const menuPath = req.params[1] || '';
  const decodedTitulo = decodeURIComponent(tituloPath);
  const decodedMenu = decodeURIComponent(menuPath);
  
  console.log(`[DEBUG] Buscando perguntas de ordens para título: "${decodedTitulo}" e menu: "${decodedMenu}"`);
  
  try {
    const query = `
      SELECT 
        id,
        titulo,
        menu_origem,
        secao,
        pergunta_titulo,
        pergunta_completa,
        ajuda
      FROM db_checklist.perguntas_ordens
      WHERE LOWER(TRIM(titulo)) = LOWER(TRIM($1)) AND menu_origem = $2
      ORDER BY id ASC`;
    
    const result = await db.query(query, [decodedTitulo, decodedMenu]);
    
    console.log(`[DEBUG] Encontradas ${result.rows.length} perguntas para "${decodedTitulo}" e menu "${decodedMenu}"`);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar perguntas de ordens:", err.message);
    res.status(500).json({ error: 'Erro ao buscar perguntas de ordens.', details: err.message });
  }
});

// 5.3. Buscar perguntas de ordens apenas por titulo (fallback quando não houver menu)
app.get(/^\/api\/perguntas-ordens\/(.+)$/, async (req, res) => {
  const tituloPath = req.params[0] || '';
  const decodedTitulo = decodeURIComponent(tituloPath);
  
  console.log(`[DEBUG] Buscando perguntas de ordens para título: "${decodedTitulo}" (sem filtro de menu)`);
  
  try {
    const query = `
      SELECT 
        id,
        titulo,
        menu_origem,
        secao,
        pergunta_titulo,
        pergunta_completa,
        ajuda
      FROM db_checklist.perguntas_ordens
      WHERE LOWER(TRIM(titulo)) = LOWER(TRIM($1))
      ORDER BY id ASC`;
    
    const result = await db.query(query, [decodedTitulo]);
    
    console.log(`[DEBUG] Encontradas ${result.rows.length} perguntas para "${decodedTitulo}" (sem filtro de menu)`);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar perguntas de ordens:", err.message);
    res.status(500).json({ error: 'Erro ao buscar perguntas de ordens.', details: err.message });
  }
});

// 6. Finalizar checklist de ordens - Salva no banco db_qualidade.checklist_pedidos
app.post('/api/finalizar-checklist-ordens', async (req, res) => {
  const { tarefa, pagina, resultado, titulo } = req.body;

  // Validação dos dados obrigatórios
  if (!tarefa || !pagina || !titulo) {
    return res.status(400).json({ error: "Dados obrigatórios faltando: tarefa, pagina e titulo são necessários." });
  }

  try {
    // Converter array de resultado para JSON string
    const resultadoJSON = Array.isArray(resultado) ? JSON.stringify(resultado) : resultado;

    // Usa a coluna 'aba' ao invés de 'titulo' (mesma estrutura da tabela checklist_pedidos)
    const query = `
      INSERT INTO db_qualidade.checklist_pedidos (tarefa, pagina, resultado, aba, data_carga)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING tarefa, pagina, aba, data_carga`;

    const values = [tarefa, pagina, resultadoJSON, titulo]; // titulo vai para a coluna aba
    
    const result = await db.query(query, values);
    
    console.log('Checklist de ordens salvo com sucesso:', result.rows[0]);
    res.json({ 
      message: "Checklist de ordens finalizado e salvo com sucesso!",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("Erro ao salvar checklist de ordens:", err.message);
    res.status(500).json({ error: "Erro ao salvar checklist de ordens no banco de dados.", details: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Servidor Admin/User rodando na porta ${PORT}`));