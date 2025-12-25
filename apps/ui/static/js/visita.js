// Unified visita module — combina visita_actions + gerenciar_visita
// (visitaActions API first, then page-specific UI handlers)

// -------------------------------
// visita_actions (shared API)
// -------------------------------
(function(){
  function resolveCSRFToken() {
    if (typeof getCSRFToken === 'function') return getCSRFToken();
    if (typeof csrftoken !== 'undefined') return csrftoken;
    const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    return cookie ? cookie.split('=')[1] : '';
  }

  const ENCERRAR_MSG = 'Tem certeza que deseja encerrar esta visita? Todas as pessoas e veículos serão marcados como fora.';
  const ENCERRAR_TITLE = 'Encerrar visita';
  function confirmarEncerrarVisita() {
    return window.showConfirm
      ? window.showConfirm(ENCERRAR_MSG, ENCERRAR_TITLE)
      : Promise.resolve(window.confirm(ENCERRAR_MSG));
  }

  async function fetchResumo(grupoId) {
    const resp = await fetch(`/api/visitas/grupos/${grupoId}/resumo/`);
    if (!resp.ok) return null;
    return await resp.json();
  }

  async function encerrarVisita(grupoId) {
    const resp = await fetch(`/api/visitas/grupos/${grupoId}/encerrar/`, {
      method: 'POST', headers: { 'X-CSRFToken': resolveCSRFToken() }
    });
    if (resp.ok) {
      window.dispatchEvent(new CustomEvent('visita:encerrada', { detail: { grupoId } }));
      return { ok: true };
    }
    return { ok: false, error: 'Erro ao encerrar visita' };
  }

  async function registrarSaidaPessoa(grupoId, pessoaId, opts={confirmIfLast:true}) {
    try {
      if (opts.confirmIfLast) {
        const resumo = await fetchResumo(grupoId);
        if (resumo) {
          const presentesPessoas = resumo.pessoas.filter(p => !p.saida).length;
          const presentesVeiculos = resumo.veiculos.filter(v => !v.saida).length;
          if (presentesPessoas === 1 && presentesVeiculos === 0) {
            const confirmar = await (window.showConfirm ? window.showConfirm('Esta é a última pessoa presente. Deseja encerrar a visita após registrar a saída?', 'Último presente') : Promise.resolve(window.confirm('Esta é a última pessoa presente. Deseja encerrar a visita após registrar a saída?')));
            if (!confirmar) return { cancelled: true };

            const confirmarEncerrar = await confirmarEncerrarVisita();
            if (!confirmarEncerrar) return { cancelled: true };
          }
        }
      }

      let resp = await fetch(`/api/visitas/pessoas/${pessoaId}/saida/`, { method: 'PATCH', headers: { 'X-CSRFToken': resolveCSRFToken() } });
      if (!resp.ok) {
        resp = await fetch(`/api/visitas/pessoas/${pessoaId}/`, { method: 'PATCH', headers: { 'Content-Type':'application/json','X-CSRFToken': resolveCSRFToken() }, body: JSON.stringify({ data_saida: new Date().toISOString() }) });
      }
      if (!resp.ok) return { error: 'Erro ao registrar saída' };

      const resumo = await fetchResumo(grupoId);
      window.dispatchEvent(new CustomEvent('visita:atualizada', { detail: { grupoId, resumo } }));

      const pessoasDentro = resumo ? resumo.pessoas.filter(p => !p.saida).length : 0;
      const veiculosDentro = resumo ? resumo.veiculos.filter(v => !v.saida).length : 0;
      if (pessoasDentro === 0 && veiculosDentro === 0) {
        const enc = await encerrarVisita(grupoId);
        return { encerrada: !!enc.ok };
      }

      return { ok: true };
    } catch (e) {
      console.error('visitaActions.registrarSaidaPessoa', e);
      return { error: String(e) };
    }
  }

  async function confirmAndRegistrarSaidaPessoa(grupoId, pessoaId) {
    if (!(await (window.showConfirm ? window.showConfirm('Registrar saída da pessoa?', 'Confirmar saída') : Promise.resolve(window.confirm('Registrar saída da pessoa?'))))) {
      return { cancelled: true };
    }
    return await registrarSaidaPessoa(grupoId, pessoaId, { confirmIfLast: true });
  }

  async function registrarSaidaVeiculo(grupoId, veiculoId, opts={confirmIfLast:true}) {
    try {
      if (opts.confirmIfLast) {
        const resumo = await fetchResumo(grupoId);
        if (resumo) {
          const presentesPessoas = resumo.pessoas.filter(p => !p.saida).length;
          const presentesVeiculos = resumo.veiculos.filter(v => !v.saida).length;
          if (presentesVeiculos === 1 && presentesPessoas === 0) {
            const confirmar = await (window.showConfirm ? window.showConfirm('Este é o último veículo presente. Deseja encerrar a visita após registrar a saída?', 'Último presente') : Promise.resolve(window.confirm('Este é o último veículo presente. Deseja encerrar a visita após registrar a saída?')));
            if (!confirmar) return { cancelled: true };

            const confirmarEncerrar = await confirmarEncerrarVisita();
            if (!confirmarEncerrar) return { cancelled: true };
          }
        }
      }

      let resp = await fetch(`/api/visitas/veiculos/${veiculoId}/saida/`, { method: 'POST', headers: { 'X-CSRFToken': resolveCSRFToken() } });
      if (!resp.ok) {
        resp = await fetch(`/api/visitas/veiculos/${veiculoId}/`, { method: 'PATCH', headers: { 'Content-Type':'application/json','X-CSRFToken': resolveCSRFToken() }, body: JSON.stringify({ data_saida: new Date().toISOString() }) });
      }
      if (!resp.ok) return { error: 'Erro ao registrar saída' };

      const resumo = await fetchResumo(grupoId);
      window.dispatchEvent(new CustomEvent('visita:atualizada', { detail: { grupoId, resumo } }));

      const pessoasDentro = resumo ? resumo.pessoas.filter(p => !p.saida).length : 0;
      const veiculosDentro = resumo ? resumo.veiculos.filter(v => !v.saida).length : 0;
      if (pessoasDentro === 0 && veiculosDentro === 0) {
        const enc = await encerrarVisita(grupoId);
        return { encerrada: !!enc.ok };
      }

      return { ok: true };
    } catch (e) {
      console.error('visitaActions.registrarSaidaVeiculo', e);
      return { error: String(e) };
    }
  }

  async function confirmAndRegistrarSaidaVeiculo(grupoId, veiculoId) {
    if (!(await (window.showConfirm ? window.showConfirm('Registrar saída do veículo?', 'Confirmar saída') : Promise.resolve(window.confirm('Registrar saída do veículo?'))))) {
      return { cancelled: true };
    }
    return await registrarSaidaVeiculo(grupoId, veiculoId, { confirmIfLast: true });
  }

  async function registrarEntradaPessoa(grupoId, pessoaId) {
    try {
      let resp = await fetch(`/api/visitas/pessoas/${pessoaId}/entrada/`, { method: 'PATCH', headers: { 'X-CSRFToken': resolveCSRFToken() } });
      if (!resp.ok) {
        resp = await fetch(`/api/visitas/pessoas/${pessoaId}/`, { method: 'PATCH', headers: { 'Content-Type':'application/json','X-CSRFToken': resolveCSRFToken() }, body: JSON.stringify({ data_saida: null }) });
      }
      if (!resp.ok) return { error: 'Erro ao registrar entrada' };
      const resumo = await fetchResumo(grupoId);
      window.dispatchEvent(new CustomEvent('visita:atualizada', { detail: { grupoId, resumo } }));
      return { ok: true };
    } catch (e) {
      console.error('visitaActions.registrarEntradaPessoa', e);
      return { error: String(e) };
    }
  }

  async function registrarEntradaVeiculo(grupoId, veiculoId) {
    try {
      let resp = await fetch(`/api/visitas/veiculos/${veiculoId}/entrada/`, { method: 'POST', headers: { 'X-CSRFToken': resolveCSRFToken() } });
      if (!resp.ok) {
        resp = await fetch(`/api/visitas/veiculos/${veiculoId}/`, { method: 'PATCH', headers: { 'Content-Type':'application/json','X-CSRFToken': resolveCSRFToken() }, body: JSON.stringify({ data_saida: null }) });
      }
      if (!resp.ok) return { error: 'Erro ao registrar entrada' };
      const resumo = await fetchResumo(grupoId);
      window.dispatchEvent(new CustomEvent('visita:atualizada', { detail: { grupoId, resumo } }));
      return { ok: true };
    } catch (e) {
      console.error('visitaActions.registrarEntradaVeiculo', e);
      return { error: String(e) };
    }
  }

  window.visitaActions = {
    registrarSaidaPessoa,
    registrarSaidaVeiculo,
    registrarEntradaPessoa,
    registrarEntradaVeiculo,
    encerrarVisita,
    fetchResumo,
    resolveCSRFToken
  };
  window.visitaActions.confirmAndRegistrarSaidaPessoa = confirmAndRegistrarSaidaPessoa;
  window.visitaActions.confirmAndRegistrarSaidaVeiculo = confirmAndRegistrarSaidaVeiculo;
  window.visitaActions.confirmarEncerrarVisita = confirmarEncerrarVisita;

})();

