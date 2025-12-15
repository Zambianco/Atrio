let dadosCache = null;

function formatarData(data) {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR') + ' ' +
    d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
}

async function carregarPainel() {
  const resp = await fetch('/api/visitas/presentes/');
  const data = await resp.json();

  dadosCache = data;

  document.getElementById('totalPessoas').textContent = data.pessoas.length;
  document.getElementById('totalVeiculos').textContent = data.veiculos.length;
  document.getElementById('badgePessoas').textContent = data.pessoas.length;
  document.getElementById('badgeVeiculos').textContent = data.veiculos.length;

  const tbPessoas = document.querySelector('#tblPessoas tbody');
  const tbVeiculos = document.querySelector('#tblVeiculos tbody');

  tbPessoas.innerHTML = '';
  tbVeiculos.innerHTML = '';

  data.pessoas.forEach(p => {
    tbPessoas.innerHTML += `
      <tr onclick="abrirGrupo(${p.grupo_id})" style="cursor:pointer">
        <td class="fw-semibold">${p.nome}</td>
        <td>${p.empresa || '-'}</td>
        <td>${formatarData(p.entrada)}</td>
        <td class="fw-bold text-primary">${p.tempo}</td>
      </tr>`;
  });

  data.veiculos.forEach(v => {
    tbVeiculos.innerHTML += `
      <tr onclick="abrirGrupo(${v.grupo_id})" style="cursor:pointer">
        <td class="fw-bold">${v.placa}</td>
        <td>${v.empresa || '-'}</td>
        <td>${formatarData(v.entrada)}</td>
        <td class="fw-bold text-primary">${v.tempo}</td>
      </tr>`;
  });
}

function abrirGrupo(grupoId) {
  if (!dadosCache) return;

  const pessoas = dadosCache.pessoas.filter(p => p.grupo_id === grupoId);
  const veiculos = dadosCache.veiculos.filter(v => v.grupo_id === grupoId);

  const entrada = pessoas[0]?.entrada || veiculos[0]?.entrada;

  document.getElementById('mdDestino').textContent = '-';
  document.getElementById('mdResponsavel').textContent = '-';
  document.getElementById('mdEntrada').textContent = entrada ? formatarData(entrada) : '-';

  const ulP = document.getElementById('mdPessoas');
  const ulV = document.getElementById('mdVeiculos');

  ulP.innerHTML = '';
  ulV.innerHTML = '';

  pessoas.forEach(p => {
    ulP.innerHTML += `<li>${p.nome} (${p.empresa || '-'})</li>`;
  });

  veiculos.forEach(v => {
    ulV.innerHTML += `<li>${v.placa} (${v.empresa || '-'})</li>`;
  });

  new bootstrap.Modal(document.getElementById('modalGrupo')).show();
}

document.addEventListener('DOMContentLoaded', () => {
  carregarPainel();
  setInterval(carregarPainel, 30000);
});
