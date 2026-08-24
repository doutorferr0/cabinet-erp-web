import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { data } from '@/data'
import { renderRoute } from '@/test/utils'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * A GUARDA DO "DADOS DE EXEMPLO" — nenhuma tela serve fixture calada.
 *
 * Na sessão 60 um usuário real, logado no site real, leu treze pedidos de
 * compra do Softlux como se fossem os dele. A causa não foi uma tela mal
 * escrita: foi que **nada obrigava** a tela a dizer de onde vinha a linha. Este
 * teste é essa obrigação.
 *
 * ## Por que a varredura é pelo REGISTRY, e não pelo `import`
 *
 * O caminho óbvio seria procurar `from '@/mocks/…'` nas rotas — e ele mede a
 * coisa errada: os imports que sobraram nas rotas de compras são `import type`,
 * apagados no build. A rota não importa a fixture; ela pede a
 * `data.pedidosCompra`, e quem lê `src/mocks/` é o provider. Buscar pelo import
 * acharia rota que só usa o TIPO e perderia a que serve o dado.
 *
 * Quem sabe a resposta é `provider.origem`. A varredura casa o identificador
 * `data.<recurso>` no fonte da rota contra o registry em memória: recurso
 * marcado `exemplo` obriga a rota a declarar o aviso de um dos três jeitos
 * abaixo. Recurso que migrar para HTTP some da lista sozinho, e o teste para de
 * cobrar sem ninguém editá-lo.
 */
const ROTAS = resolve(__dirname)

/**
 * Os três jeitos VÁLIDOS de uma rota declarar a origem, e o que cada um cobre:
 *
 * - `origem={data.X.origem}` — listagem (`TelaDeListagem` recebe `fetcher`, uma
 *   função solta que não sabe de quem é, então a rota liga as pontas);
 * - `provider={data.X}` — documento (`TelaDeDocumento` lê a marca sozinha);
 * - `<AvisoDadosDeExemplo` — o detalhe montado à mão, sem esqueleto comum.
 */
function declaraOrigem(fonte: string, recurso: string): boolean {
  return (
    fonte.includes(`origem={data.${recurso}.origem}`) ||
    fonte.includes(`provider={data.${recurso}}`) ||
    fonte.includes('<AvisoDadosDeExemplo')
  )
}

function arquivosDeRota(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivosDeRota(caminho)
    return caminho.endsWith('.tsx') && !caminho.includes('.test.') ? [caminho] : []
  })
}

/** Recursos do registry que ainda servem fixture. */
const DE_EXEMPLO = Object.entries(data)
  .filter(([, provider]) => provider.origem === 'exemplo')
  .map(([nome]) => nome)

describe('rota que serve fixture avisa que é dado de exemplo', () => {
  // Sem isto o teste inteiro passaria em silêncio no dia em que alguém
  // desmarcasse os providers: zero recurso `exemplo` = zero caso, verde.
  it('o registry ainda tem recurso servido por fixture', () => {
    expect(DE_EXEMPLO.length).toBeGreaterThan(0)
  })

  it.each(arquivosDeRota(ROTAS))('%s declara a origem do que serve', (arquivo) => {
    const fonte = readFileSync(arquivo, 'utf8')
    const servidos = DE_EXEMPLO.filter((recurso) =>
      new RegExp(`\\bdata\\.${recurso}\\b`).test(fonte),
    )
    const calados = servidos.filter((recurso) => !declaraOrigem(fonte, recurso))

    expect(
      calados,
      `A rota src/${relative(resolve(__dirname, '..'), arquivo)} serve ${calados.join(', ')}, que é fixture, sem dizer nada ao operador.
Passe \`origem={data.<recurso>.origem}\` na TelaDeListagem, use a TelaDeDocumento (que lê sozinha), ou monte <AvisoDadosDeExemplo /> à mão.`,
    ).toEqual([])
  })
})

/**
 * O outro lado da guarda: a estática prova que a rota PASSA a origem, e esta
 * prova que o operador VÊ a frase. Uma prop repassada a um componente que
 * ninguém monta continuaria verde na primeira e mentindo na tela.
 */
describe('o aviso chega ao operador', () => {
  const TELAS = [
    ['/compras/pedidos', 'Pedido de Compra'],
    ['/compras/ordens', 'Ordem de Compra'],
    ['/cadastros/colaboradores', 'Cadastro de Colaboradores'],
  ] as const

  // Pelo `heading`, e não pelo texto: o título da tela também é o rótulo do
  // link dela na sidebar, e `findByText` acha os dois.
  it.each(TELAS)('%s mostra "Dados de exemplo"', async (url, titulo) => {
    renderRoute(url)

    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()
    expect(await screen.findByText(/Dados de exemplo/)).toBeInTheDocument()
    expect(screen.getByText(/não será salvo/)).toBeInTheDocument()
  })

  // A tela de documento não recebe prop nenhuma: quem decide é o `provider`.
  // Em `novo`, que é onde o estrago da sessão 60 seria maior: o operador
  // preenche um pedido inteiro e o `Gravar` é `console.info`.
  it.each(['/compras/pedidos/1', '/compras/pedidos/novo'])(
    '%s avisa sem a rota pedir',
    async (url) => {
      renderRoute(url)

      expect(await screen.findByText(/Dados de exemplo/)).toBeInTheDocument()
    },
  )

  // A contraprova. Sem ela, um aviso montado incondicionalmente passaria em
  // todos os casos acima — e o site inteiro diria "dados de exemplo", inclusive
  // onde o dado é do servidor. Aviso que aparece sempre é aviso que ninguém lê.
  it('tela de recurso HTTP não avisa nada', async () => {
    renderRoute('/cadastros/produtos')

    expect(await screen.findByRole('heading', { name: /Produtos/ })).toBeInTheDocument()
    expect(screen.queryByText(/Dados de exemplo/)).not.toBeInTheDocument()
  })
})
