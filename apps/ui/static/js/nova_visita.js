// ========== VARI+üVEIS GLOBAIS ==========
let grupoVisita = null;
let pessoasAdicionadas = [];
let veiculosAdicionados = [];
let modoGerenciamento = false;
let visitaExistenteId = null;

// LocalStorage key para rascunho de nova visita
const DRAFT_KEY = 'nova_visita_draft_v1';

// Tempo (ms) para exibir o badge de rascunho carregado
const DRAFT_DISPLAY_MS = 5000;
let draftBadgeTimeout = null;
const MIN_SEARCH_CHARS = 3;

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function salvarDraft() {
  if (isModoGerenciamento()) return;
  try {
    const motivoEl = document.getElementById('motivo');
    const responsavelEl = document.getElementById('responsavel');
    const observacaoEl = document.getElementById('observacao');
    const draft = {
      motivo: motivoEl ? motivoEl.value : '',
      responsavel: responsavelEl ? responsavelEl.value : '',
      observacao: observacaoEl ? observacaoEl.value : '',
      pessoas: pessoasAdicionadas || [],
      veiculos: veiculosAdicionados || [],
      grupoVisita: !!grupoVisita,
      saved_at: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    console.error('Erro ao salvar rascunho:', e);
  }
}

function carregarDraft() {
  if (isModoGerenciamento()) return;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);

    const motivoEl = document.getElementById('motivo');
    const responsavelEl = document.getElementById('responsavel');
    const observacaoEl = document.getElementById('observacao');

    if (motivoEl && draft.motivo) motivoEl.value = draft.motivo;
    if (responsavelEl && draft.responsavel) responsavelEl.value = draft.responsavel;
    if (observacaoEl && draft.observacao) observacaoEl.value = draft.observacao;

    pessoasAdicionadas = ensureArray(draft.pessoas);
    veiculosAdicionados = ensureArray(draft.veiculos);
    atualizarTabelaPessoas();
    atualizarTabelaVeiculos();
    atualizarEstadoBotaoRegistrar();

    // Mostrar badge de rascunho carregado com timestamp (se disponível)
    try {
      const draftBadge = document.getElementById('draftBadge');
      if (draftBadge) {
        if (draft.saved_at) {
          const dt = new Date(draft.saved_at);
          draftBadge.textContent = `Rascunho carregado (${dt.toLocaleString()})`;
        } else {
          draftBadge.textContent = 'Rascunho carregado';
        }
        draftBadge.classList.remove('d-none');

        // Limpar timeout anterior se existir
        try { if (draftBadgeTimeout) { clearTimeout(draftBadgeTimeout); draftBadgeTimeout = null; } } catch (e) {}

        // Esconder o badge automaticamente após DRAFT_DISPLAY_MS
        draftBadgeTimeout = setTimeout(() => {
          try {
            draftBadge.classList.add('d-none');
            draftBadge.textContent = '';
          } catch (e) {}
          draftBadgeTimeout = null;
        }, DRAFT_DISPLAY_MS);
      }
    } catch (e) { /* ignore */ }
  } catch (e) {
    console.error('Erro ao carregar rascunho:', e);
  }
}

function limparDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) { console.error(e); }
  try {
    const draftBadge = document.getElementById('draftBadge');
    if (draftBadge) {
      draftBadge.classList.add('d-none');
      draftBadge.textContent = '';
    }
  } catch (e) { /* ignore */ }
}


// Modal instances (iniciadas em modal_seleciona_pessoa.js e modal_seleciona_veiculo.js)
// let modalBuscaPessoa = null;
// let modalBuscaVeiculo = null;

// ========== FUN+ç+òES GLOBAIS ==========

// CSRF
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const csrftoken = getCookie("csrftoken");

// Fun+º+úo para verificar se estamos na p+ígina de gerenciamento
function isModoGerenciamento() {
  return window.modoGerenciamento === true;
}

// Fun+º+Áes auxiliares
function mostrarOverlay() {
  // Deprecated - modal Bootstrap n+úo precisa de overlay
}

function esconderOverlay() {
  // Deprecated - modal Bootstrap n+úo precisa de overlay
}

function mostrarBuscaPessoa() {
  console.log("Mostrar busca pessoa - Modo Gerenciamento:", isModoGerenciamento());
  
  // Usar modal Bootstrap unificado
  if (typeof modalBuscaPessoa !== 'undefined' && modalBuscaPessoa) {
    document.getElementById('buscaPessoaInput').value = '';
    document.getElementById('listaSugestoesPessoa').innerHTML = '';
    modalBuscaPessoa.show();
  } else {
    console.error('Modal Bootstrap de busca de pessoa n+úo inicializado');
  }
}

function esconderBuscaPessoa() {
  // Fechar modal Bootstrap
  if (typeof modalBuscaPessoa !== 'undefined' && modalBuscaPessoa) {
    modalBuscaPessoa.hide();
  }
}

function mostrarBuscaVeiculo() {
  console.log("Mostrar busca ve+¡culo - Modo Gerenciamento:", isModoGerenciamento());
  
  // Usar modal Bootstrap unificado
  if (typeof modalBuscaVeiculo !== 'undefined' && modalBuscaVeiculo) {
    document.getElementById('buscaVeiculoInput').value = '';
    document.getElementById('listaSugestoesVeiculo').innerHTML = '';
    modalBuscaVeiculo.show();
  } else {
    console.error('Modal Bootstrap de busca de ve+¡culo n+úo inicializado');
  }
}

function esconderBuscaVeiculo() {
  // Fechar modal Bootstrap
  if (typeof modalBuscaVeiculo !== 'undefined' && modalBuscaVeiculo) {
    modalBuscaVeiculo.hide();
  }
}

