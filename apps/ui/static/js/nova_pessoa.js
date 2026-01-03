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

  const showMessage = (message) => {
    if (window.showAlert) return window.showAlert(message);
    alert(message);
    return Promise.resolve();
  };

  const normalize = (value) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
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
    } catch (err) {
      console.error(err);
    }
  };

  const verificarDocumentoExistente = async (row) => {
    const tipoSelect = row.querySelector(".tipo-documento");
    const numeroInput = row.querySelector(".numero-documento");
    const aviso = row.querySelector(".documento-existe");
    const docId = row.dataset.docId || "";

    const tipoId = tipoSelect.value;
    const numero = numeroInput.value.trim();

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

    select.addEventListener("change", () => verificarDocumentoExistente(row));
    numeroInput.addEventListener("blur", () => verificarDocumentoExistente(row));

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
        const numeroDocumento = row.querySelector(".numero-documento").value;
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
