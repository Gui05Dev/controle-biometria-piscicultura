/* ===================================================================
   COPACOL — CONTROLE DE BIOMETRIA  (módulo principal)
   Lê o DOM, calcula, persiste no navegador e sincroniza com o Sheets.
   Depende de util.js, calculo.js e grafico.js — carregados antes no index.html.
=================================================================== */
const CHAVE = "copacol_biometria_v3";
const CHAVE_TS = "copacol_estado_ts"; // data/hora da última alteração local (p/ mão dupla)
const camposCabecalho = ["produtor", "tanque", "dataAloj", "area", "totalPeixes", "pesoInicial", "mortosAloj"];

/* Cabeçalhos das colunas da tabela — FONTE ÚNICA.
   COLUNAS_TABELA: com <br> p/ os cabeçalhos HTML (gerados por montarThead).
   COLUNAS_PLANILHA: texto simples p/ a planilha/exportação. */
const COLUNAS_TABELA = [
  "Data", "Saldo de<br>Peixes", "Peixes<br>Capturados", "Peso Médio<br>(g)",
  "Ganho peso<br>diário (g)", "Biomassa<br>Total (kg)", "Ganho de<br>Biomassa (kg)",
  "Ganho Biomassa<br>Acum. (kg)", "Ração do<br>Período (kg)", "Conversão<br>Período",
  "Ração Acum.<br>(kg)", "Conversão<br>Acum.",
];
const COLUNAS_PLANILHA = [
  "Data", "Saldo de Peixes", "Peixes Capturados", "Peso Médio (g)", "Ganho peso diário (g)",
  "Biomassa Total (kg)", "Ganho de Biomassa (kg)", "Ganho Biomassa Acum (kg)",
  "Ração do Período (kg)", "Conversão Período", "Ração Acum (kg)", "Conversão Acum",
];

/* ---------- Dados iniciais (exemplo fictício de demonstração) ---------- */
const SEED = {
  cab: {
    produtor: "Produtor Exemplo",
    tanque: "01",
    dataAloj: "2025-12-03",
    area: "7840",
    totalPeixes: "71355",
    pesoInicial: "44",
    mortosAloj: "42",
  },
  linhas: [
    { data: "2025-12-11", saldo: "67787", cap: "113", peso: "75",  racao: "1600" },
    { data: "2025-12-22", saldo: "67780", cap: "60",  peso: "120", racao: "3000" },
    { data: "2025-12-31", saldo: "67780", cap: "145", peso: "155", racao: "2700" },
    { data: "2026-01-09", saldo: "67780", cap: "141", peso: "200", racao: "3500" },
    { data: "2026-01-16", saldo: "67780", cap: "133", peso: "237", racao: "3300" },
    { data: "2026-01-24", saldo: "67780", cap: "65",  peso: "280", racao: "3600" },
    { data: "2026-01-31", saldo: "67780", cap: "77",  peso: "330", racao: "4560" },
    { data: "2026-02-10", saldo: "67780", cap: "63",  peso: "391", racao: "5050" },
    { data: "2026-02-20", saldo: "67780", cap: "79",  peso: "455", racao: "5500" },
    { data: "2026-03-03", saldo: "67780", cap: "63",  peso: "510", racao: "5300" },
    { data: "2026-03-13", saldo: "67780", cap: "67",  peso: "590", racao: "7500" },
    { data: "2026-03-24", saldo: "67780", cap: "66",  peso: "655", racao: "7500" },
    { data: "2026-04-01", saldo: "67780", cap: "88",  peso: "740", racao: "5900" },
    { data: "2026-04-11", saldo: "67780", cap: "53",  peso: "760", racao: "5700" },
    { data: "2026-04-21", saldo: "67780", cap: "48",  peso: "840", racao: "6400" },
    { data: "2026-05-01", saldo: "67780", cap: "64",  peso: "860", racao: "3750" },
    { data: "2026-05-13", saldo: "67780", cap: "58",  peso: "890", racao: "2700" },
    { data: "2026-05-28", saldo: "67780", cap: "60",  peso: "900", racao: "1000" },
  ],
};

/* ---------- Leitura das linhas da tabela (fonte única) ---------- */
function lerLinha(tr) {
  return {
    data:  tr.querySelector(".in-data").value,
    saldo: tr.querySelector(".in-saldo").value,
    cap:   tr.querySelector(".in-cap").value,
    peso:  tr.querySelector(".in-peso").value,
    racao: tr.querySelector(".in-racao").value,
  };
}
function lerLinhas() { return [...$("corpo").querySelectorAll("tr")].map(lerLinha); }

