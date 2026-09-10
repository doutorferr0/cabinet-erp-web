# Espec — Moodboard / Proposta compartilhável do orçamento

> Atualizado: 2026-08-26 — sessão Cowork com o user; mockup aprovado ("vamos inserir isto no sistema")

## Contexto

Orçamento por ambiente JÁ é o modelo do Cabinet: ambiente com `code`/`order`, soma por seção,
snapshot de spec/preço congelado na emissão, impresso agrupando por ambiente
(`GET /api/quotes/{id}/print`, Chromium server-side, template HTML+CSS, ADR-014).
Objetivo desta frente: o orçamento GERA uma apresentação de projeto (moodboard/planner) —
página web compartilhável com cliente/arquiteto, mais PDF paginado e PPTX editável,
todos do MESMO dado (o snapshot do orçamento, nunca o catálogo vivo).

## Decisões do user (2026-08-26, sessão Cowork)

- **Formato v1: página web compartilhável por token** (não PDF-first).
- **Escopo v1: só produtos** — sem paleta de cores, sem planta baixa (dado que não existe no orçamento).
- **SEM aprovação por item.** Foi prototipada no mockup e DESCARTADA pelo user — não reabrir.
  O aceite é GLOBAL (um botão "Aprovar proposta").
- **Exportações atrás de um ícone único** (menu: PDF paginado · PPTX · imprimir), nunca botões soltos.
- **PPTX: ambiente com >8 itens quebra em múltiplos slides**, cada um com cabeçalho próprio e
  marcador `1/2`; chips de luz só no primeiro, soma do ambiente só no último.
- **Mood: design system do SITE da Vertz** (claro/editorial/prancha técnica). Dois estilos foram
  testados e descartados: creme-editorial genérico e tema escuro derivado do hero do site.

## Linguagem visual — MEDIDA no repo `doutorferr0/vertz-wp-astro1`

Fonte: `src/styles/global.css`, `tokens.css`, `editorial.css` (lidos 2026-08-26, não chutados).

- Cores: bg `#F4F1EA` · surface/borda `#E3DDD6` · hairline `rgba(26,26,26,.14)` · tinta `#2B2B2B` ·
  apoio `#6B6F73` · bloco estrutural `#18181A` · primária `#FFC107` (hover `#F9E076`).
- Fontes: **Metropolis** (corpo) · **Courier Prime** (display: rótulos, thead) ·
  **Cutive Mono** (TODO número: código, preço, qtde, numeração de seção).
- Padrões do site aplicados: manchete uppercase entre hairlines (`ed-pagehead`) · número de seção
  mono `Nº 01` sobre régua (`ed-num` + `ed-rule`) · linhas label/valor (`ed-rows`) · pill escuro de
  header · glifo ✦ · âmbar como acento único.
- Padrões de prancha técnica (referências do user): índice de página mono gigante em marca d'água
  (`01.06`), rótulo lateral vertical por seção, legenda de luz entre réguas.

**ATENÇÃO multi-tenant:** esses valores são BRANDING DO TENANT Vertz, não do produto Cabinet.
O template lê branding do tenant (timbre já mora em `tenants` desde a `0068`; `print_settings`
existe). Hardcode é só do mockup.

## Composição do documento

Capa (manchete + bloco label/valor) → índice de ambientes → uma seção por ambiente →
lista de compras consolidada → notas de projeto → condições/rodapé.

Por ambiente: a peça de MAIOR VALOR é âncora 2×2 e o resto orbita menor (grade uniforme lê como
tabela, não composição — referência de moodboard profissional) · chips de "camadas de luz"
(tipo · W · K — no mockup foram derivados à mão do nome do produto; no produto vêm de spec
estruturada do catálogo ou digitados pelo consultor, decidir na fase) · toggle "valores" esconde
TODO preço (versão que o arquiteto circula).

## Fases técnicas

- **A (barata, sem migração):** eixo `template=moodboard` no print existente. PR de contrato no web
  (parâmetro na operação `PrintQuote`), handler na api (segundo template HTML+CSS ao lado do atual;
  o `@page` e o CSS do mockup entram quase literais). Mesma permissão `orcamento:imprimir`.
- **B (foto de produto — gap dominante):** storage de asset no catálogo + contrato de upload + ETL
  do legado (`Pro_foto` é CAMINHO, não arquivo). Renderizador recebe byte pronto, NUNCA busca URL
  (SSRF — restrição já registrada na ADR-014). **DECISÃO ABERTA (user):** onde moram os bytes.
- **C (link compartilhável):** recurso de token no contrato (expiração casada com a validade da
  proposta, revogável) · rota PÚBLICA read-only + aceite global · permissão de ação
  `orcamento:compartilhar` (mesmo padrão do `orcamento:imprimir`) · visualização e aceite no
  `audit_log` (rastro explícito em GET já existe) · aceite alimenta a conversão orçamento→pedido,
  que já é operação explícita. Referência de padrão: Papermark. **DECISÃO ABERTA (user):** quem
  serve a página pública (api ou front).
- **D (PPTX):** dependência `pptxgenjs` SÓ no front (regra do dono do package.json), botão exporta
  do `QuoteDetailDto`. Sem servidor, sem contrato.

## Mockup

`mockup-moodboard-orcamento.html` (nesta pasta) — dado real do orçamento Softlux nº 0022958
(6 ambientes, total R$ 12.844,50; nome do cliente anonimizado na cópia do repo). Abrir no
navegador com internet: CDNs fontsource (Metropolis), Google Fonts (Courier Prime/Cutive Mono),
unpkg (Paged.js) e jsDelivr (PptxGenJS). Fotos de produto são placeholders SVG por tipo de peça
até a fase B existir.

## Referências externas (pesquisa 2026-08-26)

Morpholio Board (board → spec list/product sheet automáticos — o conceito desta frente) ·
Qwilr/PandaDoc (tracking de visualização + aceite online) · Papermark (link seguro + analytics,
open source, referência da fase C) · Programa/DesignFiles (aprovação por item — DESCARTADA aqui) ·
luminaire schedule (formato técnico pro arquiteto — candidato a eixo futuro `modo=tecnico`).
