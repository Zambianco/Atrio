let todasVisitas = [];
let visitasFiltradas = [];
let filtrosAtivos = {};

/* =========================
   UTILIDADES
========================= */
function formatarDataHora(data) {
  if (!data) return '-';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR') + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function mostrarLoading(mostrar) {
  const spinner = document.getElementById('loadingSpinner');
  const lista = document.getElementById('listaVisitas');
  if (spinner) {
    spinner.classList.toggle('show', mostrar);
    spinner.classList.toggle('d-none', !mostrar);
  }
  if (lista) lista.style.display = mostrar ? 'none' : 'block';
}

function mostrarEstadoVazio(mostrar) {
  const empty = document.getElementById('emptyState');
  if (empty) empty.classList.toggle('d-none', !mostrar);
}

function criarBadgeStatus(status) {
  return status === 'aberta'
    ? '<span class="badge bg-success">Aberta</span>'
    : '<span class="badge bg-secondary">Encerrada</span>';
}

/* =========================
   FILTROS
========================= */
function atualizarFiltrosAtivos() {
  const container = document.getElementById('activeFilters');
  const tagsContainer = document.getElementById('filterTags');
  if (!container || !tagsContainer) return;

  tagsContainer.innerHTML = '';
  let temFiltros = false;

  if (filtrosAtivos.texto) {
    temFiltros = true;
    tagsContainer.innerHTML += `
      <span class="filter-tag">
        Busca: "${filtrosAtivos.texto}"
        <button class="btn-close btn-close-white" style="font-size: 0.6rem; margin-left: 4px;"
                onclick="removerFiltro('texto')"></button>
      </span>
    `;
  }

  if (filtrosAtivos.status) {
    temFiltros = true;
    const statusText = filtrosAtivos.status === 'aberta' ? 'Abertas' : 'Encerradas';
    tagsContainer.innerHTML += `
      <span class="filter-tag">
        Status: ${statusText}
        <button class="btn-close btn-close-white" style="font-size: 0.6rem; margin-left: 4px;"
                onclick="removerFiltro('status')"></button>
      </span>
    `;
  }

  if (filtrosAtivos.dataInicio) {
    temFiltros = true;
    tagsContainer.innerHTML += `
      <span class="filter-tag">
        Desde: ${new Date(filtrosAtivos.dataInicio).toLocaleDateString('pt-BR')}
        <button class="btn-close btn-close-white" style="font-size: 0.6rem; margin-left: 4px;"
                onclick="removerFiltro('dataInicio')"></button>
      </span>
    `;
  }

  if (filtrosAtivos.dataFim) {
    temFiltros = true;
    tagsContainer.innerHTML += `
      <span class="filter-tag">
        Ate: ${new Date(filtrosAtivos.dataFim).toLocaleDateString('pt-BR')}
        <button class="btn-close btn-close-white" style="font-size: 0.6rem; margin-left: 4px;"
                onclick="removerFiltro('dataFim')"></button>
      </span>
    `;
  }

  container.classList.toggle('d-none', !temFiltros);
}

function removerFiltro(tipo) {
  delete filtrosAtivos[tipo];

  const inputMap = {
    texto: 'filtroTexto',
    status: 'filtroStatus',
    dataInicio: 'filtroDataInicio',
    dataFim: 'filtroDataFim'
  };

  if (inputMap[tipo]) {
    const el = document.getElementById(inputMap[tipo]);
    if (el) el.value = '';
  }

  aplicarFiltros();
}

function limparFiltros() {
  filtrosAtivos = {};
  ['filtroTexto', 'filtroStatus', 'filtroDataInicio', 'filtroDataFim', 'filtroOrdenacao']
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });

  aplicarFiltros();
}

