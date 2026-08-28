import { ErroDaApi } from '@/data/api-provider'
import {
  atualizarColaborador,
  corpoDeEscrita,
  corpoDeInclusao,
  daFichaDoServidor,
  documentoDoColaborador,
  incluirColaborador,
  listaDeColaboradores,
} from '@/data/colaboradores-api'
import { ehErroDePapelInsuficiente } from '@/lib/erros'
import { colaboradorVazio } from '@/mocks/colaboradores'
import { instalarServidor, json, problema } from '@/test/servidor'
import { tableState } from '@/test/utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Contrato da fronteira de colaboradores — o ÚLTIMO cadastro a sair do mock.
 *
 * As promessas asseridas aqui são as MESMAS que `provider.test.ts` cobrava dos
 * providers mock (paginação 1-based, total do servidor, item inexistente =
 * `null`). Mudou o lado que responde, não o contrato: por isso `colaboradores`
 * saiu de lá e entrou aqui, em vez de perder a cobertura.
 *
 * Os valores do servidor falso são os MEDIDOS em 25/08 contra a main `2ee954b`
 * do api, com par local próprio — não são shape inventado a partir da leitura do
 * `openapi-v1.json`.
 */

const ID = 'ac956183-c6b5-4adf-9b3b-457eff3e5b4f'

function detalhe(over: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: 'Demonstração',
    active: true,
    document: null,
    email: 'demo@vertz.dev',
    phone: null,
    photoUrl: null,
    roleId: '8dbcbc01-2673-4df7-96ba-46eb96121a31',
    roleName: 'Proprietário',
    sectorId: '8e448c3a-8c88-4b79-a190-ef87d6ee0cfd',
    sector: 'Administrativo',
    jobTitleId: '328cc6e3-4ffb-4f4a-a7d9-cb2308b7ccfa',
    jobTitle: 'Vendedor',
    hiredAt: '2020-03-01',
    dismissedAt: null,
    customerFacing: true,
    linkActive: true,
    ...over,
  }
}

let servidor: ReturnType<typeof instalarServidor>
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listagem de colaboradores', () => {
  it('traduz o estado da tabela na convenção de query do contrato', async () => {
    servidor = instalarServidor({
      '/api/employees': () =>
        json({ rows: [{ id: ID, name: 'Demonstração', active: true }], total: 1 }),
    })

    const r = await listaDeColaboradores.list(tableState({ q: 'demo', page: 2, pageSize: 25 }))

    expect(r).toEqual({ rows: [{ id: ID, name: 'Demonstração', active: true }], total: 1 })
    const url = new URL(servidor.chamadas[0]?.url ?? '')
    expect(url.searchParams.get('q')).toBe('demo')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('pageSize')).toBe('25')
  })

  /**
   * A LINHA é o `EmployeeDto` CRU, e é isso que faz o `sortBy` casar com a
   * whitelist do servidor. Traduzir a linha aqui (`name` → `nome`) faria a
   * grade ordenar por um campo que o servidor recusa com 400.
   */
  it('manda o sortBy no nome do DTO, não no da tela', async () => {
    servidor = instalarServidor({ '/api/employees': () => json({ rows: [], total: 0 }) })

    await listaDeColaboradores.list(tableState({ sort: { id: 'name', desc: true } }))

    const url = new URL(servidor.chamadas[0]?.url ?? '')
    expect(url.searchParams.get('sortBy')).toBe('name')
    expect(url.searchParams.get('sortDesc')).toBe('true')
  })

  /**
   * **Falha do servidor NUNCA vira lista vazia.** "Deu erro" e "não há
   * colaborador" pedem reações opostas do operador, e a listagem que engole o
   * 500 diz a segunda coisa quando a verdade é a primeira.
   */
  it('propaga a falha do servidor em vez de devolver lista vazia', async () => {
    servidor = instalarServidor({
      '/api/employees': () => problema(500, 'O banco caiu.'),
    })

    await expect(listaDeColaboradores.list(tableState())).rejects.toBeInstanceOf(ErroDaApi)
  })

  /**
   * A guarda de `filtrosDaTabela`, exercida por esta tela: `GET /api/employees`
   * **não publica `filters`** (medido: 400 `urn:cabinet:erro:filtro-invalido`),
   * então o provider é montado sem `filtraveis`. Devolver campos filtráveis à
   * tela sem publicar o parâmetro no contrato tem de FALHAR aqui, com o nome do
   * recurso — e não virar um 400 que o operador recebe sem entender.
   */
  it('recusa filtro estruturado enquanto o contrato não publicar `filters`', async () => {
    servidor = instalarServidor({ '/api/employees': () => json({ rows: [], total: 0 }) })

    await expect(
      listaDeColaboradores.list(
        tableState({
          filtros: [
            { filtroId: 'f1', id: 'active', variante: 'boolean', operador: 'eq', valor: 'true' },
          ],
        }),
      ),
    ).rejects.toThrow(/não publica o parâmetro `filters`/)
  })
})

