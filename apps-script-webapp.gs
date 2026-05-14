// ═══════════════════════════════════════════════════════════════════════
//  GOBEAUTE · TRANSPORTES — Apps Script Web App
//
//  COMO FAZER O DEPLOY:
//  1. No Google Sheets: Extensões → Apps Script → cole este código
//  2. Clique em "Implantar" → "Nova implantação"
//  3. Tipo: Web App
//     Executar como: Eu
//     Acesso: Qualquer pessoa
//  4. Autorize quando solicitado
//  5. Copie a URL gerada → cole em SCRIPT_URL no formulario.html
//
//  RESULTADO: será criada automaticamente uma aba "Benchmark" na planilha.
//  Cole o ID da planilha em SHEET_ID no index.html (painel).
// ═══════════════════════════════════════════════════════════════════════

const CFG = {
  ABA_BENCHMARK: "Benchmark",                     // aba principal — painel lê daqui
  ABA_LOG:       "Log Completo",                  // backup de cada envio
};

const REGIAO_MAP = {
  AC:"Norte",AL:"Nordeste",AM:"Norte",AP:"Norte",BA:"Nordeste",CE:"Nordeste",
  DF:"Centro-Oeste",ES:"Sudeste",GO:"Centro-Oeste",MA:"Nordeste",MG:"Sudeste",
  MS:"Centro-Oeste",MT:"Centro-Oeste",PA:"Norte",PB:"Nordeste",PE:"Nordeste",
  PI:"Nordeste",PR:"Sul",RJ:"Sudeste",RN:"Nordeste",RO:"Norte",RR:"Norte",
  RS:"Sul",SC:"Sul",SE:"Nordeste",SP:"Sudeste",TO:"Norte",
};

// ── Cabeçalhos exatos — devem coincidir com parseRow() no index.html ──
const HEADERS = [
  "Timestamp","Vendedor","UF","Regiao","Marca","CD Saida",
  "Prazo Gobeaute","Concorrente","Prazo Concorrente","Gap","Status",
  "Urgencia","Nota","Transportadoras","Dores","Categorias",
  "Frequencia","Deteccao","Calculo Prazo","Risco","Valor Risco","CD Concorrente"
];

