# Pesquisa de estilos e direções — o que ainda dá pra usar no Cabinet

> 2026-09-02 · Cowork. Complementa a auditoria (§1–§6) e o mockup. Cada item: o que é · onde entra no Cabinet · risco · custo. Ordem = ganho por hora.
> Fontes: tendências 2026 (Tenet, Gezar, Midrocket, Rajesh Nair), Material 3 tonal surfaces, Linear 2024 rebrand, Arc, Attio, Airtable, Family/Emil Kowalski (motion), Mercury, Ramp, Vercel Geist, Refero/Mobbin.

## 1. Sistema gráfico da marca — "forma dentro de forma, em traço"
A marca (duas casas concêntricas em contorno) já é uma gramática: **contorno duplo, concêntrico, sem preenchimento, cantos vivos**. Deriva uma família: círculo⊂círculo, quadrado⊂quadrado, hexágono⊂hexágono, casa⊂casa, seta⊂seta. Uma forma por módulo (Compras = casa · Estoque = cubo em traço · Vendas = seta · CRM = funil · Pessoas = círculo · Relatórios = barras).
**Onde:** vazios, 404, login, hub de módulo, favicon por módulo, loading (a forma interna "respira"), marca d'água nos impressos.
**Substitui:** `ornamento.tsx` (465 linhas de máscara + cor) por um `<Forma tipo tamanho traco>` de ~60 linhas.
**Risco:** baixo. **Custo:** 2 h. Ninguém tem isso — é o que separa de template.

## 2. OKLCH no lugar de hex
As 8 rampas de hoje são hex escolhidos a olho: `amber-400` é perceptivelmente mais claro que `indigo-400`, então "400 = fill" não é o mesmo peso em todo matiz. Em OKLCH, `L` é igual em toda a rampa (`400 = L 0.62`, `600 = L 0.45`…), `C` fixo por degrau, só `H` muda. **Escuro vira aritmética**: mesmo H e C, L espelhado.
**Onde:** `tokens-2.0.css` — trocar as 48 hex por `oklch()`; `.dark` deixa de listar cor por cor.
**Risco:** chartreuse (`#E4F222`) está na borda do gamut sRGB — em OKLCH pode "clipar"; usar `@supports (color: oklch(0 0 0))` com fallback hex e checar em tela P3 e sRGB. Suporte: todos os navegadores desde 2023.
**Custo:** 1 h. Melhor **antes** de D1 mergear os aliases.

## 3. Superfície tonal por módulo (Material 3 / Linear / Arc)
Em vez de cinza puro em toda página, a bancada de cada módulo carrega 3–5% do matiz do módulo: `/compras` tem ar indigo, `/estoque` mint. A folha continua neutra (dado nunca tinta). Elevação vira tonal, não só sombra.
**Onde:** `[data-modulo]` → `--bancada: color-mix(in oklab, var(--mod-x) 4%, var(--n-100))`. Uma linha por módulo.
**Risco:** exagerar (>6%) vira Monday. **Custo:** 20 min.

## 4. Glass 2026 = só o que flutua
Literatura 2026 converge: glass em tudo saiu; glass em **overlay, toolbar flutuante, painel de notificação, action card**. O Cabinet já tem appbar/tenant/header sticky em glass. Falta o caso mais forte: **barra de lote flutuante** (Linear/Attio) — solta, centrada no rodapé da grade, glass escuro, some quando nada está selecionado. Hoje a barra empurra a grade.
**Onde:** `DataTable` (D8): `.bulk` vira `position: sticky; bottom: 12px`, pílula com `--hard-3`, `backdrop-filter`.
**Custo:** 30 min.

## 5. Sombra difusa colorida SOB o hard shadow
Tendência "glow" é errada pra ERP, mas uma **sombra ambiente no matiz** (12% do `--kc`, 24px de blur) por baixo da sombra dura do KPI dá profundidade sem trair o Brut.
**Onde:** `.kpi`, `.tc:hover`, dialog. **Risco:** performance em grade — nunca em linha. **Custo:** 15 min.

## 6. Tipografia: números de display + count-up
Kinetic type em grade é ruído. O único lugar onde vale: **KPI**. Número em 32px mono, tracking −0.03em, e **count-up** de 600 ms (tabular, então não pula). Mercury faz o extrato parecer produto; Ramp faz o número contar.
**Onde:** `KpiTile` (D11). `font-size-adjust` pra Gambarino casar altura-x com Inter nos títulos mistos (id mono ao lado do título).
**Custo:** 30 min.

## 7. Modo Planilha (Airtable / Attio) — a terceira densidade
Compacta · Confortável · **Planilha**: célula selecionável (anel 2px), setas navegam, Enter edita inline, Tab avança, Esc cancela, `⌘C` copia a célula. É a ponte com quem passou 10 anos na grade Delphi do Softlux — e é o que faz um ERP web não parecer "site".
**Onde:** `DataTable` (D8/D9) + `GradeDeItens` (D17). **Risco:** acessibilidade (roles `grid`/`gridcell`, foco visível). **Custo:** 1 dia no repo; 40 min no mockup.

## 8. Movimento de artesão (Family / Emil Kowalski / Linear)
Regras que os melhores seguem: **saída também anima** (100 ms, mais rápido que entrada); **spring** pra soltar (drop de card no kanban), **ease-out** pra abrir; **FLIP** quando a lista reordena/agrupa (linhas deslizam pro grupo, não "piscam"); **View Transitions API** na troca de rota com shared-element do título (o título da lista vira o título da ficha). Duração por distância: 120 ms perto, 200 ms longe. Sem loop, sem delay > 80 ms.
**Onde:** `__root` (view transitions), `DataTable` (FLIP no agrupar), kanban (spring). **Risco:** Safari < 18 sem view transitions — degrada sem quebrar. **Custo:** 2 h.

## 9. Grão de papel
`feTurbulence` a 3% de opacidade só na bancada, nunca na folha. Sustenta a metáfora "papel" e mata o look de vetor chapado. 5 min. Pode desligar via `prefers-reduced-transparency`.

## 10. Densidade ergonômica (Vercel Geist / Linear)
"Workflow primário claro, controles secundários quietos": ação primária com cor, todo o resto ghost/hairline; ícones só onde há ambiguidade; 13 px como base (não 14) em grade densa; largura de coluna estável entre páginas (não recalcular por conteúdo). Já quase todo aplicado — falta fixar larguras de coluna por tipo (`id 96px · data 104px · dinheiro 128px`).

## 11. Bento só em hub e dashboard
Bento (blocos assimétricos) é tendência forte em 2026 e **certa** pra hub de módulo e dashboard (um KPI 2×1 herói, quatro 1×1, um card 2×2 de atividade). **Errada** em listagem e ficha. Aplicar em D20 e D26.

## 12. Contra-referências (o que a literatura 2026 confirma como cansado)
Aurora / gradiente mesh · neumorfismo · glass em toda superfície · ícone 3D · kinetic type em grade · bento em tabela · hover em linha · cor por coluna de status em tudo (Monday) · hero de 100vh em app.

## 13. Onde continuar olhando
Refero, Mobbin (fluxos reais), Godly (sites), Linear/Attio/Vercel changelogs (design em produção), Emil Kowalski "Animations on the web", Material 3 "tonal surfaces", Ramp/Mercury/Stripe dashboards, Airtable Interfaces, Family wallet (motion), Arc (tonal por espaço).
