import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { acaoNaLinha, renderRoute, renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

/**
 * Modo `Consul.` — transcrição §9 padrão 8. A tela é a mesma do `Alterar`;
 * o que muda é não poder editar nem gravar.
 *
 * **O objeto sob teste passou a ser montado aqui, e a nota antiga previa isto.**
 * Estas asserções rodavam pela rota de Colaborador, e o acoplamento já tinha
 * cobrado uma vez (na #101 o rótulo virou `Nome completo` e o teste quebrou sem
 * que o `CadastroForm` mudasse). Cobrou de novo na #103: `?modo=consulta` deixou
 * de abrir o formulário desabilitado e passa a abrir a FICHA — os quatro
 * cadastros não têm mais formulário em modo consulta para exercitar.
 *
 * O formulário de mentira testa o `CadastroForm` sem depender de tela nenhuma.
 * Quem prova que a rota chega na ficha é `ficha-de-cadastro.test.tsx`; quem
 * ainda usa `readOnly` de verdade são os DOCUMENTOS (Ordem de compra, abaixo),
 * onde consulta continua sendo o formulário — documento não tem módulos.
 */
const esquemaDeMentira = z.object({ nome: z.string() })

function FormularioDeMentira({ readOnly }: { readOnly: boolean }) {
  return (
    <CadastroForm
      schema={esquemaDeMentira}
      defaultValues={{ nome: 'CARLA SOUZA' }}
      onGravar={() => {}}
      onCancelar={() => {}}
      readOnly={readOnly}
      titulo="Cadastro de Colaboradores"
      contexto={readOnly ? 'Consulta' : 'CARLA SOUZA'}
    >
      <Label htmlFor="nome">Nome completo</Label>
      <Input id="nome" defaultValue="CARLA SOUZA" />
      <Button type="button">Buscar naturalidade</Button>
    </CadastroForm>
  )
}

describe('CadastroForm em modo consulta', () => {
  it('carrega os dados mas desabilita os campos e esconde Gravar', async () => {
    renderWithQuery(<FormularioDeMentira readOnly />)

    const nome = await screen.findByLabelText('Nome completo')
    expect(nome).toHaveValue('CARLA SOUZA')
    expect(nome).toBeDisabled()

    expect(screen.queryByRole('button', { name: /Gravar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fechar/ })).toBeInTheDocument()
    // O modo é CONTEXTO da banda, não sufixo do título: o `<h1>` diz a tela, o
    // Meta ao lado diz em que modo ela está.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cadastro de Colaboradores')
    expect(screen.getByText('Consulta')).toBeInTheDocument()
  })

  // A banda é identidade, não campo: `<fieldset disabled>` apaga o formulário
  // inteiro no modo consulta, e apagar junto o nome da tela deixaria o operador
  // sem saber onde está.
  it('banda de identidade não é desabilitada com o formulário', async () => {
    renderWithQuery(<FormularioDeMentira readOnly />)

    await screen.findByLabelText('Nome completo')
    const banda = screen.getByRole('heading', { level: 1 }).closest('div')
    expect(banda?.closest('fieldset')).toBeNull()
  })

  it('desabilita também os botões de dentro do formulário', async () => {
    renderWithQuery(<FormularioDeMentira readOnly />)

    await screen.findByLabelText('Nome completo')
    // `<fieldset disabled>` alcança botão de busca, não só input.
    expect(screen.getByRole('button', { name: 'Buscar naturalidade' })).toBeDisabled()
  })

  it('sem o search param a tela continua editável', async () => {
    renderRoute('/cadastros/colaboradores/1')

    const nome = await screen.findByLabelText('Nome completo')
    expect(nome).toBeEnabled()
    expect(screen.getByRole('button', { name: /Gravar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fechar/ })).not.toBeInTheDocument()
  })

  it('a LINHA leva ao modo consulta — o botão Consul. deixou de existir', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores')

    // #198: clicar na linha abre o registro em consulta. O passo "marca a
    // linha, procura o botão" morreu com ela.
    await user.click(await screen.findByText('CARLA SOUZA'))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores/1')
    })
    expect(router.state.location.search).toEqual({ modo: 'consulta' })
    expect(await screen.findByRole('button', { name: /Fechar/ })).toBeInTheDocument()
  })

  it('Alterar da barra de seleção NÃO entra em consulta', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores')

    await acaoNaLinha(user, 'CARLA SOUZA', 'Alterar')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores/1')
    })
    expect(router.state.location.search).toEqual({})
  })

  it('grade do documento também fica somente-leitura', async () => {
    renderRoute('/compras/ordens/2?modo=consulta')

    // O total continua sendo calculado e exibido…
    expect(await screen.findByLabelText('SubTotal')).toHaveTextContent('309,81')
    // …mas nenhuma célula aceita digitação.
    expect(screen.getByLabelText('Quantidade linha 1')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Busca \(Alt\+T\)/ })).toBeDisabled()
  })

  it('rodapé fixo usa régua forte na borda superior (DESIGN.md)', async () => {
    renderRoute('/cadastros/colaboradores/1')

    const gravar = await screen.findByRole('button', { name: /Gravar/ })
    const rodape = gravar.closest('div')
    // A régua é utility (`rule-strong-top`), não `border-t` + cor na tela: a
    // espessura de 3px é parte dela e muda num ponto só na recalibração.
    expect(rodape?.className).toContain('rule-strong-top')
  })
})
