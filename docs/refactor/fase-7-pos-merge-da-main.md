# Fase 7 — o que a main trouxe de volta (levantamento pós-merge)

Levantado em 2026-08-08, depois de `git merge origin/main` na `refactor/reduz-duplicacao`
(merge `8b06000`, 13 commits da main, sem conflito; `tsc` limpo, biome limpo, 63 arquivos /
427 testes verdes).

O merge não quebrou nada, mas trouxe duplicação nova: os PRs #55–#58 ("campo livre → busca
real") resolveram quatro telas **em paralelo** ao refactor, cada um copiando o mesmo bloco. Não
é retrabalho de quem escreveu — as branches não se viam. É o passivo normal de duas frentes
concorrentes, e é o que esta fase recolhe.

Os itens 1 e 2 não vieram da main: são buraco do próprio refactor, achados na revisão do PR #60.

## Situação atual

**Itens 1 e 2 concluídos em `2fc29ce`.** `TelaDeDocumento` recebeu `erroAoCarregar` e o braço
`isError`; `EsqueletoDeCarregamento` e `ErroDeCarregamento` passaram a morar em
`src/components/cabinet/estado-de-consulta.tsx`. As seis telas continuam com seus próprios `if`s
para preservar o narrowing de `query.data`; só o markup é compartilhado.

Os itens 3–6 foram concluídos nesta frente. Os testes novos são
`busca-de-cidade.test.tsx`, `campo-com-busca.test.tsx`, `abas-sem-captura.test.tsx` e a cobertura
de `tabelaDeApoio` em `data/provider.test.ts`.

## Ordem recomendada

**3+4** (o que a main trouxe) → **5** → 6. Cada bloco foi aplicado e verificado isoladamente
antes da suíte dos formulários.

---

## 1. `TelaDeDocumento` não distingue falha de inexistência

**Severidade: alta (latente).**

`src/components/cabinet/tela-de-documento.tsx` tem `if (query.isPending)` (linha 44) e
`if (!query.data)` (linha 53), e nada mais. Erro de rede cai no segundo e renderiza
`<p>{naoEncontrado}</p>`.

As telas irmãs fazem o oposto, e comentam por quê — `src/routes/cadastros/clientes/$clienteId.tsx:37`
e `src/routes/cadastros/produtos/$produtoId.tsx:40`:

> Falhou ≠ não existe: 404 chega como `null` (não está lá), qualquer outra falha chega como erro
> — 409 é "nenhuma empresa ativa na sessão". Tratar os dois como "não encontrado" mandaria
> procurar um registro que existe.

Hoje não queima porque os três documentos que usam o componente (Orçamento, Ordem de Compra,
Pedido de Compra) são `createMockProvider` e não rejeitam. Queima no dia em que ganharem caminho
no contrato: o 409 de sessão sem empresa ativa — que `parceiros-api.ts` documenta como "o caso do
dia" — vira "Orçamento não encontrado", e o operador vai procurar um documento que está lá.

É o mesmo defeito do achado 1 da revisão do PR #60 (o Boletim sem braço `isError`), em outro
lugar: consumidor que só ramifica em pendente/vazio e trata rejeição como ausência.

**Correção:** braço `isError` em `TelaDeDocumento`, com o mesmo conteúdo das rotas irmãs —
mensagem, `detalheDoErro(query.error)` quando houver, botão "Tentar de novo" chamando
`query.refetch()`. A mensagem precisa ser parametrizável (`"Não foi possível carregar o
orçamento."`), então entra uma prop ao lado de `naoEncontrado`.

## 2. As 4 telas de detalhe que sobraram fora do `TelaDeDocumento` sobraram por causa do item 1

**Severidade: média (duplicação medida).**

Nenhuma rota de detalhe de cadastro usa o componente. Elas repetem o tríduo inteiro:

| Rota | skeleton | erro + "Tentar de novo" | não encontrado |
|---|---|---|---|
| `cadastros/clientes/$clienteId.tsx` | ✓ | ✓ (l. 37) | ✓ |
| `cadastros/fornecedores/$fornecedorId.tsx` | ✓ | ✓ (l. 37) | ✓ |
| `cadastros/profissionais/$profissionalId.tsx` | ✓ | ✓ (l. 37) | ✓ |
| `cadastros/produtos/$produtoId.tsx` | ✓ | ✓ (l. 40) | ✓ |
| `cadastros/colaboradores/$colaboradorId.tsx` | ✓ | — (provider mock) | ✓ (l. 34) |
| `components/cabinet/tela-de-documento.tsx` | ✓ | — (**item 1**) | ✓ (l. 53) |

`<Skeleton className="h-8 w-64" /> + <Skeleton className="h-64 w-full" />` aparece nos 6.
`"Tentar de novo"` aparece em 4 rotas (mais `require-session.tsx`, `require-tenant.tsx`,
`data-table.tsx` e `falha-do-painel.tsx`, que têm layout próprio e ficam fora).