/* ---------- Cabeçalho da tabela gerado a partir das colunas ---------- */
function montarThead(comAcoes) {
  const grupos = `<tr class="grupos">
      <th class="g0"></th>
      <th class="g1" colspan="7">INFORMAÇÕES DE BIOMETRIA — SEMANAL</th>
      <th class="g2" colspan="4">CONSUMO DE RAÇÃO E CONVERSÃO</th>
      ${comAcoes ? '<th class="g0"></th>' : ""}
    </tr>`;
  const cols = `<tr class="colunas">${COLUNAS_TABELA.map(c => `<th>${c}</th>`).join("")}${comAcoes ? "<th></th>" : ""}</tr>`;
  return grupos + cols;
}

/* ---------- Criar linha ---------- */
function criarLinha(d) {
  d = d || {};
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="data in-data" type="date" min="2000-01-01" max="2100-12-31" value="${esc(d.data)}"></td>
    <td><input class="in-saldo" type="number" min="0" max="100000000" step="1"    value="${esc(d.saldo)}"></td>
    <td><input class="in-cap"   type="number" min="0" max="1000000"   step="1"    value="${esc(d.cap)}"></td>
    <td><input class="in-peso"  type="number" min="0" max="50000"     step="any"  value="${esc(d.peso)}"></td>
    <td class="calc out-gpd">—</td>
    <td class="calc out-bio">—</td>
    <td class="calc out-gbio">—</td>
    <td class="calc out-gbioac">—</td>
    <td><input class="in-racao" type="number" min="0" max="100000000" step="any" value="${esc(d.racao)}"></td>
    <td class="calc calc-racao out-convp">—</td>
    <td class="calc calc-racao out-racac">—</td>
    <td class="calc calc-racao out-convac">—</td>
    <td><button class="linha-x" type="button" data-action="remover-linha" aria-label="Remover biometria">✕</button></td>
  `;
  tr.querySelectorAll("input").forEach(i => {
    i.addEventListener("input", calcular);
    i.addEventListener("change", () => {
      limitar(i);
      if (i.classList.contains("in-data")) ordenarPorData(); else calcular();
    });
  });
  return tr;
}

/* Trava o valor dentro do mínimo/máximo definido no campo (avisa se ajustar) */
function limitar(input) {
  if (input.type !== "number" || input.value === "") return;
  let v = parseFloat(input.value);
  if (isNaN(v)) { input.value = ""; return; }
  const min = input.min !== "" ? parseFloat(input.min) : -Infinity;
  const max = input.max !== "" ? parseFloat(input.max) : Infinity;
  let ajustado = false;
  if (v < min) { v = min; ajustado = true; }
  if (v > max) { v = max; ajustado = true; }
  input.value = v;
  if (ajustado) notificar(`Valor ajustado para o limite permitido (${fmt(v, 0)}).`, "aviso");
}

/* Reordena as linhas pela data (linhas sem data vão para o fim) */
function ordenarPorData() {
  const corpo = $("corpo");
  const linhas = [...corpo.querySelectorAll("tr")];
  linhas.sort((a, b) => {
    const da = a.querySelector(".in-data").value;
    const db = b.querySelector(".in-data").value;
    if (!da) return 1;
    if (!db) return -1;
    return new Date(da) - new Date(db);
  });
  linhas.forEach(tr => corpo.appendChild(tr));
  calcular();
}

/* Marca um campo/célula como alerta (vermelho) ou aviso (amarelo) */
function marcar(el, cond, msg, classe) {
  if (!el) return;
  el.classList.remove("alerta", "aviso");
  if (cond) { el.classList.add(classe); el.title = msg; }
  else el.removeAttribute("title");
}

/* Nova biometria entra com a data de hoje e o saldo de peixes da última linha */
function adicionarLinha(d) {
  let dados = d;
  if (!dados) {
    const linhas = $("corpo").querySelectorAll("tr");
    const ultima = linhas[linhas.length - 1];
    const saldoAnt = ultima ? ultima.querySelector(".in-saldo").value : "";
    dados = { data: hoje(), saldo: saldoAnt };
  }
  $("corpo").appendChild(criarLinha(dados));
  calcular();
}
function removerLinha(b) { b.closest("tr").remove(); calcular(); }

/* Tela ao vivo: lê o DOM, calcula com computar() e escreve de volta */
function calcular() {
  const cab = {
    totalPeixes: $("totalPeixes").value, pesoInicial: $("pesoInicial").value,
    area: $("area").value, dataAloj: $("dataAloj").value,
  };
  const trs = [...$("corpo").querySelectorAll("tr")];
  const c = computar(cab, trs.map(lerLinha));

  $("biomassaInicial").value = fmt(c.biomassaInicial, 2) + " kg";
  $("peixesM2").value = c.area > 0 ? fmt(c.totalPeixes / c.area, 2) : "—";

  trs.forEach((tr, i) => {
    const r = c.linhas[i];
    tr.querySelector(".out-gpd").textContent    = r.gpd;
    tr.querySelector(".out-bio").textContent    = r.bio;
    tr.querySelector(".out-gbio").textContent   = r.gbio;
    tr.querySelector(".out-gbioac").textContent = r.gbioac;
    tr.querySelector(".out-convp").textContent  = r.convp;
    tr.querySelector(".out-racac").textContent  = r.racac;
    tr.querySelector(".out-convac").textContent = r.convac;

    /* ---- Alertas inteligentes ---- */
    marcar(tr.querySelector(".in-data"), r.flags.dataAlerta, "Data deve ser posterior à biometria anterior", "alerta");
    marcar(tr.querySelector(".in-peso"), r.flags.pesoAviso, "Peso menor que a biometria anterior — confira", "aviso");
    marcar(tr.querySelector(".out-gbio"), r.flags.gbioAlerta, "A biomassa caiu em relação ao período anterior", "alerta");
    marcar(tr.querySelector(".out-convp"), r.flags.convpAviso, "Conversão do período muito alta — verifique a ração e o peso", "aviso");
  });

  atualizarPainel(c.pts, { totalPeixes: c.totalPeixes, ultSaldo: c.ultSaldo, racaoAcum: c.racaoAcum, dataAloj: c.dataAloj });
  salvar();
}

/* ---------- Painel: indicadores + gráficos ----------
   Os indicadores (texto) são baratos e atualizam sempre; os gráficos (SVG)
   só são redesenhados quando a aba Painel está visível (e ao abri-la). */
let _ultPts = [], _ultCtx = {};
function painelVisivel() { return $("aba-painel").classList.contains("ativa"); }

function atualizarPainel(pts, ctx) {
  _ultPts = pts; _ultCtx = ctx;
  const ult = pts[pts.length - 1];
  const diasCult = ult ? dias(ctx.dataAloj, ult.data) : 0;

  $("iDias").textContent   = ult ? fmt(diasCult, 0) + " dias" : "—";
  $("iPeso").textContent   = ult ? fmt(ult.peso, 0) + " g" : "—";
  $("iBio").textContent    = ult ? fmt(ult.bio, 0) + " kg" : "—";
  $("iGanho").textContent  = ult ? fmt(ult.gbioac, 0) + " kg" : "—";
  $("iRacao").textContent  = ctx.racaoAcum > 0 ? fmt(ctx.racaoAcum, 0) + " kg" : "—";
  $("iConv").textContent   = (ult && ult.convac > 0) ? fmt(ult.convac, 2) : "—";

  if (painelVisivel()) desenharGraficos("g", pts);
}

/* ---------- Troca de abas ---------- */
function mostrarAba(nome) {
  document.querySelectorAll(".aba-conteudo").forEach(s => s.classList.remove("ativa"));
  document.querySelectorAll(".aba").forEach(b => b.classList.remove("ativa"));
  const sec = $("aba-" + nome);
  if (!sec) return;
  sec.classList.add("ativa");
  const btn = document.querySelector(`.aba[data-aba="${nome}"]`);
  if (btn) btn.classList.add("ativa");
  if (nome === "lotes") renderLotes();
  if (nome === "painel") desenharGraficos("g", _ultPts);
}

/* ---------- Persistência ---------- */
function coletarEstado() {
  const e = { cab: {}, linhas: lerLinhas() };
  camposCabecalho.forEach(c => e.cab[c] = $(c).value);
  return e;
}
function aplicarEstado(e) {
  if (!e || typeof e !== "object" || !e.cab || typeof e.cab !== "object") { alert("Arquivo de backup inválido."); return false; }
  camposCabecalho.forEach(c => { $(c).value = e.cab[c] ?? ""; });
  $("corpo").innerHTML = "";
  (Array.isArray(e.linhas) ? e.linhas : []).forEach(d => $("corpo").appendChild(criarLinha(d)));
  if (!$("corpo").children.length) for (let i = 0; i < 5; i++) $("corpo").appendChild(criarLinha());
  calcular();
  return true;
}

/* Salva no localStorage com debounce (evita gravar a cada tecla).
   salvarAgora() grava na hora — usado ao sair/ocultar a página. */
let _saveTimer = null;
function salvar() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(salvarAgora, 400);
  agendarSync();
}
function salvarAgora() {
  clearTimeout(_saveTimer); _saveTimer = null;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(coletarEstado()));
    localStorage.setItem(CHAVE_TS, String(Date.now())); // marca quando mudou (mão dupla)
  } catch (x) {}
}
function carregar() {
  let e = null;
  try { e = JSON.parse(localStorage.getItem(CHAVE)); } catch (x) {}
  if (!e || typeof e !== "object" || !e.cab) e = SEED; // dado inválido -> usa o SEED
  const cab = e.cab || {};
  camposCabecalho.forEach(c => { if (cab[c] != null) $(c).value = cab[c]; });
  (Array.isArray(e.linhas) ? e.linhas : []).forEach(d => $("corpo").appendChild(criarLinha(d)));
  if (!$("corpo").children.length) for (let i = 0; i < 5; i++) $("corpo").appendChild(criarLinha());
  calcular();
}

/* ---------- Backup em arquivo (.json) ---------- */
function salvarBackup() {
  const e = coletarEstado();
  const blob = new Blob([JSON.stringify(e, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `backup_tanque_${(e.cab.tanque || "01").replace(/\s+/g, "_")}_${hoje()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function abrirBackup(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const e = JSON.parse(ev.target.result);
      if (aplicarEstado(e)) alert("Backup carregado com sucesso!");
    } catch (x) {
      alert("Não foi possível ler o arquivo. Verifique se é um backup válido (.json).");
    }
    input.value = ""; // permite reabrir o mesmo arquivo depois
  };
  reader.readAsText(file);
}

