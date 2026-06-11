/* ===================================================================
   CÁLCULO PURO — recebe cabeçalho + linhas (dados crus) e devolve tudo
   calculado. Usado pela tela ao vivo E pelo detalhe de um lote salvo.

   Peso médio em GRAMAS.
   Biomassa (kg)        = saldo x peso(g) / 1000
   Ganho peso diário(g) = (peso - peso anterior) / dias
   Depende de util.js (num, fmt, dias) — carregado antes no index.html.
=================================================================== */
function computar(cab, linhasDados) {
  cab = cab || {};
  linhasDados = Array.isArray(linhasDados) ? linhasDados : [];
  const totalPeixes = num(cab.totalPeixes);
  const pesoInicial = num(cab.pesoInicial); // gramas
  const area        = num(cab.area);
  const dataAloj    = cab.dataAloj || "";

  const biomassaInicial = totalPeixes * pesoInicial / 1000; // kg

  let pesoAnt = pesoInicial;
  let bioAnt  = biomassaInicial;
  let dataAnt = dataAloj;
  let prevDataRow = dataAloj;
  let racaoAcum = 0;
  let ultSaldo = totalPeixes;
  const pts = [];
  const linhas = [];

  linhasDados.forEach(d => {
    const data  = d.data || "";
    const saldo = num(d.saldo);
    const peso  = num(d.peso); // gramas
    const racao = num(d.racao);

    const temPeso = peso > 0;
    const nd = dias(dataAnt, data);

    const gpd    = (temPeso && nd > 0) ? (peso - pesoAnt) / nd : 0;
    const bio    = saldo * peso / 1000;
    const gbio   = bio - bioAnt;            // período (1ª linha usa biomassa inicial)
    const gbioac = bio - biomassaInicial;   // acumulado
    racaoAcum += racao;
    const convp  = gbio   > 0 ? racao     / gbio   : 0;
    const convac = gbioac > 0 ? racaoAcum / gbioac : 0;

    const foraOrdem = !!(data && prevDataRow && (new Date(data) <= new Date(prevDataRow)));

    linhas.push({
      data, saldo: d.saldo, cap: d.cap, peso: d.peso, racao: d.racao,
      gpd:    temPeso ? fmt(gpd, 2) : "—",
      bio:    bio > 0 ? fmt(bio, 0) : "—",
      gbio:   bio > 0 ? fmt(gbio, 0) : "—",
      gbioac: bio > 0 ? fmt(gbioac, 0) : "—",
      convp:  convp > 0 ? fmt(convp, 2) : "—",
      racac:  racaoAcum > 0 ? fmt(racaoAcum, 0) : "—",
      convac: convac > 0 ? fmt(convac, 2) : "—",
      flags: {
        dataAlerta: foraOrdem,
        pesoAviso:  temPeso && peso < pesoAnt,
        gbioAlerta: bio > 0 && gbio < 0,
        convpAviso: convp > 2.5,
      },
    });

    if (saldo > 0) ultSaldo = saldo;
    if (temPeso) {
      pts.push({ data, peso, bio, gbioac, gpd, convp, convac });
      pesoAnt = peso; bioAnt = bio; dataAnt = data || dataAnt;
    }
    prevDataRow = data || prevDataRow;
  });

  return { totalPeixes, pesoInicial, area, dataAloj, biomassaInicial, racaoAcum, ultSaldo, pts, linhas };
}
