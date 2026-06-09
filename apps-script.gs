function doPost(e) {
  var resposta = { ok: false };
  try {
    var dados  = JSON.parse(e.postData.contents);

    // ---- Senha (token): só grava se o app enviar o código certo ----
    // DEVE ser idêntico ao TOKEN_PLANILHA do script.js do app.
    var TOKEN = 'cpcl_8Kq3Zr9TmW2yF7nLpX5';
    if (dados.token !== TOKEN) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, erro: 'Token inválido' }))
        .setMimeType(ContentService.MimeType.JSON);
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

// Permite testar a URL pelo navegador (deve mostrar uma mensagem de "ativo")
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: 'Web App da Biometria ativo' }))
    .setMimeType(ContentService.MimeType.JSON);
}
