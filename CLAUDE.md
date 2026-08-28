# CLAUDE.md — cabinet-erp-web

Orientação para o agente (claude ou kimi) neste repositório. Ler antes de qualquer tarefa.
Este repo = **front do Cabinet** (React SPA) e **dono do contrato** (`contracts/openapi-v1.json`). **O backend EXISTE desde 2026-08-17: `doutorferr0/cabinet-erp-api`** (Fastify + TS, privado), escrito no mesmo trilho — não há outro dev. Ele **consome** este contrato: mantém uma cópia conferida no CI dele e implementa o que está escrito aqui. Continua valendo que o contrato muda só por PR NESTE repo; o que mudou é que agora há com quem conferir. Memória compartilhada = `doutorferr0/projetos-claude` → `projetosClaude/vertz-erp`.

## Estilo de comunicação
PT-BR. Comprimir prosa, nunca substância. Cortar filler/cordialidade/preâmbulo. Preservar raciocínio de decisão, trade-offs, causalidade. Não inventar dado — falta = "sem dado". Revisão começa por problemas. Responder só o perguntado.

## REGRA DA FASE — O FRONT É O DONO DO CONTRATO (inegociável)
**A fase mock ACABOU e o contrato não vem mais de fora.** `contracts/openapi-v1.json` é a
especificação de **entrada** que o backend precisa implementar, não cópia que o front recebe.

- **Contrato muda SÓ por PR neste repositório.** Caminho que o front define antes de o servidor
  implementar entra marcado **`Proposto`** — o leitor precisa distinguir o que já foi implementado
  do que é pedido. **O `Proposto` continua sendo marca de INTENÇÃO, não de ausência de backend:**
  o `cabinet-erp-api` existe e implementa por partes, e operação do contrato que ele ainda não
  serve responde **501** (não 404), justamente para a diferença ficar visível.
- **Já é HTTP quase tudo, e o "quase" é a parte que muda toda semana:** o contrato tem **171
  operações em 122 caminhos** (25/08) e `ROTAS_DO_BACKEND` liga **138** — sessão (`/auth/*`),
  listas de apoio (leitura e escrita), produto com variantes e kardex, os três papéis de
  parceiro (`/api/partners`, filtro `role`) e seus contatos, orçamento, pedido de venda com
  separação e entrega, obra, colaborador, atividades, tarefas e A fazer, planner, dashboard,
  o CRM inteiro, preços, impressão e relatórios. **As outras 33 estão em `ROTAS_NO_MOCK`** —
  compras (14), comissões (13), recebimento (6). Ver `docs/integracao.md` e
  `src/mocks/rotas-do-backend.ts`, que é a lista que o CI confere.
- **O que o `Proposto` marca continua sendo INTENÇÃO, não ausência de servidor.** Dashboard e
  planner nasceram assim — caminho que o front escreveu antes de existir implementação — e hoje
  respondem. No modo mock quem responde é `src/mocks/api/handlers.ts`, e a tela não sabe a
  diferença: é isso que mantém `cabinetonline.cc` de pé sem backend nenhum.
- **Ainda mock por falta de caminho no contrato:** cidades e boletim. Seguem a regra antiga:
  dados tipados em `src/mocks/`, campos LITERAIS de `topicos/transcricaosoftlux.md` da memória.
- **Ainda mock COM caminho no contrato — que é outra coisa:** colaborador. A família tem 8
  operações — listagem, ficha, escrita, vínculo e faixas de comissão — e a passagem as liga;
  quem não migrou foi `data.colaboradores`, e o que segura é o lado do MOCK — falta handler de
  `GET /api/employees/{id}`, as duas sementes divergem e `Colaborador.id` é `number` contra o
  `format: uuid` do contrato. Dizer "falta caminho" aqui manda o próximo agente escrever
  contrato que já existe.
