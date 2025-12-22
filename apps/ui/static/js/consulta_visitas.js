let todasVisitas = [];
let visitasFiltradas = [];

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
