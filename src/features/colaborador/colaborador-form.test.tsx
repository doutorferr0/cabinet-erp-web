import { renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('tela Colaborador', () => {
  it('listagem mostra colaboradores mockados', async () => {
    renderRoute('/cadastros/colaboradores')
    expect(await screen.findByText('CARLA SOUZA')).toBeInTheDocument()
    expect(screen.getByText('Cadastro de Colaboradores')).toBeInTheDocument()
  })

  it('formulário grava novo colaborador (volta para a listagem)', async () => {
    const { router, user } = renderRoute('/cadastros/colaboradores/novo')

    const nome = await screen.findByLabelText('Nome completo')
    await user.type(nome, 'COLABORADOR TESTE')

    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/colaboradores')
    })
  })

  it('abrir registro existente carrega os dados', async () => {
    renderRoute('/cadastros/colaboradores/1')
    expect(await screen.findByDisplayValue('CARLA SOUZA')).toBeInTheDocument()
  })

  it('busca de naturalidade preserva título e preenche cidade, código e UF', async () => {
    const { user } = renderRoute('/cadastros/colaboradores/novo')

    await screen.findByLabelText('Nome completo')
    // Naturalidade mora em `Documentos e dados pessoais`, que é opcional e
    // nasce recolhido (diretriz 3). Abrir faz parte do fluxo.
    await user.click(screen.getByRole('button', { name: 'Documentos e dados pessoais' }))
    await user.click(screen.getByRole('button', { name: 'Buscar naturalidade' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Busca de Naturalidade')

    await user.click(await within(dialog).findByText('CAMPINAS'))
    await user.click(within(dialog).getByRole('button', { name: 'Selecionar' }))

    await waitFor(() => expect(screen.getByLabelText('Naturalidade')).toHaveValue('CAMPINAS'))
    expect(screen.getByText('354')).toBeInTheDocument()
    expect(screen.getByText('SP')).toBeInTheDocument()
  })
  /**
   * HIERARQUIA (#101, diretriz 3). Colaborador tinha 3 blocos, 1 nomeado — o
   * mesmo atraso do Profissional. Agora quem manda é o schema.
   */
  describe('hierarquia por módulo', () => {
    it('o obrigatório abre, o opcional recolhe, e nada obrigatório fica escondido', async () => {
      renderRoute('/cadastros/colaboradores/novo')

      expect(await screen.findByLabelText('Nome completo')).toBeInTheDocument()
      expect(screen.getByLabelText('Cargo / função')).toBeInTheDocument()

      // Opcional: no DOM (não se perde digitação ao fechar) e fora do alcance.
      expect(screen.queryByRole('textbox', { name: 'Nome do pai' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Metas e comissão' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })

    /**
     * O mockup pede e-mail de login e celular como obrigatórios (#101), e o
     * mock do colaborador não guarda nenhum dos dois. Em vez de um input que
     * aceita digitação e descarta no Gravar, a falta é DITA — mesma economia do
     * `AvisoDeCobertura`. Quando a #105 der onde gravar, o campo aparece.
     */
    it('o que o repo ainda não guarda é dito, não fingido', async () => {
      renderRoute('/cadastros/colaboradores/novo')

      await screen.findByLabelText('Nome completo')
      // Mais de um módulo tem lacuna — a do bloco obrigatório é a que importa
      // aqui, porque é ela que a issue lista como campo que deveria travar.
      const pendencias = screen.getAllByText(/Ainda não guardamos/)
      expect(pendencias.some((p) => p.textContent?.includes('E-mail de login'))).toBe(true)
      expect(screen.queryByLabelText('E-mail de login')).not.toBeInTheDocument()
    })
    /**
     * DEFEITO ENCONTRADO ESCREVENDO A #101, e travado aqui.
     *
     * O gatilho de expandir do `FormBlock` mora DENTRO do `<fieldset disabled>`
     * do `CadastroForm`. Em modo consulta ele nascia desabilitado junto com os
     * campos — e o operador não conseguia abrir bloco nenhum, isto é, não
     * conseguia LER metade do cadastro na tela que existe para ler.
     *
     * A saída não foi reabilitar o botão (fieldset desabilitado alcança todo
     * descendente, por especificação): é não colapsar em consulta. Recolher
     * existe para reduzir o esforço de PREENCHER; em leitura não há o que
     * deixar para depois, e o valor é justamente ver tudo.
     */
    it('em consulta nada fica recolhido — senão o cadastro fica ilegível', async () => {
      renderRoute('/cadastros/colaboradores/1?modo=consulta')

      await screen.findByLabelText('Nome completo')
      // Campo de bloco opcional alcançável sem clique, e sem gatilho para clicar.
      expect(screen.getByRole('textbox', { name: 'Nome do pai' })).toBeDisabled()
      expect(
        screen.queryByRole('button', { name: 'Documentos e dados pessoais' }),
      ).not.toBeInTheDocument()
    })
  })
})
