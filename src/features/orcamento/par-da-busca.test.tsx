import { servidorDeOrcamentos } from '@/test/orcamentos'
import { parceiro, stubDeParceiros } from '@/test/parceiros'
import { type FetchStub, renderRoute } from '@/test/utils'
import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O DIÁLOGO DE BUSCA GRAVA O PAR — id E nome (#406).
 *
 * O defeito que este arquivo trava já apareceu duas vezes no mesmo formulário.
 * A tela mostra o NOME (`cliente`, `profissionalExterno`) e o contrato leva o
 * ID (`customerId`, `professionalId`); um `onSelect` que grava só o nome deixa
 * o id no valor inicial e ninguém vê.
 *
 * No cliente o sintoma era barulhento — `body/customerId must match format
 * "uuid"`, 400 em toda criação pelo caminho do operador. No profissional é
 * SILENCIOSO, porque `professionalId` aceita `null`: o documento grava com o
 * nome na tela e nada no banco, e na releitura o campo volta vazio sem erro
 * nenhum no caminho.
 *
 * Por que os testes que já existiam não pegaram: `orcamento-form.test.tsx`
 * afirma sobre o `value` do input depois de selecionar — e o input é
 * justamente a metade que funcionava. A asserção tem de ser sobre o CORPO que
 * sobe, que é onde a outra metade some.
 */

const CLIENTE = parceiro({
  id: 'a1b2c3d4-1111-4a90-9f77-5b0e2c8a7d11',
  code: 'C001',
  legalName: 'ANDRÉ BATALHA',
  isCustomer: true,
})

const PROFISSIONAL = parceiro({
  id: 'e5f6a7b8-2222-4c8a-9e55-2b3c4d5e6f70',
  code: 'P001',
  legalName: 'ARQ. CAMILA SODRÉ',
  isProfessional: true,
})

/** Envelopa o dublê do orçamento para guardar o corpo do `POST`. */
function servidorQueGuardaAEscrita(corpos: Record<string, unknown>[]): FetchStub {
  const base = servidorDeOrcamentos(stubDeParceiros([CLIENTE, PROFISSIONAL]))
  return async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const { pathname } = new URL(String(requisicao ? requisicao.url : entrada), 'http://localhost')
    if (pathname === '/api/quotes' && (requisicao?.method ?? 'GET').toUpperCase() === 'POST') {
      corpos.push((await requisicao?.clone().json()) as Record<string, unknown>)
    }
    return base(entrada)
  }
}

/** Marca a linha na janela e confirma — é como o operador escolhe. */
async function escolherNaJanela(
  user: Awaited<ReturnType<typeof renderRoute>>['user'],
  titulo: string,
  nome: string,
) {
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveTextContent(titulo)
  await user.click(await within(dialog).findByText(nome))
  await user.click(within(dialog).getByRole('button', { name: 'Selecionar' }))
}

describe('a janela de busca do orçamento grava o par', () => {
  it('cliente e profissional sobem com id, não só com o nome da tela', async () => {
    const corpos: Record<string, unknown>[] = []
    const { user } = renderRoute('/vendas/orcamentos/novo', servidorQueGuardaAEscrita(corpos))

    await screen.findByLabelText('Código')

    await user.click(screen.getByRole('button', { name: 'Cliente' }))
    await escolherNaJanela(user, 'Busca de Cliente', 'ANDRÉ BATALHA')
    await waitFor(() => {
      expect(screen.getByLabelText('Cliente', { selector: 'input' })).toHaveValue('ANDRÉ BATALHA')
    })

    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await escolherNaJanela(user, 'Busca de Profissional Externo', 'ARQ. CAMILA SODRÉ')
    await waitFor(() => {
      expect(screen.getByLabelText('Profissional Externo', { selector: 'input' })).toHaveValue(
        'ARQ. CAMILA SODRÉ',
      )
    })

    await user.click(screen.getByRole('button', { name: /^Gravar$/i }))

    await waitFor(() => expect(corpos.length).toBe(1))
    const corpo = corpos[0] as Record<string, unknown>
    expect(corpo.customerId).toBe(CLIENTE.id)
    // O par do profissional: `null` aqui é o defeito da #406 passando verde na
    // tela inteira, porque o contrato aceita o campo vazio.
    expect(corpo.professionalId).toBe(PROFISSIONAL.id)
  })
})
