import {
  estagioDoContrato,
  estagioParaContrato,
  funilDoContrato,
  funilParaContrato,
} from '@/data/crm-api'
import { corpoDeEscrita } from '@/data/parceiros-api'
import { produtoDoContrato, produtoParaContrato } from '@/data/produtos-api'
import { clienteSchema } from '@/features/cliente/cliente-form'
import { funilSchema } from '@/features/crm/funil-form'
import { fornecedorSchema } from '@/features/fornecedor/fornecedor-form'
import { papelCliente } from '@/features/parceiro/papeis/cliente'
import { papelFornecedor } from '@/features/parceiro/papeis/fornecedor'
import { papelProfissional } from '@/features/parceiro/papeis/profissional'
import { produtoSchema } from '@/features/produto/produto-form'
import { profissionalSchema } from '@/features/profissional/profissional-form'
import { describe, expect, it } from 'vitest'
import contrato from '../../contracts/openapi-v1.json'

/**
 * A GUARDA DE CLASSE: nenhum formulário pode PERDER campo do contrato em
 * silêncio.
 *
 * O defeito que ela previne tem três peças, e nenhuma é bug — todas são decisão
 * correta que, juntas, viram armadilha:
 *
 * 1. **Zod descarta o que não declara.** É o que o torna seguro; é também o que
 *    faz um campo sobreviver à leitura e sumir no `parse` do submit.
 * 2. **`PUT` substitui o registro inteiro** — semântica inegociável do contrato
 *    (`docs/integracao.md`). Campo ausente do corpo é campo APAGADO.
 * 3. **O contrato cresce.** Cada campo novo que a tela não declarar entra
 *    calado nessa conta.
 *
 * O resultado é a pior classe de defeito que este repo conhece: **nenhum campo
 * visível muda**, a tela não erra, o teste da tela passa, e o operador só
 * descobre na próxima vez que abrir o cadastro — quando o dado já se foi. Foi
 * assim que os ids de Tipo/Marca/Fábrica quase saíram do produto em 2026-08-13.
 *
 * ## Como a guarda funciona
 *
 * Ela lê o `contracts/openapi-v1.json` DIRETO, não uma lista mantida à mão: por
 * isso campo novo no contrato entra na verificação sozinho, que era a condição
 * do user ("sem isso, o próximo campo novo reabre o buraco"). Para cada
 * formulário, o teste percorre o caminho REAL do dado —
 * `DTO → dtoParaForm → schema.parse → paraContrato` — e exige que cada chave do
 * `WriteRequest` chegue do outro lado **com o valor que veio do servidor**.
 *
 * Campo que a tela não edita não é exceção: ele precisa estar declarado no
 * schema do formulário como carregado-não-editado (é o que os ids da
 * classificação fazem). Se não estiver, o valor se perde no `parse` e o teste
 * quebra — que é exatamente o ponto.
 *
 * ## O que esta guarda NÃO cobre, e é bom saber
 *
 * O parceiro tem uma segunda rede: `corpoDeEscrita` devolve o valor ORIGINAL
 * quando o formulário não manda nada. Isso protege o dado — e faz com que, ali,
 * um campo derrubado do schema Zod passe neste teste. O dado não se perde; o
 * que se perde é a EDIÇÃO (o operador digita e não grava), que é outra classe de
 * defeito e tem outro dono: o `AvisoDeCobertura` da tela.
 *
 * Verificado por mutação em 2026-08-13, e vale repetir a receita ao mexer aqui:
 * derrubar um campo do schema do formulário, ou do corpo de escrita, e conferir
 * que ESTE teste fica vermelho. Guarda que não morde é pior que guarda nenhuma —
 * dá a sensação de cobertura.
 */

type Json = Record<string, unknown>

const schemas = (contrato as { components: { schemas: Record<string, Json> } }).components.schemas

/** As chaves que o corpo de escrita do recurso tem, lidas do contrato. */
function chavesDeEscrita(nomeDoSchema: string): string[] {
  const schema = schemas[nomeDoSchema] as { properties?: Record<string, unknown> } | undefined
  const propriedades = schema?.properties
  if (!propriedades) throw new Error(`schema ${nomeDoSchema} não encontrado no contrato`)
  return Object.keys(propriedades)
}

/**
 * Um valor DISTINTO e reconhecível por chave, derivado do tipo do contrato.
 *
 * Distinto porque o teste precisa saber se o campo chegou do outro lado com o
 * valor CERTO — dois campos com o mesmo valor esconderiam uma troca. Uuid onde o
 * contrato pede uuid, senão a validação do cliente gerado recusaria.
 */
