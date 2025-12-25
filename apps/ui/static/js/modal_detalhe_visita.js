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

async function abrirModal(id) {
  visitaAtualId = id;
  let v = null;
  try {
    if (typeof todasVisitas !== 'undefined' && Array.isArray(todasVisitas)) {
      v = todasVisitas.find(x => x.id === id) || null;
    }
  } catch (e) { v = null; }

  // Se não encontramos o grupo em `todasVisitas`, buscar resumo via API para montar um objeto mínimo
  if (!v) {
    try {
      const resp = await fetch(`/api/visitas/grupos/${id}/resumo/`);
      if (resp.ok) {
        const data = await resp.json();
        const grupo = data.grupo || {};
        const pessoas = data.pessoas || [];
        const veiculos = data.veiculos || [];

        v = {
          id: grupo.id || id,
          motivo: grupo.motivo || '',
          autorizado_por: grupo.autorizado_por || '',
          status: grupo.data_saida ? 'encerrada' : 'aberta',
          data_entrada: grupo.data_entrada || null,
          pessoas: pessoas.map(p => ({ id: p.id || p.pessoa_id || null, nome: p.nome || p.pessoa_nome || '(sem nome)', data_saida: p.saida || p.data_saida || null, pessoa_id: p.pessoa_id })),
          veiculos: veiculos.map(vv => ({ id: vv.id || vv.veiculo_id || null, placa: vv.placa || vv.veiculo_placa || '(sem placa)', data_saida: vv.saida || vv.data_saida || null, veiculo_id: vv.veiculo_id }))
        };
      } else {
        console.error('Não foi possível carregar resumo do grupo', id);
        return;
      }
    } catch (e) {
      console.error('Erro ao buscar resumo do grupo:', e);
      return;
    }
  }

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
  // Nota: botão de Encerrar é exibido apenas na página de gerenciamento (/visitas/{id}/)
}

function gerenciarVisita() {
  if (!visitaAtualId) return;
  window.location.href = `/visitas/${visitaAtualId}/`;
}


