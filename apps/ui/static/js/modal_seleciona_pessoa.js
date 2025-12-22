// Inicializa o modal de seleção de pessoa e expõe a instância globalmente
let modalBuscaPessoa = null;

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('modalBuscaPessoa');
  if (el) modalBuscaPessoa = new bootstrap.Modal(el);

  // Se a página não fornecer listeners para o input, passa a delegar aqui
  const input = document.getElementById('buscaPessoaInput');
  if (input && !input.dataset._bound) {
    input.dataset._bound = '1';
    input.addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      const lista = document.getElementById('listaSugestoesPessoa');
      if (q.length < 2) {
        if (lista) lista.innerHTML = '';
        return;
      }
      if (typeof buscarPessoas === 'function') {
        const pessoas = await buscarPessoas(q);
        if (!lista) return;
        if (!pessoas.length) {
          lista.innerHTML = `<li class="list-group-item text-center text-muted">Nenhuma pessoa encontrada</li>`;
          return;
        }
        lista.innerHTML = pessoas.map(p => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${p.nome || p.nome_completo}</strong><br>
              <small class="text-muted">${p.empresa || '—'}</small>
            </div>
            <button class="btn btn-sm btn-primary btnAdicionarPessoa" data-id="${p.id}">Adicionar</button>
          </li>
        `).join('');

        document.querySelectorAll('.btnAdicionarPessoa').forEach(btn => {
          btn.addEventListener('click', (ev) => {
            const id = ev.currentTarget.dataset.id;
            if (typeof adicionarPessoaNaVisitaExistente === 'function') {
              adicionarPessoaNaVisitaExistente(id);
            } else if (typeof adicionarPessoaATabela === 'function') {
              const pessoa = pessoas.find(p => p.id == id);
              if (pessoa) adicionarPessoaATabela(pessoa);
            }
          });
        });
      }
    });
  }
});
