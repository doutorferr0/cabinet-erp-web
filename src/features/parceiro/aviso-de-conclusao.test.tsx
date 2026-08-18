import { limparAvisos } from '@/lib/avisos'
import { parceiro, servidorDeParceiros } from '@/test/parceiros'
import { acaoNaLinha, renderRoute } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

afterEach(limparAvisos)

/**
 * O AVISO ATRAVESSA A NAVEGAÇÃO — é isso que o teste de componente não pega.
 *
 * O `Gravar` de um cadastro grava E volta para a listagem no mesmo `onSuccess`.
 * Um aviso guardado em estado de componente morreria com o formulário, e a
 * listagem receberia o operador sem dizer nada — que é exatamente o que havia
 * antes da #201. Por isso a cobertura é de ROTA: ela exercita a fronteira, a
 * navegação e a região de avisos juntas, na ordem real.
 */
describe('aviso de conclusão', () => {
  it('gravar volta para a listagem DIZENDO que gravou', async () => {
    const linha = parceiro()
    const { stub } = servidorDeParceiros([linha])
    // Pelo ID e não pelo `Alterar` da listagem: o que está sob teste é o
    // caminho gravar → navegar → avisar, não como se chega ao formulário.
    const { router, user } = renderRoute(`/cadastros/fornecedores/${linha.id}`, stub)

    const razaoSocial = await screen.findByLabelText('Razão Social')
    await user.clear(razaoSocial)
    await user.type(razaoSocial, 'STELLA NOVA LTDA')
    await user.click(screen.getByRole('button', { name: /Gravar/ }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/cadastros/fornecedores')
    })
    // A listagem que recebe o operador é idêntica à que ele viu antes de
    // editar: sem o aviso, o clique no `Gravar` respondia com uma troca de tela
    // e mais nada.
    expect(await screen.findByText('Alterações gravadas.')).toBeInTheDocument()
  })

  it('desativar diz o que aconteceu, e que o cadastro continua lá', async () => {
    const { stub } = servidorDeParceiros([parceiro()])
    const { user } = renderRoute('/cadastros/fornecedores', stub)

    // Marca pelo checkbox e age na barra de seleção: desde a #198 clicar na
    // linha ABRE o registro.
    await acaoNaLinha(user, 'STELLA ILUMINAÇÃO LTDA', 'Excluir')

    await screen.findByRole('alertdialog')
    await user.click(screen.getByRole('button', { name: 'Desativar' }))

    expect(await screen.findByText(/foi desativado\./)).toBeInTheDocument()
    // `Excluir` na UI de cadastro é DESATIVAÇÃO (padrão 8), e o aviso repete
    // isso: o rótulo herdado do legado promete o contrário do efeito.
    expect(screen.getByText('O cadastro continua no sistema, inativo.')).toBeInTheDocument()
  })
})
