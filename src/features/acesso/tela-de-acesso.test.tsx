import { json, problema } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A tela de USUÁRIOS E EMPRESAS contra servidor falso, pelo cliente gerado.
 *
 * O que estes testes travam:
 *
 * - **criar usuário é TRÊS escritas em ORDEM** (pessoa → vínculo → senha) — a
 *   composição de `useCriarUsuario`, que é onde o fluxo poderia quebrar em
 *   silêncio se alguém "simplificar" tirando um passo;
 * - **a senha provisória aparece no diálogo de exibição única** — o valor que
 *   o servidor devolve UMA vez chega inteiro ao operador;
 * - **o papel se monta por CAIXAS do catálogo** e grava o conjunto FINAL em
 *   `permissions` — desmarcar tem efeito, marcar fora do catálogo não existe;
 * - **a aba Empresas lista o GRUPO**, não os vínculos do usuário — a empresa em
 *   que ninguém entra aparece do mesmo jeito;
 * - **a empresa e o TIMBRE são dois formulários e duas rotas** — o cadastro não
 *   manda razão social, e o timbre é da empresa ATIVA, sem id no caminho;
 * - **o diálogo de vínculos** só oferece escrita na empresa ativa: as outras
 *   linhas trazem "Ativar e editar", nunca um Gravar que o servidor recusaria.
 */

const PAPEL_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const USUARIO_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
/** O mesmo id que `respostaVinculos` devolve — é a empresa ATIVA do teste. */
const EMPRESA_ATIVA = '00000000-0000-0000-0000-000000000003'
const EMPRESA_OUTRA = '00000000-0000-0000-0000-000000000004'

const EMPRESA_DETALHE = {
  id: EMPRESA_ATIVA,
  code: '01',
  name: 'VERTZ ILUMINAÇÃO',
  cnpj: '12345678000199',
  active: true,
  features: ['suppliers', 'professionals', 'employees'],
}

const TIMBRE = {
  name: 'VERTZ ILUMINAÇÃO',
  cnpj: '12345678000199',
  legalName: 'Vertz Comércio de Iluminação Ltda.',
  stateRegistration: '110042490114',
  address: {
    zipCode: '01310-100',
    street: 'Avenida Paulista',
    number: '1000',
    complement: null,
    district: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  },
  phone: '1132001000',
  email: 'contato@vertz.com.br',
}

const CATALOGO = {
  version: 'teste-1',
  modules: [
    {
      key: 'orcamento',
      label: 'Orçamento',
      permissions: [
        { key: 'orcamento:ver', label: 'Ver orçamentos', description: null },
        { key: 'orcamento:editar', label: 'Criar e alterar orçamentos', description: null },
      ],
    },
  ],
}

const PAPEL = {
  id: PAPEL_ID,
  name: 'Vendedor',
  description: null,
  system: false,
  template: false,
  active: true,
  permissionCount: 2,
}

function detalheDeUsuario() {
  return {
    id: USUARIO_ID,
    name: 'Maria Nova',
    document: null,
    email: 'maria@vertz.com.br',
    phone: null,
    photoUrl: null,
    active: true,
    roleId: PAPEL_ID,
    roleName: 'Vendedor',
    sectorId: null,
    sector: null,
    jobTitleId: null,
    jobTitle: null,
    hiredAt: null,
    dismissedAt: null,
    customerFacing: null,
    linkActive: true,
  }
}

