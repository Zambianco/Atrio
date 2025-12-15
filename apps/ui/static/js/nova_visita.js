document.addEventListener("DOMContentLoaded", () => {
  let grupoVisita = null;
  let pessoasAdicionadas = [];
  let veiculosAdicionados = [];

  const btnCriar = document.getElementById("btnCriarCancelar");
  const btnRegistrar = document.getElementById("btnRegistrar");
  const motivoInput = document.getElementById("motivo");
  const responsavelInput = document.getElementById("responsavel");
  const btnAddPessoa = document.getElementById("btnAddPessoa");
  const btnAddVeiculo = document.getElementById("btnAddVeiculo");
  const overlay = document.getElementById("overlay");
  const acoesDiv = document.getElementById("acoes");
  const cardPessoas = document.getElementById("cardPessoas");
  const cardVeiculos = document.getElementById("cardVeiculos");

  // Elementos de busca de pessoas
  const buscaPessoaContainer = document.getElementById("buscaPessoaContainer");
  const buscaPessoaInput = document.getElementById("buscaPessoaInput");
  const btnBuscarPessoa = document.getElementById("btnBuscarPessoa");
  const btnNovaPessoa = document.getElementById("btnNovaPessoa");
  const listaSugestoesPessoa = document.getElementById("listaSugestoesPessoa");
  const tbPessoas = document.getElementById("tbPessoas");

  // Elementos de busca de veículos
  const buscaVeiculoContainer = document.getElementById("buscaVeiculoContainer");
  const buscaVeiculoInput = document.getElementById("buscaVeiculoInput");
  const btnBuscarVeiculo = document.getElementById("btnBuscarVeiculo");
  const btnNovoVeiculo = document.getElementById("btnNovoVeiculo");
  const listaSugestoesVeiculo = document.getElementById("listaSugestoesVeiculo");
  const tbVeiculos = document.getElementById("tbVeiculos");

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

  // Funções auxiliares
  function mostrarOverlay() {
    overlay.style.display = "block";
  }

  function esconderOverlay() {
    overlay.style.display = "none";
  }

  function mostrarBuscaPessoa() {
  console.log("Mostrar busca pessoa");
  
  // PRIMEIRO: Garantir que o diálogo está posicionado corretamente
  // Remover do container pai e mover para o body
  document.body.appendChild(buscaPessoaContainer);
  
  // MOSTRAR
  buscaPessoaContainer.classList.remove("d-none");
  mostrarOverlay();
  
  // Focar no input
  setTimeout(() => {
    buscaPessoaInput.focus();
  }, 100);
}

  function esconderBuscaPessoa() {
  // VOLTAR para o local original
  const cardBodyPessoas = document.querySelector('#cardPessoas .card-body');
  if (cardBodyPessoas) {
    cardBodyPessoas.appendChild(buscaPessoaContainer);
  }
  
  buscaPessoaContainer.classList.add("d-none");
  esconderOverlay();
  buscaPessoaInput.value = "";
  listaSugestoesPessoa.innerHTML = "";
}

function mostrarBuscaVeiculo() {
  console.log("Mostrar busca veículo");
  
  // PRIMEIRO: Garantir que o diálogo está posicionado corretamente
  // Remover do container pai e mover para o body
  document.body.appendChild(buscaVeiculoContainer);
  
  // MOSTRAR
  buscaVeiculoContainer.classList.remove("d-none");
  mostrarOverlay();
  
  // Focar no input
  setTimeout(() => {
    buscaVeiculoInput.focus();
  }, 100);
}



function esconderBuscaVeiculo() {
  // VOLTAR para o local original
  const cardBodyVeiculos = document.querySelector('#cardVeiculos .card-body');
  if (cardBodyVeiculos) {
    cardBodyVeiculos.appendChild(buscaVeiculoContainer);
  }
  
  buscaVeiculoContainer.classList.add("d-none");
  esconderOverlay();
  buscaVeiculoInput.value = "";
  listaSugestoesVeiculo.innerHTML = "";
}









    // VOLTAR para o local original
  const cardBodyVeiculos = document.querySelector('#cardVeiculos .card-body');
  if (cardBodyVeiculos) {
    cardBodyVeiculos.appendChild(buscaVeiculoContainer);
  }
  
  buscaVeiculoContainer.classList.add("d-none");
  esconderOverlay();
  buscaVeiculoInput.value = "";
  listaSugestoesVeiculo.innerHTML = "";


  // Adicionar pessoa à tabela
  function adicionarPessoaATabela(pessoa) {
    // Verificar se a pessoa já foi adicionada
    if (pessoasAdicionadas.some(p => p.id === pessoa.id)) {
      alert("Esta pessoa já foi adicionada à visita");
      return;
    }
    
    pessoasAdicionadas.push(pessoa);
    atualizarTabelaPessoas();
    atualizarEstadoBotaoRegistrar();
  }

  // Adicionar veículo à tabela
  function adicionarVeiculoATabela(veiculo) {
    // Verificar se o veículo já foi adicionado
    if (veiculosAdicionados.some(v => v.id === veiculo.id)) {
      alert("Este veículo já foi adicionado à visita");
      return;
    }
    
    veiculosAdicionados.push(veiculo);
    atualizarTabelaVeiculos();
  }

  // Atualizar tabela de pessoas
  function atualizarTabelaPessoas() {
    if (pessoasAdicionadas.length === 0) {
      tbPessoas.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            <i class="bi bi-people me-1"></i>Nenhuma pessoa adicionada
          </td>
        </tr>
      `;
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

    // Mostrar card de pessoas
    cardPessoas.classList.remove("d-none");
  }

  // Atualizar tabela de veículos
  function atualizarTabelaVeiculos() {
    if (veiculosAdicionados.length === 0) {
      tbVeiculos.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted py-4">
            <i class="bi bi-car-front me-1"></i>Nenhum veículo adicionado
          </td>
        </tr>
      `;
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

    // Adicionar eventos aos botões de remover
    document.querySelectorAll('.btnRemoverVeiculo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('button').dataset.index);
        veiculosAdicionados.splice(index, 1);
        atualizarTabelaVeiculos();
      });
    });

    // Mostrar card de veículos
    cardVeiculos.classList.remove("d-none");
  }

  // Atualizar estado do botão Registrar
  function atualizarEstadoBotaoRegistrar() {
    // Habilitar botão Registrar apenas se houver pelo menos uma pessoa
    btnRegistrar.disabled = pessoasAdicionadas.length === 0;
  }