async function registrarEntradaPessoa(id) {
  if (window.visitaActions) {
    await window.visitaActions.registrarEntradaPessoa(visitaAtualId, id);
    await recarregarListaEReabrir();
  } else {
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
}

async function registrarEntradaVeiculo(id) {
  if (window.visitaActions) {
    await window.visitaActions.registrarEntradaVeiculo(visitaAtualId, id);
    await recarregarListaEReabrir();
  } else {
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
}

async function sairPessoa(id) {
  if (window.visitaActions) {
    const r = await window.visitaActions.confirmAndRegistrarSaidaPessoa(visitaAtualId, id);
    if (r.cancelled) return;
    if (r.error) { alert(r.error); return; }
    if (r.encerrada) {
      // encerrarVisita do módulo já disparou evento; modal fecha quando recarregar a lista
      await recarregarListaEReabrir();
      return;
    }
    await recarregarListaEReabrir();
    return;
  }

  // fallback: comportamento antigo
  try {
    const resumoResp = await fetch(`/api/visitas/grupos/${visitaAtualId}/resumo/`);
    if (resumoResp.ok) {
      const resumo = await resumoResp.json();
      const presentesPessoas = resumo.pessoas.filter(p => !p.saida).length;
      const presentesVeiculos = resumo.veiculos.filter(v => !v.saida).length;

      if (presentesPessoas === 1 && presentesVeiculos === 0) {
        const confirmar = await (window.showConfirm ? window.showConfirm('Esta é a última pessoa presente. Deseja encerrar a visita após registrar a saída?', 'Último presente') : Promise.resolve(window.confirm('Esta é a última pessoa presente. Deseja encerrar a visita após registrar a saída?')));
        if (!confirmar) return;

        const confirmarEncerrar = await (window.visitaActions && typeof window.visitaActions.confirmarEncerrarVisita === 'function'
          ? window.visitaActions.confirmarEncerrarVisita()
          : (window.showConfirm ? window.showConfirm('Tem certeza que deseja encerrar esta visita? Todas as pessoas e veículos serão marcados como fora.', 'Encerrar visita') : Promise.resolve(window.confirm('Tem certeza que deseja encerrar esta visita? Todas as pessoas e veículos serão marcados como fora.'))));
        if (!confirmarEncerrar) return;
      }
    }
  } catch (e) { console.error('Erro ao verificar resumo antes de sairPessoa:', e); }

  await fetch(`/api/visitas/pessoas/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': resolveCSRFToken() },
    body: JSON.stringify({ data_saida: new Date().toISOString() })
  });

  await recarregarListaEReabrir();
}
async function sairVeiculo(id) {
  if (window.visitaActions) {
    const r = await window.visitaActions.confirmAndRegistrarSaidaVeiculo(visitaAtualId, id);
    if (r.cancelled) return;
    if (r.error) { alert(r.error); return; }
    if (r.encerrada) { await recarregarListaEReabrir(); return; }
    await recarregarListaEReabrir();
    return;
  }

  try {
    const resumoResp = await fetch(`/api/visitas/grupos/${visitaAtualId}/resumo/`);
    if (resumoResp.ok) {
      const resumo = await resumoResp.json();
      const presentesPessoas = resumo.pessoas.filter(p => !p.saida).length;
      const presentesVeiculos = resumo.veiculos.filter(v => !v.saida).length;

      if (presentesVeiculos === 1 && presentesPessoas === 0) {
        const confirmar = await (window.showConfirm ? window.showConfirm('Este é o último veículo presente. Deseja encerrar a visita após registrar a saída?', 'Último presente') : Promise.resolve(window.confirm('Este é o último veículo presente. Deseja encerrar a visita após registrar a saída?')));
        if (!confirmar) return;

        const confirmarEncerrar = await (window.visitaActions && typeof window.visitaActions.confirmarEncerrarVisita === 'function'
          ? window.visitaActions.confirmarEncerrarVisita()
          : (window.showConfirm ? window.showConfirm('Tem certeza que deseja encerrar esta visita? Todas as pessoas e veículos serão marcados como fora.', 'Encerrar visita') : Promise.resolve(window.confirm('Tem certeza que deseja encerrar esta visita? Todas as pessoas e veículos serão marcados como fora.'))));
        if (!confirmarEncerrar) return;
      }
    }
  } catch (e) { console.error('Erro ao verificar resumo antes de sairVeiculo:', e); }

  await fetch(`/api/visitas/veiculos/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': resolveCSRFToken() },
    body: JSON.stringify({ data_saida: new Date().toISOString() })
  });

  await recarregarListaEReabrir();
}

async function encerrarVisita(id) {
  if (window.visitaActions) {
    const r = await window.visitaActions.encerrarVisita(id);
    try { if (typeof window.bloquearInterfaceVisita === 'function') window.bloquearInterfaceVisita(); } catch(e){}
    modalVisitaInstance.hide();
    if (typeof carregarVisitas === 'function') carregarVisitas(); else window.location.reload();
    return r;
  }

  await fetch(`/api/visitas/grupos/${id}/encerrar/`, { method: 'POST', headers: { 'X-CSRFToken': resolveCSRFToken() } });
  try { if (typeof window.bloquearInterfaceVisita === 'function') window.bloquearInterfaceVisita(); } catch(e){}
  modalVisitaInstance.hide();
  if (typeof carregarVisitas === 'function') carregarVisitas(); else window.location.reload();
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
    await abrirModal(visitaAtualId);

    // Se após recarregar não houver ninguém dentro, encerrar automaticamente
    try {
      const v = todasVisitas.find(x => x.id === visitaAtualId);
      if (v && v.status === 'aberta') {
        const pessoasDentro = v.pessoas.filter(p => !p.data_saida).length;
        const veiculosDentro = v.veiculos.filter(vv => !vv.data_saida).length;
        if (pessoasDentro === 0 && veiculosDentro === 0) {
          // encerrarVisita faz reload ou atualiza a lista
          await encerrarVisita(visitaAtualId);
        }
      }
    } catch (e) { console.error(e); }
  } else {
    window.location.reload();
  }
}

// Expor encerrarVisita globalmente para templates e outras páginas
try { window.encerrarVisita = encerrarVisita; } catch (e) {}
try { window.abrirModal = abrirModal; } catch (e) {}