Fechar o item 1 é o que habilita a adoção: com o braço de erro no lugar, as 4 rotas viram
composição. A diferença que resta entre elas é só o que o `TelaDeDocumento` já parametriza
(provider, query key, título, "não encontrado") mais o `aviso` — `CoberturaParceiro` nos três
papéis, `CoberturaDaTela` em produtos —, que passa como prop ou fica no `children`.

**Atenção — o parceiro não é caso do `TelaDeDocumento` como ele está hoje:** as três rotas de
papel não fazem `useQuery` próprio, chamam `usarParceiro`, que devolve `query` + mutations. Ou
`TelaDeDocumento` ganha um modo que aceita a query pronta em vez de montá-la, ou o pedaço
compartilhado é menor: um `<EstadoDaConsulta query pendente erro naoEncontrado>` que os dois
lados usam. **A segunda é a recomendada** — não força `usarParceiro` a caber num componente
desenhado para documento, e serve também ao `$colaboradorId`.

Redução estimada: ~120 linhas.

## 3. `BuscaCidade` duplicada 4× (veio no #58)

**Severidade: média.**

| Arquivo | `cidadeColumns` | componente |
|---|---|---|
| `features/cliente/cliente-form.tsx` | l. 74 | `BuscaCidade` (l. 80) |
| `features/colaborador/colaborador-form.tsx` | l. 74 | `BuscaNaturalidade` (l. 107) |
| `features/fornecedor/fornecedor-form.tsx` | l. 107 | `BuscaCidade` (l. 119) |
| `features/profissional/profissional-form.tsx` | l. 91 | `BuscaCidade` (l. 97) |

`cidadeColumns` é literalmente o mesmo array nos quatro. Os componentes fazem a mesma
`SearchDialog` contra `data.cidades`, com o mesmo `queryKey={['cidades']}` e os mesmos três
`setValue` (`cidadeCodigo`, `cidadeNome`, `uf`).

A versão de **profissional já é a genérica**: é parametrizada por prefixo
(`'endereco' | 'enderecoBanco'`), porque aquela tela tem dois endereços. As outras três são casos
particulares dela com prefixo fixo.

**Correção:** `<BuscaDeCidade>` em `src/components/cabinet/`, dono de `cidadeColumns`,
`queryKey={['cidades']}` e `data.cidades.list`. Ele recebe `open`, `onOpenChange`, `titulo` e um
`onSelect(cidade)` tipado; cada formulário mantém o seu `setValue` dos três campos. Isso evita
acoplar o componente ao shape de quatro formulários RHF distintos e preserva a segurança dos
nomes de campo. Cobre os quatro; Colaborador passa `titulo="Busca de Naturalidade"`.

Cuidado ao mover: colaborador usa o prefixo `naturalidade` e o rótulo é outro — se o título virar
constante, a tela de Colaborador passa a dizer "Busca de Cidade" onde a transcrição §2 diz
`Naturalidade [busca +...]`.

**Estado:** concluído. Os quatro wrappers preservam seus próprios `setValue`; o título de
Naturalidade continua específico, e a suíte confirma seleção de cidade com código/nome/UF.

## 4. "Campo readOnly + lupa" reimplementado 3× fora de componente

**Severidade: média.**

- `components/cabinet/blocks.tsx:82` — Cidade dentro do `EnderecoBlock`
- `features/colaborador/colaborador-form.tsx:130` — `NaturalidadeField`
- `features/profissional/profissional-form.tsx` (bloco Dados Bancários) — Nº/Nome do banco

Cada um refaz à mão o par `<Label htmlFor>` + `<Input id readOnly>` + `<Button size="icon"
aria-label="Buscar …">` com `<Search className="size-4" />`, e reacerta o alinhamento por conta
própria. O de banco precisou de dois `<div>` de wrapper que os outros não têm, só para o
`col-span` do grid não brigar com o `flex` interno — sintoma de que o alinhamento está sendo
resolvido três vezes.

Dois deles ainda mostram o código à esquerda do nome (`<span className="w-12 shrink-0">`);
o de banco põe código e nome em campos separados. Só extrair se a API permitir que cada chamador
continue dono do seu markup de campos e o componente cuide, no máximo, da composição
campo+botão. Um componente que imponha `codigo` opcional e um único `<Input>` mudaria esse
layout, violaria a regra de nenhum pixel novo e esconderia diferenças semânticas entre cidade,
naturalidade e banco.

**Estado:** concluído com `CampoComBusca` em `blocks.tsx`, Colaborador e Profissional. O
componente não impõe o layout dos campos: só compartilha label, agrupamento e botão; quando a
busca não existe, `EnderecoBlock` continua sem lupa.

