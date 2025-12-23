let visitaAtualId = null;
let modalVisitaInstance = null;

function resolveCSRFToken() {
  if (typeof getCSRFToken === 'function') return getCSRFToken();
  if (typeof csrftoken !== 'undefined') return csrftoken;

  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='));
  return cookie ? cookie.split('=')[1] : '';
}

function abrirModal(id) {
  visitaAtualId = id;
  const v = todasVisitas.find(x => x.id === id);
  if (!v) return;

  const modalEl = document.getElementById('modalVisita');
  if (!modalVisitaInstance) {
    modalVisitaInstance = new bootstrap.Modal(modalEl);
  }

  const pessoasDentro = v.pessoas.filter(p => !p.data_saida).length;
  const veiculosDentro = v.veiculos.filter(vv => !vv.data_saida).length;

  const listaPessoas = v.pessoas.length
    ? v.pessoas.map(p => `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <span class="fw-semibold">${p.nome}</span>
          ${p.data_saida
            ? '<span class="badge bg-secondary ms-2">SAIU</span>'
            : '<span class="badge bg-success ms-2">DENTRO</span>'}
        </div>
        ${v.status === 'aberta' ? `
          <button class="btn btn-sm ${p.data_saida ? 'btn-outline-success' : 'btn-outline-danger'}"
            onclick="event.stopPropagation(); ${
              p.data_saida
                ? `registrarEntradaPessoa(${p.id})`
                : `sairPessoa(${p.id})`
            }">
            ${p.data_saida ? 'Registrar Entrada' : 'Registrar Saída'}
          </button>` : ''}
      </div>
    `).join('')
    : '<p class="text-muted">Nenhuma pessoa registrada</p>';

  const listaVeiculos = v.veiculos.length
    ? v.veiculos.map(vv => `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <span class="fw-semibold">${vv.placa}</span>
          ${vv.data_saida
            ? '<span class="badge bg-secondary ms-2">SAIU</span>'
            : '<span class="badge bg-success ms-2">DENTRO</span>'}
        </div>
        ${v.status === 'aberta' ? `
          <button class="btn btn-sm ${vv.data_saida ? 'btn-outline-success' : 'btn-outline-danger'}"
            onclick="event.stopPropagation(); ${
              vv.data_saida
                ? `registrarEntradaVeiculo(${vv.id})`
                : `sairVeiculo(${vv.id})`
            }">
            ${vv.data_saida ? 'Registrar Entrada' : 'Registrar Saída'}
          </button>` : ''}
      </div>
    `).join('')
    : '<p class="text-muted">Nenhum veículo registrado</p>';

  document.getElementById('modalVisitaBody').innerHTML = `
    <div class="row mb-4">
      <div class="col-md-6">
        <table class="table table-sm table-borderless">
          <tr><td class="fw-bold">ID:</td><td>#${v.id}</td></tr>
          <tr><td class="fw-bold">Motivo:</td><td>${v.motivo}</td></tr>
          <tr><td class="fw-bold">Responsável:</td><td>${v.autorizado_por}</td></tr>
          <tr><td class="fw-bold">Status:</td>
            <td><span class="badge ${v.status === 'aberta' ? 'bg-success' : 'bg-danger'}">
              ${v.status.toUpperCase()}
            </span></td>
          </tr>
          <tr><td class="fw-bold">Início:</td><td>${formatarDataHora(v.data_entrada)}</td></tr>
        </table>
      </div>
      <div class="col-md-6">
        <table class="table table-sm table-borderless">
          <tr><td>Total Pessoas:</td><td>${v.pessoas.length}</td></tr>
          <tr><td>Pessoas Presentes:</td><td>${pessoasDentro}</td></tr>
          <tr><td>Total Veículos:</td><td>${v.veiculos.length}</td></tr>
          <tr><td>Veículos Presentes:</td><td>${veiculosDentro}</td></tr>
        </table>
      </div>
    </div>

    <div class="row">
      <div class="col-md-6">${listaPessoas}</div>
      <div class="col-md-6">${listaVeiculos}</div>
    </div>

    
  `;

  modalVisitaInstance.show();
}

function gerenciarVisita() {
  if (!visitaAtualId) return;
  window.location.href = `/visitas/${visitaAtualId}/`;
}


async function registrarEntradaPessoa(id) {
  await fetch(`/api/visitas/pessoas/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': resolveCSRFToken()
    },
    body: JSON.stringify({ data_saida: null })
  });

  await recarregarListaEReabrir();
}

async function registrarEntradaVeiculo(id) {
  await fetch(`/api/visitas/veiculos/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': resolveCSRFToken()
    },
    body: JSON.stringify({ data_saida: null })
  });

  await recarregarListaEReabrir();
}

async function sairPessoa(id) {
  await fetch(`/api/visitas/pessoas/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': resolveCSRFToken()
    },
    body: JSON.stringify({ data_saida: new Date().toISOString() })
  });

  await recarregarListaEReabrir();
}
async function sairVeiculo(id) {
  await fetch(`/api/visitas/veiculos/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': resolveCSRFToken()
    },
    body: JSON.stringify({
      data_saida: new Date().toISOString()
    })
  });

  await recarregarListaEReabrir();
}

async function encerrarVisita(id) {
  await fetch(`/api/visitas/grupos/${id}/encerrar/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': resolveCSRFToken() }
  });
  modalVisitaInstance.hide();
  if (typeof carregarVisitas === 'function') {
    carregarVisitas();
  } else {
    window.location.reload();
  }
}

// Alias para compatibilidade com gerenciar_visita.html
function registrarSaidaPessoa(id) {
  return sairPessoa(id);
}

function registrarSaidaVeiculo(id) {
  return sairVeiculo(id);
}

async function recarregarListaEReabrir() {
  if (typeof carregarVisitas === 'function') {
    await carregarVisitas();
    abrirModal(visitaAtualId);
  } else {
    window.location.reload();
  }
}