function valorDeTeste(chave: string, definicao: Json, indice: number): unknown {
  const tipo = definicao.type
  const tipos = Array.isArray(tipo) ? tipo : [tipo]
  if (definicao.$ref || definicao.oneOf) return null // objeto aninhado: `null` é valor legítimo
  if (tipos.includes('boolean')) return true
  if (tipos.includes('integer') || tipos.includes('number')) return 1000 + indice
  if (definicao.format === 'uuid') {
    return `${String(indice).padStart(8, '0')}-1111-4111-8111-111111111111`
  }
  if (definicao.format === 'date') return '2026-08-13'
  return `${chave.toUpperCase()}-${indice}`
}

/** DTO de leitura com TODAS as chaves preenchidas, montado do contrato. */
function dtoCompleto(nomeDoSchema: string, extras: Json = {}): Json {
  const schema = schemas[nomeDoSchema] as { properties: Record<string, Json> }
  const dto: Json = {}
  Object.entries(schema.properties).forEach(([chave, definicao], i) => {
    dto[chave] = valorDeTeste(chave, definicao, i + 1)
  })
  return { ...dto, ...extras }
}

/**
 * Confere UMA chave do corpo de escrita contra o DTO que veio do servidor.
 *
 * Três exigências, em ordem de sutileza:
 * 1. a chave EXISTE no corpo — senão o `PUT` apaga por omissão;
 * 2. o valor não é `undefined` — `{x: undefined}` passa em `toHaveProperty` e
 *    some no `JSON.stringify`, que é o mesmo apagar com outra cara;
 * 3. se o DTO de leitura tem uma chave de MESMO NOME, o valor tem de ser o
 *    mesmo. É esta que torna a guarda automática: campo novo no contrato entra
 *    na verificação sem ninguém escrever asserção para ele.
 *
 * O passo 3 aceita exceção — mas só DECLARADA, com motivo, na lista de cada
 * recurso. É a forma que "carregado-não-editado" toma neste teste.
 */
function confereChave(
  corpo: Json,
  dto: Json,
  chave: string,
  transformadas: Record<string, string>,
) {
  expect(corpo, `chave ${chave} sumiu no caminho do formulário`).toHaveProperty(chave)
  expect(corpo[chave], `chave ${chave} chegou undefined — some no JSON e o PUT apaga`).not.toBe(
    undefined,
  )

  const motivo = transformadas[chave]
  if (motivo !== undefined) return // exceção declarada: ver a lista do recurso
  if (!(chave in dto)) return // campo só de escrita, sem par na leitura

  expect(
    corpo[chave],
    `chave ${chave} chegou diferente do que o servidor mandou — se a transformação é intencional, declare-a com o motivo`,
  ).toEqual(dto[chave])
}

/**
 * A OUTRA METADE: o campo que a tela EDITA continua saindo daqui?
 *
 * A verificação de cima protege o DADO — nada se apaga. Ela não vê o defeito
 * espelhado: o campo que o operador digita e que **para de viajar**. No parceiro
 * isso é invisível de propósito, porque `corpoDeEscrita` devolve o valor
 * original quando o formulário não manda nada; a rede que salva o dado é a mesma
 * que esconde a edição perdida.
 *
 * Por isso cada recurso declara aqui o que é EDITÁVEL, com o caminho no registro
 * do formulário. O que não estiver na lista é, por definição,
 * carregado-não-editado — e é essa a declaração explícita. Campo que muda de
 * lado (vira editável, deixa de ser) muda aqui, à vista, e não por acidente.
 */
function editando(registro: Json, caminho: string, valor: unknown): Json {
  const partes = caminho.split('.')
  const copia: Json = { ...registro }
  let alvo = copia
  for (const parte of partes.slice(0, -1)) {
    alvo[parte] = { ...(alvo[parte] as Json) }
    alvo = alvo[parte] as Json
  }
  alvo[partes[partes.length - 1] as string] = valor
  return copia
}