// Buscar pessoas na API
async function buscarPessoas(query) {
  try {
    const resp = await fetch(`/api/pessoas/pessoas/buscar/?q=${encodeURIComponent(query)}`, {
      credentials: 'same-origin',
      headers: {
        "X-CSRFToken": csrftoken,
        "Accept": "application/json",
      },
    });
    
    if (!resp.ok) {
      console.error("Status:", resp.status, "URL:", resp.url);
      throw new Error("Erro ao buscar pessoas");
    }
    
    const data = await resp.json();
    console.log("Dados retornados da API pessoas:", data);
    return data.pessoas || [];
  } catch (error) {
    console.error("Erro ao buscar pessoas:", error);
    return [];
  }
}

// Buscar ve+¡culos na API
async function buscarVeiculos(query) {
  try {
    const resp = await fetch(`/api/veiculos/veiculos/buscar/?q=${encodeURIComponent(query)}`, {
      credentials: 'same-origin',
      headers: {
        "X-CSRFToken": csrftoken,
        "Accept": "application/json",
      },
    });
    
    if (!resp.ok) {
      console.error("Status:", resp.status, "URL:", resp.url);
      throw new Error("Erro ao buscar ve+¡culos");
    }
    
    const data = await resp.json();
    console.log("Dados retornados da API ve+¡culos:", data);
    return data.veiculos || [];
  } catch (error) {
    console.error("Erro ao buscar ve+¡culos:", error);
    return [];
  }
}

const PRESENTES_CACHE_MS = 30000;
let presentesCache = null;
let presentesCacheAt = 0;

async function carregarPresentes() {
  const agora = Date.now();
  if (presentesCache && (agora - presentesCacheAt) < PRESENTES_CACHE_MS) {
    return presentesCache;
  }

  try {
    const resp = await fetch("/api/visitas/presentes/", {
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!resp.ok) {
      console.error("Status:", resp.status, "URL:", resp.url);
      throw new Error("Erro ao buscar presentes");
    }

    const data = await resp.json();
    presentesCache = {
      pessoas: (data && Array.isArray(data.pessoas)) ? data.pessoas : [],
      veiculos: (data && Array.isArray(data.veiculos)) ? data.veiculos : [],
    };
  } catch (error) {
    console.error("Erro ao buscar presentes:", error);
    presentesCache = { pessoas: [], veiculos: [] };
  }

  presentesCacheAt = Date.now();
  return presentesCache;
}

async function listarPessoasEmVisita() {
  const data = await carregarPresentes();
  return data.pessoas
    .filter(item => !item.data_saida)
    .reduce((acc, item) => {
      acc[item.pessoa_id] = item.grupo_id;
      return acc;
    }, {});
}

async function listarVeiculosEmVisita() {
  const data = await carregarPresentes();
  return data.veiculos
    .filter(item => !item.data_saida)
    .reduce((acc, item) => {
      const veiculoId = item.veiculo_id || item.veiculo;
      if (veiculoId) acc[veiculoId] = item.grupo_id;
      return acc;
    }, {});
}


let modalSugestoesVeiculo = null;
let sugestoesVeiculoPessoasMap = {};

async function buscarSugestoesVeiculo(veiculoId) {
  try {
    const resp = await fetch(`/api/visitas/veiculos/${veiculoId}/sugestoes/`, {
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!resp.ok) {
      console.error("Status:", resp.status, "URL:", resp.url);
      throw new Error("Erro ao buscar sugestoes do veiculo");
    }

    return await resp.json();
  } catch (error) {
    console.error("Erro ao buscar sugestoes do veiculo:", error);
    return null;
  }
}

function renderPessoaSugestaoItem(pessoa, options) {
  const pessoaId = getPessoaKey(pessoa);
  if (!pessoaId) return "";

  const nome = pessoa.nome || pessoa.nome_completo || "Sem nome";
  const empresa = pessoa.empresa || pessoa.empresa_nome || "Sem empresa";
  const pessoasEmVisita = (options && options.pessoasEmVisita) || {};
  const ultimaVisitaId = (options && options.ultimaVisitaId) || null;

  const jaAdicionada = ensureArray(pessoasAdicionadas)
    .some(p => String(p.id) === String(pessoaId));
  const visitaAtiva = pessoasEmVisita[pessoaId];
  const disabled = jaAdicionada || !!visitaAtiva;
  const btnClass = disabled ? "btn-outline-secondary" : "btn-primary";

  let label = "Adicionar";
  if (jaAdicionada) label = "Ja adicionada";
  else if (visitaAtiva) label = `Em visita #${visitaAtiva}`;

  const linkVisita = visitaAtiva
    ? `<a href="/visitas/${visitaAtiva}/" target="_blank" rel="noopener"
         class="btn btn-sm btn-outline-secondary btnInlineAbrirVisita">Visita #${visitaAtiva}</a>`
    : "";
  const meta = ultimaVisitaId
    ? `<div class="text-muted small">Ultima visita #${ultimaVisitaId}</div>`
    : "";

  return `
    <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${pessoaId}">
      <div>
        <strong>${nome}</strong><br>
        <small class="text-muted">${empresa}</small>
        ${meta}
      </div>
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm ${btnClass} btnAdicionarPessoaSugestao" data-id="${pessoaId}" ${disabled ? "disabled" : ""}>
          ${label}
        </button>
        ${linkVisita}
      </div>
    </li>
  `;
}

async function mostrarModalSugestoesVeiculo(veiculo) {
  if (!veiculo || !veiculo.id) return;

  const modalEl = document.getElementById("modalSugestoesVeiculo");
  if (!modalEl) return;
  if (!modalSugestoesVeiculo) {
    modalSugestoesVeiculo = new bootstrap.Modal(modalEl);
  }

  const tituloEl = document.getElementById("sugestaoVeiculoTitulo");
  const loadingEl = document.getElementById("sugestaoVeiculoLoading");
  const erroEl = document.getElementById("sugestaoVeiculoErro");
  const listaEmpresaEl = document.getElementById("listaPessoasEmpresaVeiculo");
  const listaUltimasEl = document.getElementById("listaPessoasUltimasVisitasVeiculo");

  if (tituloEl) {
    const placa = veiculo.placa || "";
    tituloEl.textContent = placa ? placa : `#${veiculo.id}`;
  }
  if (erroEl) erroEl.classList.add("d-none");
  if (erroEl) erroEl.textContent = "";
  if (listaEmpresaEl) listaEmpresaEl.innerHTML = "";
  if (listaUltimasEl) listaUltimasEl.innerHTML = "";
  if (loadingEl) loadingEl.classList.remove("d-none");

  modalSugestoesVeiculo.show();

  const data = await buscarSugestoesVeiculo(veiculo.id);
  if (!data) {
    if (erroEl) {
      erroEl.textContent = "Nao foi possivel carregar as sugestoes.";
      erroEl.classList.remove("d-none");
    }
    if (loadingEl) loadingEl.classList.add("d-none");
    return;
  }

  const pessoasEmVisita = await listarPessoasEmVisita();
  const pessoasEmpresaRaw = Array.isArray(data.pessoas_empresa) ? data.pessoas_empresa : [];
  const pessoasUltimasRaw = Array.isArray(data.pessoas_ultimas_visitas) ? data.pessoas_ultimas_visitas : [];

  const pessoasEmpresa = [];
  const pessoasUltimas = [];
  const vistosEmpresa = new Set();
  const vistosUltimas = new Set();

  pessoasEmpresaRaw.forEach(p => {
    const pid = getPessoaKey(p);
    if (!pid || vistosEmpresa.has(String(pid))) return;
    vistosEmpresa.add(String(pid));
    pessoasEmpresa.push(p);
  });

  pessoasUltimasRaw.forEach(p => {
    const pid = getPessoaKey(p);
    if (!pid || vistosUltimas.has(String(pid))) return;
    vistosUltimas.add(String(pid));
    pessoasUltimas.push(p);
  });

  sugestoesVeiculoPessoasMap = {};
  [...pessoasEmpresa, ...pessoasUltimas].forEach(p => {
    const pid = getPessoaKey(p);
    if (pid) sugestoesVeiculoPessoasMap[String(pid)] = p;
  });

  if (listaEmpresaEl) {
    if (!pessoasEmpresa.length) {
      listaEmpresaEl.innerHTML = '<li class="list-group-item text-muted">Nenhuma pessoa encontrada</li>';
    } else {
      listaEmpresaEl.innerHTML = pessoasEmpresa
        .map(p => renderPessoaSugestaoItem(p, { pessoasEmVisita }))
        .join("");
    }
  }

  if (listaUltimasEl) {
    if (!pessoasUltimas.length) {
      listaUltimasEl.innerHTML = '<li class="list-group-item text-muted">Nenhuma pessoa encontrada</li>';
    } else {
      listaUltimasEl.innerHTML = pessoasUltimas
        .map(p => renderPessoaSugestaoItem(p, { pessoasEmVisita, ultimaVisitaId: p.grupo_id }))
        .join("");
    }
  }

  if (loadingEl) loadingEl.classList.add("d-none");

  document.querySelectorAll(".btnAdicionarPessoaSugestao").forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", (ev) => {
      const id = ev.currentTarget.dataset.id;
      const pessoa = sugestoesVeiculoPessoasMap[id];
      if (pessoa) {
        adicionarPessoaATabela(pessoa);
        ev.currentTarget.disabled = true;
        ev.currentTarget.classList.remove("btn-primary");
        ev.currentTarget.classList.add("btn-outline-secondary");
        ev.currentTarget.textContent = "Adicionada";
      }
    });
  });
}

