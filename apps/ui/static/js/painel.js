let dadosCache = null;
let visitaAtualGrupo = null;

function formatarData(data) {
  if (!data) return '-';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR') + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function estaDentro(item) {
  return item.entrada && !item.saida;
}

function normalizarTexto(valor) {
  return (valor || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseTempoParaMinutos(tempo) {
  if (tempo == null) return 0;
  if (typeof tempo === 'number') return tempo;

  const texto = tempo.toString().trim().toLowerCase();
  if (!texto) return 0;

  if (texto.includes(':')) {
    const partes = texto.split(':').map(p => parseInt(p, 10));
    if (partes.some(Number.isNaN)) return 0;
    if (partes.length === 3) return partes[0] * 60 + partes[1] + partes[2] / 60;
    if (partes.length === 2) return partes[0] + partes[1] / 60;
  }

  let minutos = 0;
  const dias = texto.match(/(\d+)\s*d/);
  const horas = texto.match(/(\d+)\s*h/);
  const mins = texto.match(/(\d+)\s*m/);
  const segs = texto.match(/(\d+)\s*s/);

  if (dias) minutos += parseInt(dias[1], 10) * 24 * 60;
  if (horas) minutos += parseInt(horas[1], 10) * 60;
  if (mins) minutos += parseInt(mins[1], 10);
  if (segs) minutos += parseInt(segs[1], 10) / 60;

  return minutos;
}

function obterEstadoControles() {
  const filtro = document.getElementById('filtroPainel');
  const ordenacao = document.getElementById('ordenacaoPainel');

  return {
    termo: (filtro && filtro.value) ? filtro.value.trim() : '',
    ordenacao: ordenacao ? ordenacao.value : 'tempo_desc'
  };
}

function filtrarLista(lista, tipo, termoNormalizado) {
  if (!termoNormalizado) return lista.slice();

  return lista.filter(item => {
    const empresa = normalizarTexto(item.empresa);
    if (tipo === 'pessoas') {
      const nome = normalizarTexto(item.nome);
      return nome.includes(termoNormalizado) || empresa.includes(termoNormalizado);
    }

    const placa = normalizarTexto(item.placa);
    return placa.includes(termoNormalizado) || empresa.includes(termoNormalizado);
  });
}

function ordenarLista(lista, ordenacao, tipo) {
  const partes = (ordenacao || 'tempo_desc').split('_');
  const campoBase = partes[0];
  const direcao = partes[1] === 'asc' ? 1 : -1;

  let campo = campoBase;
  if (campoBase === 'nome' && tipo === 'veiculos') campo = 'placa';

  return lista.slice().sort((a, b) => {
    let valorA = a[campo];
    let valorB = b[campo];
    let comparacao = 0;

    if (campo === 'tempo') {
      comparacao = parseTempoParaMinutos(valorA) - parseTempoParaMinutos(valorB);
    } else if (campo === 'entrada') {
      comparacao = new Date(valorA || 0).getTime() - new Date(valorB || 0).getTime();
    } else {
      comparacao = normalizarTexto(valorA).localeCompare(normalizarTexto(valorB));
    }

    if (comparacao === 0 && campo !== 'entrada') {
      const fallbackA = new Date(a.entrada || 0).getTime();
      const fallbackB = new Date(b.entrada || 0).getTime();
      comparacao = fallbackA - fallbackB;
    }

    return comparacao * direcao;
  });
}

function atualizarIndicadores(data, pessoasFiltradas, veiculosFiltrados) {
  const totalPessoas = document.getElementById('totalPessoas');
  const totalVeiculos = document.getElementById('totalVeiculos');
  const totalEmpresas = document.getElementById('totalEmpresas');
  const badgePessoas = document.getElementById('badgePessoas');
  const badgeVeiculos = document.getElementById('badgeVeiculos');

  if (totalPessoas) totalPessoas.textContent = data.pessoas.length;
  if (totalVeiculos) totalVeiculos.textContent = data.veiculos.length;
  if (badgePessoas) badgePessoas.textContent = pessoasFiltradas.length;
  if (badgeVeiculos) badgeVeiculos.textContent = veiculosFiltrados.length;

  const empresasAtivas = new Set();
  data.pessoas.forEach(p => { if (p.empresa) empresasAtivas.add(normalizarTexto(p.empresa)); });
  data.veiculos.forEach(v => { if (v.empresa) empresasAtivas.add(normalizarTexto(v.empresa)); });
  if (totalEmpresas) totalEmpresas.textContent = empresasAtivas.size;
}

function renderTabelas(pessoas, veiculos) {
  const tbPessoas = document.querySelector('#tblPessoas tbody');
  const tbVeiculos = document.querySelector('#tblVeiculos tbody');
  if (!tbPessoas || !tbVeiculos) return;

  tbPessoas.innerHTML = pessoas.map(p => `
        <tr onclick="abrirGrupo(${p.grupo_id})" style="cursor:pointer">
          <td class="fw-semibold">${p.nome}</td>
          <td>${p.empresa || '-'}</td>
          <td>${formatarData(p.entrada)}</td>
          <td class="fw-bold text-primary">${p.tempo}</td>
        </tr>`).join('');

  tbVeiculos.innerHTML = veiculos.map(v => `
        <tr onclick="abrirGrupo(${v.grupo_id})" style="cursor:pointer">
          <td class="fw-bold">${v.placa}</td>
          <td>${v.empresa || '-'}</td>
          <td>${formatarData(v.entrada)}</td>
          <td class="fw-bold text-primary">${v.tempo}</td>
        </tr>`).join('');
}

function atualizarPainel() {
  if (!dadosCache) return;

  const { termo, ordenacao } = obterEstadoControles();
  const termoNormalizado = normalizarTexto(termo);

  const pessoasFiltradas = ordenarLista(
    filtrarLista(dadosCache.pessoas, 'pessoas', termoNormalizado),
    ordenacao,
    'pessoas'
  );

  const veiculosFiltrados = ordenarLista(
    filtrarLista(dadosCache.veiculos, 'veiculos', termoNormalizado),
    ordenacao,
    'veiculos'
  );

  renderTabelas(pessoasFiltradas, veiculosFiltrados);
  atualizarIndicadores(dadosCache, pessoasFiltradas, veiculosFiltrados);
}

async function carregarPainel() {
  try {
    const resp = await fetch('/api/visitas/presentes/');
    const data = await resp.json();
    dadosCache = data;

    atualizarPainel();
  } catch (error) {
    console.error('Erro ao carregar painel:', error);
  }
}

function abrirGrupo(grupoId) {
  // reutiliza exatamente o mesmo modal da consulta
  visitaAtualId = grupoId;
  if (typeof window.abrirModal === 'function') {
    window.abrirModal(grupoId);
  } else if (typeof abrirModal === 'function') {
    abrirModal(grupoId);
  } else {
    console.error('abrirModal não está disponível. Verifique se modal_detalhe_visita.js foi carregado.');
  }
}


async function carregarResumoGrupo(grupoId) {
  try {
    const resp = await fetch(`/api/visitas/grupos/${grupoId}/resumo/`);
    if (!resp.ok) return;

    const data = await resp.json();
    const grupo = data.grupo;
    const pessoas = data.pessoas;
    const veiculos = data.veiculos;

    // atualiza info com dados reais do grupo
    document.getElementById('v-motivo').textContent = grupo.motivo || '-';
    document.getElementById('v-responsavel').textContent = grupo.autorizado_por || '-';
    document.getElementById('v-fim').textContent = grupo.data_saida ? formatarData(grupo.data_saida) : '-';

    const encerrada = !!grupo.data_saida;

    // contadores com todos
    document.getElementById('v-total-pessoas').textContent = pessoas.length;
    document.getElementById('v-presentes-pessoas').textContent = pessoas.filter(p => !p.saida).length;

    document.getElementById('v-total-veiculos').textContent = veiculos.length;
    document.getElementById('v-presentes-veiculos').textContent = veiculos.filter(v => !v.saida).length;

    // botão encerrar
    const btnEncerrar = document.getElementById('btnEncerrarVisita');
    if (!encerrada) btnEncerrar.classList.remove('d-none');
    else btnEncerrar.classList.add('d-none');

    // listas completas (inclui SAIU)
    const ulP = document.getElementById('lista-pessoas');
    const ulV = document.getElementById('lista-veiculos');
    ulP.innerHTML = '';
    ulV.innerHTML = '';

    pessoas.forEach(p => {
      const dentro = !p.saida;
      let botao = '';

      if (!encerrada) {
        if (dentro) {
          botao = `<button class="btn btn-sm btn-outline-danger"
                    onclick="alterarStatusPessoa(${grupoId}, ${p.id})">
                    Registrar Saída
                  </button>`;
        } else {
          // precisa do pessoa_id no resumo
          botao = `<button class="btn btn-sm btn-outline-success"
                    onclick="registrarEntradaPessoa(${grupoId}, ${p.pessoa_id})">
                    Registrar Entrada
                  </button>`;
        }
      }

      ulP.innerHTML += `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>${p.nome}</strong> (${p.empresa || '-'})
            <span class="badge ms-2 ${dentro ? 'bg-success' : 'bg-secondary'}">
              ${dentro ? 'DENTRO' : 'SAIU'}
            </span>
          </div>
          ${botao}
        </li>`;
    });

    veiculos.forEach(v => {
      const dentro = !v.saida;
      let botao = '';

      if (!encerrada) {
        if (dentro) {
          botao = `<button class="btn btn-sm btn-outline-danger"
                    onclick="alterarStatusVeiculo(${grupoId}, ${v.id})">
                    Registrar Saída
                  </button>`;
        } else {
          // precisa do veiculo_id no resumo
          botao = `<button class="btn btn-sm btn-outline-success"
                    onclick="registrarEntradaVeiculo(${grupoId}, ${v.veiculo_id})">
                    Registrar Entrada
                  </button>`;
        }
      }

      ulV.innerHTML += `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>${v.placa}</strong> — ${v.modelo || 'Sem modelo'}
            <span class="badge ms-2 ${dentro ? 'bg-success' : 'bg-secondary'}">
              ${dentro ? 'DENTRO' : 'SAIU'}
            </span>
          </div>
          ${botao}
        </li>`;
    });

  } catch (e) {
    console.error('Erro ao carregar resumo:', e);
  }
}

// SAÍDA (igual ao seu antigo)
async function alterarStatusPessoa(grupoId, pessoaVisitaId) {
  try {
    const response = await fetch(`/api/visitas/pessoas/${pessoaVisitaId}/saida/`, {
      method: 'PATCH',
      headers: { 'X-CSRFToken': getCSRFToken() }
    });

    if (response.ok) {
      await carregarPainel();
      abrirGrupo(grupoId);
    } else {
      alert('Erro ao registrar saída da pessoa');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao registrar saída');
  }
}

async function alterarStatusVeiculo(grupoId, veiculoVisitaId) {
  const response = await fetch(`/api/visitas/veiculos/${veiculoVisitaId}/saida/`, {
    method: 'PATCH',
    headers: { 'X-CSRFToken': getCSRFToken() }
  });

  if (response.ok) {
    await carregarPainel();
    abrirGrupo(grupoId);
  } else {
    alert('Erro ao registrar saída do veículo');
  }
}

// ENTRADA (re-entrada) via adicionar_na_visita
async function registrarEntradaPessoa(grupoId, pessoaId) {
  if (!pessoaId) {
    alert('Faltou pessoa_id no /resumo/. Ajuste o backend.');
    return;
  }

  const response = await fetch(`/api/visitas/grupos/${grupoId}/adicionar/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ pessoa: pessoaId })
  });

  if (response.ok) {
    await carregarPainel();
    abrirGrupo(grupoId);
  } else {
    alert('Erro ao registrar entrada da pessoa');
  }
}

async function registrarEntradaVeiculo(grupoId, veiculoId) {
  if (!veiculoId) {
    alert('Faltou veiculo_id no /resumo/. Ajuste o backend.');
    return;
  }

  const response = await fetch(`/api/visitas/grupos/${grupoId}/adicionar/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({ veiculo: veiculoId })
  });

  if (response.ok) {
    await carregarPainel();
    abrirGrupo(grupoId);
  } else {
    alert('Erro ao registrar entrada do veículo');
  }
}

async function encerrarVisita(grupoId) {
  if (!(await window.confirmarEncerrarVisita())) {
    return;
  }

  try {
    const response = await fetch(`/api/visitas/grupos/${grupoId}/encerrar/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCSRFToken() }
    });

    if (response.ok) {
      carregarPainel();
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalVisita'));
      modal.hide();
      alert('Visita encerrada com sucesso!');
    } else {
      alert('Erro ao encerrar visita');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao encerrar visita');
  }
}

function imprimirComprovante() {
  window.print();
}

document.addEventListener('DOMContentLoaded', () => {
  carregarPainel();
  setInterval(carregarPainel, 30000);

  const filtro = document.getElementById('filtroPainel');
  const ordenacao = document.getElementById('ordenacaoPainel');

  if (filtro) filtro.addEventListener('input', atualizarPainel);
  if (ordenacao) ordenacao.addEventListener('change', atualizarPainel);
});
