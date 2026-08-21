import { http, type RequestHandler, passthrough } from 'msw'

/**
 * AS ROTAS QUE O `cabinet-erp-api` JÁ SERVE — passthrough POR ROTA, não modo global.
 *
 * Decisão do user (2026-08-18): o front NÃO vira `VITE_API_MODE=http` de uma vez.
 * O backend existe e implementa **por partes** — toda operação do contrato que
 * ele ainda não serve responde **501** (é o combinado do `CLAUDE.md`, e é o que
 * torna a diferença visível). Virar o modo inteiro trocaria vinte telas que
 * funcionam por vinte telas que tomam 501, de uma vez, para ganhar quatro que
 * falam com o servidor de verdade. Então a divisão é por FAMÍLIA (ver abaixo):
 * o que está NESTA lista sai do MSW e atravessa o proxy; todo o resto continua
 * respondido pela camada em memória, e a tela não sabe a diferença.
 *
 * **Esta lista é DÍVIDA DELIBERADA, não configuração permanente.** Ela existe
 * enquanto o contrato for maior que o backend, e o que ela mede — o quanto o
 * mock ainda finge — encolhe a cada módulo entregue do outro lado. No dia em que
 * as duas metades se encontrarem, o certo não é manter este arquivo com o
 * contrato inteiro dentro: é apagá-lo junto com `browser.ts` e ligar o modo
 * http, que era o plano desde sempre.
 *
 * *(Nota de leitura, porque o enunciado da tarefa diz o contrário e alguém vai
 * conferir: a lista em si CRESCE a cada entrega — mais rotas reais. O que
 * encolhe é a superfície mockada. Escrevi as duas metades para ninguém
 * "consertar" a direção achando que passou batido.)*
 *
 * Ao acrescentar rota aqui, o par obrigatório é: (1) a operação existe no
 * `contracts/openapi-v1.json` — o teste desta lista falha se não existir; (2) o
 * backend responde algo diferente de 501 nela. Rota adiantada é pior que rota
 * ausente: o mock deixa de responder e a tela toma 501 sem ninguém ter pedido.
 *
 * **MEDIDO ao vivo em 2026-08-19** contra `cabinet-erp-api` main `744bd75`: das 69 operações do
 * contrato, **51 respondem e 18 são 501**, e as 51 estão TODAS aqui. `src/mocks/ao-vivo.test.ts`
 * reproduz a medição com o par local de pé.
 *
 * **REMEDIDO em 2026-08-20** contra `cabinet-erp-api` main `33db0df`, e a lista foi de 51 para
 * **58**: entraram as duas famílias do bloco 2 — **obra** (`api#48`) e **contatos do parceiro**
 * (`api#53`) —, que até aqui viviam numa constante própria à espera do servidor. As sete
 * operações foram exercidas uma a uma contra o Postgres, pelo CORPO e não pelo status: `POST
 * /api/works` 201 devolvendo `customerName` resolvido por junção (nome que o seed do mock não
 * tem), `GET`/`PUT` do mesmo id refletindo a alteração, e o trio de contatos criando, listando e
 * renomeando o mesmo registro.
 *
 * **REMEDIDO no rebase, em 2026-08-20**, contra `cabinet-erp-api` main `3af4f01`, e o resultado
 * INVERTE a premissa desta lista: das **78** operações do contrato (não 69 — ele cresceu de novo),
 * **zero respondem 501**. As 20 que ficam fora da lista abaixo não estão fora porque o servidor
 * não as serve; estão fora porque a FAMÍLIA delas ainda não foi conferida inteira. A dívida
 * mudou de lado — era do backend, virou nossa.
 *
 * Isso não autoriza acrescentá-las aqui em bloco: o critério de família fechada continua valendo,
 * e é ele que segura. Produto arrasta variantes e kardex; o funil arrasta motivos de perda e
 * `crm/opportunities/{id}/quote`; o dashboard é painel próprio. Cada uma é uma decisão de tela,
 * uma por vez.
 *
 * **A sonda desta rodada não deixou 400 por resolver, e isso é o que a torna conclusiva.** Das 78
 * operações, 16 pararam em 400 na primeira passada — inconclusivo pela regra do parágrafo acima.
 * Refeitas com corpo derivado de LEITURA real (o registro que o servidor devolveu, sem o `id`) e
 * com `content-type` omitido onde não há corpo, as 16 viraram 200/201/204/409: resposta de
 * DOMÍNIO, que só existe se houver handler atrás. Duas armadilhas próprias apareceram aí —
 * `POST /auth/logout` no começo da varredura derruba a sessão e faz as 15 seguintes lerem 401, e
 * `POST .../stages` com corpo derivado de uma listagem VAZIA manda `{}` e lê 400 por engano.
 *
 * **Armadilha nova, e ela não estava em nenhuma das três já anotadas:** o backend que atende em
 * `:3000` pode ser um PROCESSO VELHO. `node src/main.ts` não recarrega sozinho, e o que estava no
 * ar tinha 26 horas — servia parceiro SEM os campos da fase 1 e do bloco 2, e respondia como se o
 * contrato não os tivesse. A medição só ficou honesta subindo uma segunda instância do fonte
 * atual (`PORT=3001`) contra o MESMO banco. Antes de concluir qualquer coisa do par local:
 * conferir a idade do processo (`ps -o lstart`), não só o `/health`.
 *
 * A `main` do outro repo cresceu DURANTE a sessão — `d40d1f3` dava 46, `060f472` deu 50 — então
 * quem reabrir isto remede antes de concluir qualquer coisa. E remede pela SONDA, não por leitura
 * de código: contar `operationId` nos arquivos `rotas.ts` dos módulos do backend deixou de fora
 * `ListCatalogLookups`, que mora em `catalogo/lookups.ts`, e a lista nasceu uma rota menor do que
 * podia. A varredura HTTP não tem como errar isso.
 *
 * A sonda que vale é ESCRITA COM CORPO VÁLIDO. Corpo vazio devolve 400 em quase toda operação —
 * a validação de schema dispara ANTES do handler que responde 501 — e isso faz uma varredura
 * ingênua ler "implementado" em vinte rotas que não existem. `POST /api/products` com corpo
 * completo é 501; com `{}` é 400.
 *
 * **A recíproca também morde, e custou uma leitura errada nesta rodada:** GET com query param
 * obrigatório devolve 400 quando o param falta, e 400 não é 501 — a varredura marcou
 * `/api/dashboard/agenda` e `/api/crm/reports/lost-reasons` como servidas. Com `from` e `to` as
 * duas respondem 501. Toda leitura de 400 numa sonda é INCONCLUSIVA: significa "a validação
 * respondeu antes", e não diz nada sobre haver handler atrás dela.
 *
 * ## FAMÍLIA INTEIRA — a unidade de ligação não é a rota
 *
 * O critério do `CLAUDE.md` (a operação existe no contrato E o backend não responde 501) é
 * NECESSÁRIO e não suficiente. Ele mede uma rota de cada vez, e o que quebra é a TELA: passar
 * metade dos caminhos que uma tela consome põe id do servidor de um lado e id inventado do
 * outro, e o resultado tem cara de dado, não de erro. É a mesma regra que o registry já aplica
 * ao `get` ("`get` mock ao lado de listagem real casaria uuid do servidor com id inventado"),
 * lida no tamanho da família em vez do recurso.
 *
 * Então a lista liga por família fechada, e uma família só fecha quando o backend serve TODA a
 * superfície que a tela consome dela. Hoje fecham catorze famílias, e por isso as **64** estão
 * aqui. As que sobram ficam inteiras no mock — **oportunidades, motivos de perda e relatório de
 * perdas do CRM**, **indicadores e agenda do dashboard** e a **escrita de listas de apoio** —
 * e isso é escolha nossa, não limite do servidor: elas respondem. As duas primeiras ficam porque
 * ninguém conferiu a família inteira contra a tela que a consome; a terceira fica por PAPEL, que
 * é caso diferente e está escrito abaixo.
 *
 * **REMEDIDO em 2026-08-20** contra `cabinet-erp-api` main `3089106`, e a lista foi de 58 para
 * **64**: entrou a família de **produto** inteira — escrita, variantes e kardex (#274).
 *
 * A sonda foi de ROUND-TRIP, não de status: `POST /api/products` com o corpo CHEIO que o
 * formulário monta (unidades, tipo, e `specs` com watts/volts/temperatura), releitura do detalhe
 * campo a campo, `PUT`, variante criada e alterada pelo mesmo produto, movimento de kardex e o
 * saldo voltando no detalhe. **Um campo não volta idêntico, e está medido:** `unitInQty: '12'`
 * volta `'12.000'` — o servidor normaliza quantidade em três casas, que é a convenção do repo. O
 * mock ecoava o que recebia; depois desta ligação, quem digita `12` relê `12.000`.
 *
 * **A escrita de listas de apoio NÃO entrou, e o motivo não é 501:** `POST` e `PUT` de
 * `/api/catalog-lookups` respondem **403 `papel-insuficiente`** para `operator-full`, que é o
 * papel do usuário demo — a matriz do backend reserva esse caminho a `admin`. Ligá-la trocaria um
 * `+...` que grava por um `+...` que recusa, em 19 telas. A decisão de quem cadastra item de lista
 * está em `api#66`; enquanto ela não vem, `GET` passa e a escrita fica. É por isso que o teste da
 * divisão por VERBO passou a usar `catalog-lookups` como exemplo, no lugar de produto.
 *
 * Duas famílias entraram JUNTAS, e separá-las seria o erro:
 *
 * - **Atividades + colaborador.** `atividade-dialogo.tsx` escolhe o `assigneeEmployeeId` no combo
 *   de `listEmployees`. Atividade no Postgres com pessoa do mock gravaria o uuid de quem o
 *   servidor não conhece, e o `responsável` voltaria em branco no registro que TEM responsável.
 * - **Listas de apoio + todo o resto.** `catalog-lookups` é a raiz de quase todo combo: catálogo
 *   mockado ao lado de registro do servidor faz `sectorId`/`jobTitleId` apontarem para id que o
 *   mock nunca viu, e o rótulo sai em branco na leitura.
 *
 * ## As duas costuras que a passagem abriu, e onde elas foram tratadas
 *
 * Ligar família servida ao lado de família em 501 deixa costura, e costura escondida é o defeito
 * que esta lista existe para evitar. As duas foram para a TELA, que é onde o operador as vê:
 *
 * - **Quadro do funil**: colunas do servidor, oportunidades do mock. O quadro sai vazio, e
 *   vazio parece "não há oportunidade". `cobertura-do-funil.tsx` diz que a metade que falta é a
 *   do servidor.
 * - **Cadastro de colaborador**: `listEmployees` passa, mas `data.colaboradores` ainda é provider
 *   de mock — o combo de responsável oferece as pessoas do Postgres e a tela lista as da
 *   transcrição. `cobertura-do-colaborador.tsx` diz isso ao operador. A tela não migrou junto de
 *   propósito: falta o handler mock de `GET /api/employees/{id}` e as duas sementes de
 *   colaborador são conjuntos diferentes — trocar o provider deixaria o cadastro sem detalhe no
 *   SITE PÚBLICO, que é 100% mock.
 */

