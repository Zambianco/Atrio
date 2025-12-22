// ========== VARIÁVEIS GLOBAIS ==========
let grupoVisita = null;
let pessoasAdicionadas = [];
let veiculosAdicionados = [];
let modoGerenciamento = false;
let visitaExistenteId = null;

// Modal instances (iniciadas em modal_seleciona_pessoa.js e modal_seleciona_veiculo.js)
// let modalBuscaPessoa = null;
// let modalBuscaVeiculo = null;

// ========== FUNÇÕES GLOBAIS ==========

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

// Função para verificar se estamos na página de gerenciamento
function isModoGerenciamento() {
  return window.modoGerenciamento === true;
}

// Funções auxiliares
function mostrarOverlay() {
  // Deprecated - modal Bootstrap não precisa de overlay
}

function esconderOverlay() {
  // Deprecated - modal Bootstrap não precisa de overlay
}

function mostrarBuscaPessoa() {
  console.log("Mostrar busca pessoa - Modo Gerenciamento:", isModoGerenciamento());
  
  // Usar modal Bootstrap unificado
  if (typeof modalBuscaPessoa !== 'undefined' && modalBuscaPessoa) {
    document.getElementById('buscaPessoaInput').value = '';
    document.getElementById('listaSugestoesPessoa').innerHTML = '';
    modalBuscaPessoa.show();
  } else {
    console.error('Modal Bootstrap de busca de pessoa não inicializado');
  }
}

function esconderBuscaPessoa() {
  // Fechar modal Bootstrap
  if (typeof modalBuscaPessoa !== 'undefined' && modalBuscaPessoa) {
    modalBuscaPessoa.hide();
  }
}

function mostrarBuscaVeiculo() {
  console.log("Mostrar busca veículo - Modo Gerenciamento:", isModoGerenciamento());
  
  // Usar modal Bootstrap unificado
  if (typeof modalBuscaVeiculo !== 'undefined' && modalBuscaVeiculo) {
    document.getElementById('buscaVeiculoInput').value = '';
    document.getElementById('listaSugestoesVeiculo').innerHTML = '';
    modalBuscaVeiculo.show();
  } else {
    console.error('Modal Bootstrap de busca de veículo não inicializado');
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

// Buscar veículos na API
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
      throw new Error("Erro ao buscar veículos");
    }
    
    const data = await resp.json();
    console.log("Dados retornados da API veículos:", data);
    return data.veiculos || [];
  } catch (error) {
    console.error("Erro ao buscar veículos:", error);
    return [];
  }
}

// Adicionar pessoa à tabela (apenas para nova visita)
function adicionarPessoaATabela(pessoa) {
  if (isModoGerenciamento()) {
    // No modo gerenciamento, adicionar diretamente à visita existente
    adicionarPessoaNaVisitaExistente(pessoa.id);
    return;
  }
  
  // Código original para nova visita
  if (pessoasAdicionadas.some(p => p.id === pessoa.id)) {
    alert("Esta pessoa já foi adicionada à visita");
    return;
  }
  
  pessoasAdicionadas.push(pessoa);
  atualizarTabelaPessoas();
  atualizarEstadoBotaoRegistrar();
}

// Adicionar veículo à tabela (apenas para nova visita)
function adicionarVeiculoATabela(veiculo) {
  if (isModoGerenciamento()) {
    // No modo gerenciamento, adicionar diretamente à visita existente
    adicionarVeiculoNaVisitaExistente(veiculo.id);
    return;
  }
  
  // Código original para nova visita
  if (veiculosAdicionados.some(v => v.id === veiculo.id)) {
    alert("Este veículo já foi adicionado à visita");
    return;
  }
  
  veiculosAdicionados.push(veiculo);
  atualizarTabelaVeiculos();
}

