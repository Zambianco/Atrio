// consulta_cadastros.js

let todasPessoas = [];
let todosVeiculos = [];

const TIPO_PESSOA_LABELS = {
  visitante: "Visitante",
  funcionario: "Funcionário",
  motorista: "Motorista",
  fornecedor: "Fornecedor",
  prestador: "Prestador de Serviço",
};

const TIPO_PESSOA_BADGE = {
  visitante: "secondary",
  funcionario: "primary",
  motorista: "info",
  fornecedor: "warning",
  prestador: "dark",
};

function formatarData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

// ===================== PESSOAS =====================

async function carregarPessoas() {
  const spinner = document.getElementById("spinnerPessoas");
  spinner.classList.add("show");
  document.getElementById("listaPessoas").innerHTML = "";
  document.getElementById("emptyPessoas").classList.add("d-none");

  try {
    const resp = await fetch("/api/pessoas/pessoas/", { credentials: "same-origin" });
    if (!resp.ok) throw new Error("Erro ao carregar pessoas");
    const data = await resp.json();
    todasPessoas = Array.isArray(data) ? data : (data.results || []);
    document.getElementById("cntPessoas").textContent = todasPessoas.length;
    document.getElementById("badgePessoas").textContent = todasPessoas.length;
    renderPessoas();
  } catch (err) {
    console.error(err);
    document.getElementById("listaPessoas").innerHTML =
      '<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>Erro ao carregar pessoas. Tente recarregar a página.</div>';
  } finally {
    spinner.classList.remove("show");
  }
}

function filtrarPessoas() {
  const texto = (document.getElementById("filtroPessoas").value || "").toLowerCase().trim();
  const tipo = document.getElementById("filtroTipoPessoa").value;
  const ordem = document.getElementById("ordemPessoas").value;

  let resultado = todasPessoas.filter(p => {
    const matchTexto = !texto ||
      (p.nome || "").toLowerCase().includes(texto) ||
      (p.empresa || "").toLowerCase().includes(texto);
    const matchTipo = !tipo || p.tipo === tipo;
    return matchTexto && matchTipo;
  });

  resultado.sort((a, b) => {
    switch (ordem) {
      case "nome":
        return (a.nome || "").localeCompare(b.nome || "", "pt-BR");
      case "nome_desc":
        return (b.nome || "").localeCompare(a.nome || "", "pt-BR");
      case "recente":
        return new Date(b.criado_em) - new Date(a.criado_em);
      case "antigo":
        return new Date(a.criado_em) - new Date(b.criado_em);
      default:
        return 0;
    }
  });

  return resultado;
}

