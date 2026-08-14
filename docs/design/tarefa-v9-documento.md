# V12 — Tela de documento (orçamento) em 3 variantes — NÃO ACONTECEU

> **A exploração descrita aqui nunca foi construída**, e a premissa dela caducou: o texto diz que
> o padrão de documento é "o ÚNICO da §9 sem nenhuma implementação", o que deixou de ser verdade
> em 30/07/2026, quando a **V8** (`586d730`) entregou orçamento, pedido e ordem de compra inteiros.
> As três variantes `/lab/orcamento/a|b|c` não existem no histórico do repo. A tela de documento
> que está no ar veio da V8 e foi refeita pelas fases 1.5/1.6 — `d1133c5`, `e4662e8`, `645e647`.
> Fica como registro do que se pensou em fazer.

> **Integrada** ao `docs/fase-visual-tarefas.md` como **V12** (o número V9 já era da estruturação de testes, commit `5fd7edf`). O nome do arquivo fica como está por histórico.
> Formato: segue `template-prompt.md`. Sistema visual: `DESIGN.md`. Executor: 1 sessão por variante OU 1 sessão para as 3 — decisão do executor, registrar motivo.

## Por que exploração (e não one-shot)

Documento cabeçalho + itens + totais é o ÚNICO padrão da §9 sem nenhuma implementação, é a tela mais usada da operação (orçamento), e não há print completo (§10 trava as abas Ambiente/Serviços/Pagamento). Errar o layout aqui custa caro em toda tela de documento futura (pedido, ordem de compra). 3 variantes → comparar → escolher → padronizar.

## Pré-requisitos (ANTES de codar)

1. **Interação: por clique (decisão user 2026-07-30).** Sem atalho de teclado customizado. Grade de itens usa navegação nativa de form (Tab/Enter entre células) — comportamento padrão HTML, não atalho. Ações sempre visíveis como botão.
2. **Prints:** user tira prints da §10 no Softlux (Orçamento: Ambiente, Serviços, Pagamento) → `docs/design/inspo/softlux/`. Sem eles, as abas afetadas nascem placeholder — aceitável, não bloqueia o padrão.
3. **Inspo:** `docs/design/inspo/documento/` (9 referências rotuladas, já no repo) + direção "papel funcional" do `template-prompt.md`.

## As 3 variantes (rotas temporárias `/lab/orcamento/a|b|c`)

Mesmos campos (§8.1), mesmo mock, mesma grade de itens. Varia SÓ a arquitetura visual:

- **A — Softlux fiel:** cabeçalho em bloco no topo, grade dominante, totais em rodapé fixo. Menor risco, menor ganho.
- **B — Painel lateral:** cabeçalho colapsado numa sidebar direita (cliente, condições, totais sempre visíveis), grade ocupa o resto. Aposta: vendedor olha itens + total ao mesmo tempo.
- **C — Documento contínuo:** cabeçalho compacto de 2 linhas no topo, grade, totais inline ao fim + sticky. Aposta: leitura de cima a baixo como papel.

## Comparação e decisão

1. `/impeccable critique` + `/impeccable audit` em cada variante — relatórios commitados em `.impeccable/critique/`.
2. Teste de fluxo: montar orçamento de 5 itens em cada variante — contar cliques e fricções (rolagem pra ver total, ação escondida, alvo pequeno).
3. User escolhe (screenshot das 3 lado a lado). Chat registra decisão + motivo na memória.
4. Vencedora vira `documento-form.tsx` (padrão 6 da §9) · rotas `/lab/*` apagadas no mesmo commit.

## Critério de aceite da etapa

- 3 variantes navegáveis com mock de orçamento (5+ itens, valores em centavos).
- Grade da vencedora: adicionar/editar/remover linha por clique (Tab/Enter nativo entre células); totais recalculam; teste cobrindo.
- Padrão extraído reutilizável para pedido (§7) sem retrabalho de layout.
- FECHAMENTO completo + `topicos/frente-visual.md` atualizado.

## Fora de escopo

Integração real, impressão/PDF, abas sem print (placeholder ok), qualquer atalho de teclado customizado (decisão: cliques apenas).
