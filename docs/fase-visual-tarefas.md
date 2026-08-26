# Fase visual — roteiro ENCERRADO (histórico)

> **NÃO tire tarefa daqui.** Este roteiro conduziu a fase V1–V12 (jul–ago/2026) e está fechado. A
> fila de trabalho da frente visual vive em `topicos/frente-visual.md` da memória — o `CLAUDE.md`
> diz por quê: tracker versionado ao lado do tracker real vira dois estados que divergem, e este
> arquivo é a prova (ficou marcando "V12 próxima" por semanas, com a fase já em 1.6).

**Três regras deste arquivo foram REVOGADAS. Ele fica como registro, não como instrução:**

1. **"REGRA DA FASE: mock only · não inventar API" — caiu.** A fase mock acabou e **o front é dono
   do contrato**: `contracts/openapi-v1.json` é especificação de ENTRADA, caminho novo entra
   marcado `Proposto`, e tipo de servidor vem do codegen. Ver `CLAUDE.md` §REGRA DA FASE e
   `docs/integracao.md`.
2. **Os nomes mudaram.** `src/components/vitra/` virou `src/components/cabinet/` (`63e3798`) e o
   `<VitraDataTable>` é o `<DataTable>`. Prompt antigo copiado ao pé da letra cria pasta morta.
3. **O sistema visual não é mais o "Papel Funcional"** do bloco 1 do `template-prompt.md`: valem o
   `DESIGN.md` (fase 1.6 + identidade própria) e a amostra `docs/design/amostra-fase-1.5.html`,
   que vence o doc em divergência.

## O que aconteceu de verdade com a V12

**A exploração das 3 variantes nunca foi construída.** Não existe, e nunca existiu, rota
`/lab/orcamento/a|b|c` no histórico. A tela de documento nasceu inteira na **V8**
(`586d730`, 30/07) e foi refeita depois pelas fases visuais — `d1133c5` (Stamp e DocumentoHeader
com número em mono), `e4662e8` (totais como fileiras finais da grade), `645e647` (reface fase 2).
Quem procurar aqui o resultado da comparação não vai achar porque ela não houve.

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
| V12 tela de documento em 3 variantes | **não aconteceu** — a tela veio da V8 e das fases 1.5/1.6 | — |

V6–V11 nasceram fora deste arquivo (colados direto na sessão); estão aqui só para o roteiro parar
de mentir que a fase terminou na V5.

---

# Histórico — os prompts como foram escritos

Daqui para baixo é transcrição da fase, com as regras da época. **Lê-se para saber o que foi
pedido, não para executar.**

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
cadastro rápido; mock com os 21 kinds do vocabulário — a transcricaosoftlux @padroes
registrou 19, e a lista cresce por PR).
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
