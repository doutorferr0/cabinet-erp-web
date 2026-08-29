import { ID_DO_COLABORADOR, fichaDeColaborador, stubDeColaboradores } from '@/test/colaboradores'
import { type Rota, instalarServidor, json } from '@/test/servidor'
import { renderRoute, respostaLookups, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * Servidor falso COM REGISTRO DE CHAMADAS — o que `stubDeColaboradores` não dá.
 *
 * A escrita se prova pelo que SAIU (verbo, caminho, corpo) e pelo que voltou
 * (status e id), e o `instalarServidor` guarda as duas coisas. O stub simples
 * continua servindo para os casos de leitura, que só precisam da resposta.
 */
function servidorDeColaborador(rotas: Record<string, Rota> = {}) {
  return instalarServidor({
    '/auth/me': () => respostaSessao(),
    '/auth/tenants': () => respostaVinculos(),
    '/api/catalog-lookups': () => respostaLookups(),
    ...rotas,
  })
}

/**
 * A tela migrou para `GET /api/employees` em 2026-08-25, e estes casos migraram
 * junto: onde liam `src/mocks/colaboradores.ts`, agora leem o servidor falso de
 * `src/test/colaboradores.ts`. **A rota `/novo` continua sem stub de propósito**
 * — o "Incluir" é local (`empty()` não toca a rede), e um stub ali esconderia
 * uma chamada que não deve existir.
 */
describe('tela Colaborador', () => {
  it('listagem mostra os colaboradores do servidor', async () => {
    renderRoute('/cadastros/colaboradores', stubDeColaboradores())
    expect(await screen.findByText('CARLA SOUZA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Colaboradores')).toBeInTheDocument()
  })

  /**
   * A ESCRITA (#402). **O sucesso é assertado pela RESPOSTA — status e id —, e
   * não pela navegação**, que depende do router e de um `onSuccess` assíncrono
   * (issue #405, que não se conserta aqui). O que este caso prova é que o
   * `Gravar` de `/novo` faz `POST /api/employees` com o recorte do
   * `EmployeeWriteRequest`, e nada além dele.
   */
  it('Gravar em /novo faz POST /api/employees com só o recorte do contrato', async () => {
    const NOVO_ID = 'f0e1d2c3-b4a5-4968-8776-554433221100'
    const servidor = servidorDeColaborador({
      '/api/employees': (chamada) =>
        chamada.metodo === 'POST'
          ? json(fichaDeColaborador({ id: NOVO_ID, name: 'COLABORADOR TESTE' }), 201)
          : json({ rows: [], total: 0 }),
    })
    const { user } = renderRoute('/cadastros/colaboradores/novo', servidor.fetch)

    await user.type(await screen.findByLabelText('Nome completo'), 'COLABORADOR TESTE')
    await user.type(await screen.findByLabelText('E-mail de login'), 'teste@vertz.dev')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(servidor.em('/api/employees').some((c) => c.metodo === 'POST')).toBe(true)
    })
    const escrita = servidor.em('/api/employees').find((c) => c.metodo === 'POST')
    expect(escrita?.corpo).toEqual({
      name: 'COLABORADOR TESTE',
      email: 'teste@vertz.dev',
      phone: null,
      active: true,
      document: null,
      photoUrl: null,
    })
    // A recusa não apareceu: 201 é sucesso, e o bloco de erro só existe quando
    // o servidor diz não.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  /**
   * O `PUT` SUBSTITUI o registro inteiro, e `document` não tem campo nesta
   * tela: ele volta como veio. Um `null` aqui apagaria o CPF de quem foi
   * cadastrado por `/config/usuarios` — a regra do core de 18/08.
   */
  it('Gravar em edição faz PUT e devolve o que a tela não edita como veio', async () => {
    const ficha = fichaDeColaborador({ document: '12345678901', email: 'carla@vertz.dev' })
    const servidor = servidorDeColaborador({
      '/api/employees': () => json({ rows: [], total: 0 }),
      [`/api/employees/${ID_DO_COLABORADOR}`]: (chamada) =>
        chamada.metodo === 'PUT' ? json({ ...ficha, name: 'CARLA S. SOUZA' }) : json(ficha),
    })
    const { user } = renderRoute(`/cadastros/colaboradores/${ID_DO_COLABORADOR}`, servidor.fetch)

    const nome = await screen.findByDisplayValue('CARLA SOUZA')
    await user.clear(nome)
    await user.type(nome, 'CARLA S. SOUZA')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(
        servidor.em(`/api/employees/${ID_DO_COLABORADOR}`).some((c) => c.metodo === 'PUT'),
      ).toBe(true)
    })
    const escrita = servidor
      .em(`/api/employees/${ID_DO_COLABORADOR}`)
      .find((c) => c.metodo === 'PUT')
    expect(escrita?.corpo).toEqual({
      name: 'CARLA S. SOUZA',
      email: 'carla@vertz.dev',
      phone: null,
      active: true,
      document: '12345678901',
      photoUrl: null,
    })
  })

  /**
   * **403 `papel-insuficiente` é o caso comum desta família, não a exceção**: a
   * matriz do api reserva `/api/employees` a `admin`, e o papel da semente é
   * `operator-full`. A recusa tem de chegar à TELA com a frase do servidor —
   * silêncio faria o operador clicar de novo achando que o botão não pegou.
   */
  it('403 papel-insuficiente vira mensagem na tela, não silêncio', async () => {
    const servidor = servidorDeColaborador({
      '/api/employees': (chamada) =>
        chamada.metodo === 'POST'
          ? new Response(
              JSON.stringify({
                type: 'urn:cabinet:erro:papel-insuficiente',
                title: 'Sem permissão',
                status: 403,
                detail: 'Alterar colaborador é reservado a quem administra.',
              }),
              { status: 403, headers: { 'content-type': 'application/problem+json' } },
            )
          : json({ rows: [], total: 0 }),
    })
    const { router, user } = renderRoute('/cadastros/colaboradores/novo', servidor.fetch)

    await user.type(await screen.findByLabelText('Nome completo'), 'SEM PERMISSÃO')
    await user.type(await screen.findByLabelText('E-mail de login'), 'sem@vertz.dev')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    // O `detail` do problem+json é quem sabe QUAL permissão faltou; a tela não
    // teria como adivinhar, e a frase genérica não diz o que fazer.
    expect(
      await screen.findByText('Alterar colaborador é reservado a quem administra.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Sem permissão')).toBeInTheDocument()
    // E não navegou: recusa não é gravação.
    expect(router.state.location.pathname).toBe('/cadastros/colaboradores/novo')
  })

  it('abrir registro existente carrega a ficha do servidor', async () => {
    renderRoute(`/cadastros/colaboradores/${ID_DO_COLABORADOR}`, stubDeColaboradores())
    expect(await screen.findByDisplayValue('CARLA SOUZA')).toBeInTheDocument()
  })

  it('busca de naturalidade preserva título e preenche cidade, código e UF', async () => {
    const { user } = renderRoute('/cadastros/colaboradores/novo')

    await screen.findByLabelText('Nome completo')
    // Naturalidade mora em `Documentos e dados pessoais`, que é opcional e
    // nasce recolhido (diretriz 3). Abrir faz parte do fluxo.
    await user.click(screen.getByRole('button', { name: 'Documentos e dados pessoais' }))
    await user.click(screen.getByRole('button', { name: 'Buscar naturalidade' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Naturalidade')

    await user.click(await within(dialog).findByText('CAMPINAS'))
    await user.click(within(dialog).getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => expect(screen.getByLabelText('Naturalidade')).toHaveValue('CAMPINAS'))
    expect(screen.getByText('354')).toBeInTheDocument()
    expect(screen.getByText('SP')).toBeInTheDocument()
  })
  /**
   * HIERARQUIA (#101, diretriz 3). Colaborador tinha 3 blocos, 1 nomeado — o
   * mesmo atraso do Profissional. Agora quem manda é o schema.
   */
  describe('hierarquia por módulo', () => {
    it('o obrigatório abre, o opcional recolhe, e nada obrigatório fica escondido', async () => {
      renderRoute('/cadastros/colaboradores/novo')

      expect(await screen.findByLabelText('Nome completo')).toBeInTheDocument()
      expect(screen.getByLabelText('Cargo / função')).toBeInTheDocument()

      // Opcional: no DOM (não se perde digitação ao fechar) e fora do alcance.
      expect(screen.queryByRole('textbox', { name: 'Nome do pai' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Metas e comissão' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })

    /**
     * **O E-MAIL DE LOGIN DEIXOU DE SER PENDÊNCIA na #402**, e a inversão deste
     * caso é o registro disso. Ele nasceu afirmando o contrário: o mockup pedia
     * o campo (#101), o repo não tinha onde gravá-lo, e a falta era DITA em vez
     * de fingida com um input que descarta no Gravar.
     *
     * `EmployeeWriteRequest` publica `email` e `phone`, e o `POST` EXIGE o
     * primeiro (`employees.email` é NOT NULL — é por ele que a pessoa entra).
     * Sem o campo, o `Incluir` mandaria `email: null` e tomaria 400 em toda
     * tentativa, com o `fields[].path` apontando para um controle inexistente.
     *
     * O que CONTINUA pendência é o bloco de RH, e ele segue dito pelo nome.
     */
    it('o que o repo ainda não guarda é dito, e o que ele passou a guardar tem campo', async () => {
      renderRoute('/cadastros/colaboradores/novo')

      await screen.findByLabelText('Nome completo')
      expect(screen.getByLabelText('E-mail de login')).toBeInTheDocument()
      expect(screen.getByLabelText('Celular')).toBeInTheDocument()

      const pendencias = screen.getAllByText(/Ainda não guardamos/)
      expect(pendencias.some((p) => p.textContent?.includes('E-mail de login'))).toBe(false)
      // O módulo de metas continua inteiro sem lastro — nenhum schema guarda
      // comissão nem meta, e a falta segue dita pelo nome.
      expect(pendencias.some((p) => p.textContent?.includes('% comissão interna'))).toBe(true)
    })
    /**
     * DEFEITO ENCONTRADO ESCREVENDO A #101, e RESOLVIDO NA RAIZ pela #103.
     *
     * O gatilho de expandir do `FormBlock` mora DENTRO do `<fieldset disabled>`
     * do `CadastroForm`. Em modo consulta ele nascia desabilitado junto com os
     * campos — e o operador não conseguia abrir bloco nenhum, isto é, não
     * conseguia LER metade do cadastro na tela que existe para ler. O remendo
     * de então foi não colapsar em consulta.
     *
     * Agora `?modo=consulta` nem chega ao formulário: quem responde é a ficha
     * (`ficha-de-cadastro.test.tsx`). O que sobra aqui é a guarda de que o
     * remendo não é mais necessário — **não existe formulário em consulta para
     * ter bloco recolhido**. Se alguém reverter a ligação da ficha, este teste
     * cai junto com os de lá.
     */
    it('consulta não abre mais o formulário — quem lê é a ficha', async () => {
      renderRoute(
        `/cadastros/colaboradores/${ID_DO_COLABORADOR}?modo=consulta`,
        stubDeColaboradores(),
      )

      // O valor está na tela como texto — duas vezes, no contexto da banda e no
      // par de leitura do módulo.
      expect((await screen.findAllByText('CARLA SOUZA')).length).toBeGreaterThan(0)
      // …e não há campo, logo não há gatilho de colapso a desabilitar.
      expect(screen.queryByRole('textbox', { name: 'Nome do pai' })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Documentos e dados pessoais' }),
      ).not.toBeInTheDocument()
    })
  })
})
