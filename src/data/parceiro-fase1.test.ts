import { configurarApi } from '@/api/cliente'
import { authLogin, authSetActiveTenant } from '@/api/gerado'
import { atualizarParceiro, corpoDeEscrita, obterParceiro } from '@/data/parceiros-api'
import { papelCliente } from '@/features/parceiro/papeis/cliente'
import { papelFornecedor } from '@/features/parceiro/papeis/fornecedor'
import { papelProfissional } from '@/features/parceiro/papeis/profissional'
import { handlers } from '@/mocks/api/handlers'
import { TENANT_MATRIZ, resetStore } from '@/mocks/api/store'
import { idDeApoio } from '@/mocks/lookups'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * OS CAMPOS DA FASE 1 FAZEM A VOLTA INTEIRA (#250).
 *
 * O comparativo Softlux × Cabinet achou seis campos que a tela desenha e o
 * contrato não publicava — IE, IE de produtor rural, categoria, especificador,
 * observação e redes sociais. É a mesma classe de defeito do Celular (#244): o
 * corpo do `PUT` é montado a partir do contrato, então o valor morre no
 * caminho, sem erro e sem aviso.
 *
 * Por isso o teste percorre **linha do servidor → registro do formulário →
 * corpo do `PUT` → servidor → releitura**, contra os handlers do mock, e não
 * contra um stub: é o único formato em que "o valor não voltou" pode falhar.
 */

const servidor = setupServer(...handlers)

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

beforeEach(async () => {
  resetStore()
  configurarApi('http://mock.teste')
  await authLogin({ email: 'admin@vertz.dev', password: 'qualquer' })
  await authSetActiveTenant({ tenantId: TENANT_MATRIZ })
})

async function parceiroDoSeed(id: string) {
  const dto = await obterParceiro(id)
  if (!dto) throw new Error(`o seed do mock precisa ter o parceiro ${id}`)
  return dto
}

describe('cliente — categoria, especificador, IE rural, observação e redes', () => {
  it('o que o formulário edita chega ao servidor e volta', async () => {
    const linha = await parceiroDoSeed('parc-0002')
    const registro = papelCliente.dtoParaForm(linha)

    // O que o seed já tem, LIDO pelo formulário: sem isto, o teste provaria só
    // a escrita e a tela abriria em branco sobre um cadastro cheio.
    expect(registro.categoria).toBe(idDeApoio('CATEGORIA_CLIENTE', 'ARQUITETO'))
    expect(registro.profissional).toBe(idDeApoio('PROFISSIONAL', 'ANA RIBEIRO'))
    expect(registro.observacao).toContain('alto padrão')
    expect(registro.redesSociais.instagram).toBe('@mh.arquitetura')

    const editado = {
      ...registro,
      inscEstProdutorRural: '123456789',
      categoria: idDeApoio('CATEGORIA_CLIENTE', 'REVENDA'),
      profissional: idDeApoio('PROFISSIONAL', 'MAURO TAGLIARI'),
      observacao: 'Passou a comprar para revenda.',
      redesSociais: { facebook: 'fb.com/mharq', instagram: '@mh.arq' },
    }
    await atualizarParceiro(
      linha.id,
      corpoDeEscrita(linha, papelCliente.paraEscrita(editado, linha)),
    )

    const relido = await parceiroDoSeed(linha.id)
    expect(relido.ruralProducerRegistration).toBe('123456789')
    expect(relido.categoryId).toBe(idDeApoio('CATEGORIA_CLIENTE', 'REVENDA'))
    expect(relido.specifierId).toBe(idDeApoio('PROFISSIONAL', 'MAURO TAGLIARI'))
    expect(relido.notes).toBe('Passou a comprar para revenda.')
    expect(relido.facebook).toBe('fb.com/mharq')
    expect(relido.instagram).toBe('@mh.arq')
  })

  it('o NOME do vínculo é derivado do id, e o servidor é quem o devolve', async () => {
    // Par `id`+`name` do contrato: a tela lê o nome sem uma segunda consulta, e
    // a escrita manda só o id. Guardar o nome seria guardar algo que diverge do
    // id na primeira renomeação da lista de apoio.
    const relido = await parceiroDoSeed('parc-0002')
    expect(relido.categoryName).toBe('ARQUITETO')
    expect(relido.specifierName).toBe('ANA RIBEIRO')
  })

  it('o combo esvaziado DESVINCULA — `null` é escolha, não campo esquecido', async () => {
    const linha = await parceiroDoSeed('parc-0002')
    const registro = papelCliente.dtoParaForm(linha)

    const editado = { ...registro, categoria: null, profissional: null }
    await atualizarParceiro(
      linha.id,
      corpoDeEscrita(linha, papelCliente.paraEscrita(editado, linha)),
    )

    const relido = await parceiroDoSeed(linha.id)
    expect(relido.categoryId).toBeNull()
    expect(relido.specifierId).toBeNull()
    expect(relido.categoryName).toBeNull()
  })

  /**
   * A CONFUSÃO QUE A ISSUE NOMEIA, e que o schema do banco convida a fazer.
   *
   * `parentId` liga um profissional ao ESCRITÓRIO de que ele faz parte;
   * `specifierId` liga um CLIENTE a quem o indicou. São dois vínculos, no mesmo
   * cadastro, e colapsá-los pagaria comissão de indicação a um escritório que
   * nunca especificou nada.
   */
  it('gravar o especificador não mexe no vínculo pai', async () => {
    const linha = await parceiroDoSeed('parc-0002')
    const comPai = { ...linha, parentId: 'parc-0001' }

    const registro = papelCliente.dtoParaForm(comPai)
    const editado = { ...registro, profissional: idDeApoio('PROFISSIONAL', 'ESTÚDIO FERRARI') }
    const corpo = corpoDeEscrita(comPai, papelCliente.paraEscrita(editado, comPai))

    expect(corpo.specifierId).toBe(idDeApoio('PROFISSIONAL', 'ESTÚDIO FERRARI'))
    expect(corpo.parentId).toBe('parc-0001')
  })
})

describe('fornecedor — a Inscrição Estadual é da EMPRESA, não o conselho da pessoa', () => {
  it('a IE do formulário vai e volta, e não passa por `registration`', async () => {
    const linha = await parceiroDoSeed('parc-0001')
    const registro = papelFornecedor.dtoParaForm(linha)
    expect(registro.inscEst).toBe('110042490114')

    const editado = { ...registro, inscEst: '110099887766' }
    await atualizarParceiro(
      linha.id,
      corpoDeEscrita(linha, papelFornecedor.paraEscrita(editado, linha)),
    )

    const relido = await parceiroDoSeed(linha.id)
    expect(relido.stateRegistration).toBe('110099887766')
    // `registration` é CREA/CAU/CFT e continua vazio neste fornecedor: eram
    // lidos como o mesmo campo, e não são.
    expect(relido.registration).toBeNull()
  })

  it('o Gravar do Fornecedor NÃO apaga o que só a tela de Cliente edita', async () => {
    // O caminho por onde a perda dói: é a MESMA tabela, com três telas.
    const linha = await parceiroDoSeed('parc-0002')
    const registro = papelFornecedor.dtoParaForm(linha)
    const corpo = corpoDeEscrita(linha, papelFornecedor.paraEscrita(registro, linha))

    expect(corpo.categoryId).toBe(linha.categoryId)
    expect(corpo.specifierId).toBe(linha.specifierId)
    expect(corpo.notes).toBe(linha.notes)
  })
})

describe('profissional — as redes sociais que a tela §3 desenhava e não gravava', () => {
  it('vão e voltam, sem levar junto a IE que esta tela não tem', async () => {
    const linha = await parceiroDoSeed('parc-0002')
    const registro = papelProfissional.dtoParaForm(linha)

    const editado = {
      ...registro,
      redesSociais: { facebook: 'fb.com/mh', instagram: '@mh.studio' },
    }
    const corpo = corpoDeEscrita(linha, papelProfissional.paraEscrita(editado, linha))

    expect(corpo.facebook).toBe('fb.com/mh')
    expect(corpo.instagram).toBe('@mh.studio')
    expect(corpo.stateRegistration).toBe(linha.stateRegistration ?? null)
  })
})