// -------------------------------
// gerenciar_visita (page UI) — reuses visitaActions
// -------------------------------
// FLAGS / CONTEXTO
let modalBuscaPessoa = null;
let modalBuscaVeiculo = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {

  const modalPessoaEl = document.getElementById('modalBuscaPessoa');
  const modalVeiculoEl = document.getElementById('modalBuscaVeiculo');

  if (modalPessoaEl) {
    modalBuscaPessoa = new bootstrap.Modal(modalPessoaEl);
  }

  if (modalVeiculoEl) {
    modalBuscaVeiculo = new bootstrap.Modal(modalVeiculoEl);
  }

  const inputBuscaPessoa = document.getElementById('buscaPessoaInput');
  const inputBuscaVeiculo = document.getElementById('buscaVeiculoInput');

  if (inputBuscaPessoa) {
    inputBuscaPessoa.addEventListener('input', async e => {
      const q = e.target.value.trim();
      if (q.length < 2) {
        const l = document.getElementById('listaSugestoesPessoa'); if (l) l.innerHTML = '';
        return;
      }
      buscarESugerirPessoas(q);
    });
  }

  if (inputBuscaVeiculo) {
    inputBuscaVeiculo.addEventListener('input', async e => {
      const q = e.target.value.trim();
      if (q.length < 2) {
        const l = document.getElementById('listaSugestoesVeiculo'); if (l) l.innerHTML = '';
        return;
      }
      buscarESugerirVeiculos(q);
    });
  }

  (async function checkStatusAndBlock(){
    try {
      const gid = window.visitaExistenteId;
      if (!gid) return;
      const resp = await fetch(`/api/visitas/grupos/${gid}/resumo/`);
      if (!resp.ok) return;
      const data = await resp.json();
      const grupo = data.grupo || {};
      const encerrada = !!grupo.data_saida;
      if (encerrada) {
        bloquearInterfaceVisita();
      }
    } catch (e) { console.error('Erro ao checar status da visita:', e); }
  })();
});

