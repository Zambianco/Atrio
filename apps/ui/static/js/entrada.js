document.getElementById('btnRegistrarEntrada').onclick = async () => {
  const pessoa = document.getElementById('pessoa').value;
  const veiculo = document.getElementById('veiculo').value;
  const grupo = document.getElementById('grupo').value;

  const resp = await fetch(`/api/visitas/grupos/${grupo}/adicionar/`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      pessoa: pessoa || null,
      veiculo: veiculo || null
    })
  });

  if (resp.ok) {
    alert('Entrada registrada');
  } else {
    alert('Erro');
  }
};
