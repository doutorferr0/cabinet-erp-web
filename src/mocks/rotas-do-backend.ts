import { http, type RequestHandler, passthrough } from 'msw'

/**
 * AS ROTAS QUE O `cabinet-erp-api` JÁ SERVE — passthrough POR ROTA, não modo global.
 *
 * Decisão do user (2026-08-18): o front NÃO vira `VITE_API_MODE=http` de uma vez.
 * O backend existe e implementava **por partes** — toda operação do contrato que
 * ele ainda não servisse respondia **501** (é o combinado do `CLAUDE.md`, e era o
 * que tornava a diferença visível). Virar o modo inteiro trocaria vinte telas que
 * funcionam por vinte telas que tomam 501, de uma vez, para ganhar quatro que
 * falam com o servidor de verdade. Então a divisão é por FAMÍLIA (ver abaixo):
 * o que está NESTA lista sai do MSW e atravessa o proxy; todo o resto continua
 * respondido pela camada em memória, e a tela não sabe a diferença.
 *
 * **Desde a #274 (2026-08-21) a lista tem as 78 operações do contrato, e nenhuma
 * responde 501.** O argumento acima não caducou junto — ele é o que explica por
 * que o `VITE_API_MODE=http` continua sem ser o caminho, e a razão mudou: já não
 * é o backend que falta, é o site público que precisa do mock. Ver a seção "O
 * dia em que as duas metades se encontraram", abaixo.
 *
 * **Esta lista é DÍVIDA DELIBERADA, não configuração permanente.** Ela existe
 * enquanto o contrato for maior que o backend, e o que ela mede — o quanto o
 * mock ainda finge — encolhe a cada módulo entregue do outro lado.
 *
 * *(Nota de leitura, porque o enunciado da tarefa diz o contrário e alguém vai
 * conferir: a lista em si CRESCE a cada entrega — mais rotas reais. O que
 * encolhe é a superfície mockada. Escrevi as duas metades para ninguém
 * "consertar" a direção achando que passou batido.)*
 *
 * ## O dia em que as duas metades se encontraram foi ESTE (2026-08-21, #274)
 *
 * A frase que vivia aqui — "no dia em que as duas metades se encontrarem, o
 * certo não é manter este arquivo com o contrato inteiro dentro: é apagá-lo
 * junto com `browser.ts` e ligar o modo http" — chegou ao seu dia, e a
 * conclusão dela está ERRADA pela metade. **A lista agora contém as 78
 * operações do contrato**, e mesmo assim nem ela nem o `browser.ts` podem ser
 * apagados, por uma razão que não existia quando aquilo foi escrito:
 *
 * **o site público é 100% mock e continua precisando do MSW.**
 * `cabinetonline.cc` builda sem `VITE_API_PROXY`, `handlersDePassagem` nasce
 * vazia lá, e é o mock inteiro que serve a demonstração. Ligar
 * `VITE_API_MODE=http` apagaria o site público para ganhar um `if` a menos em
 * dev. Então o que este arquivo passou a ser não é mais "a lista do que já
 * dá para ligar" — é **o interruptor entre dois ambientes**: com
 * `VITE_API_PROXY`, nada é mockado; sem ela, tudo é.
 *
 * A consequência prática, para quem for mexer aqui: **não há mais rota do
 * contrato do lado do mock quando o par local está de pé.** Um caminho que
 * saia desta lista não vira "família mockada" — vira o único buraco no meio de
 * uma passagem completa, que é a costura mais fácil de não perceber. Tirar
 * qualquer linha daqui exige o mesmo argumento que exigiu pô-la.
 *
 * Ao acrescentar rota aqui, o par obrigatório é: (1) a operação existe no
 * `contracts/openapi-v1.json` — o teste desta lista falha se não existir; (2) o
 * backend responde algo diferente de 501 nela. Rota adiantada é pior que rota
 * ausente: o mock deixa de responder e a tela toma 501 sem ninguém ter pedido.
 *
 * **Isso vale agora para o contrato CRESCER, não para esta lista alcançá-lo.** A
 * lista está completa; quem publicar operação nova no contrato tem de medi-la
 * contra o par local antes de pô-la aqui — e o teste `a passagem cobre o
 * contrato INTEIRO` vai apontar a operação nova no momento em que ela nascer.
 * Operação recém-escrita no contrato que o backend ainda não serve é o único
 * caso em que uma linha PODE faltar aqui, e ela falta com o 501 como motivo
 * escrito, não em silêncio.
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
 * **zero respondem 501**. As 20 que ficavam fora não estavam fora porque o servidor não as serve;
 * estavam fora porque a FAMÍLIA delas ainda não fora conferida inteira. A dívida mudou de lado —
 * era do backend, virou nossa.
 *
 * **REMEDIDO em 2026-08-21 (#274) contra `cabinet-erp-api` main `3089106`, e a lista fechou: 58 →
 * 78.** As 20 que faltavam entraram TODAS, em cinco famílias — escrita de produto e variantes,
 * kardex, dashboard, CRM (oportunidades, motivos de perda e o relatório) e a escrita de listas de
 * apoio. A dívida que esta lista mede acabou; o que sobra dela é o papel de interruptor descrito
 * acima.
 *
 * A sonda foi de ROUND-TRIP, não de status: cada escrita foi relida e conferida campo a campo — o
 * `PUT` de produto voltando a descrição alterada, a variante criada e alterada pelo mesmo produto,
 * o movimento devolvendo `balanceAfter: 5`, a oportunidade movida de `Contato` para `Proposta` e
 * o `stageId` conferido na releitura, o orçamento gerado abrindo em `GET /api/quotes/{id}`.
 *
 * **Resultado: 18 das 20 respondem 200/201, 2 respondiam 403 por PAPEL, nenhuma responde 501.** As
 * duas do 403 eram `POST`/`PUT /api/catalog-lookups`, e entraram assim mesmo, com o custo posto na
 * mesa. **REMEDIDO em 2026-08-21 contra `30a098e`: não respondem mais 403 — `POST` é 201 e `PUT` é
 * 200.** O `api#70` afrouxou a matriz de `admin` para `operator-full` horas depois da medição
 * acima, e o custo aceito aqui deixou de existir antes de ser pago. Ver o bloco daquela família.
 *
 * Duas leituras erradas foram desfeitas nesta rodada, as duas MINHAS e não do servidor, e ficam
 * anotadas porque nenhuma estava nas armadilhas já catalogadas:
 *
 * 1. **A armadilha do processo velho REINCIDIU, e por quatro minutos.** Ela já está anotada mais
 *    abaixo, com "26 horas" — e é justamente por isso que quase passou: quatro minutos parecem
 *    fresco. O processo do `:3000` nasceu 22:11 e o checkout do backend para `3089106` é de
 *    22:15. **A idade do processo não é a medida certa; a comparação é.** O sinal é o `mtime` de
 *    `.git/refs/heads/main` do outro repo contra o instante de nascimento do processo
 *    (`stat -c %y /proc/<pid>`), e o pid vem do `ss -ltnp`, não do `ps -o lstart` — que derrapa
 *    no WSL2. A medição honesta saiu de uma segunda instância (`PORT=3020`) do fonte de hoje,
 *    contra o MESMO banco, sem derrubar a que estava no ar.
 * 2. **`GET /api/crm/pipelines/{id}/stages` devolve ARRAY PURO**, não o `{rows, total}` das
 *    listagens paginadas. Ler `.rows` ali dá `undefined`, que parece "pipeline sem estágio" — e
 *    fez a primeira sonda mover a oportunidade para o MESMO estágio e ler 200 de um no-op. Com os
 *    cinco estágios de verdade, o `PATCH` moveu e a releitura confirmou.
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
 * a validação de schema dispara ANTES do handler — e isso faz uma varredura ingênua ler
 * "implementado" em rota que não existe. Quando isto foi escrito, `POST /api/products` com corpo
 * completo era 501 e com `{}` era 400; hoje as duas leituras mudaram (201 e 400), e é a REGRA que
 * sobrevive ao exemplo: o status que a validação devolve não fala do handler atrás dela.
 *
 * **A recíproca também morde, e custou uma leitura errada:** GET com query param obrigatório
 * devolve 400 quando o param falta, e 400 não é 501 — a varredura chegou a marcar
 * `/api/dashboard/agenda` e `/api/crm/reports/lost-reasons` como servidas por engano, quando as
 * duas ainda eram 501. **As duas estão na lista desde a #274, e com `from`/`to` respondem 200** —
 * o que não desfaz a lição: toda leitura de 400 numa sonda é INCONCLUSIVA, significa "a validação
 * respondeu antes" e não diz nada sobre haver handler atrás dela. Nesta rodada a regra pagou de
 * novo: `POST /api/crm/opportunities` leu 400 com `stageId: undefined` e virou 201 com o par
 * pipeline/estágio derivado de leitura real.
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
 * superfície que a tela consome dela. **Desde a #274 fecham TODAS**, e por isso as 78 estão aqui:
 * nenhuma operação do contrato ficou do lado do mock.
 *
 * A regra não morre com a lista cheia — ela troca de direção. Enquanto faltava rota, a família
 * dizia o que ainda NÃO podia entrar; com a lista completa, ela diz o que não pode SAIR. O teste
 * desta lista passou a medir a cobertura contra o contrato inteiro, justamente para que remover
 * uma linha exija o mesmo argumento que exigiu acrescentá-la.
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
 * ## As costuras: uma MORREU nesta rodada, a outra continua — e não é desta lista
 *
 * Ligar família servida ao lado de família mockada deixa costura, e costura escondida é o defeito
 * que esta lista existe para evitar. As duas foram para a TELA, que é onde o operador as vê.
 *
 * - **Quadro do funil — RESOLVIDA, e o aviso saiu junto.** Enquanto as oportunidades ficaram
 *   fora, o quadro recebia colunas do servidor e cartões do mock: `{rows: [], total: 0}` com
 *   status 200, que se lê como "não há negócio". `cobertura-do-funil.tsx` existia para desfazer
 *   essa leitura, e ele mesmo dizia que sairia inteiro quando a família fechasse. Fechou aqui, e
 *   ele saiu. **Aviso de falta que não existe mais é a mesma mentira com o sinal trocado**, e é
 *   pior que a original: ensina o operador a ignorar avisos, e o próximo será de verdade.
 *
 * - **Cadastro de colaborador — CONTINUA, e nunca foi buraco desta lista.** As seis operações de
 *   `/api/employees` passam desde antes; o que falta é do lado do MOCK, não do backend:
 *   `data.colaboradores` ainda é provider de mock, sem handler de `GET /api/employees/{id}` e com
 *   duas sementes de pessoas que são conjuntos diferentes. `cobertura-do-colaborador.tsx` diz
 *   isso ao operador e segue no lugar. Migrar a tela deixaria o cadastro sem detalhe no SITE
 *   PÚBLICO, que é 100% mock — está em curso na #276/PR #277, fora daqui.
 *
 * ## A costura de PAPEL que esta rodada abriu, e que durou menos que a PR
 *
 * `POST`/`PUT /api/catalog-lookups` entraram ligadas **respondendo 403** para o papel do usuário
 * demo: não era falta de servidor nem meia família, era a matriz de papéis do backend recusando o
 * `operator-full`, e o efeito visível seria o `+...` do `LookupCombo` deixando de gravar em 19
 * telas com o par local de pé. O custo foi aceito de olhos abertos.
 *
 * **Ele não se paga mais.** Aquele `admin` era HERANÇA — a linha da matriz nasceu fechada quando
 * não havia escrita de lookup no contrato, e a escrita chegou depois sem ninguém reabrir a linha
 * de propósito (`api#66`). O `api#70` afrouxou para `operator-full` no mesmo dia. Medido contra
 * `30a098e` com sessão real: **`POST` 201, `PUT` 200**, e `ao-vivo.test.ts` passou a cobrar isso —
 * item criado através do app e relido direto no backend.
 *
 * **Fica a distinção, que é o que vale guardar:** a escrita de COLABORADOR continua 403 para
 * `operator-full`, e ali é DECISÃO e não herança — a matriz reserva `/api/employees` a `admin`
 * porque vínculo é o que decide o papel dos outros. Remedido junto: segue 403. Papel que recusa
 * não é sempre a mesma coisa; vale perguntar se a linha foi decidida ou herdada antes de aceitar
 * o custo.
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

  // produto: FAMÍLIA INTEIRA — leitura, escrita, variantes e kardex.
  //
  // "A escrita segue no mock porque o backend responde 501 nela" era o motivo
  // escrito aqui, e ele VENCEU. Medido contra `3089106` com corpo válido e
  // sessão real: `POST` 201, `PUT` 200, variantes 201/200. Nenhuma é 501.
  //
  // O par leitura-inteira já estava certo (listagem + detalhe juntos: com o
  // detalhe no mock, `Alterar` pedia ao mock um uuid que só existe no
  // Postgres e o formulário nem abria). A escrita entra pelo MESMO argumento,
  // um passo adiante: abrir o formulário com o registro do servidor e gravar
  // no mock devolveria "gravado" sobre uma cópia que a próxima leitura não
  // traz. A metade que faltava era justo a que o operador aperta.
  //
  // As VARIANTES entram junto por obrigação, não por simetria: são gravadas
  // pelo MESMO botão do produto (`salvarProduto` em `src/data/produtos-api.ts`
  // grava o produto e em seguida cada variante editada). Produto no Postgres
  // com variante no mock deixaria a grade apontando para um `productId` que o
  // mock nunca viu — metade da gravação de cada lado.
  //
  // **Um campo não volta idêntico, e está medido:** `unitInQty: '12'` volta
  // `'12.000'` (o servidor normaliza quantidade em três casas, que é a
  // convenção do repo). O mock ecoava o que recebia; depois desta ligação,
  // quem digita `12` relê `12.000`.
  { metodo: 'get', caminho: '/api/products' },
  { metodo: 'get', caminho: '/api/products/{id}' },
  { metodo: 'post', caminho: '/api/products' },
  { metodo: 'put', caminho: '/api/products/{id}' },
  { metodo: 'post', caminho: '/api/products/{productId}/variants' },
  { metodo: 'put', caminho: '/api/products/{productId}/variants/{id}' },

  // kardex (2 operações) — **e agora TÊM tela**, o que muda o que estas linhas
  // custam.
  //
  // Entraram sem consumidor: o `GET` era medido só por HTTP e o risco de ligar
  // era zero. `/estoque/movimentacao` deixou de ser `TelaNaoCapturada` e passou
  // a ler o kardex de verdade (`src/features/estoque/`), então o `GET` daqui é o
  // que a grade mostra quando o proxy está de pé.
  //
  // **E é aí que a MEIA FAMÍLIA aparece, com o proxy ligado:** o kardex sai do
  // servidor, mas `stock-locations` e `stock-balances` continuam em
  // `FORA_DE_PROPOSITO` (escrita de depósito é 403 por papel — a medição está lá).
  // Resultado: o `locationId` do movimento é uuid do Postgres e a lista de
  // depósitos é do mock, então a coluna `Depósito` cai no fallback e mostra o
  // uuid cru em vez do nome. Não é defeito da tela: é o preço, VISÍVEL, de a
  // família estar partida. Sem proxy — o modo do site público — as três vêm do
  // mock e a tela fecha certo.
  { metodo: 'post', caminho: '/api/variants/{variantId}/stock-movements' },
  { metodo: 'get', caminho: '/api/variants/{variantId}/stock-movements' },

  // perfil de custo (5 operações) — a metade de COMPRA da formação de preço, e
  // ela nasce no servidor sem passar pelo mock. É decisão, não pendência: o
  // mock teria de reimplementar a cascata inteira (quatro descontos
  // encadeados, IPI, encargo sobre base composta, frete com duas bases) para a
  // simulação devolver número, e número de margem inventado com cara de
  // apuração é pior do que tela vazia — é o mesmo argumento dos dez
  // relatórios. Sem proxy, a tela cai no `AvisoDeCobertura`.
  { metodo: 'get', caminho: '/api/cost-profiles' },
  { metodo: 'post', caminho: '/api/cost-profiles' },
  { metodo: 'get', caminho: '/api/cost-profiles/{id}' },
  { metodo: 'put', caminho: '/api/cost-profiles/{id}' },
  { metodo: 'post', caminho: '/api/cost-profiles/{id}/simulate' },

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
  //
  // A ESCRITA entrou junto, e a história dela vale mais que o resultado.
  //
  // Ela foi ligada em 2026-08-21 **sabendo que respondia 403** — decisão do
  // user, de olhos abertos: `POST` e `PUT` de `/api/catalog-lookups` não eram
  // 501, eram **403 `urn:cabinet:erro:papel-insuficiente`** para
  // `operator-full`, o papel do usuário do seed. A consequência aceita era
  // visível: com `VITE_API_PROXY` ligado, o `+...` do `LookupCombo` — cadastro
  // rápido do padrão 2, usado em 19 telas — recusaria em vez de gravar. Ligamos
  // assim mesmo porque a alternativa era pior: mock que grava enquanto o
  // servidor recusa ensina que funciona, e o defeito só apareceria no dia da
  // ligação, com a tela já construída em cima da ficção.
  //
  // **O custo não se paga mais, e o motivo interessa.** Aquele `admin` da
  // matriz do backend (`src/core/http/classificacao.ts`) era HERANÇA: a linha
  // nasceu fechada quando não havia escrita de lookup no contrato — o próprio
  // comentário dela dizia "sem escrita no contrato de hoje" —, a escrita chegou
  // depois (`api#38`) e ninguém reabriu a linha de propósito. Levantado em
  // `api#66`, afrouxado para `operator-full` em `api#70`, no mesmo dia.
  //
  // **Remedido em 2026-08-21 contra `30a098e`, com sessão real de
  // `operator-full`: `POST` → 201, `PUT` → 200.** O `+...` grava onde o combo
  // lê, e `ao-vivo.test.ts` cobra isso: item criado através do app e relido
  // DIRETO no backend.
  //
  // A escrita de COLABORADOR continua 403, e ali é DECISÃO e não herança — a
  // matriz reserva `/api/employees` a `admin` porque vínculo é o que decide o
  // papel dos outros, e isso tem razão própria escrita. Remedido junto: segue
  // 403. **Papel que recusa não é sempre a mesma coisa:** antes de aceitar o
  // custo de uma recusa, vale perguntar se a linha foi decidida ou herdada.
  { metodo: 'get', caminho: '/api/catalog-lookups' },
  { metodo: 'post', caminho: '/api/catalog-lookups' },
  { metodo: 'put', caminho: '/api/catalog-lookups/{id}' },

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

  // CRM: funis e estágios (7 operações).
  { metodo: 'get', caminho: '/api/crm/pipelines' },
  { metodo: 'post', caminho: '/api/crm/pipelines' },
  { metodo: 'get', caminho: '/api/crm/pipelines/{id}' },
  { metodo: 'put', caminho: '/api/crm/pipelines/{id}' },
  { metodo: 'get', caminho: '/api/crm/pipelines/{pipelineId}/stages' },
  { metodo: 'post', caminho: '/api/crm/pipelines/{pipelineId}/stages' },
  { metodo: 'put', caminho: '/api/crm/pipelines/{pipelineId}/stages/{id}' },

  // CRM: oportunidades (6 operações) — **e é isto que MATA a costura do funil**.
  //
  // Enquanto elas ficaram fora, o quadro recebia colunas do servidor e pedia ao
  // mock as oportunidades de um `pipelineId` que o mock nunca viu: `{rows: [],
  // total: 0}` com status 200, que se lê como "não há negócio neste funil".
  // `cobertura-do-funil.tsx` existia só para desfazer essa leitura. Com as duas
  // metades no mesmo lado, a costura deixa de existir e o aviso saiu junto —
  // manter um aviso de falta que não há é a mesma mentira, com o sinal trocado.
  //
  // `opportunities/{id}/quote` entra por ser escrita do módulo, como
  // `quotes/{id}/order` já entrava: converter oportunidade em orçamento com o
  // orçamento vindo do Postgres e a oportunidade do mock gravaria um documento
  // pendurado num negócio que o servidor não conhece. Medido de ponta a ponta —
  // **201**, e o `quoteId` devolvido abre em `GET /api/quotes/{id}` (número 13).
  //
  // O 400 que a medição anterior leu aqui era regra de DOMÍNIO, não falta de
  // handler: "Converta o lead em cliente antes de gerar o orçamento" — a
  // oportunidade da sonda não tinha `partnerId`. Com uma que tem, 201.
  { metodo: 'get', caminho: '/api/crm/opportunities' },
  { metodo: 'post', caminho: '/api/crm/opportunities' },
  { metodo: 'get', caminho: '/api/crm/opportunities/{id}' },
  { metodo: 'put', caminho: '/api/crm/opportunities/{id}' },
  { metodo: 'patch', caminho: '/api/crm/opportunities/{id}/stage' },
  { metodo: 'post', caminho: '/api/crm/opportunities/{id}/quote' },

  // CRM: motivos de perda (3) e o relatório que os agrega (1).
  //
  // Vêm JUNTO das oportunidades e não depois: `lostReasonId` é campo da
  // oportunidade, e o `PATCH .../stage` o exige ao mover para um estágio de
  // perda. Catálogo mockado ao lado de oportunidade do servidor gravaria um
  // motivo que o Postgres não conhece, e o relatório — que agrega por esse id —
  // sairia com a coluna vazia num funil cheio de negócios perdidos.
  //
  // O relatório é GET com `from`/`to` OBRIGATÓRIOS. Sem eles responde 400, e
  // 400 já enganou uma varredura desta lista: leu-se "servida" onde havia 501.
  // Hoje, com o par de datas, responde 200.
  { metodo: 'get', caminho: '/api/crm/lost-reasons' },
  { metodo: 'post', caminho: '/api/crm/lost-reasons' },
  { metodo: 'put', caminho: '/api/crm/lost-reasons/{id}' },
  { metodo: 'get', caminho: '/api/crm/reports/lost-reasons' },

  // dashboard (2 operações) — indicadores e agenda.
  //
  // Painel próprio, sem id em comum com o quadro de tarefas que já passava: o
  // que se ganha é a contagem do resumo voltar a bater com o quadro ao lado.
  // Enquanto ficaram no mock, os dois painéis discordavam — o resumo contava a
  // ficção e o quadro contava o Postgres.
  //
  // `agenda` é GET com `from`/`to` obrigatórios, mesma armadilha do relatório
  // de perdas: com o par de datas, 200 e dez itens.
  { metodo: 'get', caminho: '/api/dashboard/summary' },
  { metodo: 'get', caminho: '/api/dashboard/agenda' },

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

  // PAGAMENTO (5 operações) — G1 do `prompts-leva-softlux-fase2.md`, api#161.
  //
  // **A razão de estar fora VENCEU.** A nota que segurava a família na lista de
  // exceção do teste foi escrita em 2026-08-22 contra o api `e47827e` e dizia
  // "no servidor de hoje não há handler nenhum … `git grep` por `payment-terms`
  // devolve ZERO". A fase B do trilho entrou depois: `src/modules/pagamento/`
  // existe na `main` do api com os cinco handlers.
  //
  // **MEDIDO em 2026-08-23** contra `cabinet-erp-api` main `024aed8`, em par
  // ISOLADO — Postgres próprio migrado até a `0075`, servidor em `:3011`,
  // sessão real de `semear-dev` —, e o isolamento não é zelo: o processo que
  // ocupava `:3000` nesta máquina servia o commit `2b4c72f` de uma worktree
  // `obra-sortby`, **sem `src/modules/pagamento/`**. Medir contra ele daria o
  // 404 do Fastify e "provaria" de novo a nota vencida.
  //
  //   GET /api/payment-terms       200 · {rows: [], total: 0} (banco de dev não semeia condição)
  //   GET /api/installment-policy  200 · {10000, 5000, 6} — o padrão do servidor, sem linha gravada
  //   POST /api/payment-terms      201 · 30/60/90 com uuid do Postgres
  //   PUT  /api/payment-terms/{id} 200 · a mesma condição relida com 2 parcelas
  //   PUT  /api/installment-policy 200 · teto 6 → 8, e o POST seguinte de 9× recusou
  //                                      com `urn:cabinet:erro:parcelas-acima-do-teto`
  //
  // Essa última linha é a que fecha a família: a política GOVERNA a condição no
  // servidor, e é por isso que as duas não podem se separar. Condição do
  // Postgres com política do mock recusaria um plano de 8× que o servidor
  // aceita — e a divergência apareceria como 400 numa gravação que a tela tinha
  // por válida.
  //
  // **As três ESCRITAS entram, e aqui elas não repetem a decisão pendente dos
  // depósitos.** `POST`/`PUT` respondem 403 `papel-insuficiente` para o
  // `operator-full` do usuário demo (com `admin` são 201 e 200, medido acima) —
  // mesma leitura do 403 dos depósitos, custo DIFERENTE: lá a tela de estoque
  // existe e é ela que aperta o botão recusado; aqui a fronteira do front é
  // só-leitura por decisão declarada (`src/data/pagamento-api.ts`: "quem
  // cadastra condição é a tela de configuração, que ainda não existe"). Nenhuma
  // tela chama as três, então ligá-las não tira gravação de ninguém — e
  // deixá-las no mock é que criaria a meia família.
  //
  // **O que MUDA no par local, e é dado de ambiente e não costura:** o
  // `semear-dev.ts` do api não cria condição de pagamento, então o combo do
  // bloco Pagamento abre VAZIO com o proxy de pé, contra as condições semeadas
  // que o mock oferece. O bloco já sabe dizer isso ("Sem condição", "Documento
  // sem condição de pagamento") — é o estado legítimo de empresa que ainda não
  // cadastrou, não uma falta escondida. O site público não vê nada disso: sem
  // `VITE_API_PROXY` a lista nasce vazia e o mock serve tudo.
  { metodo: 'get', caminho: '/api/payment-terms' },
  { metodo: 'post', caminho: '/api/payment-terms' },
  { metodo: 'put', caminho: '/api/payment-terms/{id}' },
  { metodo: 'get', caminho: '/api/installment-policy' },
  { metodo: 'put', caminho: '/api/installment-policy' },
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
