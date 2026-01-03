// Inicializa o modal de seleção de pessoa e expõe a instância globalmente
if (typeof modalBuscaPessoa === 'undefined') window.modalBuscaPessoa = window.modalBuscaPessoa || null;

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
          if (q.startsWith('#')) {
            const idText = q.slice(1).trim();
            lista.innerHTML = `<li class="list-group-item text-center text-muted">Nenhuma pessoa com ID ${idText || 'informado'}</li>`;
          } else {
            lista.innerHTML = `<li class="list-group-item text-center text-muted">Nenhuma pessoa encontrada</li>`;
          }
          return;
        }

        const pessoasEmVisita = await obterPessoasEmVisita();

        lista.innerHTML = pessoas.map(p => {
          const visitaAtual = pessoasEmVisita[p.id];
          const disabled = visitaAtual ? 'disabled' : '';
          const btnClass = visitaAtual ? 'btn-outline-secondary' : 'btn-primary';
          const label = visitaAtual ? `Em visita #${visitaAtual}` : 'Adicionar';
          const linkVisita = visitaAtual
            ? `<a href="/visitas/${visitaAtual}/" target="_blank"
                 class="ms-2 text-decoration-none link-visita-pessoa"
                 data-visita="${visitaAtual}">Abrir</a>`
            : '';
          return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>${p.nome || p.nome_completo}</strong><br>
                <small class="text-muted">${p.empresa || 'Sem empresa'}</small>
              </div>
              <div class="d-flex align-items-center">
                <button class="btn btn-sm ${btnClass} btnAdicionarPessoa" data-id="${p.id}" ${disabled}>${label}</button>
                ${linkVisita}
              </div>
            </li>
          `;
        }).join('');

        document.querySelectorAll('.btnAdicionarPessoa').forEach(btn => {
          if (btn.disabled) return;
          btn.addEventListener('click', (ev) => {
            const id = ev.currentTarget.dataset.id;
            // Se estamos em modo gerenciamento, usar a função de gerenciar
            if (window.modoGerenciamento === true) {
              if (typeof adicionarPessoaNaVisitaExistente === 'function') {
                adicionarPessoaNaVisitaExistente(id);
              }
            } else {
              // Caso contrário, adicionar à tabela de nova visita
              if (typeof adicionarPessoaATabela === 'function') {
                const pessoa = pessoas.find(p => p.id == id);
                if (pessoa) adicionarPessoaATabela(pessoa);
              }
            }
          });
        });

        document.querySelectorAll('.link-visita-pessoa').forEach(link => {
          link.addEventListener('click', () => {
            if (modalBuscaPessoa) modalBuscaPessoa.hide();
          });
        });
      }
    });
  }
});

let cachePessoasEmVisita = null;
async function obterPessoasEmVisita() {
  if (typeof listarPessoasEmVisita === 'function') {
    return listarPessoasEmVisita();
  }
  if (cachePessoasEmVisita) return cachePessoasEmVisita;

  try {
    const resp = await fetch('/api/visitas/pessoas/');
    const data = await resp.json();
    cachePessoasEmVisita = data
      .filter(item => !item.data_saida)
      .reduce((acc, item) => {
        acc[item.pessoa] = item.grupo;
        return acc;
      }, {});
  } catch (e) {
    console.error('Falha ao buscar pessoas em visita', e);
    cachePessoasEmVisita = {};
  }
  return cachePessoasEmVisita;
}
