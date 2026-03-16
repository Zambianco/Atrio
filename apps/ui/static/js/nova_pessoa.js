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

// === Script principal ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnSalvarPessoa");
  const btnLimpar = document.getElementById("btnLimparPessoa");
  const btnAdicionarDocumento = document.getElementById("btnAdicionarDocumento");
  const documentosContainer = document.getElementById("documentosContainer");
  const template = document.getElementById("documentoTemplate");

  const nome = document.getElementById("nomePessoa");
  const empresa = document.getElementById("empresaPessoa");
  const listaEmpresas = document.getElementById("empresasPessoaList");
  const listaSugestoesEmpresa = document.getElementById("empresaPessoaSuggestions");
  const tipo = document.getElementById("tipoPessoa");
  const observacao = document.getElementById("observacaoPessoa");

  const buscaPessoa = document.getElementById("buscaPessoaEdicao");
  const btnBuscarPessoa = document.getElementById("btnBuscarPessoaEdicao");
  const listaPessoa = document.getElementById("listaPessoaEdicao");
  const pessoaEditando = document.getElementById("pessoaEditando");

  if (
    !btn ||
    !nome ||
    !empresa ||
    !tipo ||
    !observacao ||
    !btnAdicionarDocumento ||
    !documentosContainer ||
    !template ||
    !buscaPessoa ||
    !btnBuscarPessoa ||
    !listaPessoa ||
    !pessoaEditando
  ) {
    console.error("Elementos do formulario nao encontrados no template.");
    return;
  }

  let tiposDocumento = [];
  let pessoaEmEdicao = null;
  let documentosRemovidos = [];

  carregarEmpresasPessoa();
  const CPF_DIGITS_LEN = 11;
  const CNH_DIGITS_LEN = 11;

  const showMessage = (message) => {
    if (window.showAlert) return window.showAlert(message);
    alert(message);
    return Promise.resolve();
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

  async function carregarEmpresasPessoa() {
    const lista = listaEmpresas;
    if (!lista) return;

    try {
      const resp = await fetch("/api/pessoas/pessoas/empresas/", {
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

  const normalize = (value) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };

  const onlyDigits = (value) => value.replace(/\D/g, "");

  const formatCPF = (digits) => {
    const slice = digits.slice(0, CPF_DIGITS_LEN);
    const part1 = slice.slice(0, 3);
    const part2 = slice.slice(3, 6);
    const part3 = slice.slice(6, 9);
    const part4 = slice.slice(9, 11);
    let formatted = part1;
    if (part2) formatted += `.${part2}`;
    if (part3) formatted += `.${part3}`;
    if (part4) formatted += `-${part4}`;
    return formatted;
  };

  const isValidCPF = (digits) => {
    if (digits.length !== CPF_DIGITS_LEN) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let total = 0;
    for (let i = 0; i < 9; i++) {
      total += parseInt(digits[i], 10) * (10 - i);
    }
    let check = (total * 10) % 11;
    if (check === 10) check = 0;
    if (check !== parseInt(digits[9], 10)) return false;
    total = 0;
    for (let i = 0; i < 10; i++) {
      total += parseInt(digits[i], 10) * (11 - i);
    }
    check = (total * 10) % 11;
    if (check === 10) check = 0;
    return check === parseInt(digits[10], 10);
  };

  const isValidCNH = (digits) => {
    if (digits.length !== CNH_DIGITS_LEN) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i], 10) * (9 - i);
    }
    let mod = sum % 11;
    let firstCheck = mod >= 10 ? 0 : mod;
    let desc = mod >= 10 ? 2 : 0;

    sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i], 10) * (i + 1);
    }
    sum += desc;
    mod = sum % 11;
    let secondCheck = mod >= 10 ? 0 : mod;

    return (
      firstCheck === parseInt(digits[9], 10) &&
      secondCheck === parseInt(digits[10], 10)
    );
  };

  const getTipoDocumentoNome = (tipoId) => {
    const tipo = tiposDocumento.find((item) => String(item.id) === String(tipoId));
    return tipo?.nome || "";
  };

  const isCpfTipoDocumento = (tipoId) => {
    return getTipoDocumentoNome(tipoId).toUpperCase() === "CPF";
  };

  const isCnhTipoDocumento = (tipoId) => {
    return getTipoDocumentoNome(tipoId).toUpperCase() === "CNH";
  };

  const setDocumentoInvalidState = (row, tipoNome, invalid) => {
    const avisoCpf = row.querySelector(".cpf-invalido");
    const avisoCnh = row.querySelector(".cnh-invalido");
    const numeroInput = row.querySelector(".numero-documento");
    if (!numeroInput) return;
    if (tipoNome === "CPF") row.dataset.cpfInvalid = invalid ? "1" : "0";
    if (tipoNome === "CNH") row.dataset.cnhInvalid = invalid ? "1" : "0";

    const cpfInvalid = row.dataset.cpfInvalid === "1";
    const cnhInvalid = row.dataset.cnhInvalid === "1";

    if (avisoCpf) avisoCpf.classList.toggle("d-none", !cpfInvalid);
    if (avisoCnh) avisoCnh.classList.toggle("d-none", !cnhInvalid);
    numeroInput.classList.toggle("is-invalid", cpfInvalid || cnhInvalid);
  };

  const formatCpfRow = (row) => {
    const numeroInput = row.querySelector(".numero-documento");
    const digits = onlyDigits(numeroInput.value).slice(0, CPF_DIGITS_LEN);
    numeroInput.value = formatCPF(digits);
    return digits;
  };

  const normalizeCnhRow = (row) => {
    const numeroInput = row.querySelector(".numero-documento");
    const digits = onlyDigits(numeroInput.value).slice(0, CNH_DIGITS_LEN);
    numeroInput.value = digits;
    return digits;
  };

  const validateCpfRow = (row, showIncomplete = false) => {
    const numeroInput = row.querySelector(".numero-documento");
    const digits = onlyDigits(numeroInput.value);
    if (!digits) {
      setDocumentoInvalidState(row, "CPF", false);
      return true;
    }
    if (digits.length !== CPF_DIGITS_LEN) {
      setDocumentoInvalidState(row, "CPF", showIncomplete);
      return !showIncomplete;
    }
    const valid = isValidCPF(digits);
    setDocumentoInvalidState(row, "CPF", !valid);
    return valid;
  };

  const validateCnhRow = (row, showIncomplete = false) => {
    const numeroInput = row.querySelector(".numero-documento");
    const digits = onlyDigits(numeroInput.value);
    if (!digits) {
      setDocumentoInvalidState(row, "CNH", false);
      return true;
    }
    if (digits.length !== CNH_DIGITS_LEN) {
      setDocumentoInvalidState(row, "CNH", showIncomplete);
      return !showIncomplete;
    }
    const valid = isValidCNH(digits);
    setDocumentoInvalidState(row, "CNH", !valid);
    return valid;
  };

  const setEmissorDefault = (row, tipoNome) => {
    const emissorInput = row.querySelector(".emissor-documento");
    if (!emissorInput) return;
    if (tipoNome === "CPF") emissorInput.value = "RFB";
    if (tipoNome === "CNH") emissorInput.value = "DETRAN";
  };

  const setEmissorLocked = (row, locked) => {
    const emissorInput = row.querySelector(".emissor-documento");
    if (!emissorInput) return;
    emissorInput.readOnly = locked;
  };

  const setValidadeVisibility = (row, hidden) => {
    const validadeInput = row.querySelector(".validade-documento");
    if (!validadeInput) return;
    const field = validadeInput.closest(".col-md-6") || validadeInput.parentElement;
    if (!field) return;
    field.classList.toggle("d-none", hidden);
    if (hidden) validadeInput.value = "";
  };

  const applyDocumentoMode = (row) => {
    const select = row.querySelector(".tipo-documento");
    const numeroInput = row.querySelector(".numero-documento");
    const tipoNome = getTipoDocumentoNome(select.value).toUpperCase();
    const isCpf = tipoNome === "CPF";
    const isCnh = tipoNome === "CNH";
    const prevTipoNome = (row.dataset.tipoDocumentoNome || "").toUpperCase();
    const mudouEntreCpfCnh =
      (prevTipoNome === "CPF" || prevTipoNome === "CNH") &&
      (tipoNome === "CPF" || tipoNome === "CNH") &&
      prevTipoNome !== tipoNome;
    const emissorInput = row.querySelector(".emissor-documento");
    if (mudouEntreCpfCnh && emissorInput) emissorInput.value = "";
    if (isCpf) {
      numeroInput.maxLength = 14;
      numeroInput.setAttribute("inputmode", "numeric");
      formatCpfRow(row);
      setDocumentoInvalidState(row, "CNH", false);
      setEmissorDefault(row, "CPF");
      setEmissorLocked(row, true);
      setValidadeVisibility(row, true);
    } else if (isCnh) {
      numeroInput.maxLength = 11;
      numeroInput.setAttribute("inputmode", "numeric");
      normalizeCnhRow(row);
      setDocumentoInvalidState(row, "CPF", false);
      setEmissorDefault(row, "CNH");
      setEmissorLocked(row, true);
      setValidadeVisibility(row, false);
    } else {
      numeroInput.maxLength = 100;
      numeroInput.removeAttribute("inputmode");
      setDocumentoInvalidState(row, "CPF", false);
      setDocumentoInvalidState(row, "CNH", false);
      setEmissorLocked(row, false);
      const emissorInput = row.querySelector(".emissor-documento");
      if (emissorInput) emissorInput.value = "";
      setValidadeVisibility(row, false);
    }

    row.dataset.tipoDocumentoNome = tipoNome;
  };

  const getNumeroDocumentoValue = (row) => {
    const tipoId = row.querySelector(".tipo-documento").value;
    const numeroInput = row.querySelector(".numero-documento");
    const raw = numeroInput.value.trim();
    return isCpfTipoDocumento(tipoId) || isCnhTipoDocumento(tipoId)
      ? onlyDigits(raw)
      : raw;
  };

  const setModoEdicao = (pessoa) => {
    pessoaEmEdicao = pessoa?.id || null;
    documentosRemovidos = [];
    if (pessoaEmEdicao) {
      pessoaEditando.textContent = `Editando: ${pessoa.nome || "Pessoa"} (ID ${pessoaEmEdicao})`;
      pessoaEditando.classList.remove("d-none");
      btn.textContent = "Salvar alteracoes";
    } else {
      pessoaEditando.textContent = "";
      pessoaEditando.classList.add("d-none");
      btn.textContent = "Salvar";
    }
  };

  const montarSelectTipos = (select) => {
    select.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Selecione";
    select.appendChild(option);

    tiposDocumento.forEach((tipoItem) => {
      const item = document.createElement("option");
      item.value = String(tipoItem.id);
      item.textContent = tipoItem.nome;
      select.appendChild(item);
    });

    if (select.dataset.selected) {
      select.value = select.dataset.selected;
      delete select.dataset.selected;
    }
  };

  const carregarTiposDocumento = async () => {
    try {
      const resp = await fetch("/api/pessoas/tipos-documento/");
      const data = await resp.json().catch(() => []);
      if (!resp.ok || !Array.isArray(data)) return;
      tiposDocumento = data;
      documentosContainer
        .querySelectorAll(".tipo-documento")
        .forEach((select) => montarSelectTipos(select));
      documentosContainer
        .querySelectorAll(".documento-row")
        .forEach((row) => applyDocumentoMode(row));
    } catch (err) {
      console.error(err);
    }
  };

  const tipoLabels = {
    visitante: "Visitante",
    funcionario: "Funcionário",
    motorista: "Motorista",
    fornecedor: "Fornecedor",
    prestador: "Prestador de Serviço",
  };

  const mostrarModalPessoaExistente = (pessoa) => {
    document.getElementById("modalPessoaNome").textContent = pessoa.nome || "-";
    document.getElementById("modalPessoaEmpresa").textContent = pessoa.empresa || "Sem empresa";
    document.getElementById("modalPessoaTipo").textContent = tipoLabels[pessoa.tipo] || pessoa.tipo || "-";

    const btnAbrir = document.getElementById("btnAbrirCadastroPessoa");
    const novoBtn = btnAbrir.cloneNode(true);
    btnAbrir.parentNode.replaceChild(novoBtn, btnAbrir);

    novoBtn.addEventListener("click", async () => {
      bootstrap.Modal.getInstance(document.getElementById("modalPessoaExistente"))?.hide();
      await carregarPessoaParaEdicao(pessoa.id);
    });

    new bootstrap.Modal(document.getElementById("modalPessoaExistente")).show();
  };

  const verificarDocumentoExistente = async (row) => {
    const tipoSelect = row.querySelector(".tipo-documento");
    const numeroInput = row.querySelector(".numero-documento");
    const aviso = row.querySelector(".documento-existe");
    const docId = row.dataset.docId || "";

    const tipoId = tipoSelect.value;
    const numero = getNumeroDocumentoValue(row);

    if (!tipoId || !numero) {
      aviso.classList.add("d-none");
      numeroInput.classList.remove("is-invalid");
      return;
    }

    try {
      const resp = await fetch(
        `/api/pessoas/documentos/existe/?tipo_documento=${encodeURIComponent(
          tipoId
        )}&numero=${encodeURIComponent(numero)}&exclude_id=${encodeURIComponent(docId)}`
      );
      const data = await resp.json().catch(() => ({}));
      const existe = !!data.exists;
      aviso.classList.toggle("d-none", !existe);
      numeroInput.classList.toggle("is-invalid", existe);
      if (existe && data.pessoa) {
        mostrarModalPessoaExistente(data.pessoa);
      }
      return existe;
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  const documentoRowVazio = (row) => {
    const tipoDocumento = row.querySelector(".tipo-documento").value.trim();
    const numeroDocumento = row.querySelector(".numero-documento").value.trim();
    const emissorDocumento = row.querySelector(".emissor-documento").value.trim();
    const validadeDocumento = row.querySelector(".validade-documento").value.trim();
    const observacaoDocumento = row
      .querySelector(".observacao-documento")
      .value.trim();

    return (
      !tipoDocumento &&
      !numeroDocumento &&
      !emissorDocumento &&
      !validadeDocumento &&
      !observacaoDocumento
    );
  };

  const criarDocumentoRow = (documento = null) => {
    const content = template.content.cloneNode(true);
    const row = content.querySelector(".documento-row");
    const select = row.querySelector(".tipo-documento");
    const numeroInput = row.querySelector(".numero-documento");
    const emissorInput = row.querySelector(".emissor-documento");
    const validadeInput = row.querySelector(".validade-documento");
    const observacaoInput = row.querySelector(".observacao-documento");
    const removerBtn = row.querySelector(".remover-documento");

    if (documento?.id) row.dataset.docId = String(documento.id);

    if (tiposDocumento.length) {
      montarSelectTipos(select);
    } else if (documento?.tipo_documento) {
      select.dataset.selected = String(documento.tipo_documento);
    }

    if (documento) {
      select.value = documento.tipo_documento ? String(documento.tipo_documento) : "";
      numeroInput.value = documento.numero || "";
      emissorInput.value = documento.emissor || "";
      validadeInput.value = documento.validade || "";
      observacaoInput.value = documento.observacao || "";
    }

    select.addEventListener("change", () => {
      applyDocumentoMode(row);
      verificarDocumentoExistente(row);
    });
    numeroInput.addEventListener("input", () => {
      if (isCpfTipoDocumento(select.value)) {
        const digits = formatCpfRow(row);
        if (digits.length === CPF_DIGITS_LEN) {
          validateCpfRow(row);
        } else {
          setDocumentoInvalidState(row, "CPF", false);
        }
        setDocumentoInvalidState(row, "CNH", false);
      } else if (isCnhTipoDocumento(select.value)) {
        const digits = normalizeCnhRow(row);
        if (digits.length === CNH_DIGITS_LEN) {
          validateCnhRow(row);
        } else {
          setDocumentoInvalidState(row, "CNH", false);
        }
        setDocumentoInvalidState(row, "CPF", false);
      }
    });
    numeroInput.addEventListener("blur", () => {
      if (isCpfTipoDocumento(select.value)) {
        validateCpfRow(row, true);
      } else if (isCnhTipoDocumento(select.value)) {
        validateCnhRow(row, true);
      }
      verificarDocumentoExistente(row);
    });

    removerBtn.addEventListener("click", () => {
      const docId = row.dataset.docId;
      if (docId) documentosRemovidos.push(docId);
      row.remove();
      if (!documentosContainer.querySelector(".documento-row")) {
        adicionarDocumento();
      }
    });

    documentosContainer.appendChild(row);
  };

  const adicionarDocumento = async () => {
    const rows = Array.from(documentosContainer.querySelectorAll(".documento-row"));
    const hasBlank = rows.some((row) => documentoRowVazio(row));

    if (hasBlank) {
      await showMessage("Preencha o documento em branco antes de adicionar outro.");
      const row = rows.find((item) => documentoRowVazio(item));
      row?.querySelector(".tipo-documento")?.focus();
      return;
    }

    criarDocumentoRow();
  };

  const validarDocumentosExistentes = async (documentos) => {
    for (const doc of documentos) {
      const resp = await fetch(
        `/api/pessoas/documentos/existe/?tipo_documento=${encodeURIComponent(
          doc.tipo_documento
        )}&numero=${encodeURIComponent(doc.numero.trim())}&exclude_id=${encodeURIComponent(
          doc.id || ""
        )}`
      );
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.exists) {
        return true;
      }
    }
    return false;
  };

  const limparCampos = () => {
    nome.value = "";
    empresa.value = "";
    tipo.value = "";
    observacao.value = "";
    documentosContainer.innerHTML = "";
    setModoEdicao(null);
    adicionarDocumento();
  };

  const renderListaPessoas = (pessoas, query) => {
    if (!pessoas.length) {
      if (query && query.startsWith("#")) {
        const idText = query.slice(1).trim();
        listaPessoa.innerHTML = `<li class="list-group-item text-center text-muted">Nenhuma pessoa com ID ${idText || "informado"}</li>`;
        return;
      }
      listaPessoa.innerHTML =
        '<li class="list-group-item text-center text-muted">Nenhuma pessoa encontrada</li>';
      return;
    }

    listaPessoa.innerHTML = pessoas
      .map(
        (pessoa) => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <strong>${pessoa.nome || pessoa.nome_completo || "Sem nome"}</strong><br>
              <small class="text-muted">${pessoa.empresa || "Sem empresa"}</small>
            </div>
            <button class="btn btn-sm btn-outline-primary btnSelecionarPessoa" data-id="${pessoa.id}">
              Selecionar
            </button>
          </li>
        `
      )
      .join("");

    listaPessoa.querySelectorAll(".btnSelecionarPessoa").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const id = event.currentTarget.dataset.id;
        await carregarPessoaParaEdicao(id);
      });
    });
  };

  const buscarPessoas = async (query) => {
    try {
      const resp = await fetch(
        `/api/pessoas/pessoas/buscar/?q=${encodeURIComponent(query)}`
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) return [];
      return data.pessoas || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const carregarPessoaParaEdicao = async (pessoaId) => {
    try {
      const resp = await fetch(`/api/pessoas/pessoas/${pessoaId}/`);
      const pessoa = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        await showMessage("Nao foi possivel carregar a pessoa.");
        return;
      }

      nome.value = pessoa.nome || "";
      empresa.value = pessoa.empresa || "";
      tipo.value = pessoa.tipo || "";
      observacao.value = pessoa.observacao || "";

      const documentosResp = await fetch(
        `/api/pessoas/documentos/?pessoa=${encodeURIComponent(pessoaId)}`
      );
      const documentos = await documentosResp.json().catch(() => []);

      documentosContainer.innerHTML = "";

      if (documentosResp.ok && Array.isArray(documentos) && documentos.length) {
        documentos.forEach((doc) => criarDocumentoRow(doc));
      } else {
        adicionarDocumento();
      }

      setModoEdicao(pessoa);
      listaPessoa.innerHTML = "";
    } catch (err) {
      console.error(err);
      await showMessage("Erro ao carregar pessoa.");
    }
  };

  btnLimpar?.addEventListener("click", () => limparCampos());
  btnAdicionarDocumento?.addEventListener("click", () => adicionarDocumento());

  buscaPessoa.addEventListener("input", async (event) => {
    const query = event.target.value.trim();
    if (query.length < 2) {
      listaPessoa.innerHTML = "";
      return;
    }
    const pessoas = await buscarPessoas(query);
    renderListaPessoas(pessoas, query);
  });

  btnBuscarPessoa.addEventListener("click", () => {
    const query = buscaPessoa.value.trim();
    if (query.length >= 2) {
      buscaPessoa.dispatchEvent(new Event("input"));
    }
  });

  adicionarDocumento();
  carregarTiposDocumento();
  setModoEdicao(null);

  // Auto-carregar pessoa se ?id= estiver na URL
  const urlId = new URLSearchParams(window.location.search).get("id");
  if (urlId) {
    const collapse = document.getElementById("collapseBusca");
    if (collapse) {
      new bootstrap.Collapse(collapse, { show: true });
    }
    carregarPessoaParaEdicao(urlId);
  }

  btn.addEventListener("click", async () => {
    const nomeValue = nome.value.trim();

    if (!nomeValue) {
      await showMessage("Informe o nome.");
      return;
    }

    const payload = {
      nome: nomeValue,
      empresa: normalize(empresa.value),
      tipo: normalize(tipo.value || ""),
      observacao: normalize(observacao.value),
    };

    const documentos = Array.from(
      documentosContainer.querySelectorAll(".documento-row")
    )
      .map((row) => {
        const tipoDocumento = row.querySelector(".tipo-documento").value;
        const numeroDocumento = getNumeroDocumentoValue(row);
        const emissorDocumento = row.querySelector(".emissor-documento").value;
        const validadeDocumento = row.querySelector(".validade-documento").value;
        const observacaoDocumento =
          row.querySelector(".observacao-documento").value;

        return {
          id: row.dataset.docId || "",
          tipo_documento: tipoDocumento,
          numero: numeroDocumento,
          emissor: emissorDocumento,
          validade: validadeDocumento,
          observacao: observacaoDocumento,
        };
      })
      .filter((doc) =>
        [
          doc.tipo_documento,
          doc.numero,
          doc.emissor,
          doc.validade,
          doc.observacao,
        ].some((value) => value.trim() !== "")
      );

    for (const doc of documentos) {
      if (!doc.tipo_documento.trim() || !doc.numero.trim()) {
        await showMessage(
          "Preencha tipo e numero em todos os documentos adicionados."
        );
        return;
      }
    }

    for (const row of documentosContainer.querySelectorAll(".documento-row")) {
      const tipoDocumento = row.querySelector(".tipo-documento").value;
      if (isCpfTipoDocumento(tipoDocumento) && !validateCpfRow(row, true)) {
        await showMessage("CPF invalido.");
        return;
      }
      if (isCnhTipoDocumento(tipoDocumento) && !validateCnhRow(row, true)) {
        await showMessage("CNH invalida.");
        return;
      }
    }

    for (const row of documentosContainer.querySelectorAll(".documento-row")) {
      const aviso = row.querySelector(".documento-existe");
      if (aviso && !aviso.classList.contains("d-none")) {
        await showMessage("Existe documento duplicado. Corrija antes de salvar.");
        return;
      }
    }

    if (await validarDocumentosExistentes(documentos)) {
      await showMessage("Existe documento duplicado. Corrija antes de salvar.");
      return;
    }

    try {
      const pessoaUrl = pessoaEmEdicao
        ? `/api/pessoas/pessoas/${pessoaEmEdicao}/`
        : "/api/pessoas/pessoas/";
      const pessoaMethod = pessoaEmEdicao ? "PATCH" : "POST";

      const resp = await fetch(pessoaUrl, {
        method: pessoaMethod,
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error(data);
        await showMessage(data.erro || data.detail || "Erro ao salvar");
        return;
      }

      const pessoaId = pessoaEmEdicao || data.id;

      for (const docId of documentosRemovidos) {
        await fetch(`/api/pessoas/documentos/${docId}/`, {
          method: "DELETE",
          headers: { "X-CSRFToken": csrftoken },
        });
      }

      for (const doc of documentos) {
        const documentoPayload = {
          pessoa: pessoaId,
          tipo_documento: doc.tipo_documento,
          numero: doc.numero.trim(),
          emissor: normalize(doc.emissor || ""),
          validade: normalize(doc.validade || ""),
          observacao: normalize(doc.observacao || ""),
        };

        const docUrl = doc.id
          ? `/api/pessoas/documentos/${doc.id}/`
          : "/api/pessoas/documentos/";
        const docMethod = doc.id ? "PATCH" : "POST";

        const respDoc = await fetch(docUrl, {
          method: docMethod,
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken,
          },
          body: JSON.stringify(documentoPayload),
        });

        const dataDoc = await respDoc.json().catch(() => ({}));

        if (!respDoc.ok) {
          console.error(dataDoc);
          await showMessage(
            dataDoc.erro || dataDoc.detail || "Erro ao salvar documento"
          );
          return;
        }
      }

      await showMessage(
        pessoaEmEdicao ? "Pessoa atualizada com sucesso!" : "Pessoa salva com sucesso!"
      );
      limparCampos();
      buscaPessoa.value = "";
      listaPessoa.innerHTML = "";
    } catch (err) {
      console.error(err);
      await showMessage("Erro de comunicacao com o servidor.");
    }
  });
});