- **COMPRAS saiu dessa lista e ficou no MEIO do caminho, que é o estado a não esquecer.** O
  contrato publica as 14 operações do módulo (#316) e `src/mocks/api/compras.ts` as serve com
  estado de verdade — reserva da linha de pedido, devolução no cancelamento, faturamento mínimo.
  **As telas (`features/pedido-compra`, `features/ordem-compra`, `routes/compras/*`) ainda leem os
  fixtures de `src/mocks/pedidos-compra.ts` e `ordens-compra.ts`, com id NUMÉRICO.** Não é dívida
  escondida: é o trilho seguinte, e enquanto durar, as telas de compras e o mock do contrato são
  dois mundos que não se falam — gravar numa não aparece na outra. Migrar mexe em `src/data/`,
  não na tela, que é a regra de acesso a dado logo abaixo.
- **APROVAÇÕES (F12) é o caso NOVO da lista, e é mock por falta de SERVIDOR, não de caminho.** O
  contrato publica as 5 operações de `/api/approval-requests` (fila, resumo, ficha, aprovar,
  recusar), `src/mocks/api/aprovacoes.ts` as serve com estado de verdade e a tela
  (`features/aprovacao/`) as consome. O que falta do outro lado não são handlers: é o GANCHO que
  CRIA o pedido, ao gravar documento com desconto acima do teto (`cabinet-erp-api#237`, fase 1).
  Por isso as cinco ficam em `ROTAS_NO_MOCK` mesmo depois de o api sincronizar o contrato —
  ligá-las antes do gancho poria uma fila vazia no lugar de uma que funciona, e "não há nada
  para aprovar" é indistinguível de "o gancho não existe". Ver `docs/integracao.md` §Fila.
- **PROIBIDO continua:** inventar chamada HTTP, inventar shape de API sem passar pelo contrato,
  escrever à mão tipo que o contrato define. Todo tipo de servidor vem do codegen —
  `pnpm codegen` (Orval + pós-codegen), saída em `src/api/gerado/`, **commitada**, com
  `@ts-nocheck` posto pelo passo pós-codegen. **Nunca editar `src/api/gerado/` à mão**;
  conflito de merge nele se resolve rodando o codegen.
- **Operação nova NASCE exigindo sessão.** O `security` do topo do documento vale por herança;
  abrir exceção é declarar `security: []` na operação E justificar em
  `src/data/security-do-contrato.test.ts`, que é a guarda. Toda operação autenticada declara
  **401** e toda operação de domínio declara **403**, por `$ref` a `components/responses` —
  nunca copiando a descrição. Ver `docs/integracao.md` §Sessão no contrato.
- **A guarda do contrato é o CI:** o passo `Codegen is up to date` refaz o codegen e reprova se
  `src/api/gerado` divergir de `contracts/`. É a guarda inteira — mexeu no contrato, rodou
  codegen e commitou o gerado no mesmo PR.
- **A tela nunca inventa o que o contrato não cobre.** Contrato menor que a transcrição fica
  VISÍVEL: coluna que o DTO não tem sai da listagem, campo que o servidor não guarda aparece em
  branco e o `AvisoDeCobertura` avisa o operador. Preencher com mock daria dado de mentira com
  cara de dado do servidor.
- Formulários validam com Zod local; `// TODO(contract):` marca o que o codegen ainda vai substituir.

## Stack (decidida — NÃO trocar sem confirmação do user)
- **Vite + React 19 + TypeScript strict** · SPA
- **Tailwind v4 + shadcn/ui** (copy-paste, sem runtime dep de UI kit)
- **TanStack Query v5** (estado servidor) · **TanStack Table v8** · **TanStack Router** (adotado; rotas em `src/routes/`, árvore gerada em `src/routeTree.gen.ts`)
- **Orval** (codegen do contrato: tipos + hooks TanStack + Zod + handlers MSW) · cliente em `src/api/cliente.ts` (`fetch`, `credentials: 'include'` — a sessão é cookie opaco)
- **react-hook-form + Zod 4**
- **pnpm** com `minimumReleaseAge: 10080` (7d) no workspace — OBRIGATÓRIO, pós supply-chain. **Biome** (lint+format) · **vitest** + Testing Library
- **Vetos:** Redux · axios · styled-components · MUI/Antd/UI-kits de runtime · form-generator declarativo · SheetJS (`xlsx` npm) · float p/ dinheiro
- Referência visual/estrutural: shadcn/ui docs · Kiranism next-shadcn-dashboard-starter (SÓ como referência de DataTable/layout — é Next, aqui é Vite: adaptar, não copiar rotas/SSR)

## Convenções
- **Dinheiro:** trafega em **centavos (int)**; formatar R$ só na borda de exibição (`Intl.NumberFormat('pt-BR')`). NUNCA float em estado/mock.
- **Quantidade:** até 3 casas. **Datas:** ISO nos dados, exibição pt-BR. **CNPJ/CPF:** sem máscara no dado, máscara só no input.
- **Atalhos — interface por clique** (decisão do user, 30/07/2026): toda ação é alcançável por mouse e nenhum fluxo depende de tecla memorizada. Navegação em formulário é a nativa do browser (Tab / Shift+Tab, Enter no controle focado). **NÃO criar atalho customizado novo.** Os que já existem em `src/lib/shortcuts.ts` (`Ctrl+K` **paleta de comandos** · `Alt+N` incluir · `Alt+P/A/T/I` nos documentos) ficam como conveniência, não como requisito — a paleta, por exemplo, abre também pelo botão de busca da appbar — não removê-los, não expandi-los, não desenhar tela que só funcione por eles. F3–F6 continuam proibidos (conflito com browser).
- Componentes compartilhados moram em `src/components/cabinet/` (DataTable, LookupCombo, blocos) — telas só COMPÕEM, não reimplementam.
- Acessibilidade mínima: label em todo campo, foco visível, dialog com focus-trap (shadcn já dá).

## Os 9 padrões — JÁ IMPLEMENTADOS, tela nova COMPÕE (1–8 da transcricaosoftlux @padroes, 20 telas; o 9º é decisão do core)
1. **DataTable server-ready** — busca, ordenação, paginação com estado tipado `{q, sort, page, pageSize}` (mais `filtros`/`juncao`, opcionais). Nos recursos HTTP quem aplica é o backend; nos mock, o provider. É o coração: 8+ telas usam. Coluna que ordena usa `accessorKey` **em inglês**, o nome que a whitelist de `sortBy` do servidor aceita — traduzir quebra a ordenação com 400 só ao clicar no cabeçalho. **Filtro estruturado** (campo+operador+valor, portado de sadmann7/shadcn-table — ver `NOTICE`) viaja em `filters` (array JSON) + `joinOperator`, `Proposto` em `/api/products`, `/api/partners`, `/api/crm/opportunities` e `/api/quotes`. Continua **opt-in por tela** via a prop `filtros`, e só em recurso que publica o parâmetro: quem não publica recusa em voz alta na fronteira, em vez de devolver a lista inteira com a tela mostrando filtro aplicado. Campo fora da whitelist é barrado antes de sair (o contrato manda 400), e o que o operador DIGITA vira o que o dado GUARDA na saída (`normalizar` — CNPJ com máscara). Variantes: texto, número, **data** (`<input type="date">` nativo, comparação por dia), booleano, seleção e múltipla escolha. Ver `docs/integracao.md` §Filtro estruturado.
2. **LookupCombo** — Combobox (Command+Popover) + botão `...` abrindo Dialog de cadastro rápido; parametrizado por `kind` (19 usos).
3. **Blocos compartilhados** — `<EnderecoBlock>` (com busca CEP mockada) · `<ComunicadoresBlock>` (2 pares combo+texto) · `<RedesSociaisBlock>`. **`<TelefonesBlock>` saiu da lista (#186):** telefone não é mais bloco montado à mão — vem do `moduloContatos` do schema de módulos, que é quem sabe o prefixo de cada entidade (`foneComercial` na raiz do Cliente, `telefones.foneComercial` no Profissional). O componente existia sem consumidor e a lista o prometia como implementado.
4. **Form com abas** — shadcn Tabs + RHF, **1 form por tela** (não por aba), rodapé fixo Gravar/Cancelar.
5. **Janela de busca** — Dialog contendo a MESMA DataTable, com seleção e retorno.
6. **Grade no formulário** — TanStack Table + RHF `useFieldArray`, células editáveis, Incluir/Excluir linha.
7. Toda listagem: barra de ações padrão (Filtro · Incluir · Alterar · Consultar · Excluir/Cancelar · Imprimir) — componente único configurável.
8. `Ativo` checkbox em todo cadastro (desativação lógica — nunca "excluir" de verdade na UI de cadastros).
9. **View modes** (#86) — a MESMA `VitraDataTable` desenhada de outro jeito: props `visoes` (as alternativas; a tabela existe sempre e não entra na lista), `agrupamentos` e `visaoInicial`. A visão RECEBE as linhas e não consulta nada — é o que garante o "mesmo filtro" do padrão aprovado (core @decisoes, ponto 6). Visão que agrupa liga o `Agrupar por`; visão não-tabela pede o conjunto inteiro (`pageSize` no teto do contrato) e o rodapé DIZ quando o teto cortou — coluna montada com uma página é coluna falsa. Visão + agrupamento entram na consulta favorita. Piloto: o funil (`src/features/crm/pagina-do-funil.tsx`). Tela nova COMPÕE — não reimplementar alternador.

## Layout do repo
```
src/app/            # shell, providers, router, guarda de sessão
src/routes/         # rotas do TanStack Router (árvore gerada em src/routeTree.gen.ts)
src/components/ui/  # shadcn (gerado)
src/components/cabinet/  # DataTable, LookupCombo, blocos, ActionBar...
src/features/<tela>/   # fornecedor/, cliente/, produto/...
src/api/            # cliente.ts (configuração) + gerado/ (codegen — NÃO editar)
src/data/           # FRONTEIRA de dados: contrato, registry, adaptadores HTTP
src/mocks/          # dados fake tipados (só dado, sem acesso)
src/lib/            # utils, shortcuts, formatters (money, cnpj, date)
src/test/           # helpers de teste (renderRoute, renderWithQuery, instalarServidor)
contracts/openapi-v1.json  # CONTRATO — spec de entrada do backend, muda só por PR daqui
docs/integracao.md  # semânticas inegociáveis + estado da troca mock -> HTTP
```

**Regra de acesso a dado:** tela NUNCA importa `fetch*` de `src/mocks/` nem chama o cliente
gerado direto — pede a `data.<recurso>` (`src/data/index.ts`) ou ao hook da fronteira
(`useSessao`, `useLookupOptions`…). De `src/mocks/` só vêm **tipos** e **tabelas de apoio
estáticas**. Trocar mock→HTTP mexe em `src/data/`, não na tela.

**A entrada do registry tem a forma do que o CONTRATO oferece, não a que a tela gostaria.**
Produtos e parceiro expõem `list`/`get`/`empty` porque o contrato publica detalhe por id nos
dois (`GET /api/products/{id}` · `GET /api/partners/{id}`). A regra é sobre a ORIGEM de cada
método, não sobre o conjunto: **`get` só entra quando o caminho existe de verdade**, porque
`get` mock ao lado de listagem real casaria uuid do servidor com id inventado e responderia
"não encontrado" para registro que existe. Recurso ainda sem detalhe no contrato expõe
`list`/`empty` e a tela desabilita `Alterar`/`Consul.` — em branco é pior que indisponível.

**Regra de teste:** tela usa `renderRoute('/url')` (router real); componente isolado
usa `renderWithQuery(<X />)`. Ambos em `src/test/utils.tsx` — não recriar `setup()`
local com `createMemoryHistory`. Recurso HTTP se testa contra **servidor falso**
(`instalarServidor`/`json`/`problema` em `src/test/servidor.ts`), nunca com mock do módulo:
o cliente gerado chama `fetch(new Request(...))`, então **verbo e corpo vêm do `Request`** —
`init.method` dá sempre `GET`, e stub que casa só por caminho deixa `POST` cair na resposta
do `GET` e o teste passa sem asserir nada. Recurso mock segue travado por
`src/data/provider.test.ts`; os HTTP, por `src/data/<recurso>-api.test.ts`.

## Comandos
```
pnpm install
pnpm dev            # Vite (5173) — proxy /api e /auth -> VITE_API_PROXY (sem padrão)
pnpm check          # biome check --write
pnpm check-types    # tsc -b
pnpm test           # vitest run
pnpm build
pnpm codegen        # regera src/api/gerado/ a partir de contracts/openapi-v1.json
```

**Par local — PASSTHROUGH POR ROTA, não modo http global** (decisão do user, 2026-08-18):

```
pnpm dev                                          # mock puro — o padrão
VITE_API_PROXY=http://localhost:3000 pnpm dev     # backend real nas rotas de ROTAS_DO_BACKEND
```

`VITE_API_PROXY` é **a única flag da passagem** — não há chave por família, por rota nem por
módulo, e não deve haver: quem escolhe o que sai é a lista em `src/mocks/rotas-do-backend.ts`,
que é conferida contra o contrato pelo CI. Uma flag a mais seria uma segunda autoridade sobre a
mesma decisão, e a que ninguém testa é a que ganha.

Sem a variável, o MSW responde tudo e nada sai da origem — é o modo de quem não subiu o backend
e o do site público. **Com ela, e só com ela**, as operações listadas em
`rotas-do-backend.ts` saem do mock e atravessam o proxy.

A #274 (2026-08-21) fechou a passagem sobre as 78 operações de então, e **aquilo já venceu três
vezes**: o contrato foi a 124 (#341), a 163 (#348) e a **171** agora (122 caminhos). **A última
MEDIÇÃO contra o api é de 2026-08-24 (`5b2d560`, #348): 130 saíam para a rede e 33 ficavam no
MSW** — compras (14), comissões (13) e recebimento (6). Hoje a lista declara **138 e as mesmas
33**: a diferença são as 8 de impressão que a #333 acrescentou DEPOIS daquela medição, com 404
medido (o api ainda não tinha sincronizado o contrato). Ou seja, `rotas-do-backend.ts` não é
"a lista do que já dá para ligar" NEM "o interruptor entre dois ambientes" — é as duas coisas, e
qual delas vale depende de o contrato estar ou não à frente do backend naquele dia. Ele esteve
nos três estados em três dias.

**A entrega (G4, 10 operações) saiu do mock nesta remedição, e quem a apontou foi a sonda**: a
nota dizia "o módulo existe no api e não tem rota", medida em `9c5b91f`, e a Fase B mergeou desde.
Ela era o pior caso da lista — **sem tela e sem handler de mock, uma rota declarada mockada não é
respondida por ninguém: cai no fallback da SPA e devolve `index.html` com 200.**

**Não copiar esses números para lugar nenhum sem remedir** — este arquivo não roda. A fonte viva
é o console, que os imprime a cada `pnpm dev` com proxy.

**2026-08-25 — CONFERÊNCIA ESTÁTICA, e ela não substitui a medição ao vivo.** O contrato foi de
163 para **172 operações (123 caminhos)**, e a lista continuou onde estava. Cruzando o contrato
daqui com o FONTE do `cabinet-erp-api` em `origin/main` (`2ee954b`) — presença da chave
`<OperationId>` no mapa que `src/core/http/servidor.ts` compõe —, **160 das 172 têm handler** e as
12 sem handler são: **recebimento (6, `/api/goods-receipts`), layout de etiqueta (5) e
`ResetEmployeePassword`**. Consequência direta: as `natureza: 'sem-handler'` declaradas para
**comissões (13) e relatórios (10)** estão VELHAS — aquelas famílias têm handler hoje.

Isto é leitura de código, não sonda: só o `ao-vivo.test.ts` contra servidor de pé pode promover
uma linha para a passagem, e é ele que continua mandando. O que a conferência estática faz é
apontar ONDE remedir primeiro, em vez de deixar a declaração envelhecendo verde — que é
exatamente a falha que este arquivo descreve dois parágrafos acima.

**Duas armadilhas da conferência estática, as duas mordidas:** (1) o checkout local do api estava
**74 commits atrás** do `origin/main` — medir por ele apontou 85 operações "sem handler" que
existiam há dias; conferir `git rev-list --left-right --count origin/main...HEAD` ANTES. (2) o
mapa de manipuladores tem DUAS formas de chave, `Op: async (req, reply) =>` e `Op: objeto.metodo,`
— casar só a primeira perde ~90 operações e inventa um buraco que não existe.

### 501 e 404 não são a mesma dívida — `natureza`

Toda rota de `ROTAS_NO_MOCK` é respondida pelo mock, e por isso a tela mostra dado bonito em
todas. O que muda é **o que falta do outro lado**, e o campo `natureza` diz qual:

| natureza | o api responde | próximo passo |
|---|---|---|
| `sem-handler` | **501** — o contrato de lá conhece o caminho | handler no mapa de `src/core/http/servidor.ts` |
| `sem-contrato` | **404 `Este caminho não existe no contrato`** | `pnpm sync:contract` + `pnpm codegen` **no api**, ANTES do handler |

**`sem-contrato` é uma janela, não uma prateleira.** Ela abre no merge de contrato AQUI (este repo
é o dono) e fecha no `sync:contract` de LÁ. Enquanto está aberta, o mock responde 200 onde o
servidor responderia 404 — e é isso que o passthrough não pode mascarar. O console grita o número
e os caminhos numa linha própria, antes do relatório por família. **A classe DEIXOU de estar
vazia, e cresceu:** medido em 26/08, os dois `contracts/openapi-v1.json` já não batem byte a byte
— o daqui tem 143 caminhos / 196 operações, o do api tem 122 / 171, e as **25 que faltam lá são
exatamente as 25 declaradas `sem-contrato`**: os quinze da tesouraria (G7 fase A), os cinco do
ciclo da credencial e os cinco do suporte-da-plataforma. A janela está aberta e fecha no
`sync:contract` de lá. Foi a terceira vez que a frase "a classe está vazia" envelheceu sem ninguém
a invalidar; ela é verdadeira só no dia em que foi medida, e o número acima também.

**Errar a natureza manda alguém para o repositório errado**, e já aconteceu duas vezes com as
mesmas 13 rotas de comissões: a `#337` as declarou 501 medindo contra o checkout compartilhado do
api, que estava ATRÁS da main; a `#341` remediu contra a main e achou 404; agora são 501 de novo,
porque o sync aconteceu. **Prosa dentro de uma string não tem como ser conferida contra o
servidor.** Por isso é campo, e por isso `ao-vivo.test.ts` tem a sonda `a NATUREZA declarada bate
com o servidor` — o único lugar onde uma declaração de ausência tem quem a invalide (o CI não fala
com o api, então ela fica verde para sempre lá).

A sonda só afirma o que pode: **404 tem dois significados** — o do roteador ("caminho não existe
no contrato") e o do handler ("não achei este id") —, e o que os separa é o `detail`, nunca o
status. Onde 400/401/403 respondem antes do handler, o caso REGISTRA em vez de reprovar.

**Trocar `VITE_API_MODE` para `http` continua NÃO sendo a forma de falar com o backend**, e a
razão mudou: já não é o 501, é que o **site público é 100% mock** e o modo http o apagaria. Por
isso nem `rotas-do-backend.ts` nem `browser.ts` foram removidos quando a lista fechou.

**A unidade de ligação é a FAMÍLIA, não a rota** — regra que não morre com a lista cheia, só troca
de direção: antes dizia o que ainda não podia ENTRAR, agora diz o que não pode SAIR. Remover uma
linha exige o mesmo argumento que exigiu pô-la, e o teste `a passagem cobre o contrato INTEIRO`
(em `rotas-do-backend.test.ts`) aponta qual operação faltou. Operação NOVA no contrato é o único
caso em que uma linha pode faltar — e falta com o 501 medido como motivo escrito, nunca em
silêncio. **Não citar número deste arquivo sem remedir:** ele não roda, então envelhece calado.

**E confira a IDADE do processo em `:3000`** — a armadilha reincidiu na #274, por quatro minutos:
o processo nasceu 22:11 e o checkout do backend foi 22:15. `node src/main.ts` não recarrega, e um
servidor de minutos atrás já responde como o contrato de antes. A medida não é a idade, é a
comparação: `mtime` de `.git/refs/heads/main` do outro repo contra `stat -c %y /proc/<pid>` (pid
pelo `ss -ltnp`; `ps -o lstart` derrapa no WSL2). Medir sem derrubar o processo alheio = subir uma
segunda instância (`PORT=3020`) do fonte de hoje contra o MESMO banco.

**A costura do quadro do funil ACABOU** — a #274 ligou oportunidades, motivos de perda e o
`.../quote`, as duas metades do quadro passaram a vir do mesmo lado e `cobertura-do-funil.tsx` foi
removido. Aviso de falta que não existe mais é a mesma mentira com o sinal trocado.

**Duas costuras continuam declaradas NA TELA** (só com `VITE_API_PROXY`):

- **Cadastro de colaborador** — `listEmployees` passa (as atividades dependem dele) mas
  `data.colaboradores` ainda é provider de mock, e as duas listas de pessoas divergem
  (`src/features/colaborador/cobertura-do-colaborador.tsx`). **Nunca foi buraco da passagem**: o
  que falta é do lado do mock — handler de `GET /api/employees/{id}` e unificar as duas sementes.
  Sem isso o site público, que é 100% mock, ficaria sem detalhe.
- **Escrita de lista de apoio — costura que VENCEU em menos de um dia.** `POST`/`PUT
  /api/catalog-lookups` entraram na passagem respondendo **403 `papel-insuficiente`** para
  `operator-full`, e ligamos assim mesmo (decisão do user) porque mock que grava enquanto o
  servidor recusa ensina que funciona. **Não é mais o caso:** aquele `admin` da matriz era
  HERANÇA — a linha nasceu fechada quando não havia escrita no contrato e ninguém a reabriu quando
  a escrita chegou (`api#66`) —, o `api#70` afrouxou para `operator-full`, e remedido em
  `30a098e` o `POST` é **201** e o `PUT` é **200**. O `+...` grava onde o combo lê, e
  `ao-vivo.test.ts` cobra isso. **A escrita de COLABORADOR continua 403 e ali é DECISÃO, não
  herança:** `/api/employees` é `admin` porque vínculo é o que decide o papel dos outros. Papel
  que recusa não é sempre a mesma coisa — perguntar se a linha foi decidida ou herdada antes de
  aceitar o custo.

Uma variável governa as duas metades de propósito — o `vite.config.ts` a lê de `process.env`, o
`browser.ts` de `import.meta.env` (o Vite expõe ao cliente tudo que tem prefixo `VITE_`). Duas
chaves poderiam divergir, e a divergência é silenciosa: passthrough sem proxy faz `/api` cair no
fallback da SPA e a tela recebe `index.html` com status 200.

O proxy existe por causa do COOKIE (`cabinet_sessao`, sessão opaca): atravessando o Vite, `/api` e
`/auth` saem da MESMA origem da página e o cookie viaja sozinho — apontar o front direto para
:3000 tornaria tudo cross-origin e exigiria `SameSite=None; Secure` + CORS só em dev.
Com backend real o **autologin do mock não roda** (`VITE_MOCK_AUTOLOGIN` é ignorada): quem diz se
há sessão é o servidor, e semear o store abriria uma sessão que só existe no navegador.

**Ao acrescentar rota à lista, o par é obrigatório:** a operação existe no contrato (o teste
`src/mocks/rotas-do-backend.test.ts` falha se não existir) **e** o backend responde algo diferente
de 501. Rota adiantada é pior que ausente — o mock deixa de responder e a tela toma 501 sem
ninguém ter pedido. A lista é dívida deliberada: existe enquanto o contrato for maior que o
backend, e morre junto com o modo mock no dia em que as duas metades se encontrarem.

Variáveis documentadas em `.env.example` (copiar para `.env.local`, que é gitignored).

**Provar contra o backend real** — o par vivo agora RODA NO CI (job `ao-vivo`), e o que segue é
o mesmo caminho na sua máquina:

```
pnpm par:semear     # o api cria papel dono + unaccent, migra e SEMEIA (setup:ci de lá)
pnpm e2e            # sobe api + Vite e roda o fluxo no navegador
pnpm par:ao-vivo    # a fronteira em Node, com o par já de pé
```

`CABINET_API_DIR` aponta o checkout do api (padrão `../cabinet-erp-api`), e
`CABINET_API_PORT`/`CABINET_APP_PORT` movem as portas — necessário quando dois agentes têm par
local no mesmo micro, senão o segundo mede o servidor do primeiro.

**A frase que vivia aqui — "o banco de dev nasce VAZIO, semear é dado de ambiente" — VENCEU.**
`pnpm seed:dev` do api semeia duas empresas, colaborador com senha de verdade, catálogo,
parceiros, orçamentos e pedidos; `pnpm setup:ci` acrescenta o passo de superusuário
(`preparar-banco.sql`), que em dev entra pelo `initdb` do compose e num *service container* do
Actions não entraria nunca — service container não monta volume.

**E o ritual manual era o problema, não o detalhe.** Enquanto provar o par fosse quatro comandos
decorados, as baterias que dependiam dele não rodavam: a #341 mediu 27 declarações falsas em 48
horas. Guarda que depende de alguém lembrar não é guarda.

Três armadilhas de MEDIÇÃO, pagas nesta sessão:
1. **curl no `:5173` não prova a divisão.** O MSW vive no navegador; curl atravessa o proxy e
   recebe o 501 do backend em rota que, na tela, o mock responderia. curl serve para o cookie e
   para o backend; a divisão se prova pelo `ao-vivo.test.ts`, que monta os mesmos handlers.
2. **Os padrões do mock começam com `*` e casam QUALQUER origem** — inclusive `localhost:3000`.
   Medir o backend de dentro de um processo com MSW ligado devolve a resposta do MOCK, e o
   resultado parece integração. Precisa de `msw.use(http.X(url, () => passthrough()))` explícito.
3. **Escrita com corpo vazio mede errado:** a validação de schema responde 400 antes do 501. Só
   corpo VÁLIDO distingue "implementado" de "no contrato, sem servidor".

**Armadilha medida:** `pnpm check-types` (`tsc -b`) já passou verde com erro real de tipo,
reaproveitando build info. Quando a mudança mexe em assinatura de provider, conferir com
`npx tsc -p tsconfig.app.json --noEmit`. E **nunca filtrar a saída da suíte com `tail`** na
primeira rodada — redirecionar para arquivo, senão a falha some.

## Skills — situação → qual usar
Skills vivem em `~/.claude/skills/` (globais) e `.claude/skills/` (só `impeccable`, deste repo).
Disparam pela descrição, sem o user precisar digitar; `/nome` força.

| situação | skill |
|---|---|
| tela feia, layout/hierarquia/acessibilidade, fase de reface | `impeccable` |
| construir comportamento novo test-first (vitest + TL) | `tdd` |
| revisar o diff da branch antes de commitar | `code-review` |
| bug que resiste ao primeiro olhar, flake, regressão, lentidão | `diagnosing-bugs` |
| tocar o ticket já escrito de ponta a ponta | `implement` |
| dúvida de UI/estado que só se responde vendo rodar | `prototype` |
| ler doc externa (Tailwind v4, TanStack, shadcn) em fonte primária | `research` |
| conflito de merge/rebase **fora** de `src/api/gerado/` | `resolving-merge-conflicts` |

**Não usar aqui:** `to-spec`/`to-tickets`/`grill-with-docs`/`setup-matt-pocock-skills` — criam
estado local (`.scratch/`, `CONTEXT.md`, ADR) que duplicaria o tracker real, que é
`topicos/frente-visual.md` na memória. `domain-modeling` também não: nome de campo vem de
`transcricaosoftlux.md`, renomear conceito aqui é inventar campo. `wayfinder` é caro e o mapa
já existe (20 telas, 8 padrões). Conflito em `src/api/gerado/` se resolve com `pnpm codegen`,
nunca hunk a hunk.

## FECHAMENTO — obrigatório antes de encerrar QUALQUER sessão
1. `pnpm check` → zero erros. 2. `pnpm check-types` → zero erros. 3. `pnpm test` → verde (componente novo = teste novo mínimo: render + interação principal). 4. Mexeu no contrato? `pnpm codegen` e **commitar `src/api/gerado/`** — o CI tem passo `Codegen is up to date` e reprova o gerado velho. 5. Commit Conventional ≤50 char, foco no "porquê" — **adicionar por CAMINHO, nunca `git add -A`**: a árvore costuma ter trabalho de outro trilho não commitado. 6. Push → CI verde (`gh run watch`). CI vermelho = sessão não terminou. 7. **Registrar progresso em `topicos/frente-visual.md` da memória** (seção MEMÓRIA abaixo) — NUNCA tocar no `next-task.md` (é do trilho backend).

## REGRA DE OURO — N agentes no mesmo repo, zonas DISJUNTAS
Atualizada 2026-08-13 por decisão do user (`project-core` @regras) — **supersede "UM agente por
vez por repo"**. Paralelismo intra-repo está liberado, e as condições são TODAS obrigatórias:

1. **Worktree + branch própria por agente.** Ninguém trabalha na `main` direto.
2. **Zona de arquivos DISJUNTA, declarada no prompt.** Sair da zona → parar e registrar blocker.
   Worktree resolve CHECKOUT, não MERGE: o mesmo arquivo em duas branches dá o mesmo conflito de
   sempre. A divisão é por arquivo, não por assunto.
3. **Dono único de `package.json`/lockfile.** Dependência nova fora do dono → parar e registrar
   blocker, não instalar "só pra testar".
4. **Merge SERIAL na `main`** — e aqui a `main` deploya sozinha em DOIS destinos (o demo
   `cabinetonline.cc` **e** o site real `app.cabinetonline.cc`), então merge é publicação em
   produção (ver §PUBLICAÇÃO).
5. **Cada trilho escreve só no SEU arquivo de memória:** backend → `next-task.md` · visual →
   `topicos/frente-visual.md`. Handoff é a MEMÓRIA, nunca conversa colada.
6. **Enquanto um executor roda, o chat NÃO escreve na memória** (evita head divergente). Exceção:
   o user mandar.
7. **`next-task.md` VENCE o roteiro versionado** se os dois divergirem.

**Consequência prática para quem lê isto dentro de uma sessão:** a árvore pode ter trabalho de
outro agente em curso. Por isso o fechamento manda `git add` **por caminho** — `git add -A`
levaria junto a zona alheia. E `git status` sujo não é motivo para "limpar": é motivo para não
tocar no que não é seu.

**Antes de reservar tarefa:** `git branch -r --contains <oid>`. Worktree parada NÃO é trabalho em
curso — já houve tarefa reservada duas vezes para coisa que estava em `main`.

---

# MEMÓRIA — protocolo (repo projetos-claude)

## LEITURA — início de toda sessão
```bash
gh api graphql -f query='
query {
  repository(owner: "doutorferr0", name: "projetos-claude") {
    head: ref(qualifiedName: "refs/heads/main") { target { oid } }
    core:  object(expression: "main:projetosClaude/vertz-erp/project-core.md")  { ... on Blob { text } }
    state: object(expression: "main:projetosClaude/vertz-erp/current-state.md") { ... on Blob { text } }
    telas: object(expression: "main:projetosClaude/vertz-erp/topicos/transcricaosoftlux.md") { ... on Blob { text } }
    dash: object(expression: "main:projetosClaude/vertz-erp/topicos/dashboard.md") { ... on Blob { text } }
  }
}'
```
**O `frente-visual.md` NÃO vem por aqui — ele passou de 512 KB, e o `text` de `Blob` TRUNCA
nesse tamanho, sem erro e sem avisar.** Ler por ele e gravar por cima apaga a cauda do arquivo:
aconteceu **duas vezes em 16/08**, ~21 KB e ~29 KB de outras sessões perdidos, reparados em
`3142c69` e `18f7392`. O campo `isTruncated` existe no schema e ninguém o pedia. Leia pela API de
conteúdo, que não trunca:
```bash
gh api "repos/doutorferr0/projetos-claude/contents/projetosClaude/vertz-erp/topicos/frente-visual.md?ref=main" \
  --jq '.content' | base64 -d > /tmp/frente-visual.md
```
Guardar `head.target.oid`. Ecoar 2 linhas: `▸ Frente visual: <status do frente-visual.md>` · `▸ Próxima tarefa: <a colada pelo user>`.

**Sinal de arquivo íntegro:** termina em `<!-- /referencias-visuais -->`. Terminar no meio de uma
frase quer dizer que a cauda já foi comida — repare ANTES de escrever a sua rodada: ache
`atual[-400:]` dentro de um commit íntegro anterior (`gh api ...contents/...?ref=<sha>`), cole o
resto e confira `reparado.startswith(atual)`, para não desfazer o que os outros gravaram no meio.

**`topicos/dashboard.md` é a ESPECIFICAÇÃO da seção Dashboard** (páginas Dashboard e Planner):
diagramação e inventário de elementos, vindos de mockup aprovado. Está na leitura porque é a
fonte de campo/elemento dessas duas telas — o mesmo papel que `transcricaosoftlux.md` faz para as
20 telas transcritas, que não as cobrem. **É LEITURA, não escrita:** quem o mantém é o chat com o
user; o handoff dele passa só diagramação e elementos, e a decisão de componente, token e sidebar
é daqui. Progresso da implementação vai para `frente-visual.md`, como todo o resto.

## ESCRITA — fim de sessão (SÓ o tópico da frente visual)
Conteúdo COMPLETO novo de `/tmp/frente-visual.md` (estado por tarefa: feito · em curso · decisões · tentativas falhas "tentou X → falhou porque Y") →
```bash
gh api graphql -f query='
mutation($head: GitObjectID!, $vis: Base64String!) {
  createCommitOnBranch(input: {
    branch: { repositoryNameWithOwner: "doutorferr0/projetos-claude", branchName: "main" },
    expectedHeadOid: $head,
    message: { headline: "chore(vertz-erp): frente visual — <resumo>" },
    fileChanges: { additions: [
      { path: "projetosClaude/vertz-erp/topicos/frente-visual.md", contents: $vis }
    ]}
  }) { commit { oid } }
}' -f head="<oid>" -f vis="$(base64 -w0 /tmp/frente-visual.md)"
```
Head divergente (trilho backend commitou antes) → reler head, reaplicar, retry 1x.
**Conferir DEPOIS de gravar, e a régua é o tamanho:** o blob novo tem de crescer o tanto que
você inseriu (`byteSize` antes × depois). Cresceu menos = você comeu cauda alheia — repare na
hora. Comparar com `Blob { text }` não serve: ele volta truncado e acusa divergência falsa no
fim de um arquivo que está certo.
**PROIBIDO escrever em:** next-task.md, project-core.md, current-state.md, outros tópicos. Achou algo que pertence a eles → anotar no frente-visual.md em `## Para o hub` e o chat move depois.

## Regras de trabalho
- Decisão estrutural (router, dep nova fora da stack, padrão novo) → **propor antes**, 1 parágrafo com trade-off.
- Campo de tela: fonte é `transcricaosoftlux.md` — NÃO inventar campo. Exceção de origem, não de
  regra: Dashboard e Planner não estão na transcrição e vêm de `topicos/dashboard.md`. Tela fora
  das duas fontes = perguntar ao user, nunca inferir.
- Commits AQUI: git normal. Memória: gh api. NÃO confundir.
- Empacou → registrar erro literal em frente-visual.md `## Blockers` e parar. Nunca fingir sucesso.

## PUBLICAÇÃO — a `main` publica DOIS sites (medido 2026-08-23)
**Merge na `main` não atualiza mais só uma demonstração: publica o sistema que roda sobre dado de
verdade.** São DOIS projetos Cloudflare Pages ligados a ESTE repositório, os dois na branch `main`;
um push dispara os dois builds em paralelo, e o que os separa é só a env fixada em cada painel.

| destino | projeto Pages | env do build | o que é |
|---|---|---|---|
| **https://cabinetonline.cc** | `cabinet-erp-web` | `VITE_API_MODE=mock` + `VITE_DEMO_USER`/`VITE_DEMO_PASS` | vitrine: dado fake do MSW, credencial única, título `Cabinet — demo` |
| **https://app.cabinetonline.cc** | `cabinet-erp-app` | `VITE_API_URL=https://api.cabinetonline.cc`, **sem** env de demo | o **produto**: fala com o backend real (VPS + Cloudflare Tunnel), login do banco de produção, título `Cabinet` |

- **O peso da mudança:** antes, merge quebrado estragava uma vitrine; agora derruba (ou corrompe a
  vista de) um sistema em uso. `CI vermelho = sessão não terminou` deixou de ser higiene e virou a
  única trava que existe — a `main` **não** tem proteção de branch, e a Cloudflare builda em
  paralelo ao CI, sem esperar por ele (`docs/ci-qualidade.md` §2 e §3).
- **Mecânica:** `pnpm build` roda nos servidores da Cloudflare; o que é servido é o `dist/`, nunca
  o fonte. Sem `VITE_API_MODE` no painel o build nasce em **`http`** (`src/main.tsx`), e o MSW só
  sobe onde alguém fixou `mock` — hoje só o projeto do demo. Não existe "modo do repo": o modo é
  env de painel, por projeto.
- **O `app.` é cross-origin de propósito.** Base absoluta (`api.cabinetonline.cc`) em vez de proxy,
  então o cookie de sessão depende do CORS credenciado do backend — medido no ar:
  `access-control-allow-origin: https://app.cabinetonline.cc` + `access-control-allow-credentials:
  true`. Origem nova (preview, domínio novo) precisa entrar na lista do `cabinet-erp-api` antes de
  conseguir logar.
- **O `app.` mostra dado fake onde a tela ainda é mock, e isso NÃO é modo mock.** Provider de
  `src/data/index.ts` montado sobre `src/mocks/` (colaborador, compras, cidades, boletim) não fala
  com a rede em modo nenhum — em `app.cabinetonline.cc` ele serve a mesma fixture, agora ao lado de
  dado do Postgres. Migrar tela para HTTP virou trabalho de produção, não de demo.
- Push em QUALQUER outra branch → preview isolado em **cada** um dos dois projetos, com URL própria
  (aba Deployments no painel, ou status do commit no GitHub). Use pra mostrar trabalho em andamento
  — e, no preview do `cabinet-erp-app`, confira no painel a env de preview antes de supor contra
  qual API ele está falando.
- Branch `demo-site` é LEGADO (foi a branch de publicação até 2026-08-06). Não publicar por ela.
- Login do demo: `demo@vertziluminacao.com.br` / `senha1234` — **vale só em `cabinetonline.cc`**
  (gate de build; dev/testes não mudam). No `app.` quem autentica é o backend, com credencial do
  banco de produção.
