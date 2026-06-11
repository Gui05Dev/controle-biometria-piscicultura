// Senha (token): DEVE ser idêntico ao TOKEN_PLANILHA do app.js do app.
var TOKEN = 'cpcl_8Kq3Zr9TmW2yF7nLpX5';
// Chave onde guardamos o "estado cru" do lote em andamento (mão dupla)
var CHAVE_ESTADO = 'estado_atual';

function doPost(e) {
  var resposta = { ok: false };
  try {
    var dados = JSON.parse(e.postData.contents);

    // ---- só grava se o app enviar o código certo ----
    if (dados.token !== TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, erro: 'Token inválido' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ---- MÃO DUPLA: guarda o estado cru p/ outros aparelhos baixarem ----
    if (dados.estado) {
      try {
        PropertiesService.getScriptProperties().setProperty(
          CHAVE_ESTADO,
          JSON.stringify({ estado: dados.estado, ts: Number(dados.estadoTs) || 0 })
        );
      } catch (e2) { /* estado grande demais: ignora, a planilha já foi salva */ }
    }

    var nomeAba = (dados.aba || 'Biometria').toString().substring(0, 90);
    var matriz  = dados.matriz || [];

    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var aba = ss.getSheetByName(nomeAba);
    if (!aba) aba = ss.insertSheet(nomeAba);

    aba.clearContents();

    if (matriz.length) {
      // Garante que todas as linhas tenham o mesmo número de colunas
      var maxCol = 0;
      matriz.forEach(function (l) { if (l.length > maxCol) maxCol = l.length; });
      matriz = matriz.map(function (l) {
        var c = l.slice();
        while (c.length < maxCol) c.push('');
        return c;
      });

      aba.getRange(1, 1, matriz.length, maxCol).setValues(matriz);

      // Um toque de formatação: título e cabeçalho da tabela em negrito
      aba.getRange(1, 1).setFontWeight('bold').setFontSize(13);
      if (matriz.length >= 13) aba.getRange(13, 1, 1, maxCol).setFontWeight('bold');
      aba.autoResizeColumns(1, maxCol);
    }

    resposta.ok = true;
    resposta.linhas = matriz.length;
  } catch (err) {
    resposta.erro = String(err);
  }

  return ContentService
    .createTextOutput(JSON.stringify(resposta))
    .setMimeType(ContentService.MimeType.JSON);
}

// Devolve o estado mais recente (mão dupla) quando o app pede com ?token=...
// Sem token, só confirma que o Web App está ativo (testar pelo navegador).
function doGet(e) {
  var out = { ok: true, msg: 'Web App da Biometria ativo' };
  if (e && e.parameter && e.parameter.token === TOKEN) {
    var saved = PropertiesService.getScriptProperties().getProperty(CHAVE_ESTADO);
    if (saved) {
      try {
        var p = JSON.parse(saved);
        out.estado = p.estado;
        out.estadoTs = p.ts || 0;
      } catch (x) { /* ignora estado corrompido */ }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
