// === CSRF helper (obrigatório no Django) ===
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(
          cookie.substring(name.length + 1)
        );
        break;
      }
    }
  }
  return cookieValue;
}

const csrftoken = getCookie("csrftoken");

// === Script principal ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnSalvarPessoa");
  const nome = document.getElementById("nomePessoa");
  const empresa = document.getElementById("empresaPessoa");

  if (!btn || !nome || !empresa) {
    console.error("Elementos do formulário não encontrados no template.");
    return;
  }

  btn.addEventListener("click", async () => {
    console.log("Clique capturado");

    const payload = {
      nome: nome.value.trim(),
      empresa: empresa.value.trim(),
    };

    if (!payload.nome) {
      alert("Informe o nome.");
      return;
    }

    try {
      const resp = await fetch("/api/pessoas/pessoas/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error(data);
        alert(data.erro || data.detail || "Erro ao salvar");
        return;
      }

      alert("Pessoa salva com sucesso!");
      nome.value = "";
      empresa.value = "";

    } catch (err) {
      console.error(err);
      alert("Erro de comunicação com o servidor.");
    }
  });
});
