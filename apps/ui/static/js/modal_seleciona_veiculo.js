// Inicializa o modal de seleção de veículo e expõe a instância globalmente
let modalBuscaVeiculo = null;

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
        lista.innerHTML = veiculos.map(v => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${v.placa}</strong><br>
              <small class="text-muted">${v.modelo || '—'}</small>
            </div>
            <button class="btn btn-sm btn-primary btnAdicionarVeiculo" data-id="${v.id}">Adicionar</button>
          </li>
        `).join('');

        document.querySelectorAll('.btnAdicionarVeiculo').forEach(btn => {
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