// Atualizar tabela de pessoas (apenas para nova visita)
function atualizarTabelaPessoas() {
  if (isModoGerenciamento()) return;
  
  const tbPessoas = document.getElementById("tbPessoas");
  const cardPessoas = document.getElementById("cardPessoas");
  
  if (!tbPessoas) return;
  
  if (pessoasAdicionadas.length === 0) {
    tbPessoas.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-4">
          <i class="bi bi-people me-1"></i>Nenhuma pessoa adicionada
        </td>
      </tr>
    `;
    if (cardPessoas) cardPessoas.classList.add("d-none");
    return;
  }

  tbPessoas.innerHTML = pessoasAdicionadas.map((pessoa, index) => `
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
  `).join('');

  // Adicionar eventos aos botões de remover
  document.querySelectorAll('.btnRemoverPessoa').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('button').dataset.index);
      pessoasAdicionadas.splice(index, 1);
      atualizarTabelaPessoas();
      atualizarEstadoBotaoRegistrar();
    });
  });

  if (cardPessoas) cardPessoas.classList.remove("d-none");
}

// Atualizar tabela de veículos (apenas para nova visita)
function atualizarTabelaVeiculos() {
  if (isModoGerenciamento()) return;
  
  const tbVeiculos = document.getElementById("tbVeiculos");
  const cardVeiculos = document.getElementById("cardVeiculos");
  
  if (!tbVeiculos) return;
  
  if (veiculosAdicionados.length === 0) {
    tbVeiculos.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted py-4">
          <i class="bi bi-car-front me-1"></i>Nenhum veículo adicionado
        </td>
      </tr>
    `;
    if (cardVeiculos) cardVeiculos.classList.add("d-none");
    return;
  }

  tbVeiculos.innerHTML = veiculosAdicionados.map((veiculo, index) => `
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
  `).join('');

  document.querySelectorAll('.btnRemoverVeiculo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.closest('button').dataset.index);
      veiculosAdicionados.splice(index, 1);
      atualizarTabelaVeiculos();
    });
  });

  if (cardVeiculos) cardVeiculos.classList.remove("d-none");
}

// Atualizar estado do botão Registrar (apenas para nova visita)
function atualizarEstadoBotaoRegistrar() {
  if (isModoGerenciamento()) return;
  
  const btnRegistrar = document.getElementById("btnRegistrar");
  if (btnRegistrar) {
    btnRegistrar.disabled = pessoasAdicionadas.length === 0;
  }
}

// CRIAR VISITA (apenas para nova visita)
function criarVisitaLocal() {
  if (isModoGerenciamento()) return false;
  
  const motivoInput = document.getElementById("motivo");
  const responsavelInput = document.getElementById("responsavel");
  const btnCriar = document.getElementById("btnCriarCancelar");
  
  if (!motivoInput || !responsavelInput || !btnCriar) return false;

  const motivo = motivoInput.value.trim();
  const autorizado = responsavelInput.value.trim();

  if (!motivo || !autorizado) {
    alert("Informe o motivo e o responsável");
    return false;
  }

  grupoVisita = {
    motivo: motivo,
    autorizado_por: autorizado,
    data_criacao: new Date(),
    pessoas: [],
    veiculos: []
  };

  const badge = document.getElementById("badgeGrupo");
  if (badge) {
    badge.textContent = `Visita em criação`;
    badge.classList.remove("d-none");
  }

  const acoesDiv = document.getElementById("acoes");
  if (acoesDiv) acoesDiv.classList.remove("d-none");

  motivoInput.disabled = true;
  responsavelInput.disabled = true;

  btnCriar.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancelar Visita';
  btnCriar.classList.remove("btn-primary");
  btnCriar.classList.add("btn-danger");

  return true;
}

