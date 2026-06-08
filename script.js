"use strict";

const CHAVE = "copacol_biometria_v3";
const camposCabecalho = ["produtor","tanque","dataAloj","area","totalPeixes","pesoInicial","mortosAloj"];

/* ---------- Dados iniciais (transcritos do formulário) ---------- */
const SEED = {
  cab: {
    produtor: "Juan Tiago",
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

/* ---------- Utilidades ---------- */
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; };
const fmt = (v, casas = 2) => (isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const $ = id => document.getElementById(id);
const dias = (de, ate) => {
  if (!de || !ate) return 0;
  const d = (new Date(ate) - new Date(de)) / 86400000;
  return d > 0 ? d : 0;
};
// Data de hoje no formato AAAA-MM-DD (fuso local)
function hoje() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/* ---------- Criar linha ---------- */
function criarLinha(d = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="data in-data" type="date" min="2000-01-01" max="2100-12-31" value="${d.data ?? ""}"></td>
    <td><input class="in-saldo" type="number" min="0" max="100000000" step="1"    value="${d.saldo ?? ""}"></td>
    <td><input class="in-cap"   type="number" min="0" max="1000000"   step="1"    value="${d.cap ?? ""}"></td>
    <td><input class="in-peso"  type="number" min="0" max="50000"     step="any"  value="${d.peso ?? ""}"></td>
    <td class="calc out-gpd">—</td>
    <td class="calc out-bio">—</td>
    <td class="calc out-gbio">—</td>
    <td class="calc out-gbioac">—</td>
    <td><input class="in-racao" type="number" min="0" max="100000000" step="any" value="${d.racao ?? ""}"></td>
    <td class="calc calc-racao out-convp">—</td>
    <td class="calc calc-racao out-racac">—</td>
    <td class="calc calc-racao out-convac">—</td>
    <td><button class="linha-x" onclick="removerLinha(this)">✕</button></td>
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

/* Trava o valor dentro do mínimo/máximo definido no campo */
function limitar(input) {
  if (input.type !== "number" || input.value === "") return;
  let v = parseFloat(input.value);
  if (isNaN(v)) { input.value = ""; return; }
  const min = input.min !== "" ? parseFloat(input.min) : -Infinity;
  const max = input.max !== "" ? parseFloat(input.max) : Infinity;
  if (v < min) v = min;
  if (v > max) v = max;
  input.value = v;
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
// Nova biometria entra com a data de hoje e o saldo de peixes da última linha
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

/* ---------- Cálculos ----------
   Peso médio em GRAMAS.
   Biomassa (kg)        = saldo x peso(g) / 1000
   Ganho peso diário(g) = (peso - peso anterior) / dias
*/
function calcular() {
  const totalPeixes = num($("totalPeixes").value);
  const pesoInicial = num($("pesoInicial").value); // gramas
  const area        = num($("area").value);
  const dataAloj    = $("dataAloj").value;

  const biomassaInicial = totalPeixes * pesoInicial / 1000; // kg
  $("biomassaInicial").value = fmt(biomassaInicial, 2) + " kg";
  $("peixesM2").value = area > 0 ? fmt(totalPeixes / area, 2) : "—";

  const linhas = [...$("corpo").querySelectorAll("tr")];

  let pesoAnt = pesoInicial;
  let bioAnt  = biomassaInicial;
  let dataAnt = dataAloj;
  let prevDataRow = dataAloj; // data da linha anterior (para checar ordem)
  let racaoAcum = 0;
  let ultSaldo = totalPeixes;
  const pts = []; // série para os gráficos (somente linhas com pesagem)

  linhas.forEach(tr => {
    const data  = tr.querySelector(".in-data").value;
    const saldo = num(tr.querySelector(".in-saldo").value);
    const peso  = num(tr.querySelector(".in-peso").value); // gramas
    const racao = num(tr.querySelector(".in-racao").value);

    const temPeso = peso > 0;
    const nd = dias(dataAnt, data);

    const gpd    = (temPeso && nd > 0) ? (peso - pesoAnt) / nd : 0;
    const bio    = saldo * peso / 1000;
    const gbio   = bio - bioAnt;            // período (1ª linha usa biomassa inicial)
    const gbioac = bio - biomassaInicial;   // acumulado
    racaoAcum += racao;
    const convp  = gbio   > 0 ? racao     / gbio   : 0;
    const convac = gbioac > 0 ? racaoAcum / gbioac : 0;

    tr.querySelector(".out-gpd").textContent    = temPeso ? fmt(gpd, 2) : "—";
    tr.querySelector(".out-bio").textContent    = bio > 0 ? fmt(bio, 0) : "—";
    tr.querySelector(".out-gbio").textContent   = bio > 0 ? fmt(gbio, 0) : "—";
    tr.querySelector(".out-gbioac").textContent = bio > 0 ? fmt(gbioac, 0) : "—";
    tr.querySelector(".out-convp").textContent  = convp  > 0 ? fmt(convp, 2) : "—";
    tr.querySelector(".out-racac").textContent  = racaoAcum > 0 ? fmt(racaoAcum, 0) : "—";
    tr.querySelector(".out-convac").textContent = convac > 0 ? fmt(convac, 2) : "—";

    /* ---- Alertas inteligentes ---- */
    const foraOrdem = data && prevDataRow && (new Date(data) <= new Date(prevDataRow));
    marcar(tr.querySelector(".in-data"), foraOrdem, "Data deve ser posterior à biometria anterior", "alerta");
    marcar(tr.querySelector(".in-peso"), temPeso && peso < pesoAnt, "Peso menor que a biometria anterior — confira", "aviso");
    marcar(tr.querySelector(".out-gbio"), bio > 0 && gbio < 0, "A biomassa caiu em relação ao período anterior", "alerta");
    marcar(tr.querySelector(".out-convp"), convp > 2.5, "Conversão do período muito alta — verifique a ração e o peso", "aviso");

    if (saldo > 0) ultSaldo = saldo;
    if (temPeso) {
      pts.push({ data, peso, bio, gbioac, gpd, convp, convac });
      pesoAnt = peso; bioAnt = bio; dataAnt = data || dataAnt;
    }
    prevDataRow = data || prevDataRow;
  });

  atualizarPainel(pts, { totalPeixes, ultSaldo, racaoAcum, dataAloj });
  salvar();
}

/* ---------- Painel: indicadores + gráficos ---------- */
function atualizarPainel(pts, ctx) {
  const ult = pts[pts.length - 1];
  const diasCult = ult ? dias(ctx.dataAloj, ult.data) : 0;

  $("iDias").textContent   = ult ? fmt(diasCult, 0) + " dias" : "—";
  $("iPeso").textContent   = ult ? fmt(ult.peso, 0) + " g" : "—";
  $("iBio").textContent    = ult ? fmt(ult.bio, 0) + " kg" : "—";
  $("iGanho").textContent  = ult ? fmt(ult.gbioac, 0) + " kg" : "—";
  $("iRacao").textContent  = ctx.racaoAcum > 0 ? fmt(ctx.racaoAcum, 0) + " kg" : "—";
  $("iConv").textContent   = (ult && ult.convac > 0) ? fmt(ult.convac, 2) : "—";

  grafico($("g-peso"), [{ cor: "#1289b8", dados: pts.map(p => ({ x: p.data, y: p.peso })) }], { casas: 0 });
  grafico($("g-bio"),  [{ cor: "#1f8a5a", dados: pts.map(p => ({ x: p.data, y: p.bio })) }],  { casas: 0 });
  grafico($("g-conv"), [
    { cor: "#1289b8", dados: pts.filter(p => p.convac > 0).map(p => ({ x: p.data, y: p.convac })) },
    { cor: "#e0982a", dados: pts.filter(p => p.convp  > 0).map(p => ({ x: p.data, y: p.convp  })) },
  ], { casas: 2 });
  grafico($("g-gpd"),  [{ cor: "#7a55c8", dados: pts.map(p => ({ x: p.data, y: p.gpd })) }],  { casas: 1 });
}

/* ---------- Gráfico de linhas em SVG (sem bibliotecas) ---------- */
function fmtDataCurta(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
function grafico(el, series, opts = {}) {
  if (!el) return;
  const base = series.find(s => s.dados.length >= 2);
  if (!base) { el.innerHTML = '<div class="sem-dados">Adicione pelo menos 2 biometrias com peso</div>'; return; }

  const W = 620, H = 320, pl = 56, pr = 22, ptop = 26, pb = 52;
  const iw = W - pl - pr, ih = H - ptop - pb;
  const umaSerie = series.filter(s => s.dados.length).length === 1;

  const ys = [];
  series.forEach(s => s.dados.forEach(p => ys.push(p.y)));
  let ymin = Math.min(...ys), ymax = Math.max(...ys);
  if (ymin === ymax) ymax = ymin + 1;
  const folga = (ymax - ymin) * 0.15;
  ymin = Math.max(0, ymin - folga);
  ymax = ymax + folga;

  const n = base.dados.length;
  const xAt = i => pl + (n === 1 ? iw / 2 : iw * i / (n - 1));
  const yAt = v => ptop + ih - ((v - ymin) / (ymax - ymin)) * ih;
  const baseY = yAt(ymin);

  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="grafico">`;

  // Linhas de grade + rótulos do eixo Y
  const div = 4;
  for (let g = 0; g <= div; g++) {
    const val = ymin + (ymax - ymin) * g / div;
    const y = yAt(val);
    svg += `<line x1="${pl}" y1="${y}" x2="${W - pr}" y2="${y}" class="grade"/>`;
    svg += `<text x="${pl - 8}" y="${y + 4}" class="rotuloY">${fmt(val, opts.casas ?? 0)}</text>`;
  }

  // Rótulos do eixo X (datas)
  base.dados.forEach((p, i) => {
    const x = xAt(i);
    svg += `<text x="${x + 4}" y="${H - pb + 22}" class="rotuloX" transform="rotate(-40 ${x} ${H - pb + 22})">${fmtDataCurta(p.x)}</text>`;
  });

  // Séries
  series.forEach(s => {
    if (s.dados.length < 1) return;
    const coords = s.dados.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`);

    // Área preenchida (somente quando há uma única série, para não poluir)
    if (umaSerie) {
      const area = `${xAt(0).toFixed(1)},${baseY.toFixed(1)} ${coords.join(" ")} ${xAt(s.dados.length - 1).toFixed(1)},${baseY.toFixed(1)}`;
      svg += `<polygon points="${area}" fill="${s.cor}" fill-opacity="0.10"/>`;
    }

    svg += `<polyline points="${coords.join(" ")}" fill="none" stroke="${s.cor}" stroke-width="3" class="linha"/>`;

    s.dados.forEach((p, i) => {
      const x = xAt(i), y = yAt(p.y);
      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#fff" stroke="${s.cor}" stroke-width="2.5"/>`;
      // Área de hover (maior e invisível) com tooltip: data + valor exato
      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="transparent" class="ponto-hover"><title>${fmtDataCurta(p.x)} — ${fmt(p.y, opts.casas ?? 0)}</title></circle>`;
      // Rótulo de valor (só na série única, para manter legível)
      if (umaSerie) {
        svg += `<text x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" class="valorPonto" fill="${s.cor}">${fmt(p.y, opts.casas ?? 0)}</text>`;
      }
    });
  });

  svg += "</svg>";
  el.innerHTML = svg;
}

/* ---------- Troca de abas ---------- */
function mostrarAba(nome) {
  document.querySelectorAll(".aba-conteudo").forEach(s => s.classList.remove("ativa"));
  document.querySelectorAll(".aba").forEach(b => b.classList.remove("ativa"));
  $("aba-" + nome).classList.add("ativa");
  document.querySelector(`.aba[data-aba="${nome}"]`).classList.add("ativa");
}

/* ---------- Persistência ---------- */
function coletarEstado() {
  const e = { cab: {}, linhas: [] };
  camposCabecalho.forEach(c => e.cab[c] = $(c).value);
  $("corpo").querySelectorAll("tr").forEach(tr => e.linhas.push({
    data:  tr.querySelector(".in-data").value,
    saldo: tr.querySelector(".in-saldo").value,
    cap:   tr.querySelector(".in-cap").value,
    peso:  tr.querySelector(".in-peso").value,
    racao: tr.querySelector(".in-racao").value,
  }));
  return e;
}
function aplicarEstado(e) {
  if (!e || typeof e !== "object" || !e.cab) { alert("Arquivo de backup inválido."); return false; }
  camposCabecalho.forEach(c => { $(c).value = e.cab[c] ?? ""; });
  $("corpo").innerHTML = "";
  (e.linhas || []).forEach(d => $("corpo").appendChild(criarLinha(d)));
  if (!$("corpo").children.length) for (let i = 0; i < 5; i++) $("corpo").appendChild(criarLinha());
  calcular();
  return true;
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(coletarEstado())); } catch (x) {}
  agendarSync();
}
function carregar() {
  let e = null;
  try { e = JSON.parse(localStorage.getItem(CHAVE)); } catch (x) {}
  if (!e) e = SEED; // primeira abertura: carrega os dados do formulário
  camposCabecalho.forEach(c => { if (e.cab[c] != null) $(c).value = e.cab[c]; });
  (e.linhas || []).forEach(d => $("corpo").appendChild(criarLinha(d)));
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
/* Abre o modal de confirmação (dupla checagem antes de apagar) */
function limparTudo() {
  $("inpConfirmaApagar").value = "";
  $("btnConfirmaApagar").disabled = true;
  $("modalLimpar").classList.add("show");
  $("inpConfirmaApagar").focus();
}
function fecharLimpar() { $("modalLimpar").classList.remove("show"); }
/* Só libera o botão vermelho quando a pessoa digita APAGAR */
function validarApagar() {
  const ok = $("inpConfirmaApagar").value.trim().toUpperCase() === "APAGAR";
  $("btnConfirmaApagar").disabled = !ok;
}
/* Executa a limpeza de fato */
function confirmarLimpeza() {
  if ($("inpConfirmaApagar").value.trim().toUpperCase() !== "APAGAR") return;
  localStorage.removeItem(CHAVE);
  camposCabecalho.forEach(c => $(c).value = "");
  $("corpo").innerHTML = "";
  for (let i = 0; i < 5; i++) $("corpo").appendChild(criarLinha());
  calcular();
  fecharLimpar();
}

/* ---------- Exportar CSV ---------- */
function exportarCSV() {
  const sep = ";", L = [];
  L.push(["Copacol - CONTROLE DE BIOMETRIA"]);
  L.push(["Produtor", $("produtor").value]);
  L.push(["No Tanque", $("tanque").value]);
  L.push(["Data Alojamento", $("dataAloj").value]);
  L.push(["Area (m2)", $("area").value]);
  L.push(["No Total Peixes", $("totalPeixes").value]);
  L.push(["Peso Medio Inicial (g)", $("pesoInicial").value]);
  L.push(["Biomassa (kg)", $("biomassaInicial").value]);
  L.push(["Peixes/m2", $("peixesM2").value]);
  L.push(["Mortos Aloj.", $("mortosAloj").value]);
  L.push([]);
  L.push(["Data","Saldo de Peixes","Peixes Capturados","Peso Medio (g)","Ganho peso diario (g)",
    "Biomassa Total (kg)","Ganho de Biomassa (kg)","Ganho Biomassa Acum (kg)",
    "Racao do Periodo (kg)","Conversao Periodo","Racao Acum (kg)","Conversao Acum"]);
  $("corpo").querySelectorAll("tr").forEach(tr => {
    const t = s => tr.querySelector(s).textContent;
    const v = s => tr.querySelector(s).value;
    L.push([v(".in-data"), v(".in-saldo"), v(".in-cap"), v(".in-peso"), t(".out-gpd"),
      t(".out-bio"), t(".out-gbio"), t(".out-gbioac"),
      v(".in-racao"), t(".out-convp"), t(".out-racac"), t(".out-convac")]);
  });
  const csv = "﻿" + L.map(l => l.map(c => `"${(c ?? "").toString().replace(/"/g,'""')}"`).join(sep)).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `biometria_tanque_${($("tanque").value || "01").replace(/\s+/g,"_")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ===================================================================
   SINCRONIZAÇÃO COM GOOGLE PLANILHAS  (mão única: app -> planilha)
=================================================================== */
const CHAVE_URL = "copacol_sheets_url";
// URL padrão da planilha (já conecta sozinho em qualquer aparelho).
// Pode ser trocada/desconectada pelo chip de sincronização no topo.
const URL_PADRAO = "https://script.google.com/macros/s/AKfycbyLMKzEpIiiDK4nPM5FJlpuTC_5kMxodtfRz3sBkiAFCXzV7mHDaHGX083BgPp6GOB-/exec";
let urlPlanilha = localStorage.getItem(CHAVE_URL) || URL_PADRAO;
let syncTimer   = null;
let syncPendente = false;

/* Atualiza o "chip" de status no cabeçalho */
function statusSync(estado, texto) {
  const chip = $("syncChip");
  if (!chip) return;
  chip.className = "sync-chip " + estado;
  const rotulos = {
    off:      "🔌 Conectar planilha",
    ok:       "🟢 Sincronizado",
    enviando: "🟡 Enviando…",
    erro:     "🔴 Sem conexão",
  };
  chip.textContent = texto || rotulos[estado] || rotulos.off;
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
  L.push(["Data","Saldo de Peixes","Peixes Capturados","Peso Médio (g)","Ganho peso diário (g)",
    "Biomassa Total (kg)","Ganho de Biomassa (kg)","Ganho Biomassa Acum (kg)",
    "Ração do Período (kg)","Conversão Período","Ração Acum (kg)","Conversão Acum"]);
  $("corpo").querySelectorAll("tr").forEach(tr => {
    const t = s => tr.querySelector(s).textContent;
    const v = s => tr.querySelector(s).value;
    L.push([
      v(".in-data"), numOuTxt(v(".in-saldo")), numOuTxt(v(".in-cap")), numOuTxt(v(".in-peso")),
      t(".out-gpd"), t(".out-bio"), t(".out-gbio"), t(".out-gbioac"),
      numOuTxt(v(".in-racao")), t(".out-convp"), t(".out-racac"), t(".out-convac"),
    ]);
  });
  return L;
}

/* Agenda o envio com atraso (debounce) — evita mandar a cada tecla */
function agendarSync() {
  if (!urlPlanilha) return;          // só sincroniza se já configurou a URL
  syncPendente = true;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(sincronizar, 1500);
}

/* Envia o estado atual para a planilha */
async function sincronizar() {
  if (!urlPlanilha) { statusSync("off"); return; }
  statusSync("enviando");
  try {
    const corpo = JSON.stringify({
      aba: "Tanque " + ($("tanque").value || "01"),
      matriz: matrizParaPlanilha(),
    });
    // body como string => Content-Type text/plain => evita preflight de CORS
    const r = await fetch(urlPlanilha, { method: "POST", body: corpo });
    const j = await r.json();
    if (j && j.ok) { syncPendente = false; statusSync("ok"); }
    else throw new Error((j && j.erro) || "resposta inválida");
  } catch (e) {
    statusSync("erro");
    // tenta novamente em 15s (ex.: voltou a internet)
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sincronizar, 15000);
  }
}

/* ---------- Telinha de configuração ---------- */
function abrirConfigSync() {
  $("inpSyncUrl").value = urlPlanilha;
  $("syncMsg").textContent = "";
  $("modalSync").classList.add("show");
}
function fecharConfigSync() { $("modalSync").classList.remove("show"); }

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
      body: JSON.stringify({ aba: "Teste", matriz: [["Teste de conexão", new Date().toLocaleString("pt-BR")]] }),
    });
    const j = await r.json();
    $("syncMsg").textContent = (j && j.ok)
      ? "✓ Funcionou! Veja a aba 'Teste' na sua planilha."
      : "Resposta inesperada: " + JSON.stringify(j);
  } catch (e) {
    $("syncMsg").textContent = "✗ Não conectou. Confira se publicou como 'Qualquer pessoa' e se a URL termina em /exec.";
  }
}

// Quando a internet voltar, reenvia se ficou algo pendente
window.addEventListener("online", () => { if (syncPendente) sincronizar(); });

/* ---------- Início ---------- */
camposCabecalho.forEach(c => {
  $(c).addEventListener("input", calcular);
  $(c).addEventListener("change", () => { limitar($(c)); calcular(); });
});
carregar();
statusSync(urlPlanilha ? "ok" : "off");
