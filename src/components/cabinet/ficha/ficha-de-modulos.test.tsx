import { FichaDeModulos } from '@/components/cabinet/ficha/ficha-de-modulos'
import { moduloVazio, textoDoCampo, valorNoCaminho } from '@/components/cabinet/ficha/valores'
import { ENTIDADES, cliente, colaborador } from '@/features/cadastro/modulos'
import { renderWithQuery } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * A FICHA DE LEITURA (issue #103).
 *
 * O caso que estes testes protegem não é o desenho — é a promessa de que **a
 * ficha e o formulário são o mesmo schema**. O drift já aconteceu uma vez com os
 * `FormBlock` escritos à mão (Fornecedor 13 blocos, Profissional 3), e uma
 * segunda tela sobre a mesma entidade é exatamente onde ele volta.
 */

const REGISTRO_CHEIO = {
  nome: 'MARINA DUARTE PRADO',
  cpf: '31844290715',
  celular: '19998124400',
  email: 'marina@teste.com',
  ativo: true,
  rg: '449021173',
  endereco: { cep: '13024110', cidadeNome: 'CAMPINAS', uf: 'SP' },
}

describe('leitura do registro pelo schema', () => {
  it('caminho pontilhado alcança o campo aninhado', () => {
    expect(valorNoCaminho(REGISTRO_CHEIO, 'endereco.cidadeNome')).toBe('CAMPINAS')
  })

  it('caminho que não existe é `undefined`, não estouro', () => {
    expect(valorNoCaminho(REGISTRO_CHEIO, 'endereco.nao.existe')).toBeUndefined()
    expect(valorNoCaminho(null, 'qualquer')).toBeUndefined()
  })

  it('booleano vira Sim/Não — `false` é VALOR, não ausência', () => {
    // `false` cair em "não informado" seria dizer que ninguém respondeu, quando
    // alguém respondeu que não. É o campo `Ativo` de todo cadastro.
    const campo = { k: 'ativo', r: 'Ativo', campo: 'ativo' }
    expect(textoDoCampo({ ativo: true }, campo)).toBe('Sim')
    expect(textoDoCampo({ ativo: false }, campo)).toBe('Não')
  })

  it('campo que o repo ainda não guarda conta como vazio', () => {
    // Sem `campo` no schema, não há onde ter valor. Contar como preenchido faria
    // um módulo inteiramente teórico (`Metas e comissão`) abrir cheio de
    // "não informado".
    expect(textoDoCampo(REGISTRO_CHEIO, { k: 'meta', r: 'Meta mensal' })).toBeNull()
  })

  it('`rotulos` traduz o valor guardado no texto que se lê', () => {
    // É por aqui que o id de uma lista de apoio vira nome, sem a ficha consultar
    // lista nenhuma.
    const campo = { k: 'setor', r: 'Setor', campo: 'setor' }
    const traduzido = textoDoCampo({ setor: 'lk-SETOR-1' }, campo, { 'lk-SETOR-1': 'VENDAS' })
    expect(traduzido).toBe('VENDAS')
  })
})

describe('FichaDeModulos', () => {
  it('módulo COM dado renderiza aberto', () => {
    renderWithQuery(<FichaDeModulos entidade={cliente} registro={REGISTRO_CHEIO} />)

    const identificacao = document.querySelector('[data-modulo-id="identificacao"]')
    expect(identificacao).not.toBeNull()
    expect(identificacao).not.toHaveAttribute('data-vazio')
    // Aberto de verdade: o valor está na tela, não escondido atrás de um gatilho.
    expect(screen.getByText('MARINA DUARTE PRADO')).toBeInTheDocument()
  })

  it('módulo SEM nenhum campo preenchido renderiza recolhido e apagado', () => {
    renderWithQuery(<FichaDeModulos entidade={cliente} registro={REGISTRO_CHEIO} />)

    // `Observação interna` não tem valor no registro acima.
    const observacao = document.querySelector('[data-modulo-id="observacao"]')
    expect(observacao).toHaveAttribute('data-vazio', 'true')
    // Recolhido quer dizer BAIXO, não escondido: uma fileira com o nome e o
    // resumo, sem os pares rótulo/valor. Nenhum `não informado` aqui dentro —
    // é isso que o diferencia do módulo cheio com campos em branco.
    expect(observacao?.textContent).toContain('Observação interna')
    expect(observacao?.textContent).not.toContain('não informado')
    // E é cinza: sem a cor do módulo, que anuncia conteúdo.
    expect(observacao?.querySelector('[data-modulo]')).toBeNull()
  })

  it('campo sem valor dentro de módulo CHEIO escreve "não informado"', () => {
    // A regra que a issue nomeia: some o módulo inteiro, nunca o campo solto.
    // Sem isto o leitor não distingue "o dado não existe" de "a tela não mostra".
    renderWithQuery(<FichaDeModulos entidade={cliente} registro={REGISTRO_CHEIO} />)

    expect(screen.getAllByText('não informado').length).toBeGreaterThan(0)
    // E o rótulo do campo vazio continua lá, nomeando o que falta.
    expect(screen.getByText('Código')).toBeInTheDocument()
  })

  it('o lápis abre a edição DAQUELE módulo, não do formulário inteiro', async () => {
    const editar = vi.fn()
    const { user } = renderWithQuery(
      <FichaDeModulos entidade={cliente} registro={REGISTRO_CHEIO} onEditarModulo={editar} />,
    )

    await user.click(screen.getByRole('button', { name: 'Alterar Identificação' }))
    expect(editar).toHaveBeenCalledWith('identificacao')
  })

  it('módulo vazio convida a preencher, e diz qual', async () => {
    const preencher = vi.fn()
    const { user } = renderWithQuery(
      <FichaDeModulos entidade={cliente} registro={REGISTRO_CHEIO} onPreencherModulo={preencher} />,
    )

    await user.click(screen.getByRole('button', { name: 'Preencher Observação interna' }))
    expect(preencher).toHaveBeenCalledWith('observacao')
  })

  it('registro em branco: TODOS os módulos vazios, nenhum some da tela', () => {
    renderWithQuery(<FichaDeModulos entidade={colaborador} registro={{}} />)

    for (const modulo of colaborador.modulos) {
      const secao = document.querySelector(`[data-modulo-id="${modulo.id}"]`)
      expect(secao, modulo.id).toHaveAttribute('data-vazio', 'true')
    }
  })

  /**
   * A FAIXA DE INDICADORES QUE NÃO EXISTE — e a ficha diz isso.
   *
   * Era uma prop `kpis` que tela nenhuma passava: desenho aprovado, invisível
   * para todo teste. Quatro quadros vazios diriam "sem dado"; a linha diz "sem
   * origem", e os nomes vêm do schema, não deste teste.
   */
  it('a faixa de indicadores aparece como lacuna nomeada, sem número inventado', () => {
    renderWithQuery(<FichaDeModulos entidade={cliente} registro={REGISTRO_CHEIO} />)

    const pendencia = document.querySelector('[data-slot="indicadores-pendentes"]')
    expect(pendencia).not.toBeNull()
    for (const indicador of cliente.indicadores ?? []) {
      expect(pendencia).toHaveTextContent(indicador.r)
    }

    // Nenhum quadro de KPI na tela: a faixa não desenha valor até ter origem.
    expect(screen.queryByText('R$ 0,00')).toBeNull()
    expect(screen.queryByText('—')).toBeNull()
  })

  it('entidade sem indicadores declarados não imprime linha nenhuma', () => {
    // A linha é conteúdo, não moldura: sem indicador no schema ela não existe,
    // em vez de aparecer vazia.
    renderWithQuery(
      <FichaDeModulos entidade={{ ...cliente, indicadores: [] }} registro={REGISTRO_CHEIO} />,
    )

    expect(document.querySelector('[data-slot="indicadores-pendentes"]')).toBeNull()
  })
})

/**
 * O TESTE QUE IMPEDE AS DUAS TELAS DE DIVERGIREM.
 *
 * Não checa aparência: checa que a ficha nasce da MESMA lista de módulos que o
 * formulário. Módulo novo no schema aparece nas duas sem ninguém lembrar;
 * módulo que alguém acrescentar só numa das telas não passa por aqui, porque
 * não existe "só numa das telas" — existe um schema.
 */
describe('paridade entre formulário e ficha', () => {
  it.each(Object.entries(ENTIDADES))(
    '%s: a ficha tem uma seção por módulo do schema, com o mesmo id',
    (_, entidade) => {
      renderWithQuery(<FichaDeModulos entidade={entidade} registro={{}} />)

      const naFicha = [...document.querySelectorAll('[data-modulo-id]')].map(
        (el) => el.getAttribute('data-modulo-id') as string,
      )
      expect(naFicha).toEqual(entidade.modulos.map((modulo) => modulo.id))
    },
  )

  it('nenhum módulo da ficha é inventado fora do schema', () => {
    // O espelho do caso acima, e vale a pena estar escrito: a ficha não pode
    // acrescentar seção própria (um "Resumo", um "Histórico") sem que ela exista
    // no schema — senão o formulário passa a não ter onde editá-la.
    renderWithQuery(<FichaDeModulos entidade={cliente} registro={REGISTRO_CHEIO} />)

    const ids = new Set(cliente.modulos.map((m) => m.id))
    for (const el of document.querySelectorAll('[data-modulo-id]')) {
      expect(ids.has(el.getAttribute('data-modulo-id') as string)).toBe(true)
    }
  })

  it('módulo obrigatório do schema NUNCA aparece recolhido na ficha por acaso', () => {
    // Ele pode ficar vazio num registro novo, e aí recolhe como qualquer outro.
    // O que não pode é recolher tendo dado — é o módulo que se veio ler.
    renderWithQuery(<FichaDeModulos entidade={cliente} registro={REGISTRO_CHEIO} />)

    const obrigatorio = cliente.modulos.find((m) => m.obrigatorio)
    expect(moduloVazio(REGISTRO_CHEIO, obrigatorio as never)).toBe(false)
    expect(document.querySelector(`[data-modulo-id="${obrigatorio?.id}"]`)).not.toHaveAttribute(
      'data-vazio',
    )
  })
})
