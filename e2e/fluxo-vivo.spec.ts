import { type Page, expect, test } from '@playwright/test'

/**
 * O FLUXO VIVO — cinco telas, uma sessão, zero mock.
 *
 * Este é o único teste do repositório que roda no NAVEGADOR contra o Postgres.
 * `src/mocks/ao-vivo.test.ts` mede a fronteira em Node — status, shape, quem
 * respondeu; aqui se mede o que ele não alcança: a tela montando o que voltou.
 *
 * A distinção não é acadêmica. Os dois defeitos mais caros deste repo passariam
 * inteiros por uma asserção de status:
 *
 * - **`empresas.find is not a function` (#226)** — o proxy não estava montado,
 *   `/api` caiu no fallback da SPA e voltou `index.html` com status **200**. Um
 *   `expect(r.status).toBe(200)` teria passado.
 * - **id do servidor de um lado, id do mock do outro** — as duas metades
 *   respondem 200 e a tela mostra "nenhum registro" com cara de dado.
 *
 * ## O que faz este teste ser "ao vivo" de verdade
 *
 * `VITE_API_PROXY` (posta pelo `playwright.config.ts`) liga as duas metades ao
 * mesmo tempo: o proxy do Vite e a lista de passagem do MSW. Com ela, **nenhuma
 * rota de `/api` chega ao mock** — é a afirmação da #274, e é o que faz cada
 * clique daqui virar linha no Postgres. Sem ela, este arquivo mediria o mock e
 * ficaria VERDE, que é o pior resultado possível. Por isso o primeiro caso não
 * é o login: é a prova de que quem responde é o servidor.
 *
 * ## Por que um fluxo só, e encadeado
 *
 * Mínimo é requisito, não economia. Suíte de tela é o trabalho da bateria de
 * componentes, que roda em jsdom em segundos e não precisa de banco. O que só
 * este arquivo prova é a CORRENTE: o parceiro criado na tela 2 é o que o
 * orçamento da tela 4 escolhe, e o pedido da tela 5 nasce daquele orçamento.
 * Cada elo é um id que atravessou HTTP, RLS e voltou.
 *
 * Daí `fullyParallel: false` e `workers: 1` no config — e daí os passos serem
 * `test.step` dentro de um caso só, em vez de cinco `test()`: `test()` separado
 * anuncia independência que não existe, e o segundo falharia sozinho por culpa
 * do primeiro.
 */

const EMAIL = process.env.CABINET_EMAIL ?? 'demo@vertz.dev'
const SENHA = process.env.CABINET_SENHA ?? 'senha-de-desenvolvimento'

/**
 * Sufixo por execução — o banco do CI nasce limpo, o do dev local não.
 *
 * Nome fixo faria a segunda rodada local achar o registro da primeira e passar
 * sem ter criado nada. É a mesma armadilha de `Cenário já semeia saldo`: número
 * fixo mede a semente, não o que o teste fez.
 */
const MARCA = `E2E-${Date.now().toString(36).toUpperCase()}`

/** O uuid que o Postgres gera — nenhum mock precisaria acertar este formato. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * Espera o 201 de uma escrita — a asserção que não depende de navegação.
 *
 * Prender o teste a "para onde a tela foi depois de gravar" o faz reprovar por
 * uma decisão de produto que pode mudar, e sem nada a dizer sobre o que foi
 * gravado. Aqui o que se afirma é o que atravessou HTTP.
 */
function esperarEscrita(page: Page, caminho: string) {
  return page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().includes(caminho) && r.status() === 201,
    { timeout: 60_000 },
  )
}

/**
 * Espera a url PARAR DE MUDAR — a única espera honesta para o que vem depois de
 * gravar neste app.
 *
 * MEDIDO em cinco execuções deste arquivo: depois do `Gravar` do orçamento, a
 * tela ora fica na listagem, ora segue para o documento recém-criado. As duas
 * coisas acontecem no mesmo commit, com a mesma semente — é corrida entre o
 * `navigate` do `onSuccess` e a invalidação do cache, não decisão de produto.
 *
 * Prender o teste a QUALQUER um dos dois destinos o faz reprovar em metade das
 * rodadas, e um E2E intermitente é pior que E2E nenhum: ensina a reexecutar até
 * passar. O que dá para afirmar sem escolher lado é que, uma hora, ela para.
 *
 * (A não-determinação em si é achado do app, e está registrada na PR. Não é
 * papel deste arquivo consertá-la — é papel dele não fingir que não existe.)
 */