function bloquearInterfaceVisita() {
  try {
    const btnAddP = document.getElementById('btnAddPessoaGerenciar');
    const btnAddV = document.getElementById('btnAddVeiculoGerenciar');
    if (btnAddP) { btnAddP.disabled = true; btnAddP.classList.add('disabled'); }
    if (btnAddV) { btnAddV.disabled = true; btnAddV.classList.add('disabled'); }

    document.querySelectorAll('[onclick]').forEach(el => {
      const attr = el.getAttribute('onclick') || '';
      if (/registrarSaidaPessoa|registrarEntradaPessoa|registrarSaidaVeiculo|registrarEntradaVeiculo|adicionarPessoaNaVisitaExistente|adicionarVeiculoNaVisitaExistente/.test(attr)) {
        try { el.disabled = true; el.classList.add('disabled'); } catch(e){}
      }
    });

    document.querySelectorAll('.col-acao button').forEach(b => {
      try { b.style.display = 'none'; } catch(e){}
    });

    try {
      const header = document.querySelector('.d-flex.justify-content-between.align-items-center');
      if (header) {
        let badge = document.getElementById('visitaEncerradaBadge');
        if (!badge) {
          badge = document.createElement('span');
          badge.id = 'visitaEncerradaBadge';
          badge.className = 'badge bg-secondary ms-3';
          badge.textContent = 'ENCERRADA';
          header.querySelector('div')?.appendChild(badge);
        }
      }
    } catch (e) {}
  } catch (e) {
    console.error('Erro ao bloquear interface:', e);
  }
}

// MODAIS
function mostrarBuscaPessoa() {
  modalBuscaPessoa?.show();
  document.getElementById('listaPessoas').innerHTML = '';
}

function mostrarBuscaVeiculo() {
  modalBuscaVeiculo?.show();
  document.getElementById('listaVeiculos').innerHTML = '';
}

// BUSCAS
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