// Adicionar pessoa +á tabela (apenas para nova visita)
function adicionarPessoaATabela(pessoa) {
  if (isModoGerenciamento()) {
    // No modo gerenciamento, adicionar diretamente +á visita existente
    adicionarPessoaNaVisitaExistente(pessoa.id);
    return;
  }
  
  // C+¦digo original para nova visita
  if (pessoasAdicionadas.some(p => p.id === pessoa.id)) {
    alert("Esta pessoa j+í foi adicionada +á visita");
    return;
  }
  
  pessoasAdicionadas.push(pessoa);
  atualizarTabelaPessoas();
  atualizarEstadoBotaoRegistrar();
  salvarDraft();
}

// Adicionar ve+¡culo +á tabela (apenas para nova visita)
function adicionarVeiculoATabela(veiculo) {
  if (isModoGerenciamento()) {
    // No modo gerenciamento, adicionar diretamente a visita existente
    adicionarVeiculoNaVisitaExistente(veiculo.id);
    return;
  }

  // Codigo original para nova visita
  if (veiculosAdicionados.some(v => v.id === veiculo.id)) {
    alert("Este veiculo ja foi adicionado a visita");
    return;
  }

  veiculosAdicionados.push(veiculo);
  atualizarTabelaVeiculos();
  salvarDraft();
  mostrarModalSugestoesVeiculo(veiculo);
}


function renderPessoaInputRow() {
  return `
    <tr>
      <td colspan="4">
        <div class="autocomplete-wrap">
          <input id="pessoaSearchInput" class="form-control form-control-sm" placeholder="Digite o nome (min 3 caracteres)">
          <div id="pessoaSuggestions" class="list-group mt-2 autocomplete-list"></div>
        </div>
      </td>
    </tr>
  `;
}


function getPessoaKey(pessoa) {
  return pessoa && (pessoa.id || pessoa.pessoa_id);
}

function getVeiculoKey(veiculo) {
  return veiculo && (veiculo.id || veiculo.veiculo_id);
}