// CANCELAR VISITA (apenas para nova visita)
function cancelarVisita() {
  if (isModoGerenciamento()) return;
  
  if (confirm("Deseja realmente cancelar esta visita? Todos os dados serão perdidos.")) {
    pessoasAdicionadas = [];
    veiculosAdicionados = [];
    grupoVisita = null;

    atualizarTabelaPessoas();
    atualizarTabelaVeiculos();

    const badge = document.getElementById("badgeGrupo");
    const acoesDiv = document.getElementById("acoes");
    const cardPessoas = document.getElementById("cardPessoas");
    const cardVeiculos = document.getElementById("cardVeiculos");
    const motivoInput = document.getElementById("motivo");
    const responsavelInput = document.getElementById("responsavel");
    const btnCriar = document.getElementById("btnCriarCancelar");
    const btnRegistrar = document.getElementById("btnRegistrar");
    
    if (badge) badge.classList.add("d-none");
    if (acoesDiv) acoesDiv.classList.add("d-none");
    if (cardPessoas) cardPessoas.classList.add("d-none");
    if (cardVeiculos) cardVeiculos.classList.add("d-none");

    if (motivoInput) motivoInput.disabled = false;
    if (responsavelInput) responsavelInput.disabled = false;

    if (btnCriar) {
      btnCriar.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Criar visita';
      btnCriar.classList.remove("btn-danger");
      btnCriar.classList.add("btn-primary");
    }

    if (btnRegistrar) btnRegistrar.disabled = true;
  }
}

