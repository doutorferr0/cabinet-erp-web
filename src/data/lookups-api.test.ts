import { configurarApi } from '@/api/cliente'
import {
  type CatalogLookupDto,
  type PagedResultOfCatalogLookupDto,
  authLogin,
  authSetActiveTenant,
  createCatalogLookup,
  listCatalogLookups,
} from '@/api/gerado'
import { nomeDoLookup } from '@/data/lookups-api'
import { handlers } from '@/mocks/api/handlers'
import { TENANT_MATRIZ, resetStore } from '@/mocks/api/store'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * A FRONTEIRA DAS LISTAS DE APOIO, depois da migração para `value=id` (#94).
 *
 * Este arquivo cobria `resolverIdDoLookup` — a tradução nome→id que rodava no
 * submit, com cinco casos: nome único, nome AMBÍGUO (dois homônimos), nome fora
 * da lista, nome vazio e espaço nas bordas. **Os cinco deixaram de existir**,
 * não de ser testados: o combo escolhe por id, e não há mais um passo entre a
 * escolha e a gravação onde um nome possa virar o id errado.
 *
 * O que sobrou é o caminho inverso, e ele é só de EXIBIÇÃO: dado um id, qual
 * nome mostrar. Errar aqui mostra o rótulo errado; errar na tradução antiga
 * gravava o registro errado. É outra classe de risco, e é por isso que ela pode
 * ser simples.
 */
describe('nomeDoLookup', () => {
  const opcoes = [
    { id: 'lk-MARCA-1', nome: 'EVOLED' },
    { id: 'lk-MARCA-2', nome: 'STELLA' },
  ]

  it('acha o nome do id que está na lista', () => {
    expect(nomeDoLookup(opcoes, 'lk-MARCA-2')).toBe('STELLA')
  })

  it('devolve `undefined` para id fora da lista — e isso NÃO é erro', () => {
    // Item desativado depois de gravado, ou lista cortada no teto de 100. Quem
    // exibe decide o que pôr no lugar (o `LookupCombo` põe o rótulo que o
    // registro trouxe); o que não se faz é apagar o valor por não saber o nome.
    expect(nomeDoLookup(opcoes, 'lk-MARCA-99')).toBeUndefined()
  })

  it('sem id, não há nome — campo vazio é escolha legítima', () => {
    expect(nomeDoLookup(opcoes, null)).toBeUndefined()
    expect(nomeDoLookup(opcoes, '')).toBeUndefined()
  })

  it('homônimo deixou de ser problema: escolhe pelo id, não pelo nome', () => {
    // O caso que derrubava a tradução antiga. Aqui os dois convivem e cada id
    // acha o SEU rótulo — que é o ponto inteiro da issue #94.
    const comHomonimo = [
      { id: 'lk-MARCA-1', nome: 'STELLA' },
      { id: 'lk-MARCA-7', nome: 'STELLA' },
    ]
    expect(nomeDoLookup(comHomonimo, 'lk-MARCA-7')).toBe('STELLA')
    expect(nomeDoLookup(comHomonimo, 'lk-MARCA-1')).toBe('STELLA')
  })
})

/**
 * O `+...` CONTRA O SERVIDOR FALSO — o caminho do site público, que é 100% mock.
 *
 * Medido contra `handlers.ts` e não contra um stub: o que interessa aqui é a
 * UNICIDADE, e ela é comportamento do servidor. Um stub que devolvesse 201
 * sempre faria o teste passar sobre a duplicata que o 409 existe para impedir.
 *
 * As asserções olham o CORPO, não o status: 201 com corpo vazio, ou 409 sem
 * item existente do outro lado, passariam num teste que só lê o número.
 */
describe('POST /api/catalog-lookups — o cadastro rápido no mock', () => {
  const servidor = setupServer(...handlers)

  beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => servidor.resetHandlers())
  afterAll(() => servidor.close())

  beforeEach(async () => {
    resetStore()
    configurarApi('http://mock.teste')
    await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
    // ESCOLHER EMPRESA faz parte do cenário. A escrita de lista de apoio
    // exige empresa ativa e responde 409 `sem-empresa-ativa` sem ela (#269) —
    // enquanto este arquivo logava e parava, o 201 que ele media vinha de um
    // handler que não conferia a sessão, e a asserção passava por descuido do
    // mock, não por acerto do servidor.
    await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
  })

  it('cria o item e a lista do kind passa a devolvê-lo', async () => {
    const resposta = await createCatalogLookup({
      kind: 'CATEGORIA_CLIENTE',
      name: 'CONSTRUTORA',
      active: true,
    })

    expect(resposta.status).toBe(201)
    const criado = resposta.data as CatalogLookupDto
    expect(criado).toMatchObject({ kind: 'CATEGORIA_CLIENTE', name: 'CONSTRUTORA', active: true })
    // O id vem do servidor. Era o que o cadastro rápido inventava, e o que
    // acabava no `categoryId` (uuid) do corpo do `PUT`.
    expect(criado.id).toBeTruthy()

    const lista = await listCatalogLookups({ kind: 'CATEGORIA_CLIENTE', pageSize: 100 })
    const nomes = (lista.data as PagedResultOfCatalogLookupDto).rows.map((r) => r.name)
    expect(nomes).toContain('CONSTRUTORA')
  })

  it('nome repetido no MESMO kind é 409 — e o item de antes continua único', async () => {
    const repetido = await createCatalogLookup({
      kind: 'CATEGORIA_CLIENTE',
      // Sem caixa: `Arquiteto` e `ARQUITETO` são o par duplicado, não dois itens.
      name: 'Arquiteto',
      active: true,
    })

    expect(repetido.status).toBe(409)
    // O `detail` ecoa o nome PEDIDO (`Arquiteto`), não o do item existente —
    // é o que o backend faz (`conflitoDeNome(nome)`, em `catalogo/lookups.ts`)
    // e o que a #269 espelhou no mock. A asserção antes exigia `ARQUITETO`,
    // medindo o handler duplicado que a #264 chegou a escrever: quem acha o existente é
    // o COMBO, pelo nome, na lista que já tem em cache, e não esta frase.
    expect((repetido.data as { detail?: string }).detail).toContain('Arquiteto')
    // E ele é o 409 GENÉRICO: o vocabulário fechado da #269 não reserva URN
    // para nome repetido em lista de apoio, e é essa ausência que o combo lê
    // como "duplicado" — daí ele só precisar excluir `sem-empresa-ativa`.
    expect((repetido.data as { type?: string }).type).toBe('about:blank')

    const lista = await listCatalogLookups({ kind: 'CATEGORIA_CLIENTE', pageSize: 100 })
    const arquitetos = (lista.data as PagedResultOfCatalogLookupDto).rows.filter(
      (r) => r.name.toLocaleUpperCase() === 'ARQUITETO',
    )
    expect(arquitetos).toHaveLength(1)
  })

  it('o mesmo nome em OUTRO kind entra — a unicidade é por lista', async () => {
    // `ARQUITETO` é item legítimo de `CATEGORIA_CLIENTE` E de
    // `CATEGORIA_PROFISSIONAL`: a tabela é única e discriminada por kind
    // (ADR-011), e uma unicidade global fundiria duas listas diferentes.
    const resposta = await createCatalogLookup({
      kind: 'PROFISSAO',
      name: 'ARQUITETO PLENO',
      active: true,
    })
    expect(resposta.status).toBe(201)
    expect((resposta.data as CatalogLookupDto).kind).toBe('PROFISSAO')
  })
})
