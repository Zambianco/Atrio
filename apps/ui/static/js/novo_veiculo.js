document.getElementById('btnSalvarVeiculo').onclick = async () => {
  const placa = document.getElementById('placaVeiculo').value;
  const empresa = document.getElementById('empresaVeiculo').value;

  const resp = await fetch('/api/veiculos/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ placa, empresa })
  });

  if (resp.ok) {
    alert('Veículo cadastrado');
  } else {
    alert('Erro ao cadastrar veículo');
  }
};