function renderPessoaSuggestionItem(pessoa, visitaGrupoId) {
  const nome = pessoa.nome || pessoa.nome_completo || "Sem nome";
  const empresa = pessoa.empresa || pessoa.empresa_nome || "Sem empresa";
  const visitaAttr = visitaGrupoId ? ` data-visita-grupo="${visitaGrupoId}"` : "";
  const disabledAttr = visitaGrupoId ? "disabled" : "";
  const btnClass = visitaGrupoId ? "btn-outline-secondary" : "btn-primary";
  const label = visitaGrupoId ? `Em visita #${visitaGrupoId}` : "Adicionar";
  const itemClass = visitaGrupoId
    ? "list-group-item d-flex justify-content-between align-items-center"
    : "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
  const linkVisita = visitaGrupoId
    ? `<a href="/visitas/${visitaGrupoId}/" target="_blank" rel="noopener"
         class="btn btn-sm btn-outline-secondary btnInlineAbrirVisita">
         Visita #${visitaGrupoId}
       </a>`
    : "";

  return `
    <div class="${itemClass}"${visitaAttr} data-id="${pessoa.id}">
      <div>
        <strong>${nome}</strong><br>
        <small class="text-muted">${empresa}</small>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm ${btnClass} btnInlineAddPessoa" data-id="${pessoa.id}" ${disabledAttr}>
          ${label}
        </button>
        ${linkVisita}
      </div>
    </div>
  `;
}
function renderVeiculoSuggestionItem(veiculo, visitaGrupoId) {
  const placa = veiculo.placa || "Sem placa";
  const modelo = veiculo.modelo || veiculo.marca || "Modelo nao informado";
  const empresa = veiculo.empresa || veiculo.empresa_nome || "Sem empresa";
  const visitaAttr = visitaGrupoId ? ` data-visita-grupo="${visitaGrupoId}"` : "";
  const disabledAttr = visitaGrupoId ? "disabled" : "";
  const btnClass = visitaGrupoId ? "btn-outline-secondary" : "btn-primary";
  const label = visitaGrupoId ? `Em visita #${visitaGrupoId}` : "Adicionar";
  const itemClass = visitaGrupoId
    ? "list-group-item d-flex justify-content-between align-items-center"
    : "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
  const linkVisita = visitaGrupoId
    ? `<a href="/visitas/${visitaGrupoId}/" target="_blank" rel="noopener"
         class="btn btn-sm btn-outline-secondary btnInlineAbrirVisita">
         Visita #${visitaGrupoId}
       </a>`
    : "";
  const veiculoId = getVeiculoKey(veiculo) || "";

  return `
    <div class="${itemClass}"${visitaAttr} data-id="${veiculoId}">
      <div>
        <strong>${placa}</strong><br>
        <small class="text-muted">${modelo}</small>
        <div class="text-muted small">${empresa}</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm ${btnClass} btnInlineAddVeiculo" data-id="${veiculoId}" ${disabledAttr}>
          ${label}
        </button>
        ${linkVisita}
      </div>
    </div>
  `;
}

function renderVeiculoInputRow() {
  return `
    <tr>
      <td colspan="4">
        <div class="autocomplete-wrap">
          <input id="veiculoSearchInput" class="form-control form-control-sm" placeholder="Digite placa ou modelo (min 3 caracteres)">
          <div id="veiculoSuggestions" class="list-group mt-2 autocomplete-list"></div>
        </div>
      </td>
    </tr>
  `;
}

function bindPessoaInlineSearch() {
  const input = document.getElementById("pessoaSearchInput");
  const lista = document.getElementById("pessoaSuggestions");
  if (!input || !lista || input.dataset._boundInline) return;

  input.dataset._boundInline = "1";
  lista.dataset._boundInline = "1";
  input._lastPessoas = [];

  const handleInput = async (e) => {
    const query = e.target.value.trim();
    if (query.length < MIN_SEARCH_CHARS) {
      lista.innerHTML = "";
      return;
    }
    const pessoas = await buscarPessoas(query);
    input._lastPessoas = pessoas;

    if (!pessoas.length) {
      lista.innerHTML = '<div class="list-group-item text-center text-muted">Nenhuma pessoa encontrada</div>';
      return;
    }

    const pessoasEmVisita = await listarPessoasEmVisita();
    lista.innerHTML = pessoas.map((pessoa) => (
      renderPessoaSuggestionItem(pessoa, pessoasEmVisita[getPessoaKey(pessoa)])
    )).join("");
  };

  input.addEventListener("input", handleInput);
  input.addEventListener("keyup", handleInput);
  input.addEventListener("blur", () => {
    setTimeout(() => { lista.innerHTML = ""; }, 150);
  });

  const handleSelect = (e) => {
    const link = e.target.closest(".btnInlineAbrirVisita");
    if (link) {
      if (e.type === "pointerdown") e.preventDefault();
      return;
    }

    const row = e.target.closest(".list-group-item[data-id]");
    if (!row) return;
    if (e.type === "pointerdown") e.preventDefault();
    if (row.dataset.visitaGrupo) return;
    const pessoaId = row.dataset.id;
    const pessoa = (input._lastPessoas || []).find(p => String(p.id) === String(pessoaId));
    if (pessoa) {
      adicionarPessoaATabela(pessoa);
      input.value = "";
      lista.innerHTML = "";
      input.focus();
    }
  };

  lista.addEventListener("click", handleSelect);
  lista.addEventListener("pointerdown", handleSelect);
}
function bindVeiculoInlineSearch() {
  const input = document.getElementById("veiculoSearchInput");
  const lista = document.getElementById("veiculoSuggestions");
  if (!input || !lista || input.dataset._boundInline) return;

  input.dataset._boundInline = "1";
  lista.dataset._boundInline = "1";
  input._lastVeiculos = [];

  const handleInput = async (e) => {
    const query = e.target.value.trim();
    if (query.length < MIN_SEARCH_CHARS) {
      lista.innerHTML = "";
      return;
    }
    const veiculos = await buscarVeiculos(query);
    input._lastVeiculos = veiculos;

    if (!veiculos.length) {
      lista.innerHTML = '<div class="list-group-item text-center text-muted">Nenhum veiculo encontrado</div>';
      return;
    }

    const veiculosEmVisita = await listarVeiculosEmVisita();


    lista.innerHTML = veiculos.map((veiculo) => (


      renderVeiculoSuggestionItem(veiculo, veiculosEmVisita[getVeiculoKey(veiculo)])


    )).join("");
  };

  input.addEventListener("input", handleInput);
  input.addEventListener("keyup", handleInput);
  input.addEventListener("blur", () => {
    setTimeout(() => { lista.innerHTML = ""; }, 150);
  });

  const handleSelect = (e) => {
    const link = e.target.closest(".btnInlineAbrirVisita");
    if (link) {
      if (e.type === "pointerdown") e.preventDefault();
      return;
    }

    const row = e.target.closest(".list-group-item[data-id]");
    if (!row) return;
    if (e.type === "pointerdown") e.preventDefault();
    if (row.dataset.visitaGrupo) return;
    const veiculoId = row.dataset.id;
    const veiculo = (input._lastVeiculos || []).find(v => String(v.id) === String(veiculoId));
    if (veiculo) {
      adicionarVeiculoATabela(veiculo);
      input.value = "";
      lista.innerHTML = "";
      input.focus();
    }
  };

  lista.addEventListener("click", handleSelect);
  lista.addEventListener("pointerdown", handleSelect);
}

