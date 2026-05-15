# Gobeaute · Pesquisa de Transportes

Sistema completo de coleta e visualização de dados logísticos.  
Dois links: um para o time preencher, um para o gestor acompanhar.

```
formulario.html  →  Apps Script Web App  →  Google Sheets  →  index.html (painel)
     ↑                      ↑                     ↑                  ↑
 time comercial         salva dados           fonte de dados     gestor / diretoria
```

---

## Passo a passo completo

### 1. Criar a planilha Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha em branco
2. Copie o **ID** da planilha da URL:
   ```
   https://docs.google.com/spreadsheets/d/  1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms  /edit
                                             ↑ esse trecho é o ID ↑
   ```
3. Guarde esse ID — você vai precisar dele no passo 4

---

### 2. Configurar o Apps Script

1. Na planilha, clique em **Extensões → Apps Script**
2. Apague o código existente e cole o conteúdo de `apps-script-webapp.gs`
3. No bloco `CFG` no topo do arquivo, altere o e-mail de alerta:
   ```javascript
   EMAIL_ALERTA: "seu-email@gobeaute.com.br",
   ```
4. Salve (Ctrl+S)

---

### 3. Publicar o Apps Script como Web App

1. Clique em **Implantar → Nova implantação**
2. Clique no ícone ⚙️ ao lado de "Tipo" e selecione **App da Web**
3. Configure:
   - **Executar como:** Eu (seu e-mail)
   - **Quem tem acesso:** Qualquer pessoa
4. Clique em **Implantar**
5. **Autorize** quando o Google pedir permissão
6. Copie a **URL** gerada (começa com `https://script.google.com/macros/s/...`)

> ⚠️ Importante: se você editar o código depois, clique em **Implantar → Gerenciar implantações** e crie uma **nova versão** para aplicar as mudanças.

---

### 4. Configurar os dois HTMLs

**`formulario.html`** — cole a URL do Apps Script:
```javascript
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

**`index.html`** — cole o ID da planilha:
```javascript
const SHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms";
```

---

### 5. Compartilhar a planilha (para o painel ler os dados)

1. Na planilha, clique em **Compartilhar** (canto superior direito)
2. Em "Acesso geral", selecione **Qualquer pessoa com o link → Leitor**
3. Clique em **Concluído**

> Isso permite que o painel leia os dados sem login. Apenas leitura — ninguém externo consegue editar.

---

### 6. Subir no GitHub Pages

```bash
# Clone ou crie o repositório
git init
git add formulario.html index.html
git commit -m "painel logístico gobeaute"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/gobeaute-transportes.git
git push -u origin main
```

Depois no GitHub:
1. **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `/ (root)`
4. **Save**

Em ~2 minutos os links estarão ativos:

| Link | Arquivo |
|------|---------|
| `https://SEU-USUARIO.github.io/gobeaute-transportes/formulario.html` | Formulário (time comercial) |
| `https://SEU-USUARIO.github.io/gobeaute-transportes/` | Painel (gestor) |

---

## Como funciona o fluxo completo

```
1. Vendedor acessa formulario.html e preenche
2. Ao clicar "Enviar pesquisa":
   └→ POST para o Apps Script Web App
       └→ Salva uma linha no Google Sheets por cada região preenchida
           └→ index.html busca os dados do Sheets a cada 60 segundos
               └→ Painel atualiza automaticamente
```

O painel busca os dados automaticamente a cada **60 segundos**.  
Há também um botão **"Atualizar"** para forçar a atualização na hora.

---

## Estrutura do repositório

```
gobeaute-transportes/
├── index.html              ← Painel do gestor (GitHub Pages serve como página principal)
├── formulario.html         ← Formulário do time comercial
├── apps-script-webapp.gs   ← Código do Apps Script (NÃO vai para o GitHub — só para o Sheets)
└── README.md               ← Este guia
```

> `apps-script-webapp.gs` não precisa ir para o GitHub. Ele fica no Apps Script da planilha.

---

## Solução de problemas

**O formulário enviou mas não aparece no painel**
- Verifique se o compartilhamento da planilha está como "Qualquer pessoa com o link → Leitor"
- Aguarde até 60 segundos (ciclo de atualização do painel)
- Clique em "Atualizar" no painel para forçar

**Erro ao enviar o formulário**
- Confirme que `SCRIPT_URL` está preenchido corretamente em `formulario.html`
- Abra a URL do Apps Script diretamente no browser — deve aparecer a página de status verde
- No Apps Script: **Execuções** para ver logs de erro

**Painel mostra dados de exemplo (demo)**
- Significa que `SHEET_ID` não está preenchido ou a planilha não está compartilhada
- O banner amarelo no topo indica isso

**Editei o Apps Script mas as mudanças não funcionam**
- Crie uma nova versão: **Implantar → Gerenciar implantações → ✏️ editar → Nova versão → Implantar**

---

## Configuração de alerta por e-mail

O Apps Script envia um e-mail automaticamente quando qualquer resposta tiver **gap ≥ 3 dias úteis**.  
Para alterar o limite, edite `GAP_CRITICO` no bloco `CFG` do Apps Script.

Para testar: na planilha, clique em **🚛 Gobeaute Transportes → Testar e-mail de alerta**.
