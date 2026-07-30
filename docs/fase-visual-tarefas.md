# Fase visual — roteiro (1 tarefa por sessão, com FECHAMENTO)

Colar UMA tarefa por sessão (kimi ou claude) DENTRO deste repo. Toda sessão: lê a memória (CLAUDE.md seção MEMÓRIA), termina com FECHAMENTO (biome → tsc → vitest → commit → CI verde → frente-visual.md).
REGRA DA FASE: mock only. Campos das telas: `transcricaosoftlux.md`. NÃO inventar campo nem API.

## Estado do roteiro

Estado autoritativo por tarefa vive em `topicos/frente-visual.md` da memória. Resumo:

| Tarefa | Estado | Commit |
|---|---|---|
| V1 esqueleto + shell | feito | `256fb9c` |
| V2 VitraDataTable server-ready | feito | `eeeb33a` |
| V3 LookupCombo + blocos compartilhados | feito | `f125b9d` |
| V4 form com abas + Fornecedor | feito | `e0b5e9c` |
| V5 SearchDialog + Cliente | feito | `5c0b5e1` |
| V6 Colaborador (§2) e Profissional Externo (§3) | feito | `a205177` |
| V6b extração ActionBar + provider mock único | feito | `ad2ec47` |
| V7 Produto (§6, 5 abas) | feito | `f1eb1a6` |
| V8 documentos: Ordem/Pedido de Compra, Orçamento | feito | `586d730` |
| V9 estruturação para testes e conexão | feito | `5fd7edf` |
| V10 modo consulta (§9 padrão 8) + cobertura de `lib/` | feito | `7bd8d90` |
| V11 documentação do sistema visual (PRODUCT.md, DESIGN.md) | feito | `89493ef`, `4d99287`, `e6aa464` |
| **V12 tela de documento em 3 variantes** | **próxima** | — |

V6–V11 nasceram fora deste arquivo (colados direto na sessão); estão aqui só para o roteiro parar de mentir que a fase terminou na V5. Os blocos de prompt abaixo são os originais de V1–V5.

**Nota de numeração:** a V12 chega do arquivo `docs/design/tarefa-v9-documento.md`, que se autointitulava "V9" — número já ocupado pela estruturação de testes. O arquivo continua sendo a fonte detalhada; o número corrente é V12.

## TAREFA V1 — Esqueleto + shell
```
Leia a memória (protocolo do CLAUDE.md) e execute:
Esqueleto: Vite + React 19 + TS strict + Tailwind v4 + shadcn/ui (init) +
Biome + vitest + pnpm (workspace com minimumReleaseAge: 10080).
Router: TanStack Router (proposta — registrar 1 parágrafo de trade-off vs
react-router no frente-visual.md; user pode vetar depois).
Shell da app: sidebar (módulos: Cadastros, Estoque, Vendas, Compras),
header com seletor de empresa ativa (mock: VERTZ ILUMINAÇÃO · VIA HF) e
tema claro/escuro. CI: biome + tsc + vitest.
FECHAMENTO + criar/atualizar topicos/frente-visual.md.
```

## TAREFA V2 — DataTable server-ready (o coração, 8+ telas usam)
```
Continua. Componente <VitraDataTable> em src/components/vitra/:
TanStack Table v8, estado tipado {q, sort, page, pageSize} tratado COMO
contrato de servidor (provider mock aplica busca/ordenação/paginação com
latência simulada via TanStack Query). Barra de ações padrão (Filtro,
Incluir, Alterar, Consultar, Excluir/Cancelar, Imprimir) configurável.
Demo: listagem de produtos com colunas do Softlux (transcricaosoftlux
@produto/@orcamento). Testes: render, busca, paginação.
FECHAMENTO + frente-visual.md.
```