// ADD NA VISITA
async function adicionarPessoaNaVisitaExistente(pessoaId) {
  const csrf = window.visitaActions && typeof window.visitaActions.resolveCSRFToken === 'function' ? window.visitaActions.resolveCSRFToken() : (typeof csrftoken !== 'undefined' ? csrftoken : (document.cookie.split('; ').find(row => row.startsWith('csrftoken=')) || '').split('=')[1]);
  const resp = await fetch('/api/visitas/pessoas/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf
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
  const csrf = window.visitaActions && typeof window.visitaActions.resolveCSRFToken === 'function' ? window.visitaActions.resolveCSRFToken() : (typeof csrftoken !== 'undefined' ? csrftoken : (document.cookie.split('; ').find(row => row.startsWith('csrftoken=')) || '').split('=')[1]);
  const resp = await fetch('/api/visitas/veiculos/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf
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

// SAÍDA / RETORNO — PESSOAS
async function registrarSaidaPessoa(id) {
  if (window.visitaActions) {
    const r = await window.visitaActions.confirmAndRegistrarSaidaPessoa(window.visitaExistenteId, id);
    if (r.cancelled) return;
    if (r.error) { alert(r.error); return; }
    if (r.encerrada) {
      await (window.showAlert ? window.showAlert('Visita encerrada automaticamente (todos saíram).', 'Visita encerrada') : Promise.resolve(alert('Visita encerrada automaticamente (todos saíram).')));
      bloquearInterfaceVisita();
      location.reload();
      return;
    }
    location.reload();
    return;
  }
  if (!(await (window.showConfirm ? window.showConfirm('Registrar saída da pessoa?', 'Confirmar saída') : Promise.resolve(window.confirm('Registrar saída da pessoa?'))))) return;
  try {
    const resp = await fetch(`/api/visitas/pessoas/${id}/saida/`, { method: 'PATCH', headers: { 'X-CSRFToken': csrftoken } });
    if (!resp.ok) { alert('Erro ao registrar saída'); return; }
    location.reload();
  } catch (e) { console.error(e); alert('Erro ao registrar saída'); }
}

async function registrarEntradaPessoa(id) {
  if (!(await (window.showConfirm ? window.showConfirm('Registrar retorno da pessoa?', 'Confirmar entrada') : Promise.resolve(window.confirm('Registrar retorno da pessoa?'))))) return;

  if (window.visitaActions) {
    const r = await window.visitaActions.registrarEntradaPessoa(window.visitaExistenteId, id);
    if (r.error) { alert(r.error); return; }
    location.reload();
    return;
  }

  const resp = await fetch(`/api/visitas/pessoas/${id}/entrada/`, { method: 'PATCH', headers: { 'X-CSRFToken': csrftoken } });
  if (!resp.ok) { alert('Erro ao registrar retorno'); return; }
  location.reload();
}

// SAÍDA / RETORNO — VEÍCULOS
async function registrarSaidaVeiculo(id) {
  if (window.visitaActions) {
    const r = await window.visitaActions.confirmAndRegistrarSaidaVeiculo(window.visitaExistenteId, id);
    if (r.cancelled) return;
    if (r.error) { alert(r.error); return; }
    if (r.encerrada) {
      await (window.showAlert ? window.showAlert('Visita encerrada automaticamente (todos saíram).', 'Visita encerrada') : Promise.resolve(alert('Visita encerrada automaticamente (todos saíram).')));
      bloquearInterfaceVisita();
      location.reload();
      return;
    }
    location.reload();
    return;
  }
  if (!(await (window.showConfirm ? window.showConfirm('Registrar saída do veículo?', 'Confirmar saída') : Promise.resolve(window.confirm('Registrar saída do veículo?'))))) return;
  try {
    const resp = await fetch(`/api/visitas/veiculos/${id}/saida/`, { method: 'POST', headers: { 'X-CSRFToken': csrftoken } });
    if (!resp.ok) { alert('Erro ao registrar saída'); return; }
    location.reload();
  } catch (e) { console.error(e); alert('Erro ao registrar saída'); }
}

async function checkAndEncerrarSeVazio(grupoId) {
  if (window.visitaActions) {
    const resumo = await window.visitaActions.fetchResumo(grupoId);
    if (!resumo) return location.reload();
    const presentesPessoas = resumo.pessoas.filter(p => !p.saida).length;
    const presentesVeiculos = resumo.veiculos.filter(v => !v.saida).length;
    if (presentesPessoas === 0 && presentesVeiculos === 0) {
      const r = await window.visitaActions.encerrarVisita(grupoId);
      if (r.ok) {
        await (window.showAlert ? window.showAlert('Visita encerrada automaticamente (todos saíram).', 'Visita encerrada') : Promise.resolve(alert('Visita encerrada automaticamente (todos saíram).')));
        bloquearInterfaceVisita();
        location.reload();
        return;
      }
      location.reload();
      return;
    }
    location.reload();
    return;
  }

  try {
    const resp = await fetch(`/api/visitas/grupos/${grupoId}/resumo/`);
    if (!resp.ok) return location.reload();
    const data = await resp.json();
    const presentesPessoas = data.pessoas.filter(p => !p.saida).length;
    const presentesVeiculos = data.veiculos.filter(v => !v.saida).length;
    if (presentesPessoas === 0 && presentesVeiculos === 0) {
      const enc = await fetch(`/api/visitas/grupos/${grupoId}/encerrar/`, { method: 'POST', headers: { 'X-CSRFToken': csrftoken } });
      if (enc.ok) { await (window.showAlert ? window.showAlert('Visita encerrada automaticamente (todos saíram).', 'Visita encerrada') : Promise.resolve(alert('Visita encerrada automaticamente (todos saíram).'))); location.reload(); return; }
      location.reload();
    } else {
      location.reload();
    }
  } catch (e) { console.error(e); location.reload(); }
}

async function registrarEntradaVeiculo(id) {
  if (window.visitaActions && typeof window.visitaActions.registrarEntradaVeiculo === 'function') {
    const r = await window.visitaActions.registrarEntradaVeiculo(window.visitaExistenteId, id);
    if (r.error) { alert(r.error); return; }
    location.reload();
    return;
  }

  if (!(await (window.showConfirm ? window.showConfirm('Registrar retorno do veículo?', 'Confirmar entrada') : Promise.resolve(window.confirm('Registrar retorno do veículo?'))))) return;

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

// EXPORT GLOBAL
window.mostrarBuscaPessoa = mostrarBuscaPessoa;
window.mostrarBuscaVeiculo = mostrarBuscaVeiculo;
window.adicionarPessoaNaVisitaExistente = adicionarPessoaNaVisitaExistente;
window.adicionarVeiculoNaVisitaExistente = adicionarVeiculoNaVisitaExistente;
window.registrarSaidaPessoa = registrarSaidaPessoa;
window.registrarEntradaPessoa = registrarEntradaPessoa;
window.registrarSaidaVeiculo = registrarSaidaVeiculo;
window.registrarEntradaVeiculo = registrarEntradaVeiculo;

window.handleEncerrarClick = async function() {
  const gid = window.visitaExistenteId;
  if (!gid) return;
  const confirmar = await (window.visitaActions && typeof window.visitaActions.confirmarEncerrarVisita === 'function'
    ? window.visitaActions.confirmarEncerrarVisita()
    : (window.showConfirm ? window.showConfirm('Tem certeza que deseja encerrar esta visita? Todas as pessoas e veículos serão marcados como fora.', 'Encerrar visita') : Promise.resolve(window.confirm('Tem certeza que deseja encerrar esta visita? Todas as pessoas e veículos serão marcados como fora.')))));
  if (!confirmar) return;
  try {
    if (window.visitaActions && typeof window.visitaActions.encerrarVisita === 'function') {
      const r = await window.visitaActions.encerrarVisita(gid);
      if (r.ok) {
        await (window.showAlert ? window.showAlert('Visita encerrada com sucesso.', 'Visita encerrada') : Promise.resolve(alert('Visita encerrada com sucesso.')));
        bloquearInterfaceVisita();
        location.reload();
        return;
      }
      alert('Erro ao encerrar visita');
    } else {
      const csrf = typeof csrftoken !== 'undefined' ? csrftoken : (document.cookie.split('; ').find(row => row.startsWith('csrftoken=')) || '').split('=')[1];
      const resp = await fetch(`/api/visitas/grupos/${gid}/encerrar/`, { method: 'POST', headers: { 'X-CSRFToken': csrf } });
      if (resp.ok) {
        await (window.showAlert ? window.showAlert('Visita encerrada com sucesso.', 'Visita encerrada') : Promise.resolve(alert('Visita encerrada com sucesso.')));
        bloquearInterfaceVisita();
        location.reload();
      } else {
        alert('Erro ao encerrar visita');
      }
    }
  } catch (e) { console.error(e); alert('Erro ao encerrar visita'); }
};