type Verbo = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type RotaDoBackend = {
  /** Verbo HTTP. A divisão é por VERBO + caminho, nunca por caminho só. */
  readonly metodo: Verbo
  /**
   * Caminho como o contrato o escreve, com parâmetro em `{...}`. A tradução
   * para o padrão do MSW (`:id`) e o `*` de origem moram em `padraoDoMsw()` —
   * escrever o caminho na forma do contrato é o que deixa a guarda do teste
   * comparar os dois lados sem tabela de conversão à mão.
   */
  readonly caminho: string
}

export const ROTAS_DO_BACKEND: readonly RotaDoBackend[] = [
  // saúde — não exige sessão, e é por onde se confere que o par local está de pé
  { metodo: 'get', caminho: '/health' },
  { metodo: 'get', caminho: '/health/db' },

  // sessão inteira (6 operações). Ou TODAS as seis passam, ou nenhuma: login
  // pelo servidor e `/auth/me` pelo mock daria duas verdades sobre a mesma
  // sessão — o cookie `cabinet_sessao` numa metade, o store em memória na
  // outra, e a tela acreditando na que respondeu primeiro.
  { metodo: 'post', caminho: '/auth/login' },
  { metodo: 'post', caminho: '/auth/logout' },
  { metodo: 'post', caminho: '/auth/change-password' },
  { metodo: 'get', caminho: '/auth/me' },
  { metodo: 'get', caminho: '/auth/tenants' },
  { metodo: 'put', caminho: '/auth/active-tenant' },

  // produto: FAMÍLIA INTEIRA (8 operações), desde a #274.
  //
  // A leitura já estava aqui; a escrita entrou agora, e com ela as variantes e o
  // kardex. O recorte "leitura sim, escrita não" que vigorou até aqui era o
  // menor coerente ENQUANTO o backend respondia 501 na gravação — não é mais o
  // caso, e mantê-lo passaria a ser o defeito que esta lista evita: o operador
  // consultaria produto do Postgres e gravaria no mock, e a alteração sumiria na
  // próxima leitura sem erro nenhum.
  //
  // As variantes entram JUNTO por obrigação, não por conveniência: elas são
  // gravadas pelo MESMO botão do produto (`escreverProduto` e depois
  // `gravarVariantes`, em `produtos-api.ts`). Produto no Postgres com variante no
  // mock deixaria a grade do formulário apontando para um `productId` que o mock
  // nunca viu — metade da gravação de cada lado, que é a costura que a regra de
  // família existe para impedir.
  //
  // O kardex entra pela mesma razão levada ao fim: ele pende da VARIANTE
  // (`/api/variants/{variantId}/stock-movements`) e o saldo é derivado dele. Hoje
  // nenhuma tela o consome — `produtos-api.ts` diz isso em voz alta —, então
  // ligá-lo não muda nada visível; deixá-lo fora é que criaria a armadilha para
  // quem escrever essa tela depois, com movimento no mock e variante no servidor.
  { metodo: 'get', caminho: '/api/products' },
  { metodo: 'get', caminho: '/api/products/{id}' },
  { metodo: 'post', caminho: '/api/products' },
  { metodo: 'put', caminho: '/api/products/{id}' },
  { metodo: 'post', caminho: '/api/products/{productId}/variants' },
  { metodo: 'put', caminho: '/api/products/{productId}/variants/{id}' },
  { metodo: 'get', caminho: '/api/variants/{variantId}/stock-movements' },
  { metodo: 'post', caminho: '/api/variants/{variantId}/stock-movements' },

  // parceiro (5 operações) — os três papéis (cliente, fornecedor, profissional)
  // são o mesmo recurso com filtro `role`, então servir a listagem e o detalhe
  // atende as três telas de uma vez.
  { metodo: 'get', caminho: '/api/partners' },
  { metodo: 'post', caminho: '/api/partners' },
  { metodo: 'get', caminho: '/api/partners/{id}' },
  { metodo: 'put', caminho: '/api/partners/{id}' },
  { metodo: 'post', caminho: '/api/partners/{id}/link' },

  // orçamento (6 operações) — o módulo INTEIRO, e é o que o torna seguro. A
  // tela lê a listagem, abre o documento, grava e cancela pelo mesmo servidor,
  // e o cliente de cada orçamento é um parceiro que também vem de lá.
  //
  // `POST /api/quotes/{id}/order` entra junto: converter é escrita do módulo do
  // orçamento, e deixá-la no mock faria o botão gravar um pedido que só existe
  // no navegador, a partir de um orçamento que existe no banco.
  { metodo: 'get', caminho: '/api/quotes' },
  { metodo: 'post', caminho: '/api/quotes' },
  { metodo: 'get', caminho: '/api/quotes/{id}' },
  { metodo: 'put', caminho: '/api/quotes/{id}' },
  { metodo: 'post', caminho: '/api/quotes/{id}/cancel' },
  { metodo: 'post', caminho: '/api/quotes/{id}/order' },

  // pedido de venda (5 operações) — servidas, e NENHUMA tela as consome ainda.
  // Entram porque o par que esta lista exige é sobre o servidor, não sobre o
  // consumidor: a operação está no contrato e o backend responde. Enquanto não
  // houver tela, o efeito prático é nenhum; no dia em que houver, ela nasce
  // falando com o Postgres em vez de nascer mockada e precisar migrar depois.
  { metodo: 'get', caminho: '/api/orders' },
  { metodo: 'post', caminho: '/api/orders' },
  { metodo: 'get', caminho: '/api/orders/{id}' },
  { metodo: 'put', caminho: '/api/orders/{id}' },
  { metodo: 'post', caminho: '/api/orders/{id}/cancel' },

  // quadro de tarefas e lista A fazer (5 operações) — módulo inteiro.
  //
  // Convivem com um dashboard ainda mockado (`/api/dashboard/summary` e
  // `/api/dashboard/agenda` são 501) e isso é DIFERENTE do caso do funil: os
  // indicadores e a agenda são painéis próprios, com consulta própria, sem id
  // em comum com a tarefa. O que se perde é a contagem do resumo bater com o
  // quadro ao lado — dois painéis discordando, e não um quadro vazio mentindo
  // que não há trabalho.
  { metodo: 'get', caminho: '/api/tasks' },
  { metodo: 'post', caminho: '/api/tasks' },
  { metodo: 'patch', caminho: '/api/tasks/{taskId}' },
  { metodo: 'get', caminho: '/api/todos' },
  { metodo: 'patch', caminho: '/api/todos/{todoId}' },

  // planner (2 operações) — o módulo inteiro do jeito que o contrato o publica.
  // Projeto e plano são só leitura, e o plano é do projeto que a listagem deu:
  // não há id de fora entrando na tela.
  { metodo: 'get', caminho: '/api/projects' },
  { metodo: 'get', caminho: '/api/projects/{projectId}/plan' },

  // listas de apoio — os 19 kinds do padrão `[combo]`, numa operação só.
  //
  // Passa porque é a RAIZ de quase toda combinação: enquanto o catálogo vinha
  // do mock e os registros vinham do servidor, todo `sectorId`/`jobTitleId` que
  // o Postgres guarda apontava para um id que o mock nunca viu, e o rótulo saía
  // em branco na leitura (`useRotulosDeApoio`). Catálogo e registro têm de vir
  // do mesmo lugar, sempre.
  //
  // **Banco de dev vazio devolve combo vazio, e isso é a verdade dele**, não um
  // defeito desta lista — a mesma situação de `GET /api/products` desde o
  // primeiro dia. Semear é dado de ambiente.
  { metodo: 'get', caminho: '/api/catalog-lookups' },

  // atividades (4 operações) — o painel polimórfico de `entityType`.
  { metodo: 'get', caminho: '/api/activities' },
  { metodo: 'post', caminho: '/api/activities' },
  { metodo: 'put', caminho: '/api/activities/{id}' },
  { metodo: 'post', caminho: '/api/activities/{id}/done' },

  // colaborador (6 operações). Vem JUNTO com atividades, e não por arredondar
  // a lista: `atividade-dialogo.tsx` escolhe o `assigneeEmployeeId` no combo de
  // `listEmployees`. Atividade no Postgres com pessoa do mock gravaria o uuid
  // de quem o servidor não conhece, e o responsável voltaria em branco no
  // registro que TEM responsável.
  { metodo: 'get', caminho: '/api/employees' },
  { metodo: 'post', caminho: '/api/employees' },
  { metodo: 'get', caminho: '/api/employees/{id}' },
  { metodo: 'put', caminho: '/api/employees/{id}' },
  { metodo: 'post', caminho: '/api/employees/{id}/link' },
  { metodo: 'put', caminho: '/api/employees/{id}/link' },

  // CRM: funis e estágios (7 operações). As OPORTUNIDADES seguem em 501, e a
  // consequência está tratada na tela, não escondida aqui: o quadro do funil
  // recebe colunas do servidor e pediria ao mock as oportunidades de um
  // `pipelineId` que o mock nunca viu — zero linhas com status 200. Vazio
  // parece "não há oportunidade". `cobertura-do-funil.tsx` diz que a metade
  // que falta é a do servidor, e por isso a passagem pode acontecer agora.
  { metodo: 'get', caminho: '/api/crm/pipelines' },
  { metodo: 'post', caminho: '/api/crm/pipelines' },
  { metodo: 'get', caminho: '/api/crm/pipelines/{id}' },
  { metodo: 'put', caminho: '/api/crm/pipelines/{id}' },
  { metodo: 'get', caminho: '/api/crm/pipelines/{pipelineId}/stages' },
  { metodo: 'post', caminho: '/api/crm/pipelines/{pipelineId}/stages' },
  { metodo: 'put', caminho: '/api/crm/pipelines/{pipelineId}/stages/{id}' },

  // obra do cliente (4 operações) — `api#48`, medida em 2026-08-20.
  //
  // Família INTEIRA de saída: a listagem devolve `customerName` resolvido por
  // junção com `partners`, e o `customerId` de cada linha é uuid do Postgres.
  // Meia família aqui casaria obra do servidor com cliente do mock, e a tela
  // mostraria obra sem dono — que tem cara de cadastro incompleto, não de erro.
  { metodo: 'get', caminho: '/api/works' },
  { metodo: 'post', caminho: '/api/works' },
  { metodo: 'get', caminho: '/api/works/{id}' },
  { metodo: 'put', caminho: '/api/works/{id}' },

  // contatos do parceiro (3 operações) — `api#53`, medida em 2026-08-20.
  //
  // Sub-recurso de `/api/partners/{partnerId}`, que já passa: são as duas
  // metades da MESMA tela. Contato mockado pendurado em parceiro do servidor
  // (ou o inverso) daria grade cheia num cadastro vazio, e o `PUT` gravaria em
  // `partnerId` que o outro lado não conhece.
  { metodo: 'get', caminho: '/api/partners/{partnerId}/contacts' },
  { metodo: 'post', caminho: '/api/partners/{partnerId}/contacts' },
  { metodo: 'put', caminho: '/api/partners/{partnerId}/contacts/{contactId}' },
]

