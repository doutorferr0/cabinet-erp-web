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
| `bug-orcamento-overflow.md` | Estouro horizontal em `/vendas/orcamentos` |
| `bug-colaborador-layout.md` | Layout quebrado em `/cadastros/colaboradores/:id` |
| `bug-a11y-form-fields.md` | Campo sem `id`/`name` acusado pelo Chrome |

## Ordem recomendada

Fase 0 → 1 → 2 → 3 → 4 → 5 → 6, bugs podem entrar em paralelo a qualquer momento (são
independentes entre si e das fases). Cada fase é comitável e revertível isoladamente.
