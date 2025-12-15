document.addEventListener("DOMContentLoaded", () => {
  let grupoId = null;

  const btnCriar = document.getElementById("btnCriarCancelar");
  const btnRegistrar = document.getElementById("btnRegistrar");
  const motivoInput = document.getElementById("motivo");
  const responsavelInput = document.getElementById("responsavel");

  if (!btnCriar || !btnRegistrar) {
    console.error("Botões não encontrados no template");
    return;
  }

  // CSRF
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  const csrftoken = getCookie("csrftoken");

  btnCriar.addEventListener("click", async () => {
    const motivo = motivoInput.value.trim();
    const autorizado = responsavelInput.value.trim();

    if (!motivo || !autorizado) {
      alert("Informe o motivo e o responsável");
      return;
    }

    const resp = await fetch("/api/visitas/registrar/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
      body: JSON.stringify({
        motivo: motivo,
        autorizado_por: autorizado,
        observacao: "",
        pessoas: [],
        veiculos: [],
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      alert(data.erro || "Erro ao criar visita");
      return;
    }

    grupoId = data.grupo_id;

    document.getElementById("badgeGrupo").textContent = `Grupo #${grupoId}`;
    document.getElementById("badgeGrupo").classList.remove("d-none");
    document.getElementById("acoes").classList.remove("d-none");

    btnRegistrar.disabled = false;

    alert("Visita criada com sucesso");
  });

  btnRegistrar.addEventListener("click", () => {
    if (!grupoId) {
      alert("Crie a visita primeiro");
      return;
    }

    alert(`Visita ${grupoId} registrada`);
    // aqui depois você chama:
    // POST /api/visitas/grupos/{grupoId}/encerrar/  (se quiser)
  });
});
