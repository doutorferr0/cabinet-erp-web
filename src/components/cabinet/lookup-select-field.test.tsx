import { LookupSelectField } from '@/components/cabinet/form-controls'
import { Form } from '@/components/ui/form'
import { instalarServidor, json } from '@/test/servidor'
import { renderWithQuery } from '@/test/utils'
import { screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `[combo]` puro alimentado por um kind do servidor (`/api/catalog-lookups`).
 *
 * O teste intercepta o `fetch` e não o SDK: exercita o cliente gerado de verdade,
 * então mudança de URL, de nome de parâmetro ou da forma da resposta quebra aqui.
 */

const URL_LOOKUPS = '/api/catalog-lookups'

function linhas(itens: readonly (readonly [string, boolean])[]) {
  return {
    rows: itens.map(([name, active], i) => ({ id: `id-${i}`, kind: 'CARGO', name, active })),
    total: itens.length,
  }
}

function Harness({ valor = '', rotulo }: { valor?: string; rotulo?: string }) {
  // `valor` é o ID desde a migração da issue #94. `rotulo` é o nome que o
  // registro trouxe, no campo irmão — o que salva o item já desativado.
  const form = useForm({ defaultValues: { cargo: valor, cargoNome: rotulo ?? '' } })
  return (
    <Form {...form}>
      <form>
        <LookupSelectField
          name="cargo"
          label="Cargo"
          kind="cargo"
          {...(rotulo ? { rotuloDe: 'cargoNome' } : {})}
        />
      </form>
    </Form>
  )
}

const combo = () => screen.getByLabelText('Cargo') as HTMLSelectElement

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LookupSelectField', () => {
  it('pede ao servidor o kind traduzido para o nome do banco', async () => {
    const servidor = instalarServidor({
      [URL_LOOKUPS]: () => json(linhas([['GERENTE', true]])),
    })
    renderWithQuery(<Harness />)

    await waitFor(() => expect(servidor.em(URL_LOOKUPS)).toHaveLength(1))
    const url = new URL(servidor.em(URL_LOOKUPS)[0]?.url as string)
    // O front nomeia em camelCase; o banco, em MAIÚSCULA_COM_UNDERSCORE.
    expect(url.searchParams.get('kind')).toBe('CARGO')
    expect(url.searchParams.get('pageSize')).toBe('100')
  })

  it('lista as opções do servidor e ignora as inativas', async () => {
    instalarServidor({
      [URL_LOOKUPS]: () =>
        json(
          linhas([
            ['GERENTE', true],
            ['COMPRADOR', true],
            ['CARGO APOSENTADO', false],
          ]),
        ),
    })
    renderWithQuery(<Harness />)

    expect(await screen.findByRole('option', { name: 'GERENTE' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'COMPRADOR' })).toBeInTheDocument()
    // Desativação é lógica (§9 padrão 8): não se escolhe hoje o que foi aposentado.
    expect(screen.queryByRole('option', { name: 'CARGO APOSENTADO' })).not.toBeInTheDocument()
  })

  it('enquanto carrega, diz que está carregando e não aceita escolha', () => {
    instalarServidor({ [URL_LOOKUPS]: () => new Promise(() => undefined) as never })
    renderWithQuery(<Harness />)

    // "Carregando" e "vazia" são estados diferentes: select mudo faria o operador
    // concluir que não há opção cadastrada.
    expect(screen.getByRole('option', { name: 'Carregando…' })).toBeInTheDocument()
    expect(combo()).toBeDisabled()
  })

  it('falha do servidor NÃO se disfarça de lista vazia, e o campo segue usável', async () => {
    instalarServidor({ [URL_LOOKUPS]: () => new Response('', { status: 500 }) })
    renderWithQuery(<Harness />)

    expect(
      await screen.findByRole('option', { name: 'Não foi possível carregar a lista.' }),
    ).toBeInTheDocument()
    // Travar o formulário porque uma lista de apoio não veio seria desproporcional.
    expect(combo()).toBeEnabled()
  })

  // O teto de 100 é do contrato de listagem. Cortar em silêncio faria "não achei"
  // e "não existe" virarem a mesma coisa para o operador.
  it('avisa quando a lista veio cortada no teto do contrato', async () => {
    instalarServidor({
      [URL_LOOKUPS]: () => json({ ...linhas([['GERENTE', true]]), total: 137 }),
    })
    renderWithQuery(<Harness />)

    expect(
      await screen.findByText(/Mostrando os primeiros 1 — a lista é maior/),
    ).toBeInTheDocument()
  })

  it('lista inteira NÃO exibe aviso de corte', async () => {
    instalarServidor({ [URL_LOOKUPS]: () => json(linhas([['GERENTE', true]])) })
    renderWithQuery(<Harness />)

    await screen.findByRole('option', { name: 'GERENTE' })
    expect(screen.queryByText(/Mostrando os primeiros/)).not.toBeInTheDocument()
  })

  it('id do registro fora da lista continua exibido, pelo nome que ele trouxe', async () => {
    instalarServidor({ [URL_LOOKUPS]: () => json(linhas([['GERENTE', true]])) })
    renderWithQuery(<Harness valor="id-aposentado" rotulo="CARGO APOSENTADO" />)

    await screen.findByRole('option', { name: 'GERENTE' })
    // Item desativado DEPOIS de gravado: sem isto o campo abriria em branco e a
    // próxima gravação apagaria o valor sem ninguém pedir. Depois da migração
    // para `value=id` (#94) quem dá o nome é o campo irmão, porque o id sozinho
    // não diz nada ao operador.
    expect(screen.getByRole('option', { name: 'CARGO APOSENTADO' })).toBeInTheDocument()
    expect(combo().value).toBe('id-aposentado')
  })

  it('id fora da lista SEM nome não vira chave crua na tela', async () => {
    instalarServidor({ [URL_LOOKUPS]: () => json(linhas([['GERENTE', true]])) })
    renderWithQuery(<Harness valor="id-orfao" />)

    await screen.findByRole('option', { name: 'GERENTE' })
    // A opção existe (senão gravar apagaria o valor), mas o texto não é o id:
    // imprimir a chave faria o operador ler `id-orfao` achando que é o cargo.
    expect(screen.getByRole('option', { name: '(item fora da lista)' })).toBeInTheDocument()
    expect(combo().value).toBe('id-orfao')
  })
})