/* ---------- Limpar tudo (modal de confirmação) ---------- */
function limparTudo() {
  $("inpConfirmaApagar").value = "";
  $("btnConfirmaApagar").disabled = true;
  abrirModal("modalLimpar");
}
function fecharLimpar() { fecharModal("modalLimpar"); }
/* Só libera o botão vermelho quando a pessoa digita APAGAR */
function validarApagar() {
  const ok = $("inpConfirmaApagar").value.trim().toUpperCase() === "APAGAR";
  $("btnConfirmaApagar").disabled = !ok;
}
function confirmarLimpeza() {
  if ($("inpConfirmaApagar").value.trim().toUpperCase() !== "APAGAR") return;
  localStorage.removeItem(CHAVE);
  camposCabecalho.forEach(c => $(c).value = "");
  $("corpo").innerHTML = "";
  for (let i = 0; i < 5; i++) $("corpo").appendChild(criarLinha());
  calcular();
  fecharLimpar();
}

/* ===================================================================
   SINCRONIZAÇÃO COM GOOGLE PLANILHAS  (mão única: app -> planilha)
=================================================================== */
const CHAVE_URL = "copacol_sheets_url";
// URL padrão da planilha (já conecta sozinho em qualquer aparelho).
// Pode ser trocada/desconectada pelo chip de sincronização no topo.
const URL_PADRAO = "https://script.google.com/macros/s/AKfycbxERVFSweXBD5tnnR7ZeP_dXCrhQIolUPQRR1a61p2EtYhi4ryfmX03hLZbpNFhaIAv/exec";
// Senha enviada à planilha — DEVE ser idêntica ao TOKEN do apps-script.gs
const TOKEN_PLANILHA = "cpcl_8Kq3Zr9TmW2yF7nLpX5";
let urlPlanilha = localStorage.getItem(CHAVE_URL) || URL_PADRAO;
let syncTimer   = null;
let syncPendente = false;
// enquanto true, NÃO envia nada (esperando baixar o estado da nuvem ao abrir)
let _sincronizandoInicial = true;