function setupInlineAutocompleteDelegation() {
  if (window._inlineAutocompleteDelegated) return;
  window._inlineAutocompleteDelegated = true;

  const handleInline = async (e) => {
    const target = e.target;
    if (!target || !target.id) return;

    if (target.id === "pessoaSearchInput") {
      const lista = document.getElementById("pessoaSuggestions");
      if (!lista) return;
      const query = target.value.trim();
      if (query.length < MIN_SEARCH_CHARS) {
        lista.innerHTML = "";
        return;
      }

      if (target._inlineAutoLastQuery === query && e.type !== "change") return;
      target._inlineAutoLastQuery = query;

      const pessoas = await buscarPessoas(query);
      target._lastPessoas = pessoas;

      if (!pessoas.length) {
        lista.innerHTML = '<div class="list-group-item text-center text-muted">Nenhuma pessoa encontrada</div>';
        return;
      }

      const pessoasEmVisita = await listarPessoasEmVisita();
      lista.innerHTML = pessoas.map((pessoa) => (
        renderPessoaSuggestionItem(pessoa, pessoasEmVisita[getPessoaKey(pessoa)])
      )).join("");
      return;
    }

    if (target.id === "veiculoSearchInput") {
      const lista = document.getElementById("veiculoSuggestions");
      if (!lista) return;
      const query = target.value.trim();
      if (query.length < MIN_SEARCH_CHARS) {
        lista.innerHTML = "";
        return;
      }

      if (target._inlineAutoLastQuery === query && e.type !== "change") return;
      target._inlineAutoLastQuery = query;

      const veiculos = await buscarVeiculos(query);
      target._lastVeiculos = veiculos;

      if (!veiculos.length) {
        lista.innerHTML = '<div class="list-group-item text-center text-muted">Nenhum veiculo encontrado</div>';
        return;
      }

      const veiculosEmVisita = await listarVeiculosEmVisita();


      lista.innerHTML = veiculos.map((veiculo) => (


        renderVeiculoSuggestionItem(veiculo, veiculosEmVisita[getVeiculoKey(veiculo)])


      )).join("");
    }
  };

  document.addEventListener("input", handleInline, true);
  document.addEventListener("keyup", handleInline, true);
  document.addEventListener("change", handleInline, true);
  document.addEventListener("focusout", handleInline, true);

  const handleSelect = (e) => {
    const lista = e.target.closest("#pessoaSuggestions, #veiculoSuggestions");
    if (!lista || lista.dataset._boundInline === "1") return;

    if (lista.id === "pessoaSuggestions") {
      const link = e.target.closest(".btnInlineAbrirVisita");
      if (link) {
        if (e.type === "pointerdown") e.preventDefault();
        return;
      }

      const row = e.target.closest(".list-group-item[data-id]");
      if (!row) return;
      if (e.type === "pointerdown") e.preventDefault();
      if (row.dataset.visitaGrupo) return;
      const input = document.getElementById("pessoaSearchInput");
      const pessoaId = row.dataset.id;
      const pessoa = (input && input._lastPessoas || []).find(p => String(p.id) === String(pessoaId));
      if (pessoa) {
        adicionarPessoaATabela(pessoa);
        if (input) {
          input.value = "";
          input.focus();
        }
        lista.innerHTML = "";
      }
      return;
    }

    if (lista.id === "veiculoSuggestions") {
      const link = e.target.closest(".btnInlineAbrirVisita");
      if (link) {
        if (e.type === "pointerdown") e.preventDefault();
        return;
      }

      const row = e.target.closest(".list-group-item[data-id]");
      if (!row) return;
      if (e.type === "pointerdown") e.preventDefault();
      if (row.dataset.visitaGrupo) return;
      const input = document.getElementById("veiculoSearchInput");
      const veiculoId = row.dataset.id;
      const veiculo = (input && input._lastVeiculos || []).find(v => String(v.id) === String(veiculoId));
      if (veiculo) {
        adicionarVeiculoATabela(veiculo);
        if (input) {
          input.value = "";
          input.focus();
        }
        lista.innerHTML = "";
      }
    }
  };

  document.addEventListener("click", handleSelect);
  document.addEventListener("pointerdown", handleSelect);
}

function atualizarEstadoBotaoRegistrar() {
  if (isModoGerenciamento()) return;
  const btnRegistrar = document.getElementById("btnRegistrar");
  if (!btnRegistrar) return;
  const temPessoas = ensureArray(pessoasAdicionadas).length > 0;
  btnRegistrar.disabled = !temPessoas;
}

