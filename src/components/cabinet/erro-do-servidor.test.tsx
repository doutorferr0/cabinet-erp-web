import { ErroDoServidor } from '@/components/cabinet/erro-do-servidor'
import { ErroDaApi } from '@/data/api-provider'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

/**
 * O componente único de erro do servidor.
 *
 * O que estes testes travam: que as QUATRO fontes de texto continuam
 * distinguíveis (título do servidor, frase da tela, `detail` da ocorrência,
 * `fields[]`), e que nenhuma engole a outra. Foi juntá-las numa string só que
 * já custou, mais de uma vez, a frase que o backend escolheu dizer.
 */

function erroComCampos() {
  return new ErroDaApi('Falha ao gravar o produto.', 400, 'Confira os campos destacados.', {
    type: 'about:blank',
    title: 'Requisição inválida',
    status: 400,
    detail: 'Confira os campos destacados.',
    fields: [
      { path: 'code', message: 'Informe o código do produto.' },
      { path: 'description', message: 'Informe a descrição.' },
    ],
  })
}

describe('ErroDoServidor', () => {
  it('mostra o título do SERVIDOR e a frase da TELA em papéis diferentes', () => {
    render(<ErroDoServidor erro={erroComCampos()} mensagem="Falha ao gravar o produto." />)

    // O `title` é o rótulo estável do tipo; a mensagem diz o que se estava
    // fazendo. Mostrar só um dos dois perde metade do que aconteceu.
    expect(screen.getByText('Requisição inválida')).toBeInTheDocument()
    expect(screen.getByText('Falha ao gravar o produto.')).toBeInTheDocument()
    expect(screen.getByText('Confira os campos destacados.')).toBeInTheDocument()
  })

  it('lista os campos recusados com o que há de errado em cada um', () => {
    render(<ErroDoServidor erro={erroComCampos()} mensagem="Falha ao gravar." />)

    expect(screen.getByText('Informe o código do produto.')).toBeInTheDocument()
    expect(screen.getByText('Informe a descrição.')).toBeInTheDocument()
  })

  it('o campo recusado LEVA ao controle — a lista é índice, não decoração', async () => {
    const user = userEvent.setup()
    const irPara = vi.fn()
    render(
      <ErroDoServidor erro={erroComCampos()} mensagem="Falha ao gravar." aoIrParaCampo={irPara} />,
    )

    await user.click(screen.getByRole('button', { name: 'code' }))
    expect(irPara).toHaveBeenCalledWith('code')
  })

  it('sem `aoIrParaCampo` a lista continua legível, só não navegável', () => {
    render(<ErroDoServidor erro={erroComCampos()} mensagem="Falha ao gravar." />)

    expect(screen.queryByRole('button', { name: 'code' })).not.toBeInTheDocument()
    expect(screen.getByText('code')).toBeInTheDocument()
  })

  it('erro que NÃO é do servidor cai na frase da tela, sem inventar detail', () => {
    render(<ErroDoServidor erro={new Error('Failed to fetch')} mensagem="Falha ao gravar." />)

    expect(screen.getByText('Falha ao gravar.')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
  })

  it('sem erro não desenha nada — o lugar do aviso não fica reservado em branco', () => {
    const { container } = render(<ErroDoServidor erro={null} mensagem="Falha ao gravar." />)
    expect(container).toBeEmptyDOMElement()
  })

  it('é `role="alert"`: a recusa chega a quem está olhando para o rodapé', () => {
    render(<ErroDoServidor erro={erroComCampos()} mensagem="Falha ao gravar." />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

/**
 * A leitura de `fields[]` mora no `ErroDaApi`, e é ela que precisa ser
 * desconfiada: o corpo vem do servidor e pode não ter a forma prometida.
 */
describe('ErroDaApi.campos', () => {
  it('devolve vazio quando o corpo não traz fields', () => {
    expect(new ErroDaApi('x', 400, 'y', { title: 'T', status: 400 }).campos).toEqual([])
    expect(new ErroDaApi('x', 500, undefined, undefined).campos).toEqual([])
  })

  it('descarta item malformado em vez de quebrar a tela', () => {
    const erro = new ErroDaApi('x', 400, 'y', {
      fields: [{ path: 'code', message: 'ok' }, { path: 'sem-mensagem' }, 'lixo', null],
    })
    expect(erro.campos).toEqual([{ path: 'code', message: 'ok' }])
  })
})
