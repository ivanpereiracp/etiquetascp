# Plano de Implementação — Melhorias Zebra Image Tools

Escopo grande (7 módulos, ~25 funcionalidades). Para preservar tudo que já funciona (GRF, B&W, Raster, ZPL básico), proponho entregar em **6 fases incrementais**, cada uma testável isoladamente. Aprovação por fase recomendada.

---

## Fase 1 — Fundação (UI/UX, Tema, i18n)
**Módulo 1 completo**
- Painel de Configurações (`/settings` ou drawer lateral) com:
  - Cores primary/secondary (HSL) gravadas em `localStorage`, aplicadas via CSS vars em `index.css`
  - Seleção de fonte (Inter, Roboto, Poppins, JetBrains Mono)
  - Upload de logo do header e edição de título/subtítulo (branding white-label)
  - Cor de fundo da área de edição da etiqueta (preview background) — toggle claro/escuro/customizado
- i18n via `react-i18next` com PT, EN, ES (textos da UI extraídos para JSON)
- Seletor de idioma no header

## Fase 2 — Manipulação de Imagens e GRF
**Módulo 2 + parte do 3**
- **Galeria local** com IndexedDB (`idb` lib) — upload múltiplo, listar/excluir/reutilizar imagens
- **Rotação GRF** (0/90/180/270°) aplicada antes da conversão — o buffer rotacionado alimenta `convertToGRF` mantendo a correção anti-duplicação
- **Zoom independente** (preview e original) com slider 25–400% + botões +/−
- **Editor de imagem básico**: adicionar texto sobreposto, ajustar altura/largura de elementos (canvas-based, salva nova ImageData)
- Inputs de dimensão com unidade pixels/cm/mm (conversão @203 DPI)

## Fase 3 — Editor ZPL Avançado
**Módulo 3 (resto) + Módulo 4**
- Refatorar `ZPLLabelCreator` para canvas drag-and-drop:
  - Selecionar elemento (texto/caixa/linha/código de barras) → handles de redimensionar
  - Setas do teclado movem elemento selecionado em 1px (Shift = 10px)
  - Inputs numéricos de X/Y/W/H sincronizados
- Corrigir geração de código de barras: revisar comandos `^BC` (Code128), `^BE` (EAN-13), `^BQ` (QR), com flag de human-readable centralizado
- Renderização visual dos códigos de barras no preview usando `jsbarcode` + `qrcode`
- Nova aba **"Códigos de Barras"** standalone para geração avulsa (download PNG/SVG/ZPL)

## Fase 4 — Viewer ZPL + Labelary + I/O
**Módulo 5 + Módulo 6**
- Nova aba **"ZPL Viewer"**: textarea + botão "Gerar" → chama API pública Labelary (`api.labelary.com/v1/printers/8dpmm/labels/...`) e exibe imagem
- Botão "Abrir no Labelary.com" com ZPL pré-carregado via URL
- Rotação da pré-visualização (0/90/180/270)
- Importar arquivo `.zpl` (input file → textarea) e exportar (já existe, validar)
- Impressão:
  - **Convencional**: `window.print()` com CSS print + PDF (já temos)
  - **Zebra direta**: tentativa via WebUSB (`navigator.usb`) para impressoras conectadas USB; fallback baixa `.zpl` para envio manual
- **Histórico local** (IndexedDB): toda etiqueta gerada → registro com timestamp, thumb, ZPL; aba "Histórico" lista e permite restaurar

## Fase 5 — Mockup 3D
**Módulo 7 parte A**
- Nova aba **"Mockup"** com `react-three-fiber`: caixa de papelão 3D, textura da etiqueta aplicada numa face, rotação orbital, ajuste de posição da etiqueta

## Fase 6 — OCR + Tradução
**Módulo 7 parte B**
- OCR com `tesseract.js` (PT/EN/ES/multi)
- Tradução via Lovable AI Gateway (Gemini) — requer ativar Lovable Cloud
- Fluxo: upload imagem → extrai texto → mostra resultado → botão "Traduzir para [idioma]"

---

## Detalhes Técnicos

**Novas dependências previstas:**
- `react-i18next` `i18next`
- `idb` (IndexedDB wrapper)
- `jsbarcode` `qrcode`
- `tesseract.js`
- `three` `@react-three/fiber` `@react-three/drei`
- `react-rnd` ou `interactjs` (drag/resize no editor ZPL)

**Garantias de não-regressão:**
- Nenhum arquivo de `utils/imageProcessing.ts` `convertToGRF` será modificado quanto à lógica anti-duplicação já corrigida — rotação aplica-se *antes* da chamada.
- Componentes existentes (`GRFConverter`, `BlackWhiteConverter`, `RasterConverter`, `ZPLLabelCreator`) recebem props/features novas sem remover as antigas.
- Lovable Cloud só será ativado na Fase 6 (OCR/tradução) — fases 1–5 permanecem client-side.

**Estrutura de novos arquivos (resumo):**
```text
src/
  contexts/ SettingsContext.tsx, I18nProvider.tsx
  components/
    SettingsPanel.tsx
    ImageGallery.tsx, ImageEditor.tsx, ZoomControl.tsx
    ZPLCanvasEditor.tsx, ElementInspector.tsx
    BarcodeGenerator.tsx, ZPLViewer.tsx
    LabelMockup3D.tsx, OCRTool.tsx
    HistoryPanel.tsx
  hooks/ useIndexedDB.ts, useKeyboardMove.ts, useZoom.ts
  utils/ rotation.ts, units.ts, labelary.ts, webusbZebra.ts, db.ts
  locales/ pt.json, en.json, es.json
```

---

## Proposta de execução
Começo pela **Fase 1** (fundação visual + i18n) assim que aprovado. Cada fase termina com preview funcional para você validar antes de avançar.

**Pergunta antes de começar:** quer que eu siga a ordem proposta (1→6), ou prefere priorizar uma fase específica (ex.: Fase 3 — Editor ZPL drag-and-drop, que é o maior ganho funcional)?
