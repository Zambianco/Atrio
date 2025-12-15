async function carregarPainel() {
  const resp = await fetch('/api/visitas/presentes/');
  const data = await resp.json();

  document.getElementById('totalPessoas').textContent = data.pessoas.length;
  document.getElementById('totalVeiculos').textContent = data.veiculos.length;

  const tbPessoas = document.querySelector('#tblPessoas tbody');
  const tbVeiculos = document.querySelector('#tblVeiculos tbody');

  tbPessoas.innerHTML = '';
  tbVeiculos.innerHTML = '';

  data.pessoas.forEach(p => {
    tbPessoas.innerHTML += `
      <tr>
        <td>${p.nome}</td>
        <td>${p.empresa || '-'}</td>
        <td>${new Date(p.entrada).toLocaleString()}</td>
        <td>${p.tempo}</td>
      </tr>`;
  });

  data.veiculos.forEach(v => {
    tbVeiculos.innerHTML += `
      <tr>
        <td>${v.placa}</td>
        <td>${v.empresa || '-'}</td>
        <td>${new Date(v.entrada).toLocaleString()}</td>
        <td>${v.tempo}</td>
      </tr>`;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  carregarPainel();
  setInterval(carregarPainel, 30000);
});