describe('detalhe do colaborador', () => {
  it('traduz a ficha do servidor na forma da tela', async () => {
    servidor = instalarServidor({ [`/api/employees/${ID}`]: () => json(detalhe()) })

    const c = await documentoDoColaborador.get(ID)

    expect(c).toMatchObject({
      id: ID,
      nome: 'Demonstração',
      ativo: true,
      atendimentoCliente: true,
      dataAdmissao: '2020-03-01',
      dataDemissao: null,
    })
  })

  /**
   * **`setor` e `cargo` recebem o ID, não o nome.** A tela os trata como lista
   * de apoio e `useRotulosDeApoio` traduz id → rótulo na leitura; gravar o nome
   * aqui faria o combo abrir sem seleção e a ficha imprimir o rótulo cru —
   * parece certo na tela e erra na hora de gravar.
   */
  it('guarda o ID da lista de apoio em setor e cargo, e não o rótulo', async () => {
    servidor = instalarServidor({ [`/api/employees/${ID}`]: () => json(detalhe()) })

    const c = await documentoDoColaborador.get(ID)

    expect(c?.setor).toBe('8e448c3a-8c88-4b79-a190-ef87d6ee0cfd')
    expect(c?.cargo).toBe('328cc6e3-4ffb-4f4a-a7d9-cb2308b7ccfa')
    expect(c?.setor).not.toBe('Administrativo')
  })

  /**
   * O contrato v1 é MUITO menor que a §2 da transcrição: os ~13 campos de RH
   * que ele não cobre nascem em BRANCO, e não some da tela. A alternativa seria
   * esconder o que o cadastro precisa vir a ter, apagando a dívida em vez de
   * mostrá-la — é a mesma escolha de `produtos-api.ts`.
   */
  it('deixa em branco o que o contrato não cobre, sem inventar valor', () => {
    const c = daFichaDoServidor(detalhe())

    expect(c.sexo).toBeNull()
    expect(c.salario).toBeNull()
    expect(c.nomeMae).toBe('')
    expect(c.naturalidade).toEqual({ cidadeCodigo: null, cidadeNome: '', uf: null })
  })

  it('devolve null no 404 e ERRO no 409 sem empresa ativa', async () => {
    servidor = instalarServidor({
      [`/api/employees/${ID}`]: () => problema(404, 'Colaborador não encontrado.'),
    })
    await expect(documentoDoColaborador.get(ID)).resolves.toBeNull()

    servidor = instalarServidor({
      [`/api/employees/${ID}`]: () => problema(409, 'Nenhuma empresa ativa na sessão.'),
    })
    await expect(documentoDoColaborador.get(ID)).rejects.toBeInstanceOf(ErroDaApi)
  })

  /** O branco do "Incluir" é local — o backend não fornece registro em branco. */
  it('monta o registro em branco sem tocar na rede', () => {
    servidor = instalarServidor({})

    expect(documentoDoColaborador.empty()).toMatchObject({ id: '', nome: '', ativo: true })
    expect(servidor.chamadas).toHaveLength(0)
  })
})

/**
 * A ESCRITA (#402) — `POST /api/employees` e `PUT /api/employees/{id}`.
 *
 * **O sucesso é assertado pela RESPOSTA (status + id), nunca pela navegação.**
 * A troca de tela depende do router e de um `onSuccess` assíncrono, e um teste
 * que espera a URL mudar afirma coisas sobre o roteamento quando queria afirmar
 * coisas sobre a gravação (issue #405).
 */
