# Refactor — reduzir duplicação (sem tocar no contrato)

**Documento de trabalho temporário.** O tracker real do projeto é
`topicos/frente-visual.md` na memória (`doutorferr0/projetos-claude`) — ver CLAUDE.md. Este
diretório existe só enquanto o refactor está em curso e sai do repo quando fechar.

## Por quê

`src/routes/` tem 1.881 linhas com duplicação medida: 4 layouts de módulo idênticos, 3 rotas de
detalhe de documento que diferem em 3 linhas, 3 rotas de detalhe de parceiro que diferem em ~15
(mapeamento de campo), 8 listagens com o mesmo esqueleto, e o mesmo tratamento de erro copiado em
13 pontos. Nada disso depende da integração com o backend — pode ser feito agora, e barateia o
custo de quando o contrato mudar de verdade (cada fronteira passa a ser 1 arquivo, não 3–6).

## Convenções válidas para todas as fases

- **Fases 1–4 não mudam pixel nenhum.** Se uma tela mudar visualmente, é regressão — comparar com
  os screenshots da Fase 0.
- **Os comentários-decisão migram, não somem.** Eles explicam POR QUE (`accessorKey` em inglês,
  `Excluir` é desativação, a linha é semeada no cache) e valem para todas as telas que passam a
  usar o componente compartilhado. Resumi-los no caminho destrói mais do que o refactor remove.
- **Os três formulários de parceiro (Fase 5) não se fundem.** `cliente-form`, `fornecedor-form` e
  `profissional-form` divergem de verdade (abas e campos diferentes — CPF/Obra vs CNPJ/
  Transportadora). Unificá-los seria o form-generator declarativo que o CLAUDE.md veta. O que se
  compartilha é o encanamento em volta (query, mutations, navegação), não o JSX dos campos.
- **Fechamento de cada fase:** `pnpm check` → `pnpm check-types` → `pnpm test` → revisita no
  browser das telas afetadas. Armadilha conhecida (CLAUDE.md): `tsc -b` pode passar verde com erro
  real reaproveitando build info — quando a fase mexe em assinatura de provider, conferir com
  `npx tsc -p tsconfig.app.json --noEmit`. Nunca filtrar a saída da suíte com `tail` na primeira
  rodada.
- `pnpm dev` exige Node ≥22 (verificar com `node -v`; usar nvm se o do PATH for menor).
- Um commit por fase, Conventional, ≤50 char, foco no "porquê". Adicionar **por caminho**, nunca
  `git add -A`.

## Arquivos

| Arquivo | Escopo |
|---|---|
| `fase-0-baseline.md` | Sem código — captura o estado atual para comparar depois |
| `fase-1-mensagem-de-erro.md` | `mensagemDoErro()`, 13 sítios |
| `fase-2-layout-de-modulo.md` | 4 layouts de módulo → 1 |
| `fase-3-tela-de-documento.md` | 3 rotas de detalhe de documento → 1 componente |
| `fase-4-tela-de-listagem.md` | 8 listagens → 1 componente |
| `fase-5-parceiro.md` | 3 rotas de detalhe de parceiro → hook + 3 mapas de campo |
| `fase-6-boletim-conta-do-mesmo-lugar.md` | Boletim deixa de divergir da listagem |
| `fase-7-pos-merge-da-main.md` | Levantamento pós-merge: buraco do `TelaDeDocumento` + o que os PRs #55–#58 duplicaram |
| `bug-orcamento-overflow.md` | Estouro horizontal em `/vendas/orcamentos` |
| `bug-colaborador-layout.md` | Layout quebrado em `/cadastros/colaboradores/:id` |
| `bug-a11y-form-fields.md` | Campo sem `id`/`name` acusado pelo Chrome |

## Ordem recomendada

Fase 0 → 1 → 2 → 3 → 4 → 5 → 6, bugs podem entrar em paralelo a qualquer momento (são
independentes entre si e das fases). Cada fase é comitável e revertível isoladamente.

A Fase 7 é posterior ao merge da `main` na branch (2026-08-08) e tem ordem interna própria — ver
o arquivo. Ela recolhe duas coisas de origens diferentes: um buraco deixado pela Fase 3
(`TelaDeDocumento` sem braço de erro) e a duplicação que os PRs #55–#58 criaram em paralelo,
sem enxergar esta branch.

## Situação atual

- Fases 0–6 e as três correções de bug foram concluídas no PR #60 (`1f99fe3`). A Fase 6 ganhou
  ainda proteção contra falha parcial e contra contagem incompleta acima do teto de página
  (`d289217`), registradas no arquivo da fase.
- Os itens 1 e 2 da Fase 7 foram concluídos em `2fc29ce`: `TelaDeDocumento` agora separa erro de
  ausência, e `EstadoDaConsulta` concentra o markup compartilhado das telas de detalhe.
- Os itens 3–6 da Fase 7 foram concluídos nesta frente: busca de cidade, campo+lupa, tabela de
  apoio e moldura de abas agora têm componentes/providers compartilhados, com testes próprios.
- A Fase 7 está encerrada; não reabrir itens concluídos sem regressão nova.