function atualizarTabelaPessoas() {
  if (isModoGerenciamento()) return;

  const tbPessoas = document.getElementById("tbPessoas");
  if (!tbPessoas) return;

  pessoasAdicionadas = ensureArray(pessoasAdicionadas);
  const rows = pessoasAdicionadas.map((pessoa, index) => `
    <tr data-id="${pessoa.id}">
      <td>${pessoa.nome || pessoa.nome_completo || 'N/A'}</td>
      <td>${pessoa.empresa || pessoa.empresa_nome || 'N/A'}</td>
      <td>${pessoa.tipo || 'Visitante'}</td>
      <td>
        <button class="btn btn-sm btn-danger btnRemoverPessoa" data-index="${index}">
          <i class="bi bi-trash"></i> Remover
        </button>
      </td>
    </tr>
  `);

  rows.push(renderPessoaInputRow());
  tbPessoas.innerHTML = rows.join('');

  document.querySelectorAll('.btnRemoverPessoa').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('button').dataset.index);
      pessoasAdicionadas.splice(index, 1);
      atualizarTabelaPessoas();
      atualizarEstadoBotaoRegistrar();
      salvarDraft();
    });
  });

  bindPessoaInlineSearch();
}

function atualizarTabelaVeiculos() {
  if (isModoGerenciamento()) return;

  const tbVeiculos = document.getElementById("tbVeiculos");
  if (!tbVeiculos) return;

  veiculosAdicionados = ensureArray(veiculosAdicionados);
  const rows = veiculosAdicionados.map((veiculo, index) => `
    <tr data-id="${veiculo.id}">
      <td>${veiculo.placa || 'N/A'}</td>
      <td>${veiculo.modelo || veiculo.marca || 'N/A'}</td>
      <td>${veiculo.empresa || veiculo.empresa_nome || 'N/A'}</td>
      <td>
        <button class="btn btn-sm btn-danger btnRemoverVeiculo" data-index="${index}">
          <i class="bi bi-trash"></i> Remover
        </button>
      </td>
    </tr>
  `);

  rows.push(renderVeiculoInputRow());
  tbVeiculos.innerHTML = rows.join('');

  document.querySelectorAll('.btnRemoverVeiculo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('button').dataset.index);
      veiculosAdicionados.splice(index, 1);
      atualizarTabelaVeiculos();
      salvarDraft();
    });
  });

  bindVeiculoInlineSearch();
}
// CANCELAR VISITA (apenas para nova visita)
async function cancelarVisita() {
  if (isModoGerenciamento()) return;
  
  const confirmar = await (window.showConfirm ? window.showConfirm('Deseja realmente cancelar esta visita? Todos os dados serão perdidos.', 'Cancelar visita') : Promise.resolve(window.confirm('Deseja realmente cancelar esta visita? Todos os dados serão perdidos.')));
  if (!confirmar) return;

  
  // if (confirm("Deseja realmente cancelar esta visita? Todos os dados ser+úo perdidos.")) {
    pessoasAdicionadas = [];
    veiculosAdicionados = [];
    grupoVisita = null;

    atualizarTabelaPessoas();
    atualizarTabelaVeiculos();
    const motivoInput = document.getElementById("motivo");
    const responsavelInput = document.getElementById("responsavel");
    const observacaoInput = document.getElementById("observacao");
    const btnRegistrar = document.getElementById("btnRegistrar");

    if (motivoInput) motivoInput.disabled = false;
    if (responsavelInput) responsavelInput.disabled = false;

    if (btnRegistrar) btnRegistrar.disabled = true;
    // Limpar valores dos inputs básicos
    if (motivoInput) motivoInput.value = '';
    if (responsavelInput) responsavelInput.value = '';
    if (observacaoInput) observacaoInput.value = '';

    // Fechar e limpar modais/buscas se existirem
    const buscaPessoaInput = document.getElementById('buscaPessoaInput');
    const buscaVeiculoInput = document.getElementById('buscaVeiculoInput');
    const listaSugestoesPessoa = document.getElementById('listaSugestoesPessoa');
    const listaSugestoesVeiculo = document.getElementById('listaSugestoesVeiculo');
    const overlay = document.getElementById('overlay');

    if (buscaPessoaInput) buscaPessoaInput.value = '';
    if (buscaVeiculoInput) buscaVeiculoInput.value = '';
    if (listaSugestoesPessoa) listaSugestoesPessoa.innerHTML = '';
    if (listaSugestoesVeiculo) listaSugestoesVeiculo.innerHTML = '';
    if (overlay) overlay.classList.remove('show');

    // Tentar esconder os modais Bootstrap se foram inicializados
    try { if (typeof modalBuscaPessoa !== 'undefined' && modalBuscaPessoa) modalBuscaPessoa.hide(); } catch(e) {}
    try { if (typeof modalBuscaVeiculo !== 'undefined' && modalBuscaVeiculo) modalBuscaVeiculo.hide(); } catch(e) {}

    // Limpar mensagens de feedback
    const mensagem = document.getElementById('mensagem');
    if (mensagem) {
      mensagem.textContent = '';
      mensagem.classList.add('d-none');
      mensagem.classList.remove('alert-success', 'alert-danger');
    }

    limparDraft();
  }