/**
 * Caminho do contrato → padrão do MSW.
 *
 * O `*` na frente casa QUALQUER origem, que é o que os testes exigem (eles
 * apontam o cliente para uma base absoluta) e o que o navegador precisa quando
 * `VITE_API_URL` existe. Sem ele, o padrão só valeria para a origem da página.
 */
function padraoDoMsw(caminho: string): string {
  return `*${caminho.replace(/\{(\w+)\}/g, ':$1')}`
}

/**
 * Handlers que mandam a requisição para a REDE em vez de responder.
 *
 * `passthrough()` é o "não sou eu quem responde" do MSW: o worker deixa a
 * requisição seguir, o proxy do Vite a entrega em `VITE_API_PROXY` e o cookie
 * de sessão viaja porque a origem é a mesma (ver o comentário do proxy em
 * `vite.config.ts`).
 *
 * A ORDEM importa e é responsabilidade de quem monta o worker: estes vêm ANTES
 * dos handlers do mock — o MSW resolve no primeiro que casa — e antes do atraso
 * artificial, porque rota real já tem a latência dela e somar 250ms de mentira
 * mediria o servidor errado.
 *
 * **`backendReal` é parâmetro, e não leitura de `import.meta.env` aqui dentro,
 * porque é a garantia do SITE PÚBLICO.** `cabinetonline.cc` builda sem
 * `VITE_API_PROXY`, e o que o mantém 100% mock é esta lista nascer vazia lá —
 * uma lista publicada por engano viraria erro de rede em produção contra um
 * `localhost` que não existe. Enquanto a condição morava numa expressão do
 * `browser.ts`, ela era um comentário: nenhum teste roda `browser.ts`, que
 * importa `msw/browser`. Como argumento, a garantia é um caso de teste.
 */
export function handlersDePassagem(backendReal: string | undefined): RequestHandler[] {
  if (!backendReal) return []
  return ROTAS_DO_BACKEND.map(({ metodo, caminho }) =>
    http[metodo](padraoDoMsw(caminho), () => passthrough()),
  )
}