function renderPessoas() {
  const lista = document.getElementById("listaPessoas");
  const empty = document.getElementById("emptyPessoas");
  const contador = document.getElementById("contadorPessoas");
  const resultado = filtrarPessoas();

  contador.textContent = `Exibindo ${resultado.length} de ${todasPessoas.length} pessoa${todasPessoas.length !== 1 ? "s" : ""}`;

  if (!resultado.length) {
    lista.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }

  empty.classList.add("d-none");

  lista.innerHTML = resultado.map(p => {
    const tipoLabel = TIPO_PESSOA_LABELS[p.tipo] || p.tipo || "—";
    const tipoCor = TIPO_PESSOA_BADGE[p.tipo] || "secondary";
    const empresa = p.empresa || "—";
    const dataCadastro = formatarData(p.criado_em);

    return `
      <div class="cadastro-card card">
        <div class="card-body py-2 px-3">
          <div class="row align-items-center g-2">
            <div class="col-md-4">
              <div class="d-flex align-items-center gap-2">
                <div class="bg-primary bg-opacity-10 rounded p-2 d-flex align-items-center justify-content-center" style="min-width:38px;min-height:38px;">
                  <i class="bi bi-person text-primary fs-5"></i>
                </div>
                <div>
                  <div class="fw-semibold text-truncate" style="max-width:200px;" title="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</div>
                  <span class="badge bg-${tipoCor} tipo-badge">${tipoLabel}</span>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="info-label"><i class="bi bi-building me-1"></i>Empresa</div>
              <div class="info-value text-truncate" style="max-width:180px;" title="${escapeHtml(empresa)}">${escapeHtml(empresa)}</div>
            </div>
            <div class="col-md-2">
              <div class="info-label"><i class="bi bi-calendar me-1"></i>Cadastro</div>
              <div class="info-value">${dataCadastro}</div>
            </div>
            <div class="col-md-3 text-end">
              <a href="/cadastro-pessoa/?id=${p.id}" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-pencil me-1"></i>Editar
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function limparFiltroPessoas() {
  document.getElementById("filtroPessoas").value = "";
  document.getElementById("filtroTipoPessoa").value = "";
  renderPessoas();
}

// ===================== VEÍCULOS =====================

async function carregarVeiculos() {
  const spinner = document.getElementById("spinnerVeiculos");
  spinner.classList.add("show");
  document.getElementById("listaVeiculos").innerHTML = "";
  document.getElementById("emptyVeiculos").classList.add("d-none");

  try {
    const resp = await fetch("/api/veiculos/veiculos/", { credentials: "same-origin" });
    if (!resp.ok) throw new Error("Erro ao carregar veículos");
    const data = await resp.json();
    todosVeiculos = Array.isArray(data) ? data : (data.results || []);
    document.getElementById("cntVeiculos").textContent = todosVeiculos.length;
    document.getElementById("badgeVeiculos").textContent = todosVeiculos.length;
    renderVeiculos();
  } catch (err) {
    console.error(err);
    document.getElementById("listaVeiculos").innerHTML =
      '<div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i>Erro ao carregar veículos. Tente recarregar a página.</div>';
  } finally {
    spinner.classList.remove("show");
  }
}

function filtrarVeiculos() {
  const texto = (document.getElementById("filtroVeiculos").value || "").toLowerCase().trim();
  const tipo = document.getElementById("filtroTipoVeiculo").value;
  const ordem = document.getElementById("ordemVeiculos").value;

  let resultado = todosVeiculos.filter(v => {
    const matchTexto = !texto ||
      (v.placa || "").toLowerCase().includes(texto) ||
      (v.modelo || "").toLowerCase().includes(texto) ||
      (v.empresa || "").toLowerCase().includes(texto) ||
      (v.cor || "").toLowerCase().includes(texto);
    const matchTipo = !tipo || (v.tipo || "") === tipo;
    return matchTexto && matchTipo;
  });

  resultado.sort((a, b) => {
    switch (ordem) {
      case "placa":
        return (a.placa || "").localeCompare(b.placa || "", "pt-BR");
      case "placa_desc":
        return (b.placa || "").localeCompare(a.placa || "", "pt-BR");
      case "recente":
        return new Date(b.criado_em) - new Date(a.criado_em);
      case "antigo":
        return new Date(a.criado_em) - new Date(b.criado_em);
      default:
        return 0;
    }
  });

  return resultado;
}

function renderVeiculos() {
  const lista = document.getElementById("listaVeiculos");
  const empty = document.getElementById("emptyVeiculos");
  const contador = document.getElementById("contadorVeiculos");
  const resultado = filtrarVeiculos();

  contador.textContent = `Exibindo ${resultado.length} de ${todosVeiculos.length} veículo${todosVeiculos.length !== 1 ? "s" : ""}`;

  if (!resultado.length) {
    lista.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }

  empty.classList.add("d-none");

  lista.innerHTML = resultado.map(v => {
    const modelo = v.modelo || "—";
    const cor = v.cor || "—";
    const empresa = v.empresa || "—";
    const tipo = v.tipo || "—";
    const dataCadastro = formatarData(v.criado_em);

    return `
      <div class="cadastro-card card">
        <div class="card-body py-2 px-3">
          <div class="row align-items-center g-2">
            <div class="col-md-3">
              <div class="d-flex align-items-center gap-2">
                <div class="bg-warning bg-opacity-10 rounded p-2 d-flex align-items-center justify-content-center" style="min-width:38px;min-height:38px;">
                  <i class="bi bi-truck text-warning fs-5"></i>
                </div>
                <div>
                  <div class="fw-bold fs-6">${escapeHtml(v.placa)}</div>
                  <small class="text-muted">${escapeHtml(tipo)}</small>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="info-label"><i class="bi bi-car-front me-1"></i>Modelo / Cor</div>
              <div class="info-value text-truncate" style="max-width:160px;">${escapeHtml(modelo)} · ${escapeHtml(cor)}</div>
            </div>
            <div class="col-md-3">
              <div class="info-label"><i class="bi bi-building me-1"></i>Empresa</div>
              <div class="info-value text-truncate" style="max-width:160px;" title="${escapeHtml(empresa)}">${escapeHtml(empresa)}</div>
            </div>
            <div class="col-md-1">
              <div class="info-label"><i class="bi bi-calendar me-1"></i>Cadastro</div>
              <div class="info-value">${dataCadastro}</div>
            </div>
            <div class="col-md-2 text-end">
              <a href="/cadastro-veiculo/?id=${v.id}" class="btn btn-sm btn-outline-warning">
                <i class="bi bi-pencil me-1"></i>Editar
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function limparFiltroVeiculos() {
  document.getElementById("filtroVeiculos").value = "";
  document.getElementById("filtroTipoVeiculo").value = "";
  renderVeiculos();
}

// ===================== HELPERS =====================

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function recarregarAtual() {
  const abaAtiva = document.querySelector(".nav-tabs .nav-link.active");
  if (abaAtiva && abaAtiva.id === "tab-veiculos") {
    carregarVeiculos();
  } else {
    carregarPessoas();
  }
}

// ===================== INIT =====================

document.addEventListener("DOMContentLoaded", () => {
  carregarPessoas();
  carregarVeiculos();

  // Filtros em tempo real - pessoas
  document.getElementById("filtroPessoas").addEventListener("input", renderPessoas);
  document.getElementById("filtroTipoPessoa").addEventListener("change", renderPessoas);
  document.getElementById("ordemPessoas").addEventListener("change", renderPessoas);

  // Filtros em tempo real - veículos
  document.getElementById("filtroVeiculos").addEventListener("input", renderVeiculos);
  document.getElementById("filtroTipoVeiculo").addEventListener("change", renderVeiculos);
  document.getElementById("ordemVeiculos").addEventListener("change", renderVeiculos);
});