function aplicarFiltros() {
  const texto = (document.getElementById('filtroTexto')?.value || '').trim().toLowerCase();
  const status = document.getElementById('filtroStatus')?.value || '';
  const dataInicio = document.getElementById('filtroDataInicio')?.value || '';
  const dataFim = document.getElementById('filtroDataFim')?.value || '';
  const ordenacao = document.getElementById('filtroOrdenacao')?.value || 'recentes';

  filtrosAtivos = { texto, status, dataInicio, dataFim, ordenacao };
  atualizarFiltrosAtivos();

  let filtradas = [...todasVisitas];

  if (texto) {
    filtradas = filtradas.filter(v =>
      (v.motivo && v.motivo.toLowerCase().includes(texto)) ||
      (v.responsavel && v.responsavel.toLowerCase().includes(texto)) ||
      (v.usuario && v.usuario.toLowerCase().includes(texto)) ||
      (v.autorizado_por && v.autorizado_por.toLowerCase().includes(texto)) ||
      (v.pessoas && v.pessoas.some(p => p.nome && p.nome.toLowerCase().includes(texto))) ||
      (v.veiculos && v.veiculos.some(ve => ve.placa && ve.placa.toLowerCase().includes(texto)))
    );
  }

  if (status) {
    filtradas = filtradas.filter(v => v.status === status);
  }

  if (dataInicio || dataFim) {
    const inicio = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;
    if (inicio) inicio.setHours(0, 0, 0, 0);
    if (fim) fim.setHours(23, 59, 59, 999);

    filtradas = filtradas.filter(v => {
      if (!v.data_entrada) return false;
      const entrada = new Date(v.data_entrada);
      if (inicio && entrada < inicio) return false;
      if (fim && entrada > fim) return false;
      return true;
    });
  }

  if (ordenacao === 'recentes') {
    filtradas.sort((a, b) => new Date(b.data_entrada) - new Date(a.data_entrada));
  } else if (ordenacao === 'antigas') {
    filtradas.sort((a, b) => new Date(a.data_entrada) - new Date(b.data_entrada));
  } else if (ordenacao === 'nome') {
    filtradas.sort((a, b) => (a.motivo || '').localeCompare(b.motivo || ''));
  } else if (ordenacao === 'status') {
    filtradas.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
  }

  visitasFiltradas = filtradas;
  renderizarLista();
  atualizarEstatisticas(visitasFiltradas);
  atualizarContadorResultados();
}

