# Fase E — Presets, tamanhos, ZPL e container

Vou dividir em 6 entregas dentro desta fase, todas exportáveis/importáveis via arquivo JSON para mover entre PCs.

## 1. Presets de etiqueta (configurações salvas)
- Novo módulo `src/utils/labelPresets.ts` com tipos `LabelPreset` (nome, tamanho, ZPL, cor de fundo, elementos, data).
- Botões **Salvar preset**, **Carregar preset**, **Exportar (.json)**, **Importar (.json)** no `ZPLLabelCreator`.
- Armazenamento local em `localStorage` (`zit_label_presets_v1`) + arquivo `.zitlabel.json` para portar entre PCs.
- Lista lateral/modal com presets salvos, renomear e excluir.

## 2. Tamanhos de etiqueta com presets
- Tamanhos padrão de fábrica: 100×150 mm, 100×201 mm (o mais usado), 50×30 mm, 100×50 mm, 80×40 mm.
- Seletor no topo do `ZPLLabelCreator` com dropdown de tamanhos + opção "Personalizado".
- Modal para criar novo tamanho (nome, largura, altura, unidade mm/in) → salvo em `localStorage` (`zit_label_sizes_v1`).
- Exportar/importar lista de tamanhos via JSON, junto do mesmo fluxo da seção 1.

> Observação: você escreveu "201 cm × 100 cm" — assumindo que é **mm** (etiqueta industrial Zebra 100×201 mm). Se for outro valor me avise.

## 3. Fundo transparente para elementos ZPL
- Em `ZPLViewer` / `ZPLLabelCreator`, garantir que todos os elementos (texto, código de barras, imagens, formas) sejam renderizados com `background: transparent` e sem preenchimento branco.
- Ajustar o gerador (`zplGenerator.ts`) para nunca emitir `^FR` invertido em fundo escuro a menos que solicitado.
- Cor de fundo da etiqueta continua configurável e os elementos passam a respeitar qualquer cor.

## 4. Botão "Copiar ZPL"
- Botão visível no `ZPLLabelCreator` e no `ZPLViewer` que usa `navigator.clipboard.writeText` com toast de confirmação.

## 5. Melhor resolução de imagens
- No `ImageUploader` / `GRFConverter`: novo campo **URL da imagem** além do upload.
- Pipeline de alta resolução: carregar em tamanho original, aplicar `OffscreenCanvas` quando disponível, opção de upscale 2× via algoritmo bicúbico antes de converter para GRF/ZPL.
- Slider de qualidade/DPI no momento da inserção na etiqueta.

## 6. Simulação de container
- Novo modo `container` no `BoxSimulator` (ou aba dedicada).
- Containers padrão: **20 ft Dry**, **40 ft Dry**, **40 ft HC**, **Reefer 20/40**, custom (LxAxC em mm).
- Disposição automática + manual de pallets/caixas/big bags/tambores/bombonas dentro do container 3D (CSS 3D + grid de slots).
- Indicadores: nº de unidades, % de ocupação volumétrica, peso estimado (opcional).
- Exportar/importar layout do container via JSON.

## Detalhes técnicos

```text
src/
├── utils/
│   ├── labelPresets.ts     (novo) tipos + load/save/export/import
│   ├── labelSizes.ts       (novo) tamanhos padrão + customizados
│   └── containerLayout.ts  (novo) cálculo de empacotamento
├── components/
│   ├── ZPLLabelCreator.tsx (editar) presets, tamanhos, copiar ZPL, fundo transp.
│   ├── ZPLViewer.tsx       (editar) copiar ZPL, fundo transp.
│   ├── ImageUploader.tsx   (editar) URL + upscale
│   ├── GRFConverter.tsx    (editar) URL + alta resolução
│   ├── BoxSimulator.tsx    (editar) modo container
│   └── PresetManager.tsx   (novo) modal de presets/tamanhos
└── i18n/locales/{pt,en,es}.json (novas chaves)
```

Formato do arquivo portátil:
```json
{
  "version": 1,
  "exportedAt": "2026-06-09T...",
  "presets": [...],
  "sizes": [...]
}
```

## Ordem de execução
1. Tamanhos + presets + exportar/importar (1 e 2)
2. Copiar ZPL + fundo transparente (3 e 4)
3. Imagens em alta (5)
4. Container (6)

Posso implementar tudo de uma vez ou ir entregando por sub-fase. Confirma se sigo com tudo junto e se 100×201 é em **mm**.