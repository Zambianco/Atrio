// ===============================
// FLAGS / CONTEXTO
// ===============================
let modalBuscaPessoa = null;
let modalBuscaVeiculo = null;

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {

  const modalPessoaEl = document.getElementById('modalBuscaPessoa');
  const modalVeiculoEl = document.getElementById('modalBuscaVeiculo');

  if (modalPessoaEl) {
    modalBuscaPessoa = new bootstrap.Modal(modalPessoaEl);
  }

  if (modalVeiculoEl) {
    modalBuscaVeiculo = new bootstrap.Modal(modalVeiculoEl);
  }

  const inputBuscaPessoa = document.getElementById('inputBuscaPessoa');
  const inputBuscaVeiculo = document.getElementById('inputBuscaVeiculo');

  if (inputBuscaPessoa) {
    inputBuscaPessoa.addEventListener('input', async e => {
      const q = e.target.value.trim();
      if (q.length < 2) {
        document.getElementById('listaPessoas').innerHTML = '';
        return;
      }
      buscarESugerirPessoas(q);
    });
  }

  if (inputBuscaVeiculo) {
    inputBuscaVeiculo.addEventListener('input', async e => {
      const q = e.target.value.trim();
      if (q.length < 2) {
        document.getElementById('listaVeiculos').innerHTML = '';
        return;
      }
      buscarESugerirVeiculos(q);
    });
  }
});

// ===============================
// MODAIS
// ===============================
function mostrarBuscaPessoa() {
  modalBuscaPessoa?.show();
  document.getElementById('listaPessoas').innerHTML = '';
}

function mostrarBuscaVeiculo() {
  modalBuscaVeiculo?.show();
  document.getElementById('listaVeiculos').innerHTML = '';
}

// ===============================
// BUSCAS
// ===============================
async function buscarESugerirPessoas(query) {
  const pessoas = await buscarPessoas(query);
  const lista = document.getElementById('listaPessoas');

  if (!pessoas.length) {
    lista.innerHTML = `<li class="list-group-item text-muted text-center">Nenhuma pessoa encontrada</li>`;
    return;
  }

  lista.innerHTML = pessoas.map(p => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <strong>${p.nome || p.nome_completo}</strong><br>
        <small class="text-muted">${p.empresa || '—'}</small>
      </div>
      <button class="btn btn-sm btn-primary"
        onclick="adicionarPessoaNaVisitaExistente(${p.id})">
        Adicionar
      </button>
    </li>
  `).join('');
}

async function buscarESugerirVeiculos(query) {
  const veiculos = await buscarVeiculos(query);
  const lista = document.getElementById('listaVeiculos');

  if (!veiculos.length) {
    lista.innerHTML = `<li class="list-group-item text-muted text-center">Nenhum veículo encontrado</li>`;
    return;
  }

  lista.innerHTML = veiculos.map(v => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <strong>${v.placa}</strong><br>
        <small class="text-muted">${v.modelo || '—'}</small>
      </div>
      <button class="btn btn-sm btn-primary"
        onclick="adicionarVeiculoNaVisitaExistente(${v.id})">
        Adicionar
      </button>
    </li>
  `).join('');
}

// ===============================
// ADD NA VISITA
// ===============================
async function adicionarPessoaNaVisitaExistente(pessoaId) {
  const resp = await fetch('/api/visitas/pessoas/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrftoken
    },
    body: JSON.stringify({
      grupo: window.visitaExistenteId,
      pessoa: pessoaId
    })
  });

  if (!resp.ok) {
    alert('Erro ao adicionar pessoa');
    return;
  }

  modalBuscaPessoa.hide();
  location.reload();
}

async function adicionarVeiculoNaVisitaExistente(veiculoId) {
  const resp = await fetch('/api/visitas/veiculos/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrftoken
    },
    body: JSON.stringify({
      grupo: window.visitaExistenteId,
      veiculo: veiculoId
    })
  });

  if (!resp.ok) {
    alert('Erro ao adicionar veículo');
    return;
  }

  modalBuscaVeiculo.hide();
  location.reload();
}

// ===============================
// SAÍDA / RETORNO — PESSOAS
// ===============================
async function registrarSaidaPessoa(id) {
  if (!confirm('Registrar saída da pessoa?')) return;

  const resp = await fetch(`/api/visitas/pessoas/${id}/saida/`, {
    method: 'PATCH',
    headers: { 'X-CSRFToken': csrftoken }
  });

  if (!resp.ok) {
    alert('Erro ao registrar saída');
    return;
  }

  location.reload();
}

async function registrarEntradaPessoa(id) {
  if (!confirm('Registrar retorno da pessoa?')) return;

  const resp = await fetch(`/api/visitas/pessoas/${id}/entrada/`, {
    method: 'PATCH',
    headers: { 'X-CSRFToken': csrftoken }
  });

  if (!resp.ok) {
    alert('Erro ao registrar retorno');
    return;
  }

  location.reload();
}

// ===============================
// SAÍDA / RETORNO — VEÍCULOS
// ===============================
async function registrarSaidaVeiculo(id) {
  if (!confirm('Registrar saída do veículo?')) return;

  const resp = await fetch(`/api/visitas/veiculos/${id}/saida/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': csrftoken }
  });

  if (!resp.ok) {
    alert('Erro ao registrar saída');
    return;
  }

  location.reload();
}

async function registrarEntradaVeiculo(id) {
  if (!confirm('Registrar retorno do veículo?')) return;

  const resp = await fetch(`/api/visitas/veiculos/${id}/entrada/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': csrftoken }
  });

  if (!resp.ok) {
    alert('Erro ao registrar retorno');
    return;
  }

  location.reload();
}

// ===============================
// EXPORT GLOBAL
// ===============================
window.mostrarBuscaPessoa = mostrarBuscaPessoa;
window.mostrarBuscaVeiculo = mostrarBuscaVeiculo;
window.adicionarPessoaNaVisitaExistente = adicionarPessoaNaVisitaExistente;
window.adicionarVeiculoNaVisitaExistente = adicionarVeiculoNaVisitaExistente;
window.registrarSaidaPessoa = registrarSaidaPessoa;
window.registrarEntradaPessoa = registrarEntradaPessoa;
window.registrarSaidaVeiculo = registrarSaidaVeiculo;
window.registrarEntradaVeiculo = registrarEntradaVeiculo;
 