// === CSRF helper (obrigatorio no Django) ===
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const csrftoken = getCookie("csrftoken");

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnSalvarVeiculo");
  const btnLimpar = document.getElementById("btnLimparVeiculo");
  const placa = document.getElementById("placaVeiculo");
  const empresa = document.getElementById("empresaVeiculo");
  const listaEmpresas = document.getElementById("empresasVeiculoList");
  const listaSugestoesEmpresa = document.getElementById("empresaVeiculoSuggestions");
  const modelo = document.getElementById("modeloVeiculo");
  const cor = document.getElementById("corVeiculo");
  const tipo = document.getElementById("tipoVeiculo");
  const observacao = document.getElementById("observacaoVeiculo");
  const placaExiste = document.getElementById("placaExiste");

  const buscaVeiculo = document.getElementById("buscaVeiculoEdicao");
  const btnBuscarVeiculo = document.getElementById("btnBuscarVeiculoEdicao");
  const listaVeiculo = document.getElementById("listaVeiculoEdicao");
  const veiculoEditando = document.getElementById("veiculoEditando");

  if (
    !btn ||
    !placa ||
    !empresa ||
    !modelo ||
    !cor ||
    !tipo ||
    !observacao ||
    !placaExiste ||
    !buscaVeiculo ||
    !btnBuscarVeiculo ||
    !listaVeiculo ||
    !veiculoEditando
  ) {
    console.error("Elementos do formulario nao encontrados no template.");
    return;
  }

  let veiculoEmEdicao = null;

  carregarEmpresasVeiculo();

  const showMessage = (message) => {
    if (window.showAlert) return window.showAlert(message);
    alert(message);
    return Promise.resolve();
  };

  const normalize = (value) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };




  function setupEmpresaSuggestions(inputEl, listEl, empresas) {
    if (!inputEl || !listEl || listEl.dataset._bound) return;
    listEl.dataset._bound = "1";

    const nomes = empresas.map((nome) => ({
      label: nome,
      key: nome.toLowerCase(),
    }));

    const render = () => {
      const query = (inputEl.value || "").trim().toLowerCase();
      const filtered = query
        ? nomes.filter(item => item.key.includes(query))
        : nomes;

      const matches = filtered.slice(0, 8);
      listEl.innerHTML = "";
      if (!matches.length) {
        listEl.classList.add("d-none");
        return;
      }

      matches.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "list-group-item list-group-item-action";
        btn.dataset.value = item.label;
        btn.textContent = item.label;
        listEl.appendChild(btn);
      });
      listEl.classList.remove("d-none");
    };

    inputEl.addEventListener("input", render);
    inputEl.addEventListener("focus", render);
    inputEl.addEventListener("blur", () => {
      setTimeout(() => listEl.classList.add("d-none"), 150);
    });

    listEl.addEventListener("pointerdown", (e) => {
      if (e.target.closest("[data-value]")) {
        e.preventDefault();
      }
    });

    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-value]");
      if (!btn) return;
      inputEl.value = btn.dataset.value;
      listEl.classList.add("d-none");
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      inputEl.focus();
    });
  }

  async function carregarEmpresasVeiculo() {
    const lista = listaEmpresas;
    if (!lista) return;

    try {
      const resp = await fetch("/api/veiculos/veiculos/empresas/", {
        credentials: "same-origin",
        headers: { "Accept": "application/json" },
      });

      if (!resp.ok) {
        console.error("Status:", resp.status, "URL:", resp.url);
        return;
      }

      const data = await resp.json();
      const empresas = Array.isArray(data.empresas) ? data.empresas : [];

      lista.innerHTML = "";
      empresas.forEach((nome) => {
        const opt = document.createElement("option");
        opt.value = nome;
        lista.appendChild(opt);
      });

      setupEmpresaSuggestions(empresa, listaSugestoesEmpresa, empresas);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    }
  }

  const setModoEdicao = (veiculo) => {
    veiculoEmEdicao = veiculo?.id || null;
    if (veiculoEmEdicao) {
      const mensagem = veiculoEditando.querySelector(".mensagem-editando");
      if (mensagem) {
        mensagem.textContent = `Editando: ${veiculo.placa || "Veiculo"} (ID ${veiculoEmEdicao})`;
      } else {
        veiculoEditando.textContent = `Editando: ${veiculo.placa || "Veiculo"} (ID ${veiculoEmEdicao})`;
      }
      veiculoEditando.classList.remove("d-none");
      btn.textContent = "Salvar alteracoes";
    } else {
      const mensagem = veiculoEditando.querySelector(".mensagem-editando");
      if (mensagem) {
        mensagem.textContent = "";
      } else {
        veiculoEditando.textContent = "";
      }
      veiculoEditando.classList.add("d-none");
      btn.textContent = "Salvar";
    }
  };

  const limparCampos = () => {
    placa.value = "";
    placa.dataset.placaRaw = "";
    empresa.value = "";
    modelo.value = "";
    cor.value = "";
    tipo.value = "";
    observacao.value = "";
    placaExiste.classList.add("d-none");
    placa.classList.remove("border-danger", "border-2");
    setModoEdicao(null);
  };

  btnLimpar?.addEventListener("click", () => limparCampos());

  const verificarPlacaExistente = async () => {
    const placaValue = (placa.dataset.placaRaw || placa.value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (!placaValue) {
      placaExiste.classList.add("d-none");
      return false;
    }

    try {
      const resp = await fetch(
        `/api/veiculos/veiculos/existe/?placa=${encodeURIComponent(
          placaValue
        )}&exclude_id=${encodeURIComponent(veiculoEmEdicao || "")}`
      );
      const data = await resp.json().catch(() => ({}));
      const existe = !!data.exists;
      placaExiste.classList.toggle("d-none", !existe);
      placa.classList.toggle("border-danger", existe);
      placa.classList.toggle("border-2", existe);
      return existe;
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const renderListaVeiculos = (veiculos, query) => {
    if (!veiculos.length) {
      if (query && query.startsWith("#")) {
        const idText = query.slice(1).trim();
        listaVeiculo.innerHTML = `<li class="list-group-item text-center text-muted">Nenhum veiculo com ID ${idText || "informado"}</li>`;
        return;
      }
      listaVeiculo.innerHTML =
        '<li class="list-group-item text-center text-muted">Nenhum veiculo encontrado</li>';
      return;
    }

    listaVeiculo.innerHTML = veiculos
      .map(
        (veiculo) => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${veiculo.placa || "Sem placa"}</strong><br>
              <small class="text-muted">${veiculo.modelo || "Modelo nao informado"}</small>
            </div>
            <button class="btn btn-sm btn-outline-primary btnSelecionarVeiculo" data-id="${veiculo.id}">
              Selecionar
            </button>
          </li>
        `
      )
      .join("");

    listaVeiculo.querySelectorAll(".btnSelecionarVeiculo").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const id = event.currentTarget.dataset.id;
        await carregarVeiculoParaEdicao(id);
      });
    });
  };

  const buscarVeiculos = async (query) => {
    try {
      const resp = await fetch(
        `/api/veiculos/veiculos/buscar/?q=${encodeURIComponent(query)}`
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) return [];
      return data.veiculos || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const carregarVeiculoParaEdicao = async (veiculoId) => {
    try {
      const resp = await fetch(`/api/veiculos/veiculos/${veiculoId}/`);
      const veiculo = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        await showMessage("Nao foi possivel carregar o veiculo.");
        return;
      }

      placa.value = veiculo.placa || "";
      placa.dataset.placaRaw = (veiculo.placa || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      empresa.value = veiculo.empresa || "";
      modelo.value = veiculo.modelo || "";
      cor.value = veiculo.cor || "";
      tipo.value = veiculo.tipo || "";
      observacao.value = veiculo.observacao || "";

      setModoEdicao(veiculo);
      await verificarPlacaExistente();
      listaVeiculo.innerHTML = "";
    } catch (err) {
      console.error(err);
      await showMessage("Erro ao carregar veiculo.");
    }
  };

  buscaVeiculo.addEventListener("input", async (event) => {
    const query = event.target.value.trim();
    if (query.length < 2) {
      listaVeiculo.innerHTML = "";
      return;
    }
    const veiculos = await buscarVeiculos(query);
    renderListaVeiculos(veiculos, query);
  });

  btnBuscarVeiculo.addEventListener("click", () => {
    const query = buscaVeiculo.value.trim();
    if (query.length >= 2) {
      buscaVeiculo.dispatchEvent(new Event("input"));
    }
  });

  placa.addEventListener("blur", () => verificarPlacaExistente());

  setModoEdicao(null);

  btn.addEventListener("click", async () => {
    const placaValue = (placa.dataset.placaRaw || placa.value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    if (!placaValue) {
      await showMessage("Informe a placa.");
      return;
    }

    const placaDuplicada = await verificarPlacaExistente();
    if (placaDuplicada) {
      await showMessage("Placa ja cadastrada. Corrija antes de salvar.");
      return;
    }

    const payload = {
      placa: placaValue,
      empresa: normalize(empresa.value),
      modelo: normalize(modelo.value),
      cor: normalize(cor.value),
      tipo: normalize(tipo.value),
      observacao: normalize(observacao.value),
    };

    try {
      const veiculoUrl = veiculoEmEdicao
        ? `/api/veiculos/veiculos/${veiculoEmEdicao}/`
        : "/api/veiculos/veiculos/";
      const veiculoMethod = veiculoEmEdicao ? "PATCH" : "POST";

      const resp = await fetch(veiculoUrl, {
        method: veiculoMethod,
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error(data);
        await showMessage(
          data.erro || data.detail || "Erro ao cadastrar veiculo"
        );
        return;
      }

      await showMessage(
        veiculoEmEdicao ? "Veiculo atualizado!" : "Veiculo cadastrado!"
      );
      limparCampos();
      buscaVeiculo.value = "";
      listaVeiculo.innerHTML = "";
    } catch (err) {
      console.error(err);
      await showMessage("Erro de comunicacao com o servidor.");
    }
  });
});
