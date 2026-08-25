import { json } from '@/test/servidor'
import { type FetchStub, renderRoute, respostaSessao, respostaVinculos } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A tela de USUÁRIOS E EMPRESAS contra servidor falso, pelo cliente gerado.
 *
 * O que estes testes travam:
 *
 * - **criar usuário é TRÊS escritas em ORDEM** (pessoa → vínculo → senha) — a
 *   composição de `useCriarUsuario`, que é onde o fluxo poderia quebrar em
 *   silêncio se alguém "simplificar" tirando um passo;
 * - **a senha provisória aparece no diálogo de exibição única** — o valor que
 *   o servidor devolve UMA vez chega inteiro ao operador;
 * - **o papel se monta por CAIXAS do catálogo** e grava o conjunto FINAL em
 *   `permissions` — desmarcar tem efeito, marcar fora do catálogo não existe.
 */

const PAPEL_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const USUARIO_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

const CATALOGO = {
  version: 'teste-1',
  modules: [
    {
      key: 'orcamento',
      label: 'Orçamento',
      permissions: [
        { key: 'orcamento:ver', label: 'Ver orçamentos', description: null },
        { key: 'orcamento:editar', label: 'Criar e alterar orçamentos', description: null },
      ],
    },
  ],
}

const PAPEL = {
  id: PAPEL_ID,
  name: 'Vendedor',
  description: null,
  system: false,
  template: false,
  active: true,
  permissionCount: 2,
}

function detalheDeUsuario() {
  return {
    id: USUARIO_ID,
    name: 'Maria Nova',
    document: null,
    email: 'maria@vertz.com.br',
    phone: null,
    photoUrl: null,
    active: true,
    roleId: PAPEL_ID,
    roleName: 'Vendedor',
    sectorId: null,
    sector: null,
    jobTitleId: null,
    jobTitle: null,
    hiredAt: null,
    dismissedAt: null,
    customerFacing: null,
    linkActive: true,
  }
}

function servidor() {
  const escritas: { metodo: string; caminho: string; corpo: unknown }[] = []

  const stub: FetchStub = async (entrada) => {
    const requisicao = entrada instanceof Request ? entrada : null
    const url = String(requisicao ? requisicao.url : entrada)
    const caminho = new URL(url, 'http://localhost').pathname

    if (requisicao && requisicao.method.toUpperCase() !== 'GET') {
      const texto = await requisicao.clone().text()
      escritas.push({
        metodo: requisicao.method.toUpperCase(),
        caminho,
        corpo: texto ? JSON.parse(texto) : null,
      })
      if (caminho === '/api/employees') return json(detalheDeUsuario(), 201)
      if (caminho === `/api/employees/${USUARIO_ID}/link`) return json(detalheDeUsuario(), 201)
      if (caminho === `/api/employees/${USUARIO_ID}/reset-password`) {
        return json({ temporaryPassword: 'xK7mPq2wRt9v' })
      }
      if (caminho === '/api/roles') return json({ ...PAPEL, permissions: ['orcamento:ver'] }, 201)
      throw new Error(`escrita sem stub no teste: ${caminho}`)
    }

    if (caminho === '/auth/me') return respostaSessao()
    if (caminho === '/auth/tenants') return respostaVinculos()
    if (caminho === '/api/employees') {
      return json({
        rows: [{ id: USUARIO_ID, name: 'Maria Nova', sector: null, jobTitle: null, active: true }],
        total: 1,
      })
    }
    if (caminho === '/api/roles') return json({ rows: [PAPEL], total: 1 })
    if (caminho === '/api/permissions') return json(CATALOGO)
    if (caminho === `/api/roles/${PAPEL_ID}`) {
      return json({ ...PAPEL, permissions: ['orcamento:ver'] })
    }
    throw new Error(`fetch sem stub no teste: ${url}`)
  }

  return { stub, escritas }
}

describe('tela de acesso', () => {
  it('lista os usuários da empresa ativa', async () => {
    const { stub } = servidor()
    renderRoute('/config/usuarios', stub)

    expect(await screen.findByText('Maria Nova')).toBeInTheDocument()
  })

  it('criar usuário = pessoa, vínculo e senha, NESTA ordem — e a senha aparece uma vez', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('button', { name: 'Novo usuário' }))
    await user.type(await screen.findByLabelText('Nome'), 'Maria Nova')
    await user.type(screen.getByLabelText('E-mail'), 'maria@vertz.com.br')
    await user.selectOptions(screen.getByLabelText('Papel'), PAPEL_ID)
    await user.click(screen.getByRole('button', { name: 'Criar e gerar senha' }))

    await waitFor(() => expect(escritas).toHaveLength(3))
    expect(escritas.map((e) => `${e.metodo} ${e.caminho}`)).toEqual([
      'POST /api/employees',
      `POST /api/employees/${USUARIO_ID}/link`,
      `POST /api/employees/${USUARIO_ID}/reset-password`,
    ])
    // O vínculo vai por roleId — o ÚNICO caminho de atribuição do contrato.
    expect(escritas[1]?.corpo).toMatchObject({ roleId: PAPEL_ID })

    // A senha que o servidor devolveu UMA vez está no diálogo, inteira.
    expect(await screen.findByLabelText('Senha provisória')).toHaveTextContent('xK7mPq2wRt9v')
  })

  it('o papel se monta por caixas e grava o conjunto FINAL', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('tab', { name: 'Papéis' }))
    await user.click(await screen.findByRole('button', { name: 'Incluir papel' }))
    await user.type(await screen.findByLabelText('Nome'), 'Balcão')
    await user.click(screen.getByRole('checkbox', { name: /Ver orçamentos/ }))
    await user.click(screen.getByRole('button', { name: 'Gravar' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(escritas[0]).toMatchObject({ metodo: 'POST', caminho: '/api/roles' })
    expect(escritas[0]?.corpo).toEqual({
      name: 'Balcão',
      description: null,
      permissions: ['orcamento:ver'],
      active: true,
    })
  })

  it('Gerar senha na linha mostra o diálogo de exibição única', async () => {
    const { stub, escritas } = servidor()
    const { user } = renderRoute('/config/usuarios', stub)

    await user.click(await screen.findByRole('button', { name: 'Gerar senha' }))

    await waitFor(() => expect(escritas).toHaveLength(1))
    expect(await screen.findByLabelText('Senha provisória')).toHaveTextContent('xK7mPq2wRt9v')
  })
})