## TAREFA V3 — LookupCombo + blocos compartilhados
```
Continua. <LookupCombo kind> (Command+Popover + botão "..." com Dialog de
cadastro rápido; mock com os 19 kinds do transcricaosoftlux @padroes).
Blocos: <EnderecoBlock> (CEP com busca mockada), <TelefonesBlock>,
<ComunicadoresBlock> (2 pares combo+texto), <RedesSociaisBlock>.
Tudo integrado a RHF+Zod. Testes mínimos por componente.
FECHAMENTO + frente-visual.md.
```

## TAREFA V4 — Padrão "form com abas" + tela Fornecedor (mock)
```
Continua. Padrão de formulário: shadcn Tabs + RHF, 1 form por tela,
rodapé Gravar/Cancelar. Tela FORNECEDOR completa com mock — campos
LITERAIS do transcricaosoftlux @fornecedor (inclui grade Contatos com
useFieldArray: Nome | Vínculo | Fone | FAX, e checkbox Ativo).
FECHAMENTO + frente-visual.md.
```

## TAREFA V5 — Janela de busca + tela Cliente (mock)
```
Continua. <SearchDialog> reutilizando <VitraDataTable> (seleção + retorno,
atalho Ctrl+K). Tela CLIENTE aba Principal com mock (transcricaosoftlux
@cliente), usando busca de cidade via SearchDialog.
FECHAMENTO + frente-visual.md com resumo da fase e pendências pro chat.
```

**Depois da V5:** parar e avisar o user — próximas telas dependem de decisão (Produto 5 abas) e da integração (contrato do backend).

## TAREFA V12 — Tela de documento (orçamento) em 3 variantes

> Fonte detalhada: `docs/design/tarefa-v9-documento.md` (critérios de comparação, escopo excluído).
> Formato do prompt: `docs/design/template-prompt.md`. Sistema visual: `DESIGN.md`.

**Por que exploração e não one-shot:** cabeçalho + itens + totais é o único padrão da §9 sem implementação, o orçamento é a tela mais usada da operação, e não há print completo (§10 trava as abas Ambiente/Serviços/Pagamento). Errar o layout aqui custa em toda tela de documento futura (pedido, ordem de compra). 3 variantes → comparar → escolher → padronizar.

```
Continua. Três variantes navegáveis da tela de ORÇAMENTO em rotas
temporárias /lab/orcamento/a|b|c. Mesmos campos (transcricaosoftlux §8.1),
mesmo mock (5+ itens, valores em centavos), mesma grade. Varia SÓ a
arquitetura visual:
  A — Softlux fiel: cabeçalho em bloco no topo, grade dominante,
      totais em rodapé fixo.
  B — Painel lateral: cabeçalho colapsado em painel à direita (cliente,
      condições, totais sempre visíveis), grade ocupa o resto.
  C — Documento contínuo: cabeçalho compacto de 2 linhas, grade,
      totais inline ao fim + sticky.
Estética: bloco 1 de docs/design/template-prompt.md + DESIGN.md
(norte "Papel Funcional"). Aplicar DocumentoHeader com número em mono e
carimbo de situação — tom do carimbo é propriedade, NÃO inventar nome de
situação (enumeração é [a resolver]).
Referências: docs/design/inspo/documento/ (ver README da pasta:
copiar X / ignorar Y).
Interação por clique; Tab/Enter nativos. NENHUM atalho customizado.
ALWAYS/NEVER: blocos 5 e 6 do template-prompt.md.
Aceite: 3 variantes navegáveis · grade da vencedora adiciona/edita/remove
linha e recalcula totais · teste cobrindo · /impeccable critique e audit
por variante · vencedora vira documento-form.tsx e as rotas /lab/* são
apagadas no mesmo commit.
FECHAMENTO + frente-visual.md.
```

**Pré-requisitos:** prints da §10 no Softlux (Orçamento: Ambiente, Serviços, Pagamento) em `docs/design/inspo/softlux/` — sem eles, essas abas nascem placeholder (aceitável, não bloqueia). O pré-requisito de mapeamento de atalhos **caiu**: interface por clique é decisão do user (30/07/2026).

**Fora de escopo:** integração real, impressão/PDF, abas sem print.
