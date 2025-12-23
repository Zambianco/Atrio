// Inicializa o modal de seleção de veículo e expõe a instância globalmente
if (typeof modalBuscaVeiculo === 'undefined') window.modalBuscaVeiculo = window.modalBuscaVeiculo || null;

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('modalBuscaVeiculo');
  if (el) modalBuscaVeiculo = new bootstrap.Modal(el);

  const input = document.getElementById('buscaVeiculoInput');
  if (input && !input.dataset._bound) {
    input.dataset._bound = '1';
    input.addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      const lista = document.getElementById('listaSugestoesVeiculo');
      if (q.length < 2) {
        if (lista) lista.innerHTML = '';
        return;
      }
      if (typeof buscarVeiculos === 'function') {
        const veiculos = await buscarVeiculos(q);
        if (!lista) return;
        if (!veiculos.length) {
          lista.innerHTML = `<li class="list-group-item text-center text-muted">Nenhum veículo encontrado</li>`;
          return;
        }

        const veiculosEmVisita = await obterVeiculosEmVisita();

        lista.innerHTML = veiculos.map(v => {
          const visitaAtual = veiculosEmVisita[v.id];
          const disabled = visitaAtual ? 'disabled' : '';
          const btnClass = visitaAtual ? 'btn-outline-secondary' : 'btn-primary';
          const label = visitaAtual ? `Em visita #${visitaAtual}` : 'Adicionar';
          return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>${v.placa}</strong><br>
                <small class="text-muted">${v.modelo || 'Modelo não informado'}</small>
              </div>
              <div class="d-flex align-items-center">
                <button class="btn btn-sm ${btnClass} btnAdicionarVeiculo" data-id="${v.id}" ${disabled}>${label}</button>
                ${visitaAtual ? `<a href="/visitas/${visitaAtual}/" target="_blank" class="ms-2 text-decoration-none link-visita-veiculo" data-visita="${visitaAtual}">Abrir</a>` : ''}
              </div>
            </li>
          `;
        }).join('');

        document.querySelectorAll('.btnAdicionarVeiculo').forEach(btn => {
          if (btn.disabled) return;
          btn.addEventListener('click', (ev) => {
            const id = ev.currentTarget.dataset.id;
            // Se estamos em modo gerenciamento, usar a função de gerenciar
            if (window.modoGerenciamento === true) {
              if (typeof adicionarVeiculoNaVisitaExistente === 'function') {
                adicionarVeiculoNaVisitaExistente(id);
              }
            } else {
              // Caso contrário, adicionar à tabela de nova visita
              if (typeof adicionarVeiculoATabela === 'function') {
                const veiculo = veiculos.find(v => v.id == id);
                if (veiculo) adicionarVeiculoATabela(veiculo);
              }
            }
          });
        });
      }
    });
  }
});

let cacheVeiculosEmVisita = null;
async function obterVeiculosEmVisita() {
  if (typeof listarVeiculosEmVisita === 'function') {
    return listarVeiculosEmVisita();
  }
  if (cacheVeiculosEmVisita) return cacheVeiculosEmVisita;

  try {
    const resp = await fetch('/api/visitas/veiculos/');
    const data = await resp.json();
    cacheVeiculosEmVisita = data
      .filter(item => !item.data_saida)
      .reduce((acc, item) => {
        acc[item.veiculo] = item.grupo;
        return acc;
      }, {});
  } catch (e) {
    console.error('Falha ao buscar veiculos em visita', e);
    cacheVeiculosEmVisita = {};
  }
  return cacheVeiculosEmVisita;
}
