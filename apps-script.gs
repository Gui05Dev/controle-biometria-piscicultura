/**
 * ============================================================
 *  COPACOL — CONTROLE DE BIOMETRIA
 *  Integração: App  ──►  Google Planilhas  (mão única)
 * ============================================================
 *
 *  COMO INSTALAR (faça uma vez, leva ~5 minutos):
 *
 *  1) Acesse https://sheets.google.com com a conta
 *     Guilhermetoigo123@gmail.com e crie uma planilha em branco.
 *     Dê um nome, ex.: "Biometria Copacol".
 *
 *  2) No menu da planilha: Extensões → Apps Script.
 *     Apague qualquer código que aparecer e COLE TODO este arquivo.
 *     Clique no disquete 💾 (Salvar).
 *
 *  3) Botão azul "Implantar" (canto superior direito) →
 *     "Nova implantação" → engrenagem ⚙ → escolha "App da Web".
 *        • Descrição:        Biometria
 *        • Executar como:    Eu (seu e-mail)
 *        • Quem pode acessar: QUALQUER PESSOA   ← importante!
 *     Clique "Implantar". Autorize o acesso quando pedir
 *     (escolha sua conta → "Avançado" → "Acessar (não seguro)" →
 *      "Permitir"). Isso é normal, é o seu próprio script.
 *
 *  4) Copie a "URL do app da Web" (termina em /exec).
 *     Volte ao app de biometria, toque no botão de sincronização
 *     no topo, cole essa URL e salve. Pronto!
 *
 *  Depois disso, tudo que você digitar no app é copiado
 *  automaticamente para a aba "Tanque XX" da sua planilha.
 * ============================================================
 */

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