describe('cobertura de escrita — o formulário não perde campo do contrato', () => {
  it('PRODUTO leva ao servidor tudo que o ProductWriteRequest tem', () => {
    const dto = dtoCompleto('ProductDetailDto', { variants: [] })
    // O caminho REAL: detalhe → registro do form → `parse` do Zod → corpo.
    const doForm = produtoSchema.parse(produtoDoContrato(dto as never))
    const corpo = produtoParaContrato(doForm as never) as unknown as Json

    for (const chave of chavesDeEscrita('ProductWriteRequest')) {
      confereChave(corpo, dto, chave, {
        // A ficha técnica é o único campo que MUDA de forma no caminho: o
        // contrato manda um objeto, o formulário é plano, e a volta remonta.
        // O round-trip dela tem teste próprio em `produtos-api.test.ts`.
        specs: 'objeto no contrato, campos planos no formulário',
      })
    }
  })

  /**
   * O FUNIL tem duas escritas na mesma tela — o cabeçalho e cada etapa — e as
   * duas passam por schemas Zod. Duas chances de perder campo, duas entradas
   * aqui.
   *
   * A etapa é o caso mais exposto: a grade edita seis colunas, o `PUT`
   * substitui o estágio inteiro, e um campo que saísse do schema da linha
   * (`rotDays`, por exemplo) apagaria o apodrecimento de toda etapa gravada sem
   * mudar nada na tela.
   */
  it('FUNIL leva ao servidor tudo que o CrmPipelineWriteRequest tem', () => {
    const dto = dtoCompleto('CrmPipelineDto')
    const doForm = funilSchema.parse(funilDoContrato(dto as never, []))
    const corpo = funilParaContrato(doForm as never) as unknown as Json

    for (const chave of chavesDeEscrita('CrmPipelineWriteRequest')) {
      confereChave(corpo, dto, chave, {})
    }
  })

  it('ETAPA leva ao servidor tudo que o CrmStageWriteRequest tem', () => {
    const dto = dtoCompleto('CrmStageDto')
    const doForm = funilSchema.shape.estagios.element.parse(estagioDoContrato(dto as never))
    const corpo = estagioParaContrato(doForm as never) as unknown as Json

    for (const chave of chavesDeEscrita('CrmStageWriteRequest')) {
      confereChave(corpo, dto, chave, {})
    }
  })

  // Os três papéis compartilham `PartnerWriteRequest` e têm schemas DIFERENTES:
  // o que o Cliente não declara, o Profissional declara. Por isso os três são
  // verificados, e não só um.
  const papeis = [
    { nome: 'CLIENTE', papel: papelCliente, schema: clienteSchema },
    { nome: 'FORNECEDOR', papel: papelFornecedor, schema: fornecedorSchema },
    { nome: 'PROFISSIONAL', papel: papelProfissional, schema: profissionalSchema },
  ]

  // Chave do contrato → campo do formulário que a edita, POR PAPEL. As três
  // telas usam o mesmo `PartnerWriteRequest` e editam conjuntos diferentes: o
  // Cliente não tem Nome Fantasia; só o Profissional tem conselho.
  const editaveisPorPapel: Record<string, Record<string, string>> = {
    CLIENTE: { legalName: 'nome', document: 'cpf', email: 'email' },
    FORNECEDOR: {
      legalName: 'razaoSocial',
      tradeName: 'nomeFantasia',
      document: 'cnpjCpf',
      email: 'email',
    },
    PROFISSIONAL: {
      legalName: 'nome',
      tradeName: 'nomeApresentacao',
      document: 'cpf',
      email: 'email',
      registration: 'registroProfissional',
    },
  }

  for (const { nome, papel, schema } of papeis) {
    it(`${nome} leva ao servidor tudo que o PartnerWriteRequest tem`, () => {
      const dto = dtoCompleto('PartnerDto') as never
      const doForm = schema.parse(papel.dtoParaForm(dto)) as never
      const corpo = corpoDeEscrita(dto, papel.paraEscrita(doForm, dto)) as unknown as Json

      for (const chave of chavesDeEscrita('PartnerWriteRequest')) {
        confereChave(corpo, dto as unknown as Json, chave, {
          // Os três papéis são exclusivos por tela: incluir marca só o da tela,
          // e alterar devolve os da linha. Coberto em `parceiros-api.test.ts`.
          isCustomer: 'papel vem da linha ou da tela, não do formulário',
          isSupplier: 'idem',
          isProfessional: 'idem',
        })
      }
    })

    it(`${nome} continua ENVIANDO o que a tela edita`, () => {
      const dto = dtoCompleto('PartnerDto') as never
      const editaveis = editaveisPorPapel[nome] as Record<string, string>

      for (const [chaveDoContrato, campoDoForm] of Object.entries(editaveis)) {
        const digitado = `DIGITADO-${chaveDoContrato}`
        const registro = editando(papel.dtoParaForm(dto) as unknown as Json, campoDoForm, digitado)
        const doForm = schema.parse(registro) as never
        const corpo = corpoDeEscrita(dto, papel.paraEscrita(doForm, dto)) as unknown as Json

        expect(
          corpo[chaveDoContrato],
          `${nome}: o operador digitou em "${campoDoForm}" e o PUT não levou — a rede do corpoDeEscrita devolveu o valor antigo, e ninguém percebe`,
        ).toBe(digitado)
      }
    })
  }
})
