/* ===================================================================
   GRÁFICO de linhas em SVG (sem bibliotecas)
   Depende de util.js ($, fmt, fmtDataCurta) — carregado antes no index.html.
=================================================================== */
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

/* Desenha os 4 gráficos de um conjunto de pontos.
   pref = "g" (tela ao vivo) ou "gd" (detalhe do lote) */
function desenharGraficos(pref, pts) {
  grafico($(`${pref}-peso`), [{ cor: "#1289b8", dados: pts.map(p => ({ x: p.data, y: p.peso })) }], { casas: 0 });
  grafico($(`${pref}-bio`),  [{ cor: "#1f8a5a", dados: pts.map(p => ({ x: p.data, y: p.bio })) }],  { casas: 0 });
  grafico($(`${pref}-conv`), [
    { cor: "#1289b8", dados: pts.filter(p => p.convac > 0).map(p => ({ x: p.data, y: p.convac })) },
    { cor: "#e0982a", dados: pts.filter(p => p.convp  > 0).map(p => ({ x: p.data, y: p.convp  })) },
  ], { casas: 2 });
  grafico($(`${pref}-gpd`),  [{ cor: "#7a55c8", dados: pts.map(p => ({ x: p.data, y: p.gpd })) }],  { casas: 1 });
}