## 5. `delayMs: 200` das tabelas de apoio é configuração morta

**Severidade: baixa (mas engana quem lê).**

`src/data/index.ts` declara `delayMs: 200` em `cidades`, `bancos` e `transportadoras`. O segundo
argumento de `list` é um override desse valor — e o levantamento original encontrou **todo**
chamador de produção passando `0`:

```
features/cliente/cliente-form.tsx:92        data.cidades.list(state, 0)
features/colaborador/colaborador-form.tsx:119  data.cidades.list(state, 0)
features/fornecedor/fornecedor-form.tsx:131    data.cidades.list(state, 0)
features/profissional/profissional-form.tsx:111 data.cidades.list(state, 0)
features/profissional/profissional-form.tsx:142 data.bancos.list(state, 0)
features/ordem-compra/ordem-compra-form.tsx:154 data.transportadoras.list(state, 0)
data/provider.test.ts:86, 92, 98               (idem, 0)
```

6 de 6 chamadas de produção e 3 de 3 de teste. O número no registry nunca vale.

**Decidir de um jeito ou de outro:** se a latência é intencional (ela exercita o estado de
carregando das janelas de busca no dev), tirar o `0` das telas e deixar os testes overridarem;
se não é, tirar o `delayMs` do registry. Manter os dois é documentação falsa.

**Decisão aplicada:** a latência de 200 ms é intencional no mock para exercitar o estado de
carregamento. `tabelaDeApoio()` concentra matcher e latência; os chamadores de produção deixaram
de passar o override `0`, enquanto os testes de provider continuam podendo zerar a espera.

## 6. Baixa prioridade

- **`ABAS_SEM_CAPTURA`:** cinco forms (cliente l. 63, colaborador l. 67, fornecedor l. 76,
  profissional l. 84, orçamento l. 406) repetem a mesma dupla `TabsList` + `TabsContent`
  mapeando a constante. A main já extraiu o miolo em `components/cabinet/tela-nao-capturada.tsx`;
  falta a moldura — um `<AbasSemCaptura abas={…}>` que emite os dois `.map`.
- **Providers de apoio:** `cidades`, `bancos` e `transportadoras` são o mesmo
  `createMockListProvider` com matcher `codigo`/`nome` normalizado. Um helper `tabelaDeApoio()`
  tira três blocos idênticos — implementado junto com o item 5.

## Verificação (vale para todos os itens)

Mesma regra das fases anteriores: nenhum item aqui muda pixel. `pnpm check` → `pnpm check-types`
(com `npx tsc -p tsconfig.app.json --noEmit` quando mexer em assinatura de provider) → `pnpm test`
→ revisita no browser das telas afetadas.

Os itens 1 e 3 pedem teste novo, não só suíte verde:

- **Item 1:** um documento cujo `get` rejeita tem que mostrar o erro, não "não encontrado". Como
  os três providers de documento são mock e não rejeitam, o teste é do componente isolado
  (`renderWithQuery`) com um provider que rejeita — não de rota.
- **Item 1:** o mesmo teste deve falhar na primeira chamada e resolver na segunda; clicar em
  "Tentar de novo" precisa trocar o erro pelo documento. Só checar a presença do botão não prova
  que o `refetch()` está conectado.
- **Item 3:** depois de unificar, garantir que Colaborador continua dizendo "Busca de
  Naturalidade" e que selecionar uma cidade continua preenchendo código, nome e UF. É exatamente
  o que um componente compartilhado com título fixo ou callback incompleto quebraria em silêncio.

## Critério de saída

Nenhum consumidor de query trata rejeição como ausência; a janela de busca de cidade existe uma
vez; o par campo+lupa existe uma vez; nenhum número no registry é contrariado por 100% dos
chamadores.

## Fechamento dos itens 3–6

- `BuscaDeCidade` é a única dona das colunas, da query key e do provider de cidades; os quatro
  formulários continuam donos dos próprios callbacks e campos RHF.
- `CampoComBusca` concentra label, agrupamento e lupa sem impor o markup específico de cidade,
  naturalidade ou banco. `EnderecoBlock` segue sem botão quando não recebe busca.
- `tabelaDeApoio()` concentra o matcher código/nome e a latência mock de 200 ms para cidades,
  bancos e transportadoras. Os chamadores de produção não passam mais o override `0`; testes
  continuam podendo zerar a espera.
- `AbasSemCaptura` concentra a moldura das abas nos formulários de Cliente, Fornecedor,
  Profissional, Colaborador e Orçamento, preservando labels e conteúdo capturado de cada tela.

Verificação do fechamento: `npx tsc -p tsconfig.app.json --noEmit`; 55 testes das telas afetadas,
mais os quatro testes novos, passaram. A guarda de teste de rota passou depois que
`src/app/shell.test.tsx` migrou para `renderRoute`.
