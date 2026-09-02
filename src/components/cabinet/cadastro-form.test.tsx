import { CadastroForm } from '@/components/cabinet/cadastro-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ID_DO_COLABORADOR, stubDeColaboradores } from '@/test/colaboradores'
import {
  acaoNaLinha,
  renderRoute,
  renderWithQuery,
  respostaLookups,
  respostaSessao,
  respostaVinculos,
} from '@/test/utils'
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
    // O modo é CONTEXTO do cabeçalho, não sufixo do título: o `<h1>` diz a tela, o
    // Meta ao lado diz em que modo ela está.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cadastro de Colaboradores')
    expect(screen.getByText('Consulta')).toBeInTheDocument()
  })

  // O cabeçalho é identidade, não campo: `<fieldset disabled>` apaga o formulário
  // inteiro no modo consulta, e apagar junto o nome da tela deixaria o operador
  // sem saber onde está.
  it('cabeçalho de página não é desabilitado com o formulário', async () => {
    renderWithQuery(<FormularioDeMentira readOnly />)

    await screen.findByLabelText('Nome completo')
    const cabecalho = screen.getByRole('heading', { level: 1 }).closest('div')
    expect(cabecalho?.closest('fieldset')).toBeNull()
  })

  it('desabilita também os botões de dentro do formulário', async () => {
    renderWithQuery(<FormularioDeMentira readOnly />)

    await screen.findByLabelText('Nome completo')
    // `<fieldset disabled>` alcança botão de busca, não só input.
    expect(screen.getByRole('button', { name: 'Buscar naturalidade' })).toBeDisabled()
  })

  it('sem o search param a tela continua editável', async () => {
    renderRoute(`/cadastros/colaboradores/${ID_DO_COLABORADOR}`, stubDeColaboradores())

    const nome = await screen.findByLabelText('Nome completo')
    expect(nome).toBeEnabled()
    expect(screen.getByRole('button', { name: /Gravar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fechar/ })).not.toBeInTheDocument()
  })

  it('a LINHA leva ao modo consulta — o botão Consul. deixou de existir', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    // #198: clicar na linha abre o registro em consulta. O passo "marca a
    // linha, procura o botão" morreu com ela.
    await user.click(await screen.findByText('CARLA SOUZA'))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/cadastros/colaboradores/${ID_DO_COLABORADOR}`)
    })
    expect(router.state.location.search).toEqual({ modo: 'consulta' })
    // A saída da tela é o `Voltar` da folha (#235). Era o `Fechar` do cabeçalho
    // da ficha, que só esta tela tinha.
    expect(await screen.findByRole('button', { name: 'Voltar' })).toBeInTheDocument()
  })

  it('Alterar da barra de seleção NÃO entra em consulta', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores', stubDeColaboradores())

    await acaoNaLinha(user, 'CARLA SOUZA', 'Alterar')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/cadastros/colaboradores/${ID_DO_COLABORADOR}`)
    })
    expect(router.state.location.search).toEqual({})
  })

  /*
   * A ordem de compra virou HTTP na fase C do G2, então este caso passou a
   * montar o próprio servidor em vez de ler a fixture. O que ele mede não
   * mudou — é do `CadastroForm`, não do módulo de compras: em modo consulta a
   * grade calcula e exibe, e nada aceita digitação.
   *
   * O documento é montado com 3 × R$ 103,27 justamente para o subtotal cair em
   * R$ 309,81, que é o número que este caso conferia antes: trocar o valor
   * junto com a origem esconderia uma regressão de cálculo dentro da migração.
   */
  it('grade do documento também fica somente-leitura', async () => {
    const ordem = {
      id: 'oc-consulta',
      number: '2',
      status: 'draft',
      supplierId: 'forn-1',
      supplierName: 'FILLAMENTO',
      buyingTenantId: '00000000-0000-0000-0000-000000000003',
      buyingTenantName: 'MATRIZ',
      orderedAt: '2026-08-12',
      sentAt: null,
      expectedAt: null,
      rescheduledAt: null,
      rescheduleReason: null,
      minimumBillingCents: null,
      carrierId: null,
      carrierName: null,
      paymentTermId: null,
      paymentTermName: null,
      discountPercent: 0,
      surchargeCents: 0,
      subtotalCents: 30981,
      totalCents: 30981,
      notes: null,
      items: [
        {
          lineNumber: 1,
          sourceRequestId: 'pc-1',
          sourceRequestNumber: 'PC-1',
          sourceLineNumber: 1,
          variantId: null,
          description: 'ARANDELA ALUMÍNIO IP65',
          finish: 'BRANCO',
          size: 'ÚNICO',
          unit: 'UN',
          quantity: 3,
          unitCostCents: 10327,
          totalCents: 30981,
          destination: 'stock',
          productGroupId: null,
          productGroupName: null,
        },
      ],
    }

    const stub = async (entrada: RequestInfo | URL) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada)
      if (url.includes('/auth/me')) return respostaSessao()
      if (url.includes('/auth/tenants')) return respostaVinculos()
      if (url.includes('/api/catalog-lookups')) return respostaLookups()
      if (url.includes('/api/purchase-orders')) {
        return new Response(JSON.stringify(ordem), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ rows: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    renderRoute('/compras/ordens/oc-consulta?modo=consulta', stub as never)

    // O total continua sendo calculado e exibido…
    expect(await screen.findByLabelText('SubTotal')).toHaveTextContent('309,81')
    // …mas nenhuma célula aceita digitação.
    expect(screen.getByLabelText('Quantidade linha 1')).toBeDisabled()
    expect(screen.getByRole('button', { name: /Busca Alt\+T/ })).toBeDisabled()
  }, 30_000)

  it('rodapé fixo se separa por UMA hairline, não por régua de 3px', async () => {
    renderRoute(`/cadastros/colaboradores/${ID_DO_COLABORADOR}`, stubDeColaboradores())

    const gravar = await screen.findByRole('button', { name: /Gravar/ })
    const rodape = gravar.closest('div')
    // D16: a régua forte de 3px competia com a borda dos cards logo acima —
    // duas ferramentas de separação na mesma fronteira, que a §Hierarquia
    // proíbe. Fica a mais barata que resolve: hairline `n-200`.
    expect(rodape?.className).not.toContain('rule-strong-top')
    expect(rodape?.className).toContain('[border-color:var(--n-200)]')
  })
})
