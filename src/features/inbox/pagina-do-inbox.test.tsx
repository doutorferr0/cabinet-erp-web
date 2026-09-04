import { redefinirInbox } from '@/features/inbox/estado-do-inbox'
import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/**
 * O store da caixa é de MÓDULO (ver `estado-do-inbox.ts`): sobrevive à
 * desmontagem da rota, que é justamente o que ele existe para fazer. O preço é
 * que ele também sobrevive de um caso para o outro — sem redefinir, um caso que
 * marca tudo como lido deixaria a caixa vazia para o seguinte e a ordem dos
 * casos viraria parte da asserção.
 */
beforeEach(redefinirInbox)
afterEach(redefinirInbox)

/**
 * A lista É a do inbox, e não "a única `<ul>` da tela" (D37).
 *
 * `getByRole('list')` sem escopo achava uma só quando este teste foi escrito,
 * com o shell antigo. A barra da D4 monta um `<ul>` por grupo aberto — mais o de
 * Favoritos e o de Recentes —, e a busca global passou a reprovar com "found
 * multiple elements", que não fala do inbox. O card da tela já se nomeia; é por
 * ele que se entra.
 */
const lista = () =>
  within(within(screen.getByRole('region', { name: /Caixa de entrada/ })).getByRole('list'))

describe('caixa de entrada', () => {
  it('abre em Não lidas e mostra só o que ainda pede trabalho', async () => {
    renderRoute('/inbox')

    // 8 no mock, 5 não lidos.
    await waitFor(() => {
      expect(lista().getAllByRole('listitem')).toHaveLength(5)
    })
    expect(screen.getByRole('heading', { name: 'Caixa de entrada' })).toBeInTheDocument()
    expect(screen.getByText('5 não lidas')).toBeInTheDocument()
  })

  /**
   * A view é o RECORTE, e o teste vale pelo par: a lista muda E o endereço
   * muda. Só a lista provaria um filtro em `useState`, que é exatamente o que a
   * rota existe para não ser — recorte que não sobrevive ao F5 nem se cola para
   * outra pessoa.
   */
  it('trocar de view muda a lista e publica o recorte no endereço', async () => {
    const { router, user } = renderRoute('/inbox')

    await screen.findByRole('tab', { name: /Menções/ })
    await user.click(screen.getByRole('tab', { name: /Menções/ }))

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ view: 'mencoes' })
    })
    // Três menções no mock, e duas delas já lidas: menção não some por ter
    // sido vista, que é o recorte que a view promete.
    expect(lista().getAllByRole('listitem')).toHaveLength(3)

    await user.click(screen.getByRole('tab', { name: /Tudo/ }))
    await waitFor(() => {
      expect(lista().getAllByRole('listitem')).toHaveLength(8)
    })
  })

  it('view desconhecida no endereço cai na padrão em vez de quebrar', async () => {
    renderRoute('/inbox?view=xpto')

    await waitFor(() => {
      expect(lista().getAllByRole('listitem')).toHaveLength(5)
    })
  })

  /**
   * A AÇÃO INLINE é a razão de a caixa ser lista de trabalho e não mural: o
   * item se resolve sem sair da linha. Em `Não lidas` resolver significa
   * DESAPARECER da lista, e o cabeçalho tem de concordar no mesmo instante —
   * são dois leitores do mesmo store.
   */
  it('marcar como lida tira o item da view e abate a contagem', async () => {
    const { user } = renderRoute('/inbox')

    const primeira = await screen.findAllByRole('button', { name: /^Marcar como lida:/ })
    await user.click(primeira[0] as HTMLElement)

    await waitFor(() => {
      expect(lista().getAllByRole('listitem')).toHaveLength(4)
    })
    expect(screen.getByText('4 não lidas')).toBeInTheDocument()
  })

  it('marcar tudo como lido esvazia a view e o botão se desabilita', async () => {
    const { user } = renderRoute('/inbox')

    await user.click(await screen.findByRole('button', { name: 'Marcar tudo como lido' }))

    expect(await screen.findByText(/A caixa está limpa/)).toBeInTheDocument()
    // Dentro do card, e não na tela: os `<ul>` da barra continuam lá (D37).
    expect(
      within(screen.getByRole('region', { name: /Caixa de entrada/ })).queryByRole('list'),
    ).not.toBeInTheDocument()
    // Zero não vira "0 não lidas": a ausência do contexto já é a informação.
    expect(screen.queryByText(/não lidas/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar tudo como lido' })).toBeDisabled()
  })

  /**
   * O código do registro é LINK e é MONO — as duas metades da mesma decisão.
   * Link porque a linha existe para levar ao registro; mono porque é código que
   * se copia e se compara (§Hierarquia: mono = dado, sem exceção). Asserir só o
   * texto deixaria passar um `<span>`, que é a versão da linha que não resolve
   * nada.
   */
  it('o registro é link em mono para o destino', async () => {
    renderRoute('/inbox')

    const registro = await screen.findByRole('link', { name: 'ORC-2481' })
    expect(registro).toHaveAttribute('href', '/vendas/orcamentos')
    expect(registro).toHaveClass('t-dado')
  })
})