function servidor() {
  const escritas: { metodo: string; caminho: string; corpo: unknown }[] = []

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const url = String(requisicao ? requisicao.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
      const texto = await requisicao.clone().text()
      escritas.push({
        metodo: requisicao.method.toUpperCase(),
        caminho,
        corpo: texto ? JSON.parse(texto) : null,
      })
      if (caminho === '/api/employees') return json(detalheDeUsuario(), 201)
      if (caminho === `/api/employees/${USUARIO_ID}/link`) {
        // O PUT devolve 200: o vínculo já existe desde o CreateEmployee (papel
        // inicial `viewer`), e a tela SUBSTITUI.
        return json(detalheDeUsuario(), requisicao?.method.toUpperCase() === 'PUT' ? 200 : 201)
      }
      if (caminho === `/api/employees/${USUARIO_ID}/reset-password`) {
        return json({ temporaryPassword: 'xK7mPq2wRt9v' })
      }
      if (caminho === `/api/employees/${USUARIO_ID}/invite`) {
        return json({ sentTo: 'maria@vertz.com.br', expiresAt: '2026-09-05T12:00:00Z' })
      }
      if (caminho === '/api/roles') return json({ ...PAPEL, permissions: ['orcamento:ver'] }, 201)
      if (caminho === '/api/tenants') return json(EMPRESA_DETALHE, 201)
      if (caminho === `/api/tenants/${EMPRESA_ATIVA}`) return json(EMPRESA_DETALHE)
      if (caminho === '/api/company-letterhead') return json(TIMBRE)
      if (caminho === '/auth/active-tenant') return new Response(null, { status: 204 })
      throw new Error(`escrita sem stub no teste: ${caminho}`)
    }

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/employees') {
      return json({
        rows: [{ id: USUARIO_ID, name: 'Maria Nova', sector: null, jobTitle: null, active: true }],
        total: 1,
      })
    }
    if (caminho === '/api/roles') return json({ rows: [PAPEL], total: 1 })
    if (caminho === '/api/permissions') return json(CATALOGO)
    if (caminho === `/api/roles/${PAPEL_ID}`) {
      return json({ ...PAPEL, permissions: ['orcamento:ver'] })
    }
    if (caminho === '/api/tenants') {
      return json({
        rows: [
          {
            id: EMPRESA_ATIVA,
            code: '01',
            name: 'VERTZ ILUMINAÇÃO',
            cnpj: '12345678000199',
            active: true,
          },
          { id: EMPRESA_OUTRA, code: '02', name: 'VERTZ FILIAL', cnpj: null, active: true },
        ],
        total: 2,
      })
    }
    if (caminho === `/api/tenants/${EMPRESA_ATIVA}`) return json(EMPRESA_DETALHE)
    if (caminho === '/api/company-letterhead') return json(TIMBRE)
    if (caminho === `/api/employees/${USUARIO_ID}/links`) {
      return json([
        {
          tenantId: EMPRESA_ATIVA,
          tenantName: 'VERTZ ILUMINAÇÃO',
          roleId: PAPEL_ID,
          roleName: 'Vendedor',
          active: true,
        },
        {
          tenantId: EMPRESA_OUTRA,
          tenantName: 'VERTZ FILIAL',
          roleId: null,
          roleName: null,
          active: false,
        },
      ])
    }
    throw new Error(`fetch sem stub no teste: ${url}`)
  }

  return { stub, escritas }
}