describe('escrita do colaborador', () => {
  /** `application/problem+json` com o `type` do vocabulário fechado do contrato. */
  function recusa(status: number, type: string, detail: string) {
    return new Response(JSON.stringify({ type, title: 'Sem permissão', status, detail }), {
      status,
      headers: { 'content-type': 'application/problem+json' },
    })
  }

  const doFormulario = { ...colaboradorVazio(), nome: 'CARLA SOUZA', email: 'carla@vertz.dev' }

  it('POST manda só o recorte do EmployeeWriteRequest e devolve a ficha gravada', async () => {
    servidor = instalarServidor({
      '/api/employees': () => json(detalhe({ name: 'CARLA SOUZA' }), 201),
    })

    const ficha = await incluirColaborador(corpoDeInclusao(doFormulario))

    // Pela RESPOSTA: o id do registro novo é do servidor, e é ele que prova a
    // gravação — não a tela ter trocado.
    expect(ficha.id).toBe(ID)
    expect(ficha.name).toBe('CARLA SOUZA')

    const [chamada] = servidor.em('/api/employees')
    expect(chamada?.metodo).toBe('POST')
    // Chaves EXATAS, e não `toMatchObject`: um campo a mais no corpo é um campo
    // que o contrato não publica atravessando a fronteira.
    expect(Object.keys(chamada?.corpo as object).sort()).toEqual([
      'active',
      'document',
      'email',
      'name',
      'phone',
      'photoUrl',
    ])
    expect(chamada?.corpo).toEqual({
      name: 'CARLA SOUZA',
      email: 'carla@vertz.dev',
      phone: null,
      active: true,
      document: null,
      photoUrl: null,
    })
  })

  /**
   * O QUE A TELA NÃO EDITA VOLTA COMO VEIO — o `PUT` substitui o registro
   * inteiro. `document` e `photoUrl` não têm controle no formulário, e um
   * `null` aqui apagaria o CPF e a foto de quem foi cadastrado por
   * `/config/usuarios`. É a regra do core de 18/08, medida contra o Postgres.
   */
  it('PUT devolve document e photoUrl como vieram, e grava o que a tela edita', async () => {
    const original = detalhe({ document: '12345678901', photoUrl: 'https://cdn/foto.png' })
    servidor = instalarServidor({
      [`/api/employees/${ID}`]: () => json({ ...original, name: 'CARLA S. SOUZA' }),
    })

    const editado = { ...daFichaDoServidor(original), nome: 'CARLA S. SOUZA' }
    const ficha = await atualizarColaborador(ID, corpoDeEscrita(original, editado))

    expect(ficha.id).toBe(ID)
    expect(ficha.name).toBe('CARLA S. SOUZA')

    const [chamada] = servidor.em(`/api/employees/${ID}`)
    expect(chamada?.metodo).toBe('PUT')
    expect(chamada?.corpo).toEqual({
      name: 'CARLA S. SOUZA',
      email: 'demo@vertz.dev',
      phone: null,
      active: true,
      document: '12345678901',
      photoUrl: 'https://cdn/foto.png',
    })
  })

  /**
   * Cargo, setor, admissão e demissão são do VÍNCULO com a empresa e mudam por
   * `PUT /api/employees/{id}/link`. Mandá-los aqui reescreveria em silêncio o
   * cargo que a pessoa tem na outra empresa do grupo.
   */
  it('não manda cargo, setor nem datas de vínculo no corpo', () => {
    const original = detalhe()
    const corpo = corpoDeEscrita(original, {
      ...daFichaDoServidor(original),
      cargo: 'outro-cargo',
      setor: 'outro-setor',
      dataAdmissao: '2024-01-01',
      salario: 999_00,
    })

    for (const proibido of ['jobTitleId', 'sectorId', 'hiredAt', 'dismissedAt', 'roleId']) {
      expect(corpo).not.toHaveProperty(proibido)
    }
  })

  /**
   * RECUSA EM VOZ ALTA quando a ficha veio sem um dos preservados: gravar assim
   * apagaria o campo, e um `?? null` calado transformaria "o servidor não
   * mandou" em "o operador quis apagar".
   */
  it('recusa gravar quando a ficha veio sem os campos que o PUT apagaria', () => {
    const { document: _d, ...semDocumento } = detalhe()

    expect(() =>
      corpoDeEscrita(semDocumento as Parameters<typeof corpoDeEscrita>[0], doFormulario),
    ).toThrow(/apagaria o campo/)
  })

  /**
   * **403 `papel-insuficiente` é o caso comum, não a exceção**: a matriz do api
   * reserva `/api/employees` a `admin`, e o papel da semente (`operator-full`,
   * o do usuário demo) recebe a recusa em toda escrita. Ela precisa chegar à
   * tela COM o `detail` — é ele que diz ao operador por que não pode.
   */
  it('403 papel-insuficiente chega como ErroDaApi com detail e type', async () => {
    servidor = instalarServidor({
      '/api/employees': () =>
        recusa(
          403,
          'urn:cabinet:erro:papel-insuficiente',
          'Seu papel não permite alterar colaboradores.',
        ),
    })

    const erro = await incluirColaborador(corpoDeInclusao(doFormulario)).catch((e) => e)

    expect(erro).toBeInstanceOf(ErroDaApi)
    expect(erro.status).toBe(403)
    expect(erro.detail).toBe('Seu papel não permite alterar colaboradores.')
    expect(ehErroDePapelInsuficiente(erro)).toBe(true)
  })

  it('403 na alteração também recusa em voz alta', async () => {
    const original = detalhe()
    servidor = instalarServidor({
      [`/api/employees/${ID}`]: () =>
        recusa(403, 'urn:cabinet:erro:papel-insuficiente', 'Apenas administradores.'),
    })

    const erro = await atualizarColaborador(
      ID,
      corpoDeEscrita(original, daFichaDoServidor(original)),
    ).catch((e) => e)

    expect(ehErroDePapelInsuficiente(erro)).toBe(true)
    expect(erro.detail).toBe('Apenas administradores.')
  })
})
