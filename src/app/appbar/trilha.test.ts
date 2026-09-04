import { secaoDaRota, trilhaDaRota } from '@/app/appbar/trilha'
import { secoesVisiveis } from '@/app/navigation'
import { describe, expect, it } from 'vitest'

/** A empresa que opera tudo — a trilha é da TAXONOMIA, não do recurso. */
const secoes = secoesVisiveis(() => true)

/**
 * A MIGALHA da appbar 2.0 (D5). O que estes casos travam:
 *
 * 1. Que ela sai da rota e da taxonomia, e não de texto que a tela escreve —
 *    a faixa de 52px do 1.x deixava cada tela poder contradizer o menu.
 * 2. Que o último degrau NÃO é link: link para a página atual é um clique que
 *    não faz nada.
 * 3. Que o detalhe não inventa degrau com o uuid dentro.
 */
describe('trilha da rota', () => {
  it('a seção-página é achada pela raiz, e não cai na seção seguinte', () => {
    // `/config` não tem item que o case: o hub É a seção. Sem a volta pela
    // `raiz`, a trilha anunciaria o lugar errado.
    expect(secaoDaRota(secoes, '/config')?.rotulo).toBe('Configurações')
    expect(secaoDaRota(secoes, '/config/papeis')?.rotulo).toBe('Configurações')
  })

  it('a listagem anuncia Seção / Tela, e a tela não é link', () => {
    const trilha = trilhaDaRota(secoes, '/cadastros/clientes')

    expect(trilha.map((degrau) => degrau.rotulo)).toEqual(['Pessoas', 'Clientes'])
    expect(trilha.at(-1)?.url).toBeUndefined()
  })

  it('no DETALHE a tela vira link — é a saída de volta para a listagem', () => {
    const trilha = trilhaDaRota(secoes, '/cadastros/clientes/8f2b')

    // E a trilha PARA aí: a appbar não sabe o nome do registro, e um degrau
    // com o uuid seria ruído com cara de informação. Quem diz qual registro
    // está aberto é o cabeçalho da página.
    expect(trilha.map((degrau) => degrau.rotulo)).toEqual(['Pessoas', 'Clientes'])
    expect(trilha.at(-1)?.url).toBe('/cadastros/clientes')
  })

  it('rota fora da taxonomia não desenha migalha nenhuma', () => {
    // Migalha de um lugar que o menu não publica não teria para onde levar.
    expect(trilhaDaRota(secoes, '/login')).toEqual([])
    expect(trilhaDaRota(secoes, '/trocar-senha')).toEqual([])
  })

  it('dois links vizinhos para o mesmo lugar: a seção perde o link, não some', () => {
    // A seção leva à PRIMEIRA tela dela. Quando essa tela é a aberta, os dois
    // degraus apontariam para o mesmo destino — um deles mentindo sobre ser
    // outro. Apagar a seção deixaria a tela sem dizer de onde ela é.
    const secao = secoes.find((s) => !s.oculta)
    const primeira = secao?.grupos
      .flatMap((grupo) => grupo.items.flatMap((item) => item.filhas ?? [item]))
      .find((item) => item.url)
    expect(primeira?.url).toBeDefined()

    const trilha = trilhaDaRota(secoes, primeira?.url as string)
    expect(trilha).toHaveLength(2)
    expect(trilha[0]?.url).toBeUndefined()
    expect(trilha[1]?.url).toBeUndefined()
  })
})