// REGISTRAR VISITA (apenas para nova visita)
async function registrarVisita() {
  if (isModoGerenciamento()) return;
  
  const btnRegistrar = document.getElementById("btnRegistrar");
  const motivoInput = document.getElementById("motivo");
  const responsavelInput = document.getElementById("responsavel");
  
  if (pessoasAdicionadas.length === 0) {
    alert("Adicione pelo menos uma pessoa antes de registrar");
    return;
  }

  if (!confirm("Deseja registrar esta visita?")) {
    return;
  }

  if (btnRegistrar) {
    btnRegistrar.disabled = true;
    btnRegistrar.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Registrando...';
  }

  try {
    const motivo = motivoInput ? motivoInput.value.trim() : '';
    const autorizado = responsavelInput ? responsavelInput.value.trim() : '';
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
        observacao: "",
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

    setTimeout(() => {
      window.location.href = "/visitas/";
    }, 3000);

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

// Adicionar pessoa à visita existente (para modo gerenciamento)
async function adicionarPessoaNaVisitaExistente(pessoaId) {
  if (!window.visitaExistenteId) {
    alert("Visita inválida.");
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

// Adicionar veículo à visita existente (para modo gerenciamento)
async function adicionarVeiculoNaVisitaExistente(veiculoId) {
  if (!window.visitaExistenteId) {
    alert("Visita inválida.");
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
    alert("Erro ao adicionar veículo: " + msg);
    return;
  }

  location.reload();
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener("DOMContentLoaded", () => {
  // Atualizar variáveis globais se estiver em modo gerenciamento
  if (window.modoGerenciamento) {
    modoGerenciamento = window.modoGerenciamento;
    visitaExistenteId = window.visitaExistenteId;
  }

  console.log("Modo inicializado:", { modoGerenciamento, visitaExistenteId });

  // Elementos principais (apenas para nova visita)
  const btnCriar = document.getElementById("btnCriarCancelar");
  const btnRegistrar = document.getElementById("btnRegistrar");
  const btnAddPessoa = document.getElementById("btnAddPessoa");
  const btnAddVeiculo = document.getElementById("btnAddVeiculo");
  const overlay = document.getElementById("overlay");

  // Elementos de busca de pessoas (apenas para nova visita)
  const buscaPessoaInput = document.getElementById("buscaPessoaInput");
  const btnBuscarPessoa = document.getElementById("btnBuscarPessoa");
  const btnNovaPessoa = document.getElementById("btnNovaPessoa");
  const listaSugestoesPessoa = document.getElementById("listaSugestoesPessoa");

  // Elementos de busca de veículos (apenas para nova visita)
  const buscaVeiculoInput = document.getElementById("buscaVeiculoInput");
  const btnBuscarVeiculo = document.getElementById("btnBuscarVeiculo");
  const btnNovoVeiculo = document.getElementById("btnNovoVeiculo");
  const listaSugestoesVeiculo = document.getElementById("listaSugestoesVeiculo");

  // Só adicionar eventos se não estiver em modo gerenciamento
  if (!isModoGerenciamento()) {
    // Event Listeners para nova visita
    if (btnCriar) {
      function handleCriarCancelar() {
        if (btnCriar.classList.contains("btn-danger")) {
          cancelarVisita();
        } else {
          if (criarVisitaLocal()) {
            btnCriar.removeEventListener("click", handleCriarCancelar);
            btnCriar.addEventListener("click", cancelarVisita);
          }
        }
      }
      btnCriar.addEventListener("click", handleCriarCancelar);
    }

    // Botão Adicionar Pessoa
    if (btnAddPessoa) {
      btnAddPessoa.addEventListener("click", mostrarBuscaPessoa);
    }

    // Botão Adicionar Veículo
    if (btnAddVeiculo) {
      btnAddVeiculo.addEventListener("click", mostrarBuscaVeiculo);
    }

    // Buscar pessoa ao digitar
    if (buscaPessoaInput) {
      buscaPessoaInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
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

    // Buscar veículo ao digitar
    if (buscaVeiculoInput) {
      buscaVeiculoInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          if (listaSugestoesVeiculo) listaSugestoesVeiculo.innerHTML = "";
          return;
        }

        const veiculos = await buscarVeiculos(query);
        
        if (!listaSugestoesVeiculo) return;
        
        if (veiculos.length === 0) {
          listaSugestoesVeiculo.innerHTML = `
            <li class="list-group-item text-center text-muted">
              Nenhum veículo encontrado
            </li>
          `;
          return;
        }

        listaSugestoesVeiculo.innerHTML = veiculos.map(veiculo => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${veiculo.placa}</strong><br>
              <small class="text-muted">${veiculo.modelo || veiculo.marca || 'Modelo não informado'}</small>
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

    // Botão Buscar Pessoa
    if (btnBuscarPessoa) {
      btnBuscarPessoa.addEventListener("click", () => {
        const query = buscaPessoaInput ? buscaPessoaInput.value.trim() : '';
        if (query.length >= 2 && buscaPessoaInput) {
          buscaPessoaInput.dispatchEvent(new Event('input'));
        }
      });
    }

    // Botão Buscar Veículo
    if (btnBuscarVeiculo) {
      btnBuscarVeiculo.addEventListener("click", () => {
        const query = buscaVeiculoInput ? buscaVeiculoInput.value.trim() : '';
        if (query.length >= 2 && buscaVeiculoInput) {
          buscaVeiculoInput.dispatchEvent(new Event('input'));
        }
      });
    }

    // Botão Nova Pessoa
    if (btnNovaPessoa) {
      btnNovaPessoa.addEventListener("click", () => {
        alert("Funcionalidade de cadastrar nova pessoa será implementada aqui");
      });
    }

    // Botão Novo Veículo
    if (btnNovoVeiculo) {
      btnNovoVeiculo.addEventListener("click", () => {
        alert("Funcionalidade de cadastrar novo veículo será implementada aqui");
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

    // Inicializar estado do botão Registrar
    atualizarEstadoBotaoRegistrar();
  }
});

// EXPORTAR FUNÇÕES GLOBAIS PARA USO EM OUTROS ARQUIVOS
window.mostrarBuscaPessoa = mostrarBuscaPessoa;
window.mostrarBuscaVeiculo = mostrarBuscaVeiculo;
window.buscarPessoas = buscarPessoas;
window.buscarVeiculos = buscarVeiculos;
window.adicionarPessoaATabela = adicionarPessoaATabela;
window.adicionarVeiculoATabela = adicionarVeiculoATabela;
window.adicionarPessoaNaVisitaExistente = adicionarPessoaNaVisitaExistente;
window.adicionarVeiculoNaVisitaExistente = adicionarVeiculoNaVisitaExistente;