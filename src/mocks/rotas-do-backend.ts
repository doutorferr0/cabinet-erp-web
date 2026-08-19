import { http, type RequestHandler, passthrough } from 'msw'

/**
 * AS ROTAS QUE O `cabinet-erp-api` JÁ SERVE — passthrough POR ROTA, não modo global.
 *
 * Decisão do user (2026-08-18): o front NÃO vira `VITE_API_MODE=http` de uma vez.
 * O backend existe e implementa **por partes** — toda operação do contrato que
 * ele ainda não serve responde **501** (é o combinado do `CLAUDE.md`, e é o que
 * torna a diferença visível). Virar o modo inteiro trocaria vinte telas que
 * funcionam por vinte telas que tomam 501, de uma vez, para ganhar quatro que
 * falam com o servidor de verdade. Então a divisão é por operação: o que está
 * NESTA lista sai do MSW e atravessa o proxy; todo o resto continua respondido
 * pela camada em memória, e a tela não sabe a diferença.
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
 * **MEDIDO ao vivo em 2026-08-19** contra `cabinet-erp-api` main `060f472`: das 69 operações do
 * contrato, **50 respondem e 19 são 501**. `src/mocks/ao-vivo.test.ts` reproduz a medição com o
 * par local de pé. (A `main` do outro repo cresceu DURANTE a sessão — a medição do começo, em
 * `d40d1f3`, deu 46; atividades entraram no meio. Quem reabrir isto remede antes de concluir.)
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
 * ## Por que 33 e não 50 — a divisão é por TELA, não por operação
 *
 * O critério do `CLAUDE.md` (a operação existe no contrato E o backend não responde 501) é
 * NECESSÁRIO e não suficiente. Ele mede uma rota de cada vez, e o que quebra é a tela: passar
 * metade dos caminhos que UMA tela consome põe id do servidor de um lado e id inventado do
 * outro, e o resultado tem cara de dado, não de erro. É a mesma regra que o registry já aplica
 * ao `get` ("`get` mock ao lado de listagem real casaria uuid do servidor com id inventado"),
 * lida no tamanho da tela em vez do recurso.
 *
 * Ficam de fora, com o motivo medido:
 *
 * - **CRM funis e estágios** (7 operações servidas). A MESMA tela — `pagina-do-funil.tsx` — lê
 *   funis e estágios por `useFunis`/`useEstagios` e as oportunidades por
 *   `oportunidadesDoFunil(pipelineId)`. `GET /api/crm/opportunities` é **501**, então as
 *   oportunidades continuariam no mock: o quadro receberia colunas do servidor e pediria ao mock
 *   as oportunidades de um `pipelineId` que o mock nunca viu. Resposta: zero linhas, com status
 *   200. O funil ficaria permanentemente vazio, e vazio é a aparência de "não há oportunidade",
 *   não a de "a integração está pela metade". Entra junto com as oportunidades.
 * - **Atividades e colaborador** (4 + 6 operações servidas), que são UM cacho, e não dois casos.
 *   `atividade-dialogo.tsx` escolhe o `assigneeEmployeeId` no combo de `listEmployees`: passar
 *   atividade sem colaborador gravaria no Postgres o uuid de uma pessoa que só existe no mock, e
 *   o `responsável` voltaria em branco no registro que tem responsável. E passar os dois esbarra
 *   no dono da atividade — `entityType` é `opportunity | partner | quote | purchaseOrder`, e
 *   `opportunity` continua mockada (501), `purchaseOrder` nem caminho tem. Metade das atividades
 *   ficaria pendurada em id que o servidor não conhece. Some-se que `data.colaboradores`, a tela
 *   de cadastro, é provider de mock: passar `listEmployees` daria duas listas diferentes de quem
 *   trabalha aqui.
 * - **Escrita de produto e variantes** (6 operações): 501 no backend.
 *
 * **As oportunidades do CRM são a chave dos dois casos.** Não é caminho faltando no contrato nem
 * decisão daqui: servi-las libera de uma vez as 17 operações que o backend JÁ responde e esta
 * lista segura — funil e estágios (7), atividades (4) e colaborador (6) — e com elas três telas.
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

  // produtos: LEITURA. A escrita (`POST`/`PUT`, e as variantes) segue no mock
  // porque o backend responde 501 nela.
  //
  // O detalhe ENTROU agora, e conserta um defeito que a lista anterior tinha:
  // com a listagem no servidor e `GET /api/products/{id}` no mock, `Alterar` e
  // `Consul.` pediam ao mock um uuid que só existe no Postgres e recebiam "não
  // encontrado" — o formulário nem abria. O par leitura-inteira é o menor
  // recorte coerente que existe aqui: ler o que o servidor tem, e falhar na
  // gravação, que é onde a cobertura realmente acaba.
  { metodo: 'get', caminho: '/api/products' },
  { metodo: 'get', caminho: '/api/products/{id}' },

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