/* =========================
   LISTA
========================= */
function renderizarLista() {
  const lista = document.getElementById('listaVisitas');
  if (!lista) return;

  if (!visitasFiltradas.length) {
    lista.innerHTML = '';
    mostrarEstadoVazio(true);
    return;
  }

  mostrarEstadoVazio(false);

  lista.innerHTML = visitasFiltradas.map(visita => {
    const pessoasDentro = visita.pessoas.filter(p => !p.data_saida).length;
    const veiculosDentro = visita.veiculos.filter(v => !v.data_saida).length;
    return `
    <div class="card visita-card ${visita.status === 'aberta' ? 'border-open' : 'border-closed'}">
      <div class="card-header-custom d-flex justify-content-between align-items-center"
           data-visit-id="${visita.id}">
        <div>
          <div class="fw-bold">${visita.motivo || 'Visita sem motivo'}</div>
          <small class="text-muted">
            ${visita.autorizado_por || '-'} - ${formatarDataHora(visita.data_entrada)}
          </small>
          <div class="mt-1 d-flex gap-1">
            <span class="badge bg-primary count-badge">
              <i class="bi bi-people"></i> ${pessoasDentro}/${visita.pessoas.length}
            </span>
            <span class="badge bg-info count-badge">
              <i class="bi bi-truck"></i> ${veiculosDentro}/${visita.veiculos.length}
            </span>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          ${criarBadgeStatus(visita.status)}
          <button class="btn btn-sm btn-outline-primary"
                  onclick="abrirDetalhesVisita(${visita.id})"
                  data-bs-toggle="tooltip"
                  title="Ver detalhes">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn-expand" type="button" aria-label="Expandir">
            <i class="bi bi-chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="card-body-custom">
        <div class="row">
          <div class="col-md-6">
            <p class="mb-1"><strong>Contato:</strong> ${visita.autorizado_por || '-'}</p>
            <p class="mb-1"><strong>Usuario:</strong> ${visita.usuario || '-'}</p>
            <p class="mb-1"><strong>Entrada:</strong> ${formatarDataHora(visita.data_entrada)}</p>
            <p class="mb-1"><strong>Saida:</strong> ${formatarDataHora(visita.data_saida)}</p>
          </div>
          <div class="col-md-6">
            ${visita.pessoas.length > 0 ? `
              <p class="mb-1"><strong>Pessoas:</strong></p>
              <div class="d-flex flex-wrap gap-1 mb-2">
                ${visita.pessoas.map(p => `
                  <span class="badge bg-light text-dark">${p.nome}</span>
                `).join('')}
              </div>
            ` : ''}
            ${visita.veiculos.length > 0 ? `
              <p class="mb-1"><strong>Veiculos:</strong></p>
              <div class="d-flex flex-wrap gap-1">
                ${visita.veiculos.map(v => `
                  <span class="badge bg-light text-dark">${v.placa}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  }).join('');

  const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltips.forEach(el => new bootstrap.Tooltip(el));

  const headers = document.querySelectorAll('.card-header-custom');
  headers.forEach(header => {
    header.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      const card = header.closest('.visita-card');
      const body = card?.querySelector('.card-body-custom');
      const btn = card?.querySelector('.btn-expand');
      if (!body || !btn) return;
      const isOpen = body.classList.contains('show');
      body.classList.toggle('show', !isOpen);
      btn.classList.toggle('rotated', !isOpen);
      header.classList.toggle('active', !isOpen);
    });
  });

  const expandButtons = document.querySelectorAll('.btn-expand');
  expandButtons.forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const card = btn.closest('.visita-card');
      const header = card?.querySelector('.card-header-custom');
      const body = card?.querySelector('.card-body-custom');
      if (!body || !header) return;
      const isOpen = body.classList.contains('show');
      body.classList.toggle('show', !isOpen);
      btn.classList.toggle('rotated', !isOpen);
      header.classList.toggle('active', !isOpen);
    });
  });
}

function atualizarEstatisticas(visitas = todasVisitas) {
  const total = visitas.length;
  const abertas = visitas.filter(v => v.status === 'aberta').length;
  const totalPessoas = visitas.reduce(
    (sum, v) => sum + v.pessoas.filter(p => !p.data_saida).length,
    0
  );
  const totalVeiculos = visitas.reduce(
    (sum, v) => sum + v.veiculos.filter(ve => !ve.data_saida).length,
    0
  );

  const cntTotal = document.getElementById('cntTotal');
  if (cntTotal) cntTotal.textContent = total;

  const cntAbertas = document.getElementById('cntAbertas');
  if (cntAbertas) cntAbertas.textContent = abertas;

  const cntPessoas = document.getElementById('cntPessoas');
  if (cntPessoas) cntPessoas.textContent = totalPessoas;

  const cntVeiculos = document.getElementById('cntVeiculos');
  if (cntVeiculos) cntVeiculos.textContent = totalVeiculos;
}

function atualizarContadorResultados() {
  const contador = document.getElementById('contadorResultados');
  if (contador) contador.textContent = `Mostrando ${visitasFiltradas.length} visitas`;
}

function filtrarPorStatus(status) {
  const filtroStatus = document.getElementById('filtroStatus');
  if (filtroStatus) filtroStatus.value = status;
  aplicarFiltros();
}

function mostrarTodasVisitas() {
  const filtroStatus = document.getElementById('filtroStatus');
  const filtroTexto = document.getElementById('filtroTexto');
  const filtroDataInicio = document.getElementById('filtroDataInicio');
  const filtroDataFim = document.getElementById('filtroDataFim');
  if (filtroStatus) filtroStatus.value = '';
  if (filtroTexto) filtroTexto.value = '';
  if (filtroDataInicio) filtroDataInicio.value = '';
  if (filtroDataFim) filtroDataFim.value = '';
  aplicarFiltros();
}

function exportarVisitasCSV() {
  const data = visitasFiltradas.length ? visitasFiltradas : todasVisitas;
  if (!data.length) {
    window.showAlert?.('Nenhuma visita para exportar.', 'Exportacao');
    return;
  }

  const header = [
    'id',
    'motivo_destino',
    'contato',
    'usuario',
    'data_entrada',
    'data_saida',
    'status',
    'membros'
  ];

  const rows = [];
  data.forEach(v => {
    const base = [
      v.id,
      v.motivo || '',
      v.autorizado_por || '',
      v.usuario || '',
      v.data_entrada || '',
      v.data_saida || '',
      v.status || ''
    ];

    const pessoas = (v.pessoas || []).map(p => `Pessoa#${p.id} ${p.nome || ''}`.trim());
    const veiculos = (v.veiculos || []).map(ve => `Veiculo#${ve.id} ${ve.placa || ''}`.trim());
    const membros = [...pessoas, ...veiculos];

    if (!membros.length) {
      rows.push([...base, '']);
      return;
    }

    membros.forEach(membro => {
      rows.push([...base, membro]);
    });
  });

  const csv = [header, ...rows]
    .map(cols => cols.map(col => {
      const value = String(col).replace(/\"/g, '\"\"');
      return `"${value}"`;
    }).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'visitas.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function abrirDetalhesVisita(id) {
  if (typeof window.abrirModal === 'function') {
    window.abrirModal(id);
  } else {
    console.error('Funcao abrirModal nao disponivel');
    window.showAlert?.('Funcao nao disponivel no momento', 'Aviso');
  }
}

/* =========================
   CARREGAMENTO
========================= */
async function carregarVisitas() {
  mostrarLoading(true);

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

    const safeJson = async (resp) => {
      try {
        return await resp.json();
      } catch {
        return null;
      }
    };

    const gruposData = await safeJson(gruposResp);
    const visitasPessoasData = visitasPessoasResp.ok ? await safeJson(visitasPessoasResp) : null;
    const visitasVeiculosData = visitasVeiculosResp.ok ? await safeJson(visitasVeiculosResp) : null;
    const pessoasData = pessoasResp.ok ? await safeJson(pessoasResp) : null;
    const veiculosData = veiculosResp.ok ? await safeJson(veiculosResp) : null;

    const grupos = Array.isArray(gruposData) ? gruposData : (gruposData?.results || []);
    const visitasPessoas = Array.isArray(visitasPessoasData) ? visitasPessoasData : (visitasPessoasData?.results || []);
    const visitasVeiculos = Array.isArray(visitasVeiculosData) ? visitasVeiculosData : (visitasVeiculosData?.results || []);
    const pessoas = Array.isArray(pessoasData) ? pessoasData : (pessoasData?.results || []);
    const veiculos = Array.isArray(veiculosData) ? veiculosData : (veiculosData?.results || []);

    const pessoasMap = {};
    pessoas.forEach(p => { pessoasMap[p.id] = p; });

    const veiculosMap = {};
    veiculos.forEach(v => { veiculosMap[v.id] = v; });

    const podeUsarPessoas = visitasPessoasResp.ok && pessoasResp.ok;

    if (podeUsarPessoas) {
      todasVisitas = grupos.map(g => ({
        id: g.id,
        motivo: g.motivo,
        autorizado_por: g.autorizado_por,
        responsavel: g.responsavel,
        usuario: g.criado_por_username || '',
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
    } else {
      const resumoPromises = grupos.map(async g => {
        const resp = await fetch(`/api/visitas/grupos/${g.id}/resumo/`);
        if (!resp.ok) return null;
        return safeJson(resp);
      });
      const resumos = (await Promise.all(resumoPromises)).filter(Boolean);
      const resumoMap = new Map(resumos.map(r => [r.grupo.id, r]));

      todasVisitas = grupos.map(g => {
        const resumo = resumoMap.get(g.id);
        if (!resumo) {
          return {
            id: g.id,
            motivo: g.motivo,
            autorizado_por: g.autorizado_por,
            responsavel: g.responsavel,
            usuario: g.criado_por_username || '',
            observacao: g.observacao,
            data_entrada: g.data_entrada,
            data_saida: g.data_saida,
            status: g.data_saida ? 'encerrada' : 'aberta',
            pessoas: [],
            veiculos: []
          };
        }

        return {
          id: resumo.grupo.id,
          motivo: resumo.grupo.motivo,
          autorizado_por: resumo.grupo.autorizado_por,
          responsavel: resumo.grupo.responsavel,
          usuario: resumo.grupo.criado_por_username || '',
          observacao: resumo.grupo.observacao,
          data_entrada: resumo.grupo.data_entrada,
          data_saida: resumo.grupo.data_saida,
          status: resumo.grupo.data_saida ? 'encerrada' : 'aberta',
          pessoas: (resumo.pessoas || []).map(p => ({
            id: p.id,
            nome: p.nome || '(desconhecido)',
            data_entrada: p.entrada,
            data_saida: p.saida
          })),
          veiculos: (resumo.veiculos || []).map(v => ({
            id: v.id,
            placa: v.placa || '(sem placa)',
            data_entrada: v.entrada,
            data_saida: v.saida
          }))
        };
      });
    }

    aplicarFiltros();
  } catch (error) {
    console.error('Erro ao carregar visitas:', error);
    visitasFiltradas = [];
    renderizarLista();
    window.showAlert?.('Erro ao carregar visitas. Verifique sua conexao.', 'Erro');
  } finally {
    mostrarLoading(false);
  }
}

/* ========================= */
document.addEventListener('DOMContentLoaded', () => {
  ['filtroTexto', 'filtroStatus', 'filtroDataInicio', 'filtroDataFim', 'filtroOrdenacao']
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', aplicarFiltros);
    });

  const filtroTexto = document.getElementById('filtroTexto');
  if (filtroTexto) {
    filtroTexto.addEventListener('input', function() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(aplicarFiltros, 300);
    });
  }

  carregarVisitas();
});
