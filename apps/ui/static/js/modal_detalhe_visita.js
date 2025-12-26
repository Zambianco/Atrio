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

const ENCERRAR_MSG = 'Tem certeza que deseja encerrar esta visita? Todas as pessoas e ve\u00edculos ser\u00e3o marcados como fora.';
const ENCERRAR_TITLE = 'Encerrar visita';
function confirmarEncerrarVisita() {
  return window.showConfirm
    ? window.showConfirm(ENCERRAR_MSG, ENCERRAR_TITLE)
    : Promise.resolve(window.confirm(ENCERRAR_MSG));
}
window.confirmarEncerrarVisita = confirmarEncerrarVisita;

async function abrirModal(id) {
  visitaAtualId = id;
  let v = null;
  try {
    if (typeof todasVisitas !== 'undefined' && Array.isArray(todasVisitas)) {
      v = todasVisitas.find(x => x.id === id) || null;
    }
  } catch (e) { v = null; }

  // Se n\u00e3o encontramos o grupo em `todasVisitas`, buscar resumo via API para montar um objeto m\u00ednimo
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
        console.error('N\u00e3o foi poss\u00edvel carregar resumo do grupo', id);
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
      <div class="visita-item">
        <div class="visita-item-main">
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
            ${p.data_saida ? 'Registrar Entrada' : 'Registrar Sa\u00edda'}
          </button>` : ''}
      </div>
    `).join('')
    : '<div class="text-muted">Nenhuma pessoa registrada</div>';


  const listaVeiculos = v.veiculos.length
    ? v.veiculos.map(vv => `
      <div class="visita-item">
        <div class="visita-item-main">
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
            ${vv.data_saida ? 'Registrar Entrada' : 'Registrar Sa\u00edda'}
          </button>` : ''}
      </div>
    `).join('')
    : '<div class="text-muted">Nenhum ve\u00edculo registrado</div>';


  document.getElementById('modalVisitaBody').innerHTML = `
    <div class="visita-resumo mb-3">
      <div class="resumo-card">
        <div class="resumo-item"><span class="resumo-label">ID:</span><span>#${v.id}</span></div>
        <div class="resumo-item"><span class="resumo-label">Motivo:</span><span>${v.motivo}</span></div>
        <div class="resumo-item"><span class="resumo-label">Respons\u00e1vel:</span><span>${v.autorizado_por}</span></div>
        <div class="resumo-item"><span class="resumo-label">Status:</span>
          <span class="badge ${v.status === 'aberta' ? 'bg-success' : 'bg-danger'}">${v.status.toUpperCase()}</span>
        </div>
        <div class="resumo-item"><span class="resumo-label">In\u00edcio:</span><span>${formatarDataHora(v.data_entrada)}</span></div>
      </div>
      <div class="resumo-card">
        <div class="resumo-item"><span class="resumo-label">Total Pessoas:</span><span>${v.pessoas.length}</span></div>
        <div class="resumo-item"><span class="resumo-label">Pessoas Presentes:</span><span>${pessoasDentro}</span></div>
        <div class="resumo-item"><span class="resumo-label">Total Ve\u00edculos:</span><span>${v.veiculos.length}</span></div>
        <div class="resumo-item"><span class="resumo-label">Ve\u00edculos Presentes:</span><span>${veiculosDentro}</span></div>
      </div>
    </div>

    <div class="visita-lists">
      <div class="visita-list">
        <div class="fw-semibold mb-2">Pessoas</div>
        ${listaPessoas}
      </div>
      <div class="visita-list">
        <div class="fw-semibold mb-2">Ve\u00edculos</div>
        ${listaVeiculos}
      </div>
    </div>
  `;

  modalVisitaInstance.show();
  // Nota: bot\u00e3o de Encerrar ? exibido apenas na p\u00e1gina de gerenciamento (/visitas/{id}/)
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
      // encerrarVisita do m\u00f3dulo j\u00e1 disparou evento; modal fecha quando recarregar a lista
      await recarregarListaEReabrir();
      return;
    }
    await recarregarListaEReabrir();
    return;
  }

  // fallback: comportamento antigo
  let forceEncerrar = false;
  try {
    const resumoResp = await fetch(`/api/visitas/grupos/${visitaAtualId}/resumo/`);
    if (resumoResp.ok) {
      const resumo = await resumoResp.json();
      const presentesPessoas = resumo.pessoas.filter(p => !p.saida).length;

      if (presentesPessoas === 1) {
        const confirmar = await (window.showConfirm
          ? window.showConfirm('Esta \u00e9 a \u00faltima pessoa presente. Deseja encerrar a visita ap\u00f3s registrar a sa\u00edda?\nSe houver ve\u00edculo todos ter\u00e3o sua sa\u00edda registrada.', '\u00daltimo presente')
          : Promise.resolve(window.confirm('Esta \u00e9 a \u00faltima pessoa presente. Deseja encerrar a visita ap\u00f3s registrar a sa\u00edda?\nSe houver ve\u00edculo todos ter\u00e3o sua sa\u00edda registrada.')));
        if (!confirmar) return;
        forceEncerrar = true;
      }
    }
  } catch (e) { console.error('Erro ao verificar resumo antes de sairPessoa:', e); }

  await fetch(`/api/visitas/pessoas/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': resolveCSRFToken() },
    body: JSON.stringify({ data_saida: new Date().toISOString() })
  });

  if (forceEncerrar) {
    await encerrarVisita(visitaAtualId);
    return;
  }

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

  let forceEncerrar = false;
  try {
    const resumoResp = await fetch(`/api/visitas/grupos/${visitaAtualId}/resumo/`);
    if (resumoResp.ok) {
      const resumo = await resumoResp.json();
      const presentesVeiculos = resumo.veiculos.filter(v => !v.saida).length;

      if (presentesVeiculos === 1) {
        const confirmar = await (window.showConfirm
          ? window.showConfirm('Este \u00e9 o \u00faltimo ve\u00edculo presente. Deseja encerrar a visita ap\u00f3s registrar a sa\u00edda?\nSe houver pessoas todas ter\u00e3o sua sa\u00edda registrada.', '\u00daltimo presente')
          : Promise.resolve(window.confirm('Este \u00e9 o \u00faltimo ve\u00edculo presente. Deseja encerrar a visita ap\u00f3s registrar a sa\u00edda?\nSe houver pessoas todas ter\u00e3o sua sa\u00edda registrada.')));
        if (!confirmar) return;
        forceEncerrar = true;
      }
    }
  } catch (e) { console.error('Erro ao verificar resumo antes de sairVeiculo:', e); }

  await fetch(`/api/visitas/veiculos/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': resolveCSRFToken() },
    body: JSON.stringify({ data_saida: new Date().toISOString() })
  });

  if (forceEncerrar) {
    await encerrarVisita(visitaAtualId);
    return;
  }

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

    // Se ap\u00f3s recarregar n\u00e3o houver ningu\u00e9m dentro, encerrar automaticamente
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

// Expor encerrarVisita globalmente para templates e outras p\u00e1ginas
try { window.encerrarVisita = encerrarVisita; } catch (e) {}
try { window.abrirModal = abrirModal; } catch (e) {}
