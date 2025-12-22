let todasVisitas = [];
let visitasFiltradas = [];
let visitaAtualId = null;
let modalVisitaInstance = null;

/* =========================
   UTILIDADES
========================= */
function formatarDataHora(data) {
  if (!data) return '-';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR') + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getCSRFToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
}

/* =========================
   CARREGAMENTO
========================= */
async function carregarVisitas() {
  document.getElementById('loadingSpinner')?.classList.add('show');

  try {
    const [
      gruposResp,
      visitasPessoasResp,
      visitasVeiculosResp,
      pessoasResp,
      veiculosResp
    ] = await Promise.all([
      fetch('/api/visitas/grupos/'),
      fetch('/api/visitas/pessoas/'),
      fetch('/api/visitas/veiculos/'),
      fetch('/api/pessoas/pessoas/'),
      fetch('/api/veiculos/veiculos/')
    ]);

    const grupos = await gruposResp.json();
    const visitasPessoas = await visitasPessoasResp.json();
    const visitasVeiculos = await visitasVeiculosResp.json();
    const pessoas = await pessoasResp.json();
    const veiculos = await veiculosResp.json();

    const pessoasMap = {};
    pessoas.forEach(p => pessoasMap[p.id] = p);

    const veiculosMap = {};
    veiculos.forEach(v => veiculosMap[v.id] = v);

    todasVisitas = grupos.map(g => ({
      id: g.id,
      motivo: g.motivo,
      autorizado_por: g.autorizado_por,
      observacao: g.observacao,
      data_entrada: g.data_entrada,
      data_saida: g.data_saida,
      status: g.data_saida ? 'encerrada' : 'aberta',
      pessoas: visitasPessoas
        .filter(vp => vp.grupo === g.id)
        .map(vp => ({
          id: vp.id,
          nome: pessoasMap[vp.pessoa]?.nome || '(desconhecido)',
          data_entrada: vp.data_entrada,
          data_saida: vp.data_saida
        })),
      veiculos: visitasVeiculos
        .filter(vv => vv.grupo === g.id)
        .map(vv => ({
          id: vv.id,
          placa: veiculosMap[vv.veiculo]?.placa || '(sem placa)',
          data_entrada: vv.data_entrada,
          data_saida: vv.data_saida
        }))
    }));

    aplicarFiltros();
    atualizarEstatisticas();

  } finally {
    document.getElementById('loadingSpinner')?.classList.remove('show');
  }
}

/* =========================
   LISTA
========================= */
function aplicarFiltros() {
  const txt = document.getElementById('filtroTexto')?.value.toLowerCase() || '';
  const status = document.getElementById('filtroStatus')?.value || '';

  visitasFiltradas = todasVisitas.filter(v => {
    if (status && v.status !== status) return false;
    if (!txt) return true;

    return (
      v.motivo?.toLowerCase().includes(txt) ||
      v.autorizado_por?.toLowerCase().includes(txt) ||
      v.pessoas.some(p => p.nome.toLowerCase().includes(txt)) ||
      v.veiculos.some(v => v.placa.toLowerCase().includes(txt))
    );
  });

  renderizarLista();
}

function renderizarLista() {
  const lista = document.getElementById('listaVisitas');
  lista.innerHTML = '';

  if (!visitasFiltradas.length) {
    document.getElementById('emptyState')?.classList.remove('d-none');
    return;
  }
  document.getElementById('emptyState')?.classList.add('d-none');

  visitasFiltradas.forEach(v => {
    const pessoasDentro = v.pessoas.filter(p => !p.data_saida).length;
    const veiculosDentro = v.veiculos.filter(vv => !vv.data_saida).length;

    lista.innerHTML += `
      <div class="visita-card ${v.status === 'aberta' ? 'border-open' : 'border-closed'}">
        <div class="card-header-custom d-flex justify-content-between align-items-center"
             onclick="abrirModal(${v.id})">

          <div>
            <div class="fw-bold">${v.motivo}</div>
            <small class="text-muted">
              ${v.autorizado_por} • ${formatarDataHora(v.data_entrada)}
            </small>
            <div class="mt-1 d-flex gap-1">
              <span class="badge bg-primary count-badge">
                <i class="bi bi-people"></i> ${pessoasDentro}/${v.pessoas.length}
              </span>
              <span class="badge bg-info count-badge">
                <i class="bi bi-truck"></i> ${veiculosDentro}/${v.veiculos.length}
              </span>
            </div>
          </div>

          <span class="badge ${v.status === 'aberta' ? 'bg-success' : 'bg-danger'}">
            ${v.status.toUpperCase()}
          </span>
        </div>
      </div>`;
  });
}

/* =========================
   MODAL
========================= */
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

/* =========================
   AÇÕES
========================= */

function gerenciarVisita() {
  if (!visitaAtualId) return;
  window.location.href = `/visitas/${visitaAtualId}/`;
}


async function registrarEntradaPessoa(id) {
  await fetch(`/api/visitas/pessoas/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ data_saida: null })
  });

  await carregarVisitas();      // ⬅️ esperar
  abrirModal(visitaAtualId);    // ⬅️ só depois
}

async function registrarEntradaVeiculo(id) {
  await fetch(`/api/visitas/veiculos/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ data_saida: null })
  });

  await carregarVisitas();      // ⬅️ obrigatório
  abrirModal(visitaAtualId);    // ⬅️ depois
}

async function sairPessoa(id) {
  await fetch(`/api/visitas/pessoas/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ data_saida: new Date().toISOString() })
  });

  await carregarVisitas();      // ⬅️
  abrirModal(visitaAtualId);    // ⬅️
}
async function sairVeiculo(id) {
  await fetch(`/api/visitas/veiculos/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({
      data_saida: new Date().toISOString()
    })
  });

  await carregarVisitas();      // ⬅️ obrigatório
  abrirModal(visitaAtualId);    // ⬅️ depois
}

async function encerrarVisita(id) {
  await fetch(`/api/visitas/grupos/${id}/encerrar/`, {
    method: 'POST',
    headers: { 'X-CSRFToken': getCSRFToken() }
  });
  modalVisitaInstance.hide();
  carregarVisitas();
}



function atualizarEstatisticas() {
  document.getElementById('cntAbertas').textContent =
    todasVisitas.filter(v => v.status === 'aberta').length;

  document.getElementById('cntPessoas').textContent =
    todasVisitas.reduce(
      (total, v) => total + v.pessoas.filter(p => !p.data_saida).length,
      0
    );

  document.getElementById('cntVeiculos').textContent =
    todasVisitas.reduce(
      (total, v) => total + v.veiculos.filter(vv => !vv.data_saida).length,
      0
    );

  document.getElementById('cntTotal').textContent = todasVisitas.length;
}




/* ========================= */
document.addEventListener('DOMContentLoaded', carregarVisitas);
