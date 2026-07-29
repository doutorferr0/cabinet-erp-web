# Fase visual — roteiro (1 tarefa por sessão, com FECHAMENTO)

Colar UMA tarefa por sessão (kimi ou claude) DENTRO deste repo. Toda sessão: lê a memória (CLAUDE.md seção MEMÓRIA), termina com FECHAMENTO (biome → tsc → vitest → commit → CI verde → frente-visual.md).
REGRA DA FASE: mock only. Campos das telas: `transcricaosoftlux.md`. NÃO inventar campo nem API.

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