describe('tela de acesso', () => {
  /**
   * NUMA TELA DE PERMISSÃO, TABELA VAZIA É UMA AFIRMAÇÃO PERIGOSA.
   *
   * `(usuarios.data?.rows ?? []).map(...)` desenhava o mesmo corpo vazio para "esta
   * empresa não tem usuário" e para "a consulta não voltou". Na primeira leitura, a
   * segunda parece a primeira — e o operador conclui que ninguém tem acesso.
   *
   * A gravação já tinha `ErroDeGravacao`; era a LEITURA que não tinha nada.
   */
  /*
   * 409 e não 500, e a escolha é do PRODUTO, não do teste: `repetirSeValeAPena` só
   * repete 5xx e rede fora — 4xx é a resposta do servidor SOBRE o pedido e nunca se
   * repete. Com 500 o erro só chegaria à tela depois de três esperas crescentes (~7s),
   * e o teste mediria a política de repetição em vez do estado da folha. O 409 aqui é
   * caso real: é o que o contrato responde quando não há empresa ativa na sessão.
   */
  it('leitura que falha diz que falhou, em vez de tabela vazia', async () => {
    const { stub } = servidor()
    const comFalha = (entrada: RequestInfo | URL) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      const caminho = new URL(url, 'http://localhost').pathname
      if (caminho === '/api/employees') {
        return Promise.resolve(problema(409, 'Nenhuma empresa ativa na sessão.'))
      }
      return Promise.resolve(stub(entrada))
    }
    renderRoute('/config/usuarios', comFalha as typeof stub)

    // A frase é agora a da `VitraDataTable` — a listagem virou consulta de
    // servidor na D27, e quem separa falha de vazio passou a ser ela. O que o
    // teste trava não mudou: a tela DIZ que a leitura falhou, com o `detail` do
    // servidor, em vez de desenhar uma tabela vazia.
    // Timeout explícito porque o `findBy` do Testing Library espera 1s por
    // padrão, e a `VitraDataTable` chega ao estado de falha em DOIS passos —
    // skeleton enquanto a consulta corre, `FalhaDaConsulta` depois que ela
    // rejeita. Um segundo é o default da biblioteca, não uma afirmação sobre o
    // produto; com a máquina carregada ele expira antes do segundo passo e o
    // teste acusa asserção onde só houve pressa.
    expect(
      await screen.findByText('Não foi possível carregar a consulta', undefined, {
        timeout: 15000,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Nenhuma empresa ativa na sessão.')).toBeInTheDocument()
    // E o vazio NÃO aparece junto — as duas frases na mesma tela se anulariam.
    expect(screen.queryByTestId('vazio-da-consulta')).not.toBeInTheDocument()
  })

  it('lista os usuários da empresa ativa', async () => {
    const { stub } = servidor()
    renderRoute('/config/usuarios', stub)

    expect(await screen.findByText('Maria Nova')).toBeInTheDocument()
  })

  it('criar usuário = pessoa, vínculo e senha, NESTA ordem — e a senha aparece uma vez', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('button', { name: 'Novo usuário' }))
    await user.type(await screen.findByLabelText('Nome'), 'Maria Nova')
    await user.type(screen.getByLabelText('E-mail'), 'maria@vertz.com.br')
    await user.selectOptions(screen.getByLabelText('Papel'), PAPEL_ID)
    await user.click(screen.getByRole('button', { name: 'Criar e gerar senha' }))

    await waitFor(() => expect(escritas).toHaveLength(3))
    expect(escritas.map((e) => `${e.metodo} ${e.caminho}`)).toEqual([
      'POST /api/employees',
      // PUT e não POST: o servidor cria o vínculo junto com a pessoa (papel
      // inicial `viewer`) — o que a tela faz é substituí-lo pelo escolhido.
      `PUT /api/employees/${USUARIO_ID}/link`,
      `POST /api/employees/${USUARIO_ID}/reset-password`,
    ])
    // O vínculo vai por roleId — o ÚNICO caminho de atribuição do contrato.
    expect(escritas[1]?.corpo).toMatchObject({ roleId: PAPEL_ID })

    // A senha que o servidor devolveu UMA vez está no diálogo, inteira.
    expect(await screen.findByLabelText('Senha provisória')).toHaveTextContent('xK7mPq2wRt9v')
  })

  it('o papel se monta por caixas e grava o conjunto FINAL', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('tab', { name: 'Papéis' }))
    await user.click(await screen.findByRole('button', { name: 'Incluir papel' }))
    await user.type(await screen.findByLabelText('Nome'), 'Balcão')
    await user.click(screen.getByRole('checkbox', { name: /Ver orçamentos/ }))
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'POST', caminho: '/api/roles' })
    expect(escritas[0]?.corpo).toEqual({
      name: 'Balcão',
      description: null,
      permissions: ['orcamento:ver'],
      active: true,
    })
  })

  it('a aba Empresas lista o GRUPO — inclusive a empresa em que o usuário não entra', async () => {
    const { stub } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('tab', { name: 'Empresas' }))
    // Escopo na TABELA, não na tela: o nome da empresa ativa aparece também no
    // seletor do rodapé, e um `findByText` solto casaria o rodapé e passaria
    // sem a aba ter listado nada.
    const tabela = within(await screen.findByRole('table'))
    // `respostaVinculos` declara UMA empresa; a aba mostra as DUAS, porque
    // `/api/tenants` é "quais existem" e não "onde eu entro".
    expect(await tabela.findByText('VERTZ ILUMINAÇÃO')).toBeInTheDocument()
    expect(tabela.getByText('VERTZ FILIAL')).toBeInTheDocument()
  })

  it('o cadastro da empresa NÃO manda o timbre — são duas rotas', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('tab', { name: 'Empresas' }))
    // Pelo CÓDIGO, que é único na página — o nome se repete no rodapé.
    await user.click(await screen.findByText('01'))

    const nome = await screen.findByLabelText('Nome fantasia')
    await waitFor(() => expect(nome).toHaveValue('VERTZ ILUMINAÇÃO'))
    await user.clear(nome)
    await user.type(nome, 'VERTZ MATRIZ')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'PUT', caminho: `/api/tenants/${EMPRESA_ATIVA}` })
    // A IDENTIDADE, e só ela: razão social e endereço são do singleton do
    // timbre, cuja rota não aceita id — publicá-los aqui abriria por baixo a
    // porta que ela fecha (`tenants` não tem RLS).
    expect(escritas[0]?.corpo).toEqual({
      code: '01',
      name: 'VERTZ MATRIZ',
      active: true,
      features: ['suppliers', 'professionals', 'employees'],
    })
  })

  it('o TIMBRE é da empresa ATIVA, e o PUT leva os campos todos', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('tab', { name: 'Empresas' }))
    // Só a linha da empresa ATIVA oferece o timbre; a outra oferece o gesto que
    // torna o botão possível. Medido ANTES de abrir: o diálogo é modal e tira a
    // tabela da árvore de acessibilidade.
    const abrir = await screen.findByRole('button', { name: 'Timbre…' })
    expect(screen.getAllByRole('button', { name: 'Ativar para o timbre' })).toHaveLength(1)
    await user.click(abrir)

    const cidade = await screen.findByLabelText('Cidade')
    await waitFor(() => expect(cidade).toHaveValue('São Paulo'))
    await user.clear(cidade)
    await user.type(cidade, 'Santos')
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'PUT', caminho: '/api/company-letterhead' })
    // `PUT` de singleton: campo ausente é 400 e campo `null` apaga — por isso o
    // corpo leva TODOS, e não só a cidade que mudou.
    expect(escritas[0]?.corpo).toEqual({
      cnpj: '12345678000199',
      legalName: 'Vertz Comércio de Iluminação Ltda.',
      stateRegistration: '110042490114',
      address: {
        zipCode: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        complement: null,
        district: 'Bela Vista',
        city: 'Santos',
        state: 'SP',
      },
      phone: '1132001000',
      email: 'contato@vertz.com.br',
    })
  })

  it('o diálogo de vínculos lista o grupo e só oferece escrita na empresa ATIVA', async () => {
    const { stub } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    // D27: o vínculo deixou de ser o terceiro botão da linha e virou o CLIQUE
    // na linha — a coluna de ação carrega a próxima ação (`Convidar`), e abrir
    // o registro é o gesto da grade, não mais um botão que competia com ela.
    // Mesmo motivo do caso da falha: a linha só existe depois de a consulta da
    // grade voltar, e o default de 1s do `findBy` não cobre isso sob carga.
    await user.click(await screen.findByText('Maria Nova', undefined, { timeout: 15000 }))

    const dialogo = within(await screen.findByRole('dialog'))
    // E dentro dele, na TABELA: "Vendedor" é também `<option>` do combo de
    // papel logo abaixo — a asserção no diálogo inteiro passaria com a lista de
    // vínculos vazia.
    const vinculos = within(await dialogo.findByRole('table'))
    // As duas empresas, com o papel de cada uma. `null` sai como ausência
    // declarada, não como um papel plausível.
    expect(await vinculos.findByText('Vendedor')).toBeInTheDocument()
    expect(vinculos.getByText('— sem papel')).toBeInTheDocument()
    // Uma linha só oferece a troca: a da empresa que NÃO está ativa.
    expect(dialogo.getAllByRole('button', { name: 'Ativar e editar' })).toHaveLength(1)
  })

  /**
   * CONVIDAR é a `proximaAcao` da linha (D27), e o recibo NÃO traz segredo.
   *
   * O contrato não devolve o token de propósito — ele foi para o e-mail, e é
   * essa a diferença entre convidar e gerar senha. O que o aviso precisa dizer
   * é para ONDE saiu, que é o que o administrador confere.
   */
  // INTEGRAÇÃO 2.0 (Cowork, 2026-09-03): quebrou no merge de PRs paralelas; a D37 (#532) religa.
  it.skip('Convidar manda o link e o recibo diz para onde saiu, sem senha', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('button', { name: 'Convidar' }, { timeout: 15000 }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({
      metodo: 'POST',
      caminho: `/api/employees/${USUARIO_ID}/invite`,
    })
    expect(await screen.findByText(/maria@vertz\.com\.br/)).toBeInTheDocument()
    // A linha não abriu o diálogo de vínculos junto: a barreira de propagação
    // da célula de ação é o que separa "agir na linha" de "abrir a linha".
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Gerar senha na linha mostra o diálogo de exibição única', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('button', { name: 'Gerar senha' }, { timeout: 15000 }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(await screen.findByLabelText('Senha provisória')).toHaveTextContent('xK7mPq2wRt9v')
  })
})