async function buscarPessoas(query) {
  try {
    // URL CORRETA do DRF
    const resp = await fetch(`/api/pessoas/pessoas/buscar/?q=${encodeURIComponent(query)}`, {
      headers: {
        "X-CSRFToken": csrftoken,
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
    // URL CORRETA do DRF
    const resp = await fetch(`/api/veiculos/veiculos/buscar/?q=${encodeURIComponent(query)}`, {
      headers: {
        "X-CSRFToken": csrftoken,
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

  // CRIAR VISITA (apenas na memória do navegador)
  function criarVisitaLocal() {
    const motivo = motivoInput.value.trim();
    const autorizado = responsavelInput.value.trim();

    if (!motivo || !autorizado) {
      alert("Informe o motivo e o responsável");
      return false;
    }

    // Criar objeto de visita na memória
    grupoVisita = {
      motivo: motivo,
      autorizado_por: autorizado,
      data_criacao: new Date(),
      pessoas: [],
      veiculos: []
    };

    // Mostrar badge
    const badge = document.getElementById("badgeGrupo");
    badge.textContent = `Visita em criação`;
    badge.classList.remove("d-none");

    // Mostrar botões de ação
    acoesDiv.classList.remove("d-none");

    // Desabilitar campos de motivo e responsável (opcional)
    motivoInput.disabled = true;
    responsavelInput.disabled = true;

    // Mudar botão para Cancelar
    btnCriar.innerHTML = '<i class="bi bi-x-circle me-1"></i>Cancelar Visita';
    btnCriar.classList.remove("btn-primary");
    btnCriar.classList.add("btn-danger");

    return true;
  }

  // CANCELAR VISITA (limpar memória)
  function cancelarVisita() {
    if (confirm("Deseja realmente cancelar esta visita? Todos os dados serão perdidos.")) {
      // Limpar arrays
      pessoasAdicionadas = [];
      veiculosAdicionados = [];
      grupoVisita = null;

      // Limpar tabelas
      atualizarTabelaPessoas();
      atualizarTabelaVeiculos();

      // Esconder elementos
      document.getElementById("badgeGrupo").classList.add("d-none");
      acoesDiv.classList.add("d-none");
      cardPessoas.classList.add("d-none");
      cardVeiculos.classList.add("d-none");

      // Restaurar campos
      motivoInput.disabled = false;
      responsavelInput.disabled = false;

      // Restaurar botão Criar
      btnCriar.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Criar visita';
      btnCriar.classList.remove("btn-danger");
      btnCriar.classList.add("btn-primary");

      // Desabilitar botão Registrar
      btnRegistrar.disabled = true;
    }
  }

  // REGISTRAR VISITA (enviar para o backend)
  async function registrarVisita() {
    if (pessoasAdicionadas.length === 0) {
      alert("Adicione pelo menos uma pessoa antes de registrar");
      return;
    }

    if (!confirm("Deseja registrar esta visita?")) {
      return;
    }

    // Mostrar carregamento
    btnRegistrar.disabled = true;
    btnRegistrar.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Registrando...';

    try {
      const motivo = motivoInput.value.trim();
      const autorizado = responsavelInput.value.trim();
      const pessoasIds = pessoasAdicionadas.map(p => p.id);
      const veiculosIds = veiculosAdicionados.map(v => v.id);

      const resp = await fetch("/api/visitas/registrar/", {
        method: "POST",
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

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.erro || "Erro ao registrar visita");
      }

      // Sucesso!
      const mensagem = document.getElementById("mensagem");
      mensagem.textContent = `Visita registrada com sucesso! ID: ${data.grupo_id || data.id}`;
      mensagem.classList.remove("d-none", "alert-danger");
      mensagem.classList.add("alert-success");

      // Redirecionar após 3 segundos
      setTimeout(() => {
        window.location.href = "/visitas/";
      }, 3000);

    } catch (error) {
      // Erro
      const mensagem = document.getElementById("mensagem");
      mensagem.textContent = "Erro: " + error.message;
      mensagem.classList.remove("d-none", "alert-success");
      mensagem.classList.add("alert-danger");

      // Restaurar botão Registrar
      btnRegistrar.disabled = false;
      btnRegistrar.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Registrar Visita';
    }
  }

  // Event Listeners
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

  // Botão Adicionar Pessoa
  btnAddPessoa.addEventListener("click", mostrarBuscaPessoa);

  // Botão Adicionar Veículo
  btnAddVeiculo.addEventListener("click", mostrarBuscaVeiculo);

  // Buscar pessoa ao digitar
  buscaPessoaInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      listaSugestoesPessoa.innerHTML = "";
      return;
    }

    const pessoas = await buscarPessoas(query);
    
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

    // Adicionar eventos aos botões de adicionar pessoa
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

  // Buscar veículo ao digitar
  buscaVeiculoInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      listaSugestoesVeiculo.innerHTML = "";
      return;
    }

    const veiculos = await buscarVeiculos(query);
    
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

    // Adicionar eventos aos botões de adicionar veículo
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

  // Botão Buscar Pessoa
  btnBuscarPessoa.addEventListener("click", () => {
    const query = buscaPessoaInput.value.trim();
    if (query.length >= 2) {
      buscaPessoaInput.dispatchEvent(new Event('input'));
    }
  });

  // Botão Buscar Veículo
  btnBuscarVeiculo.addEventListener("click", () => {
    const query = buscaVeiculoInput.value.trim();
    if (query.length >= 2) {
      buscaVeiculoInput.dispatchEvent(new Event('input'));
    }
  });

  // Botão Nova Pessoa
  btnNovaPessoa.addEventListener("click", () => {
    alert("Funcionalidade de cadastrar nova pessoa será implementada aqui");
    // Exemplo: window.location.href = "/pessoas/nova/";
  });

  // Botão Novo Veículo
  btnNovoVeiculo.addEventListener("click", () => {
    alert("Funcionalidade de cadastrar novo veículo será implementada aqui");
    // Exemplo: window.location.href = "/veiculos/novo/";
  });

  // Fechar busca ao clicar no overlay
  overlay.addEventListener("click", () => {
    esconderBuscaPessoa();
    esconderBuscaVeiculo();
  });

  // Fechar com Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      esconderBuscaPessoa();
      esconderBuscaVeiculo();
    }
  });

  // Registrar visita
  btnRegistrar.addEventListener("click", registrarVisita);

  // Inicializar estado do botão Registrar
  atualizarEstadoBotaoRegistrar();
});