// REGISTRAR VISITA (apenas para nova visita)
async function registrarVisita() {
  if (isModoGerenciamento()) return;
  
  const btnRegistrar = document.getElementById("btnRegistrar");
  const motivoInput = document.getElementById("motivo");
  const responsavelInput = document.getElementById("responsavel");
  const observacaoInput = document.getElementById("observacao");
  
  if (pessoasAdicionadas.length === 0) {
    alert("Adicione pelo menos uma pessoa antes de registrar");
    return;
  }

  if (!(await (window.showConfirm ? window.showConfirm('Deseja registrar esta visita?', 'Registrar visita') : Promise.resolve(window.confirm('Deseja registrar esta visita?'))))) {
    return;
  }

  if (btnRegistrar) {
    btnRegistrar.disabled = true;
    btnRegistrar.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Registrando...';
  }

  try {
    const motivo = motivoInput ? motivoInput.value.trim() : '';
    const autorizado = responsavelInput ? responsavelInput.value.trim() : '';
    const observacao = observacaoInput ? observacaoInput.value.trim() : '';
    const pessoasIds = pessoasAdicionadas.map(p => p.id);
    const veiculosIds = veiculosAdicionados.map(v => v.id);

    const resp = await fetch("/api/visitas/registrar/", {
      method: "POST",
      credentials: 'same-origin',
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
      body: JSON.stringify({
        motivo: motivo,
        autorizado_por: autorizado,
        observacao: observacao,
        pessoas: pessoasIds,
        veiculos: veiculosIds,
      }),
    });

    let data = null;
    let text = null;
    try {
      data = await resp.json();
    } catch (e) {
      try { text = await resp.text(); } catch (e2) { text = null; }
    }

    if (!resp.ok) {
      const errMsg = (data && (data.erro || data.detail)) || text || `HTTP ${resp.status}`;
      console.error('Falha registrarVisita:', resp.status, errMsg);
      throw new Error(errMsg || "Erro ao registrar visita");
    }

    const mensagem = document.getElementById("mensagem");
    if (mensagem) {
      mensagem.textContent = `Visita registrada com sucesso! ID: ${data.grupo_id || data.id}`;
      mensagem.classList.remove("d-none", "alert-danger");
      mensagem.classList.add("alert-success");
    }
    // Limpar rascunho local antes de redirecionar
    limparDraft();

    window.location.href = "/";

  } catch (error) {
    const mensagem = document.getElementById("mensagem");
    if (mensagem) {
      mensagem.textContent = "Erro: " + error.message;
      mensagem.classList.remove("d-none", "alert-success");
      mensagem.classList.add("alert-danger");
    }

    if (btnRegistrar) {
      btnRegistrar.disabled = false;
      btnRegistrar.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Registrar Visita';
    }
  }
}

// Adicionar pessoa +á visita existente (para modo gerenciamento)
async function adicionarPessoaNaVisitaExistente(pessoaId) {
  if (!window.visitaExistenteId) {
    alert("Visita inv+ílida.");
    return;
  }

  const resp = await fetch("/api/visitas/pessoas/", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({
      grupo: window.visitaExistenteId,
      pessoa: pessoaId,
    }),
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      msg = data.detail || data.erro || msg;
    } catch {}
    alert("Erro ao adicionar pessoa: " + msg);
    return;
  }

  location.reload();
}

// Adicionar ve+¡culo +á visita existente (para modo gerenciamento)
async function adicionarVeiculoNaVisitaExistente(veiculoId) {
  if (!window.visitaExistenteId) {
    alert("Visita inv+ílida.");
    return;
  }

  const resp = await fetch("/api/visitas/veiculos/", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({
      grupo: window.visitaExistenteId,
      veiculo: veiculoId,
    }),
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      msg = data.detail || data.erro || msg;
    } catch {}
    alert("Erro ao adicionar ve+¡culo: " + msg);
    return;
  }

  location.reload();
}

