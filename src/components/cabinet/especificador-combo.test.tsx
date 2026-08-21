import { configurarApi } from '@/api/cliente'
import { EspecificadorCombo } from '@/components/cabinet/lookup-combo'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * O ESPECIFICADOR SAI DO CADASTRO, NÃO DA LISTA DE APOIO (#265).
 *
 * A #250 declarou `specifierId` como "item da lista `PROFISSIONAL`" olhando o
 * mock; o backend, lendo a mesma issue, escreveu
 * `specifier_id uuid REFERENCES partners (id)` na `0023`. A #265 corrigiu o
 * contrato para o que o servidor faz, e este arquivo é a metade de TELA da
 * correção.
 *
 * **Por que o teste bate no `fetch` e não no SDK.** Os dois lados do engano são
 * uuid, e nenhum mock confere chave estrangeira: um combo apontado para a lista
 * errada devolve string bem formada, o formulário grava, a suíte fica verde — e
 * o 400 `O especificador não existe.` só aparece contra o Postgres. O que
 * distingue as duas fontes é a URL PEDIDA, então é a URL que o teste mede.
 */
function respostaDeParceiros(
  linhas: readonly { id: string; legalName: string }[],
  total = linhas.length,
) {
  return new Response(
    JSON.stringify({
      rows: linhas.map((l) => ({ ...l, isProfessional: true, active: true })),
      total,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

const PROFISSIONAIS = [
  { id: 'parc-0004', legalName: 'ANA RIBEIRO ARQUITETURA LTDA' },
  { id: 'parc-0005', legalName: 'ESTUDIO FERRARI ARQUITETURA LTDA' },
]

function Harness({ excluir }: { excluir?: string }) {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div>
      <EspecificadorCombo value={value} onChange={setValue} {...(excluir ? { excluir } : {})} />
      <output data-testid="valor">{value ?? ''}</output>
    </div>
  )
}

let chamadas: string[] = []
let resposta = () => respostaDeParceiros(PROFISSIONAIS)

beforeEach(() => {
  chamadas = []
  resposta = () => respostaDeParceiros(PROFISSIONAIS)
  configurarApi('http://api.teste')
  vi.stubGlobal(
    'fetch',
    vi.fn((entrada: RequestInfo | URL) => {
      chamadas.push(String(entrada instanceof Request ? entrada.url : entrada))
      return Promise.resolve(resposta())
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('EspecificadorCombo', () => {
  it('pede PARCEIROS profissionais, não a lista de apoio', async () => {
    renderWithQuery(<Harness />)

    await waitFor(() => expect(chamadas).toHaveLength(1))
    const url = new URL(chamadas[0] as string)

    // A asserção que separa o certo do errado: `/api/partners`, e NUNCA
    // `/api/catalog-lookups?kind=PROFISSIONAL`.
    expect(url.pathname).toBe('/api/partners')
    expect(url.searchParams.get('role')).toBe('professional')
    expect(url.searchParams.get('kind')).toBeNull()

    // Teto do contrato de listagem. Passar dele é o dia em que este campo vira
    // busca — e `truncada` é quem avisa.
    expect(url.searchParams.get('pageSize')).toBe('100')
  })

  it('escolhe o ID do parceiro e mostra a razão social', async () => {
    const { user } = renderWithQuery(<Harness />)

    await user.click(await screen.findByRole('button', { name: /Selecione profissional/i }))
    await user.click(await screen.findByRole('menuitem', { name: /ESTUDIO FERRARI/ }))

    // Um `partners.id`, que é o que o `PUT` manda em `specifierId`.
    expect(screen.getByTestId('valor')).toHaveTextContent('parc-0005')
    expect(screen.getByRole('button', { name: /ESTUDIO FERRARI/ })).toBeInTheDocument()
  })

  it('não oferece o PRÓPRIO registro — ninguém se indica sozinho', async () => {
    // `conferirApoios` responde 400 (`Um parceiro não pode ser o próprio
    // especificador.`) e a `0023` tem o `CHECK` embaixo. O cliente que também é
    // profissional é exatamente quem cairia nisso, e ele existe no seed.
    const { user } = renderWithQuery(<Harness excluir="parc-0004" />)

    await user.click(await screen.findByRole('button', { name: /Selecione profissional/i }))

    expect(await screen.findByRole('menuitem', { name: /ESTUDIO FERRARI/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /ANA RIBEIRO/ })).not.toBeInTheDocument()
  })

  it('NÃO tem cadastro rápido: profissional é cadastro, não item de lista', async () => {
    // O "..." do `LookupCombo` é `POST /api/catalog-lookups`. Aqui ele criaria
    // um item de apoio para um campo que aponta para `partners` — a referência
    // quebrada que a #265 existe para acabar.
    renderWithQuery(<Harness />)

    await screen.findByRole('button', { name: /Selecione profissional/i })
    expect(screen.queryByRole('button', { name: /^Cadastrar/ })).not.toBeInTheDocument()
  })

  it('id fora da lista carregada exibe o `specifierName` que o registro trouxe', async () => {
    // Não é hipótese: o backend aceita como especificador qualquer parceiro do
    // GRUPO (`cadastroDoGrupo`), e esta consulta lista os da EMPRESA ativa. O
    // profissional que atende o grupo e só está vinculado a outra loja cai
    // aqui, e sem o rótulo o campo abriria em branco sobre um vínculo real.
    renderWithQuery(
      <EspecificadorCombo
        value="parc-de-outra-empresa"
        rotulo="MAURO TAGLIARI ARQUITETURA"
        onChange={() => {}}
      />,
    )

    expect(
      await screen.findByRole('button', { name: /MAURO TAGLIARI ARQUITETURA/ }),
    ).toBeInTheDocument()
  })

  it('lista cortada no teto avisa, em vez de fingir que acabou', async () => {
    resposta = () => respostaDeParceiros(PROFISSIONAIS, 320)
    const { user } = renderWithQuery(<Harness />)

    await user.click(await screen.findByRole('button', { name: /Selecione profissional/i }))

    expect(await screen.findByText(/Mostrando os primeiros 2/)).toBeInTheDocument()
  })
})