/* Atualiza a bolinha de status no cabeçalho (com tooltip) */
function statusSync(estado) {
  const chip = $("syncChip");
  if (!chip) return;
  chip.className = "sync-dot " + estado;
  const titulos = {
    off:      "Não conectado à planilha — clique para conectar",
    ok:       "Sincronizado com a planilha",
    enviando: "Enviando para a planilha…",
    erro:     "Sem conexão com a planilha — clique para verificar",
  };
  chip.title = titulos[estado] || titulos.off;
}

/* Monta a matriz (linhas x colunas) que será espelhada na planilha.
   Mesmo conteúdo do CSV: cabeçalho + tabela com colunas calculadas. */
function matrizParaPlanilha() {
  const numOuTxt = v => {
    const n = parseFloat(String(v).replace(",", "."));
    return (v !== "" && v != null && !isNaN(n)) ? n : (v || "");
  };
  const L = [];
  L.push(["Copacol — CONTROLE DE BIOMETRIA"]);
  L.push(["Produtor", $("produtor").value]);
  L.push(["Nº Tanque", $("tanque").value]);
  L.push(["Data Alojamento", $("dataAloj").value]);
  L.push(["Área (m²)", numOuTxt($("area").value)]);
  L.push(["Nº Total Peixes", numOuTxt($("totalPeixes").value)]);
  L.push(["Peso Médio Inicial (g)", numOuTxt($("pesoInicial").value)]);
  L.push(["Biomassa (kg)", $("biomassaInicial").value]);
  L.push(["Peixes/m²", $("peixesM2").value]);
  L.push(["Mortos Aloj.", numOuTxt($("mortosAloj").value)]);
  L.push(["Atualizado em", new Date().toLocaleString("pt-BR")]);
  L.push([]);
  L.push([...COLUNAS_PLANILHA]);
  $("corpo").querySelectorAll("tr").forEach(tr => {
    const t = s => tr.querySelector(s).textContent;
    const d = lerLinha(tr);
    L.push([
      d.data, numOuTxt(d.saldo), numOuTxt(d.cap), numOuTxt(d.peso),
      t(".out-gpd"), t(".out-bio"), t(".out-gbio"), t(".out-gbioac"),
      numOuTxt(d.racao), t(".out-convp"), t(".out-racac"), t(".out-convac"),
    ]);
  });
  return L;
}