async function urlEstavel(page: Page) {
  let anterior = ''
  for (let i = 0; i < 20; i++) {
    const atual = page.url()
    if (atual === anterior) return atual
    anterior = atual
    await page.waitForTimeout(500)
  }
  return page.url()
}

async function entrar(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  // O destino é o Dashboard (decisão do user, ver `features/login/login.tsx`).
  // Espera-se SAIR do login, e não chegar numa rota específica: prender a
  // asserção ao destino faria uma decisão de produto quebrar este arquivo.
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60_000 })
}

/**
 * Espera a grade PARAR DE CARREGAR — ou tem linha, ou declarou vazio.
 *
 * Esperar só por linha reprova a consulta legitimamente vazia com "elemento não
 * encontrado", que manda investigar o seletor; e não esperar nada lê a grade no
 * meio do esqueleto. A união dos dois estados é a única condição que significa
 * "a tela terminou de responder".
 *
 * Seletor CSS em vez de `locator.or()` de propósito: o `.or()` sobre um
 * `.first()` já reprovou aqui com "element(s) not found" antes de esgotar o
 * tempo, e um teste de integração que erra a ESPERA acusa a tela errada.
 */
async function grade(page: Page) {
  await page
    .locator('tbody tr:not([data-testid="linha-de-esqueleto"]), [data-testid="vazio-da-consulta"]')
    .first()
    .waitFor({ state: 'visible', timeout: 60_000 })
  return page.locator('tbody tr:not([data-testid="linha-de-esqueleto"])')
}

/**
 * Abre uma listagem já PAGINADA LARGO, e o motivo não é conveniência.
 *
 * A grade nasce com 10 por página, e o registro que este teste acabou de criar
 * é o último da ordem padrão. No CI o banco nasce semeado e ele cabe na
 * primeira página; num banco de dev que já rodou o teste algumas vezes, não —
 * e a falha sai como "o registro não voltou na listagem", que acusa a GRAVAÇÃO
 * quando o defeito é da leitura da segunda página. Custou duas execuções, uma
 * em cada tela, e é o mesmo conserto nas duas: 50, o maior que o seletor
 * oferece.
 */
async function listagem(page: Page, rota: string) {
  await page.goto(rota)
  // Confere que estamos NA listagem antes de ler qualquer `tbody tr`: os
  // documentos também têm grade (a de itens), e ler a errada produz uma falha
  // que descreve a tela errada.
  await expect(page.getByRole('button', { name: 'Incluir' })).toBeVisible({ timeout: 60_000 })
  await grade(page)
  await page.selectOption('#vitra-page-size', '50')
  return grade(page)
}