// ========== INICIALIZA+ç+âO ==========
document.addEventListener("DOMContentLoaded", () => {
  // Atualizar vari+íveis globais se estiver em modo gerenciamento
  if (window.modoGerenciamento) {
    modoGerenciamento = window.modoGerenciamento;
    visitaExistenteId = window.visitaExistenteId;
  }

  console.log("Modo inicializado:", { modoGerenciamento, visitaExistenteId });

  const cardVeiculos = document.getElementById("cardVeiculos");
  const cardPessoas = document.getElementById("cardPessoas");
  if (cardVeiculos) cardVeiculos.classList.remove("d-none");
  if (cardPessoas) cardPessoas.classList.remove("d-none");

  // Elementos principais (apenas para nova visita)
  const btnRegistrar = document.getElementById("btnRegistrar");
  const btnAddPessoa = document.getElementById("btnAddPessoa");
  const btnAddVeiculo = document.getElementById("btnAddVeiculo");
  const overlay = document.getElementById("overlay");

  // Inputs principais
  const motivoInput = document.getElementById('motivo');
  const responsavelInput = document.getElementById('responsavel');
  const observacaoInput = document.getElementById('observacao');

  // Carregar rascunho salvo (se existir)
  carregarDraft();

  if (!isModoGerenciamento()) {
    bindPessoaInlineSearch();
    bindVeiculoInlineSearch();
  }

  if (!isModoGerenciamento()) {
    atualizarTabelaPessoas();
    atualizarTabelaVeiculos();
    atualizarEstadoBotaoRegistrar();
    setupInlineAutocompleteDelegation();
  }

  // Salvar rascunho ao editar campos básicos
  if (motivoInput) motivoInput.addEventListener('input', salvarDraft);
  if (responsavelInput) responsavelInput.addEventListener('input', salvarDraft);
  if (observacaoInput) observacaoInput.addEventListener('input', salvarDraft);

  // Elementos de busca de pessoas (apenas para nova visita)
  const buscaPessoaInput = document.getElementById("buscaPessoaInput");
  const btnBuscarPessoa = document.getElementById("btnBuscarPessoa");
  const btnNovaPessoa = document.getElementById("btnNovaPessoa");
  const listaSugestoesPessoa = document.getElementById("listaSugestoesPessoa");

  // Elementos de busca de ve+¡culos (apenas para nova visita)
  const buscaVeiculoInput = document.getElementById("buscaVeiculoInput");
  const btnBuscarVeiculo = document.getElementById("btnBuscarVeiculo");
  const btnNovoVeiculo = document.getElementById("btnNovoVeiculo");
  const listaSugestoesVeiculo = document.getElementById("listaSugestoesVeiculo");

  // S+¦ adicionar eventos se n+úo estiver em modo gerenciamento
  if (!isModoGerenciamento()) {
    // Event Listeners para nova visita
    const btnCancelarVisita = document.getElementById("btnCancelarVisita");
    if (btnCancelarVisita) {
      btnCancelarVisita.addEventListener("click", cancelarVisita);
    }

    // Botao Adicionar Pessoa
    if (btnAddPessoa) {
      btnAddPessoa.addEventListener("click", mostrarBuscaPessoa);
    }

    // Bot+úo Adicionar Ve+¡culo
    if (btnAddVeiculo) {
      btnAddVeiculo.addEventListener("click", mostrarBuscaVeiculo);
    }

    // Buscar pessoa ao digitar
    if (buscaPessoaInput) {
      buscaPessoaInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (query.length < MIN_SEARCH_CHARS) {
          if (listaSugestoesPessoa) listaSugestoesPessoa.innerHTML = "";
          return;
        }

        const pessoas = await buscarPessoas(query);
        
        if (!listaSugestoesPessoa) return;
        
        if (pessoas.length === 0) {
          listaSugestoesPessoa.innerHTML = `
            <li class="list-group-item text-center text-muted">
              Nenhuma pessoa encontrada
            </li>
          `;
          return;
        }

        listaSugestoesPessoa.innerHTML = pessoas.map(pessoa => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${pessoa.nome || pessoa.nome_completo}</strong><br>
              <small class="text-muted">${pessoa.empresa || pessoa.empresa_nome || 'Sem empresa'}</small>
            </div>
            <button class="btn btn-sm btn-primary btnAdicionarPessoa" data-id="${pessoa.id}">
              Adicionar
            </button>
          </li>
        `).join('');

        document.querySelectorAll('.btnAdicionarPessoa').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const pessoaId = e.target.dataset.id;
            const pessoa = pessoas.find(p => p.id == pessoaId);
            if (pessoa) {
              adicionarPessoaATabela(pessoa);
              esconderBuscaPessoa();
            }
          });
        });
      });
    }

    // Buscar ve+¡culo ao digitar
    if (buscaVeiculoInput) {
      buscaVeiculoInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (query.length < MIN_SEARCH_CHARS) {
          if (listaSugestoesVeiculo) listaSugestoesVeiculo.innerHTML = "";
          return;
        }

        const veiculos = await buscarVeiculos(query);
        
        if (!listaSugestoesVeiculo) return;
        
        if (veiculos.length === 0) {
          listaSugestoesVeiculo.innerHTML = `
            <li class="list-group-item text-center text-muted">
              Nenhum ve+¡culo encontrado
            </li>
          `;
          return;
        }

        listaSugestoesVeiculo.innerHTML = veiculos.map(veiculo => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${veiculo.placa}</strong><br>
              <small class="text-muted">${veiculo.modelo || veiculo.marca || 'Modelo n+úo informado'}</small>
            </div>
            <button class="btn btn-sm btn-primary btnAdicionarVeiculo" data-id="${veiculo.id}">
              Adicionar
            </button>
          </li>
        `).join('');

        document.querySelectorAll('.btnAdicionarVeiculo').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const veiculoId = e.target.dataset.id;
            const veiculo = veiculos.find(v => v.id == veiculoId);
            if (veiculo) {
              adicionarVeiculoATabela(veiculo);
              esconderBuscaVeiculo();
            }
          });
        });
      });
    }

    // Bot+úo Buscar Pessoa
    if (btnBuscarPessoa) {
      btnBuscarPessoa.addEventListener("click", () => {
        const query = buscaPessoaInput ? buscaPessoaInput.value.trim() : '';
        if (query.length >= MIN_SEARCH_CHARS && buscaPessoaInput) {
          buscaPessoaInput.dispatchEvent(new Event('input'));
        }
      });
    }

    // Bot+úo Buscar Ve+¡culo
    if (btnBuscarVeiculo) {
      btnBuscarVeiculo.addEventListener("click", () => {
        const query = buscaVeiculoInput ? buscaVeiculoInput.value.trim() : '';
        if (query.length >= MIN_SEARCH_CHARS && buscaVeiculoInput) {
          buscaVeiculoInput.dispatchEvent(new Event('input'));
        }
      });
    }

    // Bot+úo Nova Pessoa
    if (btnNovaPessoa) {
      btnNovaPessoa.addEventListener("click", () => {
        alert("Funcionalidade de cadastrar nova pessoa ser+í implementada aqui");
      });
    }

    // Bot+úo Novo Ve+¡culo
    if (btnNovoVeiculo) {
      btnNovoVeiculo.addEventListener("click", () => {
        alert("Funcionalidade de cadastrar novo ve+¡culo ser+í implementada aqui");
      });
    }

    // Fechar busca ao clicar no overlay
    if (overlay) {
      overlay.addEventListener("click", () => {
        esconderBuscaPessoa();
        esconderBuscaVeiculo();
      });
    }

    // Fechar com Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        esconderBuscaPessoa();
        esconderBuscaVeiculo();
      }
    });

    // Registrar visita
    if (btnRegistrar) {
      btnRegistrar.addEventListener("click", registrarVisita);
    }

    // Inicializar estado do bot+úo Registrar
    atualizarEstadoBotaoRegistrar();
  }
});

// EXPORTAR FUN+ç+òES GLOBAIS PARA USO EM OUTROS ARQUIVOS
window.mostrarBuscaPessoa = mostrarBuscaPessoa;
window.mostrarBuscaVeiculo = mostrarBuscaVeiculo;
window.buscarPessoas = buscarPessoas;
window.buscarVeiculos = buscarVeiculos;
window.listarPessoasEmVisita = listarPessoasEmVisita;
window.listarVeiculosEmVisita = listarVeiculosEmVisita;

window.adicionarPessoaATabela = adicionarPessoaATabela;
window.adicionarVeiculoATabela = adicionarVeiculoATabela;
window.adicionarPessoaNaVisitaExistente = adicionarPessoaNaVisitaExistente;
window.adicionarVeiculoNaVisitaExistente = adicionarVeiculoNaVisitaExistente;