/* Agenda o envio com atraso (debounce) — evita mandar a cada tecla */
function agendarSync() {
  if (!urlPlanilha || _sincronizandoInicial) return;  // só sincroniza após baixar a nuvem
  syncPendente = true;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(sincronizar, 1500);
}

/* Envio genérico: escreve uma matriz em uma aba da planilha.
   extra: campos opcionais no corpo (ex.: { estado, estadoTs } da mão dupla) */
async function enviarPlanilha(aba, matriz, extra) {
  if (!urlPlanilha) return false;
  // neutraliza fórmulas perigosas em cada célula
  const segura = (Array.isArray(matriz) ? matriz : []).map(l => (Array.isArray(l) ? l : []).map(celulaSegura));
  const corpo = Object.assign({ token: TOKEN_PLANILHA, aba, matriz: segura }, extra || {});
  // timeout de 20s para não travar a sincronização se a rede pendurar
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    // body como string => Content-Type text/plain => evita preflight de CORS
    const r = await fetch(urlPlanilha, { method: "POST", body: JSON.stringify(corpo), signal: ctrl.signal });
    const j = await r.json();
    return !!(j && j.ok);
  } finally {
    clearTimeout(timer);
  }
}

/* Envia o estado atual (lote em andamento) para a aba do tanque.
   Vai junto o estado cru ({estado, estadoTs}) p/ outros aparelhos baixarem. */
async function sincronizar() {
  if (!urlPlanilha) { statusSync("off"); return; }
  statusSync("enviando");
  try {
    const extra = { estado: coletarEstado(), estadoTs: Number(localStorage.getItem(CHAVE_TS)) || 0 };
    const ok = await enviarPlanilha("Tanque " + ($("tanque").value || "01"), matrizParaPlanilha(), extra);
    if (ok) { syncPendente = false; statusSync("ok"); }
    else throw new Error("resposta inválida");
  } catch (e) {
    statusSync("erro");
    // tenta novamente em 15s (ex.: voltou a internet)
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sincronizar, 15000);
  }
}

/* MÃO DUPLA: baixa o estado mais recente da planilha ao abrir o app.
   Só substitui o que está na tela se a versão da nuvem for mais nova
   (compara a data/hora). Em caso de falha/offline, mantém os dados locais. */
async function sincronizarDaNuvem() {
  if (!urlPlanilha) return;
  statusSync("enviando");
  try {
    const sep = urlPlanilha.includes("?") ? "&" : "?";
    const r = await fetch(urlPlanilha + sep + "token=" + encodeURIComponent(TOKEN_PLANILHA));
    const j = await r.json();
    const ok = j && j.estado && typeof j.estado === "object" && j.estado.cab;
    if (ok) {
      const localTs = Number(localStorage.getItem(CHAVE_TS)) || 0;
      const nuvemTs = Number(j.estadoTs) || 0;
      // nuvem só vence se for igual ou mais nova que o local (não atropela edição local recente)
      if (nuvemTs >= localTs) aplicarEstado(j.estado);
    }
    statusSync("ok");
  } catch (e) {
    statusSync("erro");
  }
}

/* ---------- Telinha de configuração ---------- */
function abrirConfigSync() {
  $("inpSyncUrl").value = urlPlanilha;
  $("syncMsg").textContent = "";
  abrirModal("modalSync");
}
function fecharConfigSync() { fecharModal("modalSync"); }

function salvarUrlSync() {
  const u = $("inpSyncUrl").value.trim();
  if (u && !/^https:\/\/script\.google\.com\/.*\/exec(\?.*)?$/.test(u)) {
    $("syncMsg").textContent = "⚠ A URL deve começar com https://script.google.com e terminar em /exec.";
    return;
  }
  urlPlanilha = u;
  if (u) localStorage.setItem(CHAVE_URL, u);
  else   localStorage.removeItem(CHAVE_URL);
  if (u) { $("syncMsg").textContent = "✓ Conectado! Enviando seus dados…"; statusSync("enviando"); sincronizar(); }
  else   { $("syncMsg").textContent = "Desconectado."; statusSync("off"); }
}

function desconectarSync() {
  $("inpSyncUrl").value = "";
  salvarUrlSync();
}

async function testarSync() {
  const u = $("inpSyncUrl").value.trim();
  if (!u) { $("syncMsg").textContent = "Cole a URL primeiro."; return; }
  $("syncMsg").textContent = "Testando…";
  try {
    const r = await fetch(u, {
      method: "POST",
      body: JSON.stringify({ token: TOKEN_PLANILHA, aba: "Teste", matriz: [["Teste de conexão", new Date().toLocaleString("pt-BR")]] }),
    });
    const j = await r.json();
    $("syncMsg").textContent = (j && j.ok)
      ? "✓ Funcionou! Veja a aba 'Teste' na sua planilha."
      : "Resposta inesperada: " + JSON.stringify(j);
  } catch (e) {
    $("syncMsg").textContent = "✗ Não conectou. Confira se publicou como 'Qualquer pessoa' e se a URL termina em /exec.";
  }
}