test('login → parceiro → produto → orçamento → pedido, contra o Postgres', async ({ page }) => {
  // Erro de console é registrado, não reprovado: a tela pode logar aviso de
  // terceiro sem estar quebrada, e reprovar por isso ensina a ignorar a suíte.
  // O que vale é o console TRAZER o motivo quando um passo abaixo falhar.
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[console] ${m.text().slice(0, 200)}`)
  })

  await test.step('quem responde é o servidor, e não o mock', async () => {
    // ANTES de qualquer clique, e a sonda é `/auth/me` SEM sessão de propósito.
    //
    // O proxy do Vite desvia só `/api` e `/auth` — são os dois prefixos do
    // contrato. `/health` NÃO está entre eles: sondá-lo daqui devolve
    // `index.html` com status 200, e o teste reprovaria por acertar a rota
    // errada. (Custou a primeira execução deste arquivo, e a lição é a mesma da
    // #226: **200 com HTML dentro é o disfarce**, não o erro.)
    //
    // Sem sessão, o servidor responde 401 em problem+json. As duas metades da
    // asserção são necessárias: o STATUS prova que há uma borda decidindo — o
    // fallback da SPA responderia 200 —, e o CONTENT-TYPE prova que quem
    // respondeu fala o contrato. É a mesma conferência que `src/api/http.ts`
    // faz em produção.
    const r = await page.request.get('/auth/me')
    expect(r.status(), 'o backend não está de pé em CABINET_API_PORT').toBe(401)
    expect(r.headers()['content-type'] ?? '', 'HTML aqui = proxy não montado').toContain('json')
  })

  await test.step('login real — o cookie de sessão atravessa o proxy', async () => {
    await entrar(page)
    const cookies = await page.context().cookies()
    expect(
      cookies.map((c) => c.name),
      'sem `cabinet_sessao` o resto seria o mock respondendo',
    ).toContain('cabinet_sessao')
  })

  const nomeDoCliente = `CLIENTE ${MARCA}`

  await test.step('parceiro — o que a tela grava existe no Postgres', async () => {
    await page.goto('/cadastros/clientes')
    await page.getByRole('button', { name: 'Incluir' }).click()
    await page.waitForURL(/clientes\/novo/, { timeout: 60_000 })

    // `Gravar` só existe depois que o formulário SUJA — ele sobe para a barra de
    // alterações (ver `components/cabinet/cadastro-form.tsx`). Procurar o botão
    // antes de digitar acha nada, e a falha diria "botão não encontrado" para um
    // formulário perfeitamente montado.
    await page.getByLabel('Nome', { exact: true }).fill(nomeDoCliente)

    // A asserção fica na RESPOSTA, e não em "para onde a tela navegou depois".
    //
    // Custou três execuções descobrir por quê: depois de gravar, o app ora
    // parava na listagem, ora seguia para o documento — e um teste preso à
    // navegação reprova por essa diferença sem ter nada a dizer sobre o que foi
    // gravado. O 201 é do servidor e não tem duas leituras; o `id` que ele
    // devolve é o que o Postgres gerou, e é ele que os passos seguintes usam.
    const gravou = esperarEscrita(page, '/api/partners')
    await page.getByRole('button', { name: 'Gravar' }).click()
    const criado = (await (await gravou).json()) as { id: string }
    expect(criado.id).toMatch(UUID)

    // E a listagem tem de MOSTRAR o que foi gravado: 201 prova que o servidor
    // aceitou, não que a tela relê. As duas metades falham por motivos
    // diferentes — cache que não invalida some só aqui.
    //
    // `urlEstavel` antes de navegar pelo mesmo motivo do passo do orçamento: o
    // app pode ter uma navegação em curso, e um `goto` disparado no meio dela é
    // atropelado.
    await urlEstavel(page)
    await listagem(page, '/cadastros/clientes')
    await expect(page.getByText(nomeDoCliente).first()).toBeVisible({ timeout: 60_000 })
  })

  await test.step('produto — a listagem traz o catálogo semeado', async () => {
    const linhas = await listagem(page, '/cadastros/produtos')
    // O catálogo vem de `pnpm seed:dev` do api. Zero linha aqui significa uma de
    // duas coisas, e as duas são falha de verdade: o banco não foi semeado, ou a
    // empresa ativa da sessão não é a que tem catálogo.
    await expect(linhas.first()).toBeVisible()
    expect(await linhas.count(), 'catálogo vazio — `pnpm par:semear` rodou?').toBeGreaterThan(0)
  })

  const obra = `OBRA ${MARCA}`

  await test.step('orçamento — nasce com o cliente que este teste criou', async () => {
    await page.goto('/vendas/orcamentos')
    await page.getByRole('button', { name: 'Incluir' }).click()
    await page.waitForURL(/orcamentos\/novo/, { timeout: 60_000 })

    // A url troca ANTES de o formulário montar — o documento tem sete seções e
    // vários combos que consultam o servidor. Clicar aí é clicar no vazio, e a
    // falha sai como "botão não abriu o diálogo", que manda investigar o
    // componente errado. Esperar o primeiro campo é esperar o formulário.
    await expect(page.getByLabel('Cliente')).toBeVisible({ timeout: 60_000 })

    // O caminho do OPERADOR, e não o atalho de digitar o nome: o botão ao lado
    // do campo abre `SearchDialog`, que lista `GET /api/partners?role=customer`.
    // É este o elo da corrente — o parceiro só aparece nessa busca porque o
    // passo anterior gravou no Postgres. Preencher o campo à mão passaria igual
    // e não provaria nada sobre o que foi gravado.
    await page.getByRole('button', { name: 'Cliente', exact: true }).click()
    const busca = page.getByRole('dialog')
    await expect(busca).toBeVisible({ timeout: 30_000 })

    // BUSCAR pelo nome, e não rolar até achar. O diálogo embute a mesma grade
    // paginada em 10, então num banco que já rodou este teste o cliente novo
    // cai fora da primeira página — e a falha sai como "linha não encontrada",
    // acusando a gravação de novo. O campo alimenta o `q` da listagem, que é
    // resolvido NO SERVIDOR: filtrar aqui é mais uma coisa provada, não um
    // desvio.
    await busca.getByLabel('Busca').fill(MARCA)

    // ESPERAR A GRADE FILTRAR, e não só a linha aparecer.
    //
    // O `q` vai ao SERVIDOR. Enquanto a resposta não chega, o diálogo segue
    // mostrando a lista inteira — e a linha procurada já está visível ali, vinda
    // da página 1. Clicar nesse instante acerta um nó que o React substitui
    // quando a resposta filtrada chega: o clique se perde, e a falha aparece
    // duas linhas abaixo como **`Selecionar` desabilitado**, que descreve a
    // consequência e não a causa.
    //
    // MEDIDO no CI, e SÓ lá: nesta máquina o servidor responde antes da
    // asserção e o defeito não existe. É o caso clássico do teste que passa no
    // dev e reprova no runner por diferença de tempo — e o conserto não é
    // timeout maior, é uma condição que só o estado FILTRADO satisfaz.
    //
    // `MARCA` é único por execução, então a grade filtrada tem exatamente UMA
    // linha. Esperar por isso é esperar a resposta do servidor, e de quebra
    // prova que o `q` filtra de verdade.
    await expect(
      busca.locator('tbody tr'),
      'o `q` do servidor não filtrou até o parceiro recém-criado',
    ).toHaveCount(1, { timeout: 60_000 })

    const achado = busca.locator('tbody tr').first()

    // Clicar a linha MARCA a escolha; quem a aplica é `Selecionar` (o próprio
    // diálogo diz isso na descrição). Aqui a linha marca em vez de abrir — é a
    // outra metade do par da `#198`: *"onde a linha marca (janela de busca), os
    // dois marcam"*.
    await achado.click()

    // A seleção PEGOU — asserção própria, para a falha acusar o gesto em vez do
    // botão que ficou desabilitado por consequência.
    await expect(achado, 'o clique não marcou a linha').toHaveAttribute('data-state', 'selected')
    await busca.getByRole('button', { name: 'Selecionar' }).click()
    await expect(busca).toBeHidden({ timeout: 30_000 })
    await expect(page.getByLabel('Cliente')).toHaveValue(nomeDoCliente)

    await page.getByLabel('Descrição da Obra').fill(obra)

    const gravou = esperarEscrita(page, '/api/quotes')
    await page.getByRole('button', { name: 'Gravar' }).click()
    // `number` é STRING no contrato, e não inteiro — a numeração do documento é
    // do domínio, não aritmética. Escrever `toBeGreaterThan(0)` aqui passou a
    // parecer certo e reprovou com `Received has type: string`, que é o tipo de
    // detalhe que só um par de verdade devolve.
    const orcamento = (await (await gravou).json()) as {
      id: string
      number: string
      customerId: string
    }

    // As três asserções deste passo, e cada uma cobre um defeito diferente:
    expect(orcamento.id, 'o id é do Postgres').toMatch(UUID)
    // O NÚMERO vem da numeração por empresa do servidor. O formulário não o
    // tinha para dar — o campo `Código` nasce vazio na inclusão.
    expect(orcamento.number, 'a numeração é do servidor').toMatch(/^\d+$/)
    // E o cliente é o que o diálogo escolheu, pelo ID. Esta é a asserção que
    // reprova o defeito que este arquivo encontrou na primeira execução
    // completa: `customerId: ''` saindo da tela e 400 voltando do servidor.
    expect(orcamento.customerId, 'o diálogo de busca tem de gravar o ID, não só o nome').toMatch(
      UUID,
    )

    // ESPERAR a navegação do app terminar antes de sair da tela.
    //
    // Um `goto` disparado no meio dela é atropelado, e o passo seguinte acaba
    // lendo a grade de ITENS do documento — que também é `tbody tr` — como se
    // fosse a listagem. A falha saía como "o orçamento não voltou na listagem",
    // com a tela errada na frente.
    await urlEstavel(page)
  })

  await test.step('pedido — a conversão é do servidor, e leva ao documento novo', async () => {
    await listagem(page, '/vendas/orcamentos')

    const linha = page.locator('tbody tr', { hasText: obra }).first()
    await expect(linha, 'o orçamento gravado não voltou na listagem').toBeVisible({
      timeout: 60_000,
    })
    // ESPAÇO na linha, e não clique. Nesta tela a linha ABRE o documento — é o
    // par que a `#198` documenta: *"onde a linha abre, Enter abre e o Espaço
    // marca"*. Clicar desmontava a listagem, e a falha saía como "elemento não
    // encontrado", apontando para o seletor em vez do gesto. Checkbox também
    // não serve: a coluna de marcação não existe nesta grade, e procurá-lo
    // esgota o tempo sem dizer o motivo.
    //
    // O gesto vai dentro de um `toPass` porque a grade REFAZ a consulta ao
    // trocar o tamanho da página, e um gesto disparado durante a troca acerta um
    // nó que o React substitui — o mesmo defeito que derrubou o diálogo de busca
    // no CI, aqui com outra causa. `toPass` reexecuta o par gesto+asserção; não
    // é afrouxamento, porque a asserção é a mesma e ela ainda reprova no fim.
    //
    // `Gerar Pedido` mora na barra de SELEÇÃO (`needsSelection: true`), não no
    // cabeçalho: sem linha marcada o botão não existe, e a falha sairia como
    // "botão não encontrado" em vez de "a linha não ficou selecionada".
    await expect(async () => {
      await linha.press(' ')
      await expect(linha).toHaveAttribute('data-state', 'selected', { timeout: 5_000 })
    }).toPass({ timeout: 60_000 })

    await page.getByRole('button', { name: 'Gerar Pedido' }).click()
    // O diálogo confirma antes de converter, e o texto do botão é minúsculo no
    // 'pedido' — `Gerar Pedido` (ação) e `Gerar pedido` (confirmação) são dois
    // controles diferentes, e casar sem `exact` pegaria o da barra de novo.
    await page.getByRole('button', { name: 'Gerar pedido', exact: true }).click()

    // O sucesso NAVEGA para o pedido recém-criado (ver `gerar-pedido.tsx`): a
    // url carrega o uuid que o Postgres acabou de gerar. É a asserção mais forte
    // do arquivo — nenhum mock estava no caminho para inventá-lo.
    await page.waitForURL(/\/vendas\/pedidos\/[0-9a-f-]{36}/, { timeout: 60_000 })

    // `toHaveValue`, e não `getByText`: a obra chega num CAMPO do documento, e
    // valor de input não é texto do DOM. `getByText` procurava por 60s um nó que
    // nunca existiria, com a tela certa na frente — a falha descrevia a
    // conversão como quebrada quando ela tinha acabado de funcionar.
    await expect(page.getByLabel('Descrição da Obra')).toHaveValue(obra)

    // E o servidor confirma pelo mesmo id, sem passar pela tela.
    const id = page.url().split('/').pop()?.split('?')[0]
    const r = await page.request.get(`/api/orders/${id}`)
    expect(r.status()).toBe(200)
    expect((await r.json()) as { projectName: string }).toMatchObject({ projectName: obra })
  })
})