// ════════════════════════════════════════════════════════════════════════
// doGet — status page quando alguém abre a URL no browser
// ════════════════════════════════════════════════════════════════════════
function doGet() {
  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:sans-serif;background:#0C0D0F;color:#F0EDE8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .box{text-align:center}.h1{font-size:26px;color:#C9A84C;margin-bottom:8px}p{color:#7A7880}
    .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#52B788;margin-right:6px}</style></head>
    <body><div class="box"><div class="h1">Gobeaute · Transportes</div>
    <p><span class="dot"></span>Web App ativa. Esta URL é o endpoint do formulário.</p></div></body></html>`);
}

// ════════════════════════════════════════════════════════════════════════
// doPost — recebe o JSON enviado pelo formulario.html
// ════════════════════════════════════════════════════════════════════════
function doPost(e) {
  const out = ContentService.createTextOutput;
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    gravarBenchmarks(ss, data);
    gravarLog(ss, e.postData.contents);

    return out(JSON.stringify({ ok: true, ts: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log("❌ doPost: " + err.message);
    return out(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ════════════════════════════════════════════════════════════════════════
// BENCHMARK — uma linha por região preenchida no formulário
// Todos os campos da pessoa são repetidos em cada linha (desnormalizado)
// para que o painel leia de uma única aba.
// ════════════════════════════════════════════════════════════════════════
function gravarBenchmarks(ss, data) {
  const aba = getOrCreate(ss, CFG.ABA_BENCHMARK);

  // Cria cabeçalho na primeira vez
  if (aba.getLastRow() === 0) {
    aba.appendRow(HEADERS);
    const hRange = aba.getRange(1, 1, 1, HEADERS.length);
    hRange.setFontWeight("bold")
          .setBackground("#1A1C20")
          .setFontColor("#C9A84C")
          .setFontSize(11);
    aba.setFrozenRows(1);
    // Largura automática
    HEADERS.forEach((_, i) => aba.setColumnWidth(i + 1, i < 3 ? 120 : 140));
  }

  const ts       = data.timestamp || new Date().toISOString();
  const regioes  = data.regioes || [];
  const cats     = categorizarDores(data.dores || "");
  const risco    = (data.risco || "").includes("Sim") ? "Sim" : "Não";

  regioes.forEach(r => {
    const gb    = Number(r.prazoGB) || 0;
    const pc    = Number(r.prazoPC) || 0;
    const gap   = gb - pc;
    const regiao = REGIAO_MAP[r.uf] || "Outra";
    const status = gap >= 3 ? "Crítico" : gap >= 1 ? "Alerta" : "OK";

    const linha = [
      ts,
      data.nome           || "",
      r.uf                || "",
      regiao,
      r.marca             || "",
      r.cdSaida           || "",
      gb,
      r.conc              || "",
      pc,
      gap,
      status,
      data.urgencia       || "",
      Number(data.nota)   || 0,
      data.transportadoras|| "",
      data.dores          || "",
      cats,
      data.frequencia     || "",
      data.deteccao       || "",
      data.calcPrazo      || "",
      risco,
      Number(data.valorRisco) || 0,
      r.cdConc            || "",
    ];

    aba.appendRow(linha);

    // Formatação condicional por gap
    const row = aba.getLastRow();
    const bg  = gap >= 3 ? "#2D1515" : gap >= 1 ? "#2A2010" : "#0F1F17";
    aba.getRange(row, 1, 1, HEADERS.length).setBackground(bg);
  });

  SpreadsheetApp.flush();
}

// ════════════════════════════════════════════════════════════════════════
// LOG — backup do JSON bruto de cada envio
// ════════════════════════════════════════════════════════════════════════
function gravarLog(ss, rawJson) {
  const aba = getOrCreate(ss, CFG.ABA_LOG);
  if (aba.getLastRow() === 0) {
    aba.appendRow(["Recebido em", "JSON"]);
    aba.getRange(1,1,1,2).setFontWeight("bold").setBackground("#1A1C20").setFontColor("#C9A84C");
    aba.setFrozenRows(1);
    aba.setColumnWidth(2, 600);
  }
  aba.appendRow([new Date().toLocaleString("pt-BR"), rawJson]);
}

// ════════════════════════════════════════════════════════════════════════
// CATEGORIZAÇÃO DE DORES
// ════════════════════════════════════════════════════════════════════════
function categorizarDores(texto) {
  const t = texto.toLowerCase();
  const mapa = {
    rastreio:      ["rastreio","rastrear","tracking","localizar","sumiço","sumiu","sem rastreio"],
    prazo_alto:    ["prazo alto","demora","demorado","lento","dias úteis","muitos dias"],
    prazo_sistema: ["sistema","erp","tabela","prazo informado","prazo diferente","prometeu"],
    comunicacao:   ["comunicação","aviso","sem notificação","sem retorno","não informa"],
    avaria:        ["avaria","avariado","danificado","extravio","extraviado","perdido","embalagem"],
    atendimento:   ["atendimento","suporte","sac","não atende","não responde"],
    cobertura:     ["cobertura","interior","não chega","não entrega","sem entrega"],
  };
  const cats = Object.entries(mapa)
    .filter(([, kws]) => kws.some(kw => t.includes(kw)))
    .map(([cat]) => cat);
  return cats.length ? cats.join(", ") : "outros";
}


// ════════════════════════════════════════════════════════════════════════
// MENU
// ════════════════════════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚛 Gobeaute Transportes")
    .addItem("📊 Ver resumo", "verResumo")
    .addItem("📧 Testar e-mail de alerta", "testarAlerta")
    .addToUi();
}

function verResumo() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const bench = ss.getSheetByName(CFG.ABA_BENCHMARK);
  const n     = bench ? Math.max(0, bench.getLastRow() - 1) : 0;
  SpreadsheetApp.getUi().alert(`📊 Benchmark: ${n} linhas\n\nConfigure o SHEET_ID no index.html (painel) para visualizar os dados.`);
}


function getOrCreate(ss, nome) {
  return ss.getSheetByName(nome) || ss.insertSheet(nome);
}