/* ===================================================================
   LOTES — histórico dos ciclos encerrados (pequeno banco de dados)
=================================================================== */
const CHAVE_LOTES = "copacol_lotes_v1";

function lerLotes()  { try { const a = JSON.parse(localStorage.getItem(CHAVE_LOTES)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function gravarLotes(arr) {
  try { localStorage.setItem(CHAVE_LOTES, JSON.stringify(arr)); } catch (e) {}
  sincronizarHistorico();
}

/* Resumo do lote a partir do que está na tela (indicadores já calculados) */
function resumoAtual() {
  let dataFim = "";
  $("corpo").querySelectorAll("tr").forEach(tr => {
    const d = lerLinha(tr);
    if (num(d.peso) > 0 && d.data) dataFim = d.data;
  });
  return {
    produtor:      $("produtor").value,
    tanque:        $("tanque").value,
    dataAloj:      $("dataAloj").value,
    dataFim,
    dias:          $("iDias").textContent,
    pesoFinal:     $("iPeso").textContent,
    biomassaFinal: $("iBio").textContent,
    conversao:     $("iConv").textContent,
    racaoTotal:    $("iRacao").textContent,
  };
}

/* Matriz da aba "Histórico" (uma linha por lote) */
function matrizHistorico(lotes) {
  const L = [];
  L.push(["Copacol — HISTÓRICO DE LOTES"]);
  L.push(["Produtor", "Nº Tanque", "Alojamento", "Última biometria", "Dias", "Peso final", "Biomassa final", "Conversão", "Ração total", "Encerrado em"]);
  lotes.forEach(lo => {
    const r = lo.resumo || {};
    L.push([r.produtor, r.tanque, r.dataAloj, r.dataFim, r.dias, r.pesoFinal, r.biomassaFinal, r.conversao, r.racaoTotal, lo.salvoEm]);
  });
  return L;
}
async function sincronizarHistorico() {
  if (!urlPlanilha) return;
  try { await enviarPlanilha("Histórico", matrizHistorico(lerLotes())); } catch (e) {}
}

/* Monta os cartões da aba Lotes */
function renderLotes() {
  const lista = $("listaLotes");
  if (!lista) return;
  const lotes = lerLotes();

  /* Comparativo: conversão acumulada final de cada lote (do mais antigo ao mais novo) */
  const card = $("comparativoCard");
  if (card) {
    const comp = lotes.slice().reverse()
      .map(lo => ({ x: (lo.resumo || {}).dataFim, y: num((lo.resumo || {}).conversao) }))
      .filter(p => p.y > 0);
    if (comp.length >= 2) {
      card.style.display = "";
      grafico($("g-comparativo"), [{ cor: "#1289b8", dados: comp }], { casas: 2 });
    } else {
      card.style.display = "none";
    }
  }

  if (!lotes.length) {
    lista.innerHTML = '<div class="sem-dados">Nenhum lote encerrado ainda.<br>Quando terminar um ciclo, clique em “🏁 Encerrar lote atual”.</div>';
    return;
  }
  lista.innerHTML = lotes.map(lo => {
    const r = lo.resumo || {};
    return `
      <div class="lote-card">
        <div class="lote-cab">
          <div class="lote-titulo">🐟 Tanque ${esc(r.tanque || "—")} <span>· ${esc(r.produtor || "—")}</span></div>
          <div class="lote-periodo">${esc(fmtBr(r.dataAloj))} → ${esc(fmtBr(r.dataFim))} · ${esc(r.dias || "—")}</div>
        </div>
        <div class="lote-metrcs">
          <div><span>Peso final</span><b>${esc(r.pesoFinal || "—")}</b></div>
          <div><span>Biomassa</span><b>${esc(r.biomassaFinal || "—")}</b></div>
          <div><span>Conversão</span><b>${esc(r.conversao || "—")}</b></div>
          <div><span>Ração total</span><b>${esc(r.racaoTotal || "—")}</b></div>
        </div>
        <div class="lote-acoes">
          <button class="azul-escuro" type="button" data-action="abrir-lote" data-id="${lo.id}">👁 Abrir</button>
          <button class="vermelho-acao" type="button" data-action="excluir-lote" data-id="${lo.id}">🗑 Excluir</button>
        </div>
      </div>`;
  }).join("");
}

/* Assinatura de um lote (ignora id/data de salvamento) — p/ detectar duplicado */
function assinaturaLote(o) { return JSON.stringify({ cab: o.cab, linhas: o.linhas }); }

/* Encerra o lote atual: guarda no histórico e prepara um novo ciclo */
let _encerrando = false;
async function encerrarLote() {
  if (_encerrando) return;                       // evita clique duplo (salvar 2x)

  const estado = coletarEstado();

  // precisa ter ao menos uma biometria com peso
  const temBiometria = (estado.linhas || []).some(l => num(l.peso) > 0);
  if (!temBiometria) { notificar("Não há biometrias para encerrar.", "aviso"); return; }

  // não deixa salvar o MESMO lote mais de uma vez
  if (lerLotes().some(l => assinaturaLote(l) === assinaturaLote(estado))) {
    notificar("Este lote já foi salvo no histórico.", "aviso");
    return;
  }

  if (!confirm("Encerrar o lote atual?\n\nEle será guardado no histórico (aba Lotes) e a planilha será limpa para um novo ciclo. Produtor, tanque e área são mantidos.")) return;

  _encerrando = true;
  try {
    const lote = {
      id: Date.now(),
      salvoEm: new Date().toLocaleDateString("pt-BR"),
      cab: estado.cab,
      linhas: estado.linhas,
      resumo: resumoAtual(),
    };

    // captura o snapshot da planilha ANTES de limpar a tela
    const matrizSnapshot = matrizParaPlanilha();
    const nomeSnapshot = ("Lote " + (lote.resumo.dataFim || hoje()) + " T" + (lote.resumo.tanque || "01")).substring(0, 90);

    // guarda no histórico local (máx. 10) — também atualiza a aba "Histórico"
    const lotes = lerLotes();
    lotes.unshift(lote);
    gravarLotes(lotes.slice(0, 10));

    // LIMPA a tela imediatamente (não espera a internet) — libera o tanque
    ["dataAloj", "totalPeixes", "pesoInicial", "mortosAloj"].forEach(c => $(c).value = "");
    $("corpo").innerHTML = "";
    for (let i = 0; i < 5; i++) $("corpo").appendChild(criarLinha());
    calcular();   // re-sincroniza a aba "Tanque XX" já vazia

    renderLotes();
    mostrarAba("lotes");
    notificar("Lote encerrado e salvo no histórico! ✅", "ok");

    // envia o snapshot completo do lote em segundo plano (não trava a tela)
    if (urlPlanilha) enviarPlanilha(nomeSnapshot, matrizSnapshot).catch(() => {});
  } finally {
    _encerrando = false;
  }
}

/* Abre um lote do histórico numa tela de detalhe (só-leitura),
   sem mexer no lote que está em andamento na aba Biometria. */
function abrirLote(id) {
  const lo = lerLotes().find(l => l.id === id);
  if (!lo) return;
  renderDetalhe(lo);
  mostrarAba("lote-detalhe");
  // mantém a aba "Lotes" destacada como contexto-pai
  const lt = document.querySelector('.aba[data-aba="lotes"]');
  if (lt) lt.classList.add("ativa");
}

/* Monta a tela de detalhe de um lote: resumo + indicadores + tabela + gráficos */
function renderDetalhe(lote) {
  const r = lote.resumo || {};
  $("detTitulo").innerHTML =
    `🐟 Tanque ${esc(r.tanque || "—")} <span>· ${esc(r.produtor || "—")}</span>` +
    `<div class="detalhe-sub">${esc(fmtBr(r.dataAloj))} → ${esc(fmtBr(r.dataFim))} · ${esc(r.dias || "—")} · encerrado em ${esc(lote.salvoEm || "—")}</div>`;

  const c = computar(lote.cab, lote.linhas);
  const ult = c.pts[c.pts.length - 1];

  /* indicadores */
  const ind = [
    ["Dias de Cultivo", r.dias || "—"],
    ["Peso Médio Final", ult ? fmt(ult.peso, 0) + " g" : "—"],
    ["Biomassa Final", ult ? fmt(ult.bio, 0) + " kg" : "—"],
    ["Ganho de Biomassa", ult ? fmt(ult.gbioac, 0) + " kg" : "—"],
    ["Ração Total", c.racaoAcum > 0 ? fmt(c.racaoAcum, 0) + " kg" : "—"],
    ["Conversão Acum.", (ult && ult.convac > 0) ? fmt(ult.convac, 2) : "—", true],
  ];
  $("detIndicadores").innerHTML = ind.map(([rot, val, dest]) =>
    `<div class="ind${dest ? " destaque" : ""}"><div class="ind-rotulo">${rot}</div><div class="ind-valor">${val}</div></div>`
  ).join("");

  /* tabela só-leitura */
  $("detCorpo").innerHTML = c.linhas.map(l => `
    <tr>
      <td>${esc(fmtBr(l.data))}</td>
      <td>${esc(l.saldo || "—")}</td>
      <td>${esc(l.cap || "—")}</td>
      <td class="${l.flags.pesoAviso ? "aviso" : ""}">${esc(l.peso || "—")}</td>
      <td class="calc">${l.gpd}</td>
      <td class="calc">${l.bio}</td>
      <td class="calc${l.flags.gbioAlerta ? " alerta" : ""}">${l.gbio}</td>
      <td class="calc">${l.gbioac}</td>
      <td>${esc(l.racao || "—")}</td>
      <td class="calc calc-racao${l.flags.convpAviso ? " aviso" : ""}">${l.convp}</td>
      <td class="calc calc-racao">${l.racac}</td>
      <td class="calc calc-racao">${l.convac}</td>
    </tr>`).join("");

  /* gráficos (mesma função da tela ao vivo) */
  desenharGraficos("gd", c.pts);
}

/* Imprime SOMENTE a tela de detalhe do lote atual */
function imprimirLote() {
  document.body.classList.add("imprimindo-lote");
  window.print();
  document.body.classList.remove("imprimindo-lote");
}

/* Remove um lote do histórico */
function excluirLote(id) {
  if (!confirm("Remover este lote do histórico? Esta ação não pode ser desfeita.")) return;
  gravarLotes(lerLotes().filter(l => l.id !== id));
  renderLotes();
}

/* ===================================================================
   MODAIS — abrir/fechar com foco gerenciado e acessibilidade
=================================================================== */
let _ultimoFoco = null;
function abrirModal(id) {
  const m = $(id);
  if (!m) return;
  _ultimoFoco = document.activeElement;
  m.classList.add("show");
  const f = m.querySelector("input, button");
  if (f) f.focus();
}
function fecharModal(id) {
  const m = $(id);
  if (m) m.classList.remove("show");
  if (_ultimoFoco && _ultimoFoco.focus) _ultimoFoco.focus();
}

/* Esc fecha qualquer modal aberto; Tab fica preso dentro do modal */
function onKeydown(e) {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-bg.show").forEach(m => m.classList.remove("show"));
    return;
  }
  if (e.key !== "Tab") return;
  const modal = document.querySelector(".modal-bg.show .modal");
  if (!modal) return;
  const foc = [...modal.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')];
  if (!foc.length) return;
  const primeiro = foc[0], ultimo = foc[foc.length - 1];
  if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
}

/* ===================================================================
   WIRING — eventos via delegação (sem handlers inline no HTML)
=================================================================== */
const ACOES = {
  "config-sync":      abrirConfigSync,
  "add-linha":        () => adicionarLinha(),
  "salvar-backup":    salvarBackup,
  "abrir-backup":     () => $("arquivoBackup").click(),
  "imprimir":         () => window.print(),
  "limpar":           limparTudo,
  "encerrar-lote":    encerrarLote,
  "voltar-lotes":     () => mostrarAba("lotes"),
  "imprimir-lote":    imprimirLote,
  "salvar-url":       salvarUrlSync,
  "testar-sync":      testarSync,
  "fechar-sync":      fecharConfigSync,
  "desconectar":      desconectarSync,
  "confirmar-limpeza": confirmarLimpeza,
  "fechar-limpar":    fecharLimpar,
  "remover-linha":    el => removerLinha(el),
  "abrir-lote":       el => abrirLote(Number(el.dataset.id)),
  "excluir-lote":     el => excluirLote(Number(el.dataset.id)),
};
function onAcaoClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const fn = ACOES[el.dataset.action];
  if (fn) fn(el);
}

/* ---------- Início ---------- */
function init() {
  // Cabeçalhos das tabelas a partir da fonte única de colunas
  $("tabela").querySelector("thead").innerHTML = montarThead(true);
  $("detTabela").querySelector("thead").innerHTML = montarThead(false);

  // Eventos globais
  document.addEventListener("click", onAcaoClick);
  document.addEventListener("keydown", onKeydown);
  document.querySelectorAll(".aba").forEach(b => b.addEventListener("click", () => mostrarAba(b.dataset.aba)));
  $("arquivoBackup").addEventListener("change", e => abrirBackup(e.target));
  $("inpConfirmaApagar").addEventListener("input", validarApagar);

  // Salva pendências ao sair/ocultar a página (compensa o debounce)
  window.addEventListener("beforeunload", salvarAgora);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") salvarAgora(); });
  // Quando a internet voltar, reenvia se ficou algo pendente
  window.addEventListener("online", () => { if (syncPendente) sincronizar(); });

  // Recalcula ao editar o cabeçalho
  camposCabecalho.forEach(c => {
    $(c).addEventListener("input", calcular);
    $(c).addEventListener("change", () => { limitar($(c)); calcular(); });
  });

  carregar();
  renderLotes();
  statusSync(urlPlanilha ? "ok" : "off");

  // MÃO DUPLA: baixa o estado da nuvem antes de liberar os envios automáticos
  // (evita subir o exemplo de fábrica por cima dos dados bons que já estão na nuvem)
  sincronizarDaNuvem().finally(() => { _sincronizandoInicial = false; });
}
init();
