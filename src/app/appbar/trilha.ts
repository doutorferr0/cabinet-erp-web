import { type NavSecao, destinoDaSecao, itemDaRota } from '@/app/navigation'

/**
 * Um degrau da trilha. Sem `url` = é o lugar onde o operador está (o último),
 * e ele não é link: link para a página atual é um clique que não faz nada.
 */
export interface DegrauDaTrilha {
  rotulo: string
  url?: string
}

/**
 * A SEÇÃO DONA DESTA ROTA — a `raiz` antes dos itens.
 *
 * A seção-página (Configurações) não tem item que case `/config`: o hub é a
 * própria seção. Sem esta primeira volta, `/config` cairia na seção seguinte e
 * a trilha anunciaria o lugar errado.
 */
export function secaoDaRota(secoes: NavSecao[], pathname: string): NavSecao | undefined {
  const naRaiz = secoes.find(
    (secao) => secao.raiz && (pathname === secao.raiz || pathname.startsWith(`${secao.raiz}/`)),
  )
  if (naRaiz) return naRaiz
  return secoes.find((secao) =>
    secao.grupos.some((grupo) =>
      grupo.items
        .flatMap((item) => item.filhas ?? [item])
        .some((item) => pathname === item.url || pathname.startsWith(`${item.url}/`)),
    ),
  )
}

/**
 * A TRILHA da rota — `Seção / Tela`, derivada da taxonomia, nunca escrita à mão
 * pela tela (Reface 2.0 · D5).
 *
 * ## Por que a rota, e não a tela, é a fonte
 *
 * O rastro que existia antes vivia numa faixa própria dentro do conteúdo, e
 * cada tela podia (ou não) contradizê-lo. Derivando de `navSecoes`, a trilha é
 * a MESMA estrutura que a barra lateral desenha: mudar a taxonomia move as duas
 * juntas, e não há como uma tela anunciar um lugar que o menu não publica.
 *
 * ## O detalhe não inventa degrau
 *
 * Em `/cadastros/clientes/<id>` a tela vira LINK (é a saída de volta para a
 * listagem) e a trilha para aí: a appbar não sabe o nome do registro, e um
 * degrau com o uuid na barra seria ruído com cara de informação. Quem diz qual
 * registro está aberto é o cabeçalho da página, que tem o dado em mãos —
 * `PageHeader` com `variante="registro"`.
 *
 * Rota fora da taxonomia (login, troca de senha) devolve trilha VAZIA, e a
 * appbar não desenha migalha nenhuma. Migalha de um lugar que o menu não
 * publica não teria para onde levar.
 */
export function trilhaDaRota(secoes: NavSecao[], pathname: string): DegrauDaTrilha[] {
  const secao = secaoDaRota(secoes, pathname)
  if (!secao) return []

  const degraus: DegrauDaTrilha[] = []
  const destino = destinoDaSecao(secao) ?? secao.raiz
  degraus.push({ rotulo: secao.rotulo, ...(destino && { url: destino }) })

  const item = itemDaRota(pathname)
  if (item) {
    // A seção leva à PRIMEIRA tela dela; quando essa tela é justamente a que
    // está aberta, o degrau da seção perde o link em vez de sumir — dois links
    // vizinhos para o mesmo lugar é um deles mentindo sobre ser outro destino,
    // e apagar a seção deixaria a tela sem dizer de onde ela é.
    const primeiro = degraus[0]
    if (primeiro?.url === item.url) degraus[0] = { rotulo: primeiro.rotulo }
    const emDetalhe = pathname !== item.url
    degraus.push({ rotulo: item.title, ...(emDetalhe && { url: item.url }) })
  }

  return degraus
}
