import { renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/** A folha que o shell monta em volta do `<Outlet/>`. */
function folha(): HTMLElement {
  const alvo = document.querySelector('[data-slot="page-frame"]')
  if (!alvo) throw new Error('a folha não foi montada')
  return alvo as HTMLElement
}

/**
 * O CONTORNO DA FOLHA É ESTRUTURAL DESDE 2026-08-13, e este teste existe por
 * causa disso.
 *
 * Até 2026-08-12 bancada e folha se separavam por MATIZ — creme quente embaixo,
 * cinza frio em cima. O degrau térmico segurava a separação sozinho, e o traço
 * era acabamento. Com as duas superfícies cinzas, a separação é só de
 * luminância e ela é BAIXA de propósito: **1,10:1 medido**. A partir daí quem
 * delimita a folha é o traço preto de 2px.
 *
 * A consequência é a que ninguém enxerga lendo o diff: "suavizar a borda" não
 * deixa a folha mais leve — faz a folha DESAPARECER contra a bancada. Trocar
 * `border-2` por `border`, tirar `border-border` ou remover a sombra são
 * mudanças que passam em toda a suíte e só aparecem na tela, para o operador.
 *
 * Monta pelo ROTEADOR e não com `render(<PageFrame/>)` puro: desde a #235 a
 * folha abriga o `Voltar` universal, que lê a rota. Montá-la fora do router
 * mediria uma peça que não existe em tela nenhuma.
 */
describe('PageFrame — a folha', () => {
  it('é delimitada por traço de 2px no token do traço', async () => {
    renderRoute('/')
    await waitFor(() => expect(document.querySelector('[data-slot="page-frame"]')).toBeTruthy())

    const classes = folha().className.split(/\s+/)

    // O par que segura a folha: espessura E token. `border` sozinho (1px) ou um
    // literal no lugar do token quebram a delimitação sem quebrar nada mais.
    expect(classes).toContain('border-2')
    expect(classes).toContain('border-border')
    // Superfície da folha, não da bancada — o degrau de luz que o traço fecha.
    expect(classes).toContain('bg-card')
  })

  it('leva a elevação padrão, que é o segundo sinal de que a folha pousa sobre a bancada', async () => {
    renderRoute('/')
    await waitFor(() => expect(document.querySelector('[data-slot="page-frame"]')).toBeTruthy())

    // FUSÃO v5 (fase 1.7): superfície estática usa a sombra MACIA; a escada
    // dura el1-5 ficou para o que é interativo ou decisão.
    expect(folha().className).toContain('shadow-macia')
  })
})

/**
 * O `Voltar` UNIVERSAL (issue #235) — espec fusão v5, §"Regras fixas de
 * página": *"Voltar/cancelar SEMPRE no canto superior esquerdo"*.
 *
 * Antes disto a saída era opt-in por tela: `PageHeader` tinha a prop `voltar` e
 * **um único consumidor** a passava (a ficha de cadastro). Formulário de
 * inclusão, documento e detalhe ficavam sem saída visível — quem entrasse por
 * link ou recarga dependia do botão do navegador, que numa SPA volta para fora
 * da aplicação com a mesma facilidade com que volta para dentro.
 *
 * Mora na FOLHA e não em cada tela justamente para não voltar a ser opt-in:
 * tela nova nasce com saída sem lembrar de nada.
 */
describe('Voltar universal (#235)', () => {
  it('não aparece em tela que o menu publica — não há para onde voltar', async () => {
    renderRoute('/cadastros/clientes')
    await screen.findByRole('heading', { name: /Cliente/i })

    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument()
  })

  it('aparece no que está depois de um destino do menu', async () => {
    renderRoute('/cadastros/clientes/novo')

    expect(await screen.findByRole('button', { name: 'Voltar' })).toBeInTheDocument()
  })

  /**
   * Entrada FRIA — link colado, recarga, aba nova. Não há histórico da SPA para
   * desfazer, e é exatamente aqui que o botão do navegador levaria para fora.
   */
  it('sem histórico, cai na rota-mãe declarada', async () => {
    const { router, user } = renderRoute('/cadastros/clientes/novo')

    await user.click(await screen.findByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/cadastros/clientes'))
  })

  /**
   * Com histórico o botão desfaz a navegação de verdade, e não pula para a
   * rota-mãe: quem veio de Fornecedores volta para Fornecedores. O par com o
   * teste acima é o que separa `history.back()` de `navigate(mãe)` — uma
   * implementação que só fizesse o segundo passaria naquele e falharia aqui.
   */
  it('com histórico, desfaz a navegação em vez de pular para a mãe', async () => {
    const { router, user } = renderRoute('/cadastros/fornecedores')
    await screen.findByRole('heading', { name: /Fornecedor/i })

    // Pela rota TIPADA: `novo` é o parâmetro da rota de detalhe, e não um
    // caminho próprio — `to: '/cadastros/clientes/novo'` não compila.
    await router.navigate({ to: '/cadastros/clientes/$clienteId', params: { clienteId: 'novo' } })
    await user.click(await screen.findByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/cadastros/fornecedores'))
  })
})
