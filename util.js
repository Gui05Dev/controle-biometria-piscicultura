/* ===================================================================
   UTILIDADES — funções puras e auxiliares (sem dependências)
=================================================================== */

/* Texto -> número (aceita vírgula decimal). Vazio/erro = 0 */
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; };

/* Número -> texto no formato pt-BR com casas decimais */
const fmt = (v, casas = 2) =>
  (isFinite(v) ? v : 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/* Atalho para document.getElementById */
const $ = id => document.getElementById(id);

/* Dias entre duas datas AAAA-MM-DD (0 se inválido ou negativo) */
const dias = (de, ate) => {
  if (!de || !ate) return 0;
  const d = (new Date(ate) - new Date(de)) / 86400000;
  return d > 0 ? d : 0;
};

/* Data de hoje no formato AAAA-MM-DD (fuso local) */
function hoje() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/* Escapa HTML — evita injeção de <script>/atributos ao montar innerHTML */
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Neutraliza injeção de fórmula no Google Sheets (= + - @ no início) */
const _formulaPerigo = /^[=+\-@\t\r]/;
function celulaSegura(v) {
  return (typeof v === "string" && _formulaPerigo.test(v)) ? "'" + v : v;
}

/* Notificação flutuante (toast). tipo: "ok" | "aviso" | "erro" */
let _toastTimer = null;
function notificar(msg, tipo = "ok") {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.className = "toast " + tipo + " show";
  t.textContent = msg;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = "toast " + tipo; }, 3200);
}

/* data AAAA-MM-DD -> DD/MM/AAAA */
function fmtBr(iso) {
  if (!iso) return "—";
  const p = String(iso).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

/* data AAAA-MM-DD -> DD/MM (rótulo curto do eixo X dos gráficos) */
function fmtDataCurta(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
