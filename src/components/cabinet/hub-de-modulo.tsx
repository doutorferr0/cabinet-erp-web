import type { Modulo } from '@/app/modulo'
import { type NavItem, gruposVisiveis } from '@/app/navigation'
import { FaixaDeKpi, KpiTile } from '@/components/cabinet/kpi-tile'
import {
  useResumoDeEstoque,
  useResumoDeOportunidades,
  useResumoDeOrcamentos,
  useResumoDeOrdensDeCompra,
  variacao,
} from '@/data/agregados-api'
import { type RecursoDaEmpresa, useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/**
 * HUB DE MÓDULO — a rota-índice deixa de ser um beco.
 *
 * `/compras`, `/estoque`, `/vendas` e `/crm` respondiam com uma frase ("Escolha
 * uma opção no menu de Compras.") que só existia porque a rota-mãe precisava
 * renderizar ALGUMA coisa. Quem chegava ali por link colado, por clique no
 * grupo da barra ou pelo `Voltar` encontrava uma tela que não sabia nada — e a
 * informação que ela deveria dar já estava a um clique, espalhada em quatro
 * telas.
 *
 * O desenho é o **workspace do ERPNext**, aprovado na auditoria §6 com um
 * limite explícito: hub como ÚNICA navegação custaria um clique a mais em tudo,
 * então ele entra SÓ como rota-índice. A barra lateral continua sendo o caminho
 * de quem já sabe para onde vai; o hub é para quem chegou.
 *
 * ## Os atalhos saem da taxonomia, não de uma lista daqui
 *
 * A grade lê `gruposVisiveis()` — a mesma fonte da barra lateral e da paleta de
 * comandos — e recorta pelo PREFIXO da rota. Uma lista própria de atalhos
 * duplicaria a taxonomia e divergiria dela em silêncio: tela nova entraria na
 * barra e faltaria no hub, e ninguém veria. Pelo prefixo, tela nova de compras
 * aparece aqui no mesmo commit em que entra no menu.
 *
 * Vem de `gruposVisiveis` e não de `navSecoes` cru por dois motivos que aquela
 * função já resolve: **recurso da empresa** (item que a empresa ativa não tem
 * some) e **tela futura** (item sem rota não vira card que não navega). Filha
 * sobe achatada, que é o certo aqui — `Compras` é pai colapsável sem tela, e um
 * card "Compras" dentro do hub de Compras abriria o quê?
 *
 * ## O que este componente NÃO inventa
 *
 * A espec da issue pede, em cada card, a "última alteração" do assunto. **Não
 * há caminho no contrato que responda isso** — nem agregado, nem carimbo por
 * recurso. Preencher com a data de hoje, ou com o `updatedAt` da primeira
 * página de uma listagem qualquer, seria dado de mentira com cara de dado do
 * servidor — exatamente o que o `AvisoDeCobertura` existe para impedir. O card
 * mostra o que EXISTE: nome e o que a tela faz (`descricao`, obrigatória na
 * taxonomia).
 *
 * ## A faixa de KPIs vem do agregado, e por isso mora fora do hub
 *
 * Os quatro números de cada módulo saem de `src/data/agregados-api.ts` (D11) —
 * um agregado do servidor, nunca a soma da página que a listagem baixou. Cada
 * módulo tem seu hook e seu DTO, então quem os lê é um componente por módulo
 * (`KpisDeCompras` e irmãos) em vez de um `switch` sobre um union: o `switch`
 * chamaria hook condicionalmente, o que o React proíbe, e a alternativa —
 * chamar os quatro hooks sempre — pediria quatro respostas para mostrar uma.
 *
 * **Views favoritas ficaram de fora** (`design/d13-favoritos` não existe no
 * remoto), e a "atividade recente do módulo" também: `GET /api/activities`
 * responde 400 a `entityType` sem `entityId`, então não há como pedir "as
 * atividades de Compras" — filtrar uma página no cliente faria a lista mentir
 * sobre o conjunto.
 */

/** Os quatro módulos que têm rota-índice própria. */
export type ModuloDeHub = Extract<Modulo, 'compras' | 'estoque' | 'vendas' | 'crm'>

interface DesenhoDoHub {
  /** Prefixo que recorta a taxonomia. É a rota-índice do próprio hub. */
  raiz: string
  titulo: string
  /** Uma linha dizendo o que o módulo RESOLVE — não o que ele contém. */
  chamada: string
}

const HUBS: Record<ModuloDeHub, DesenhoDoHub> = {
  compras: {
    raiz: '/compras',
    titulo: 'Compras',
    chamada: 'O que foi combinado com o fornecedor, o que já chegou e o que está atrasado.',
  },
  estoque: {
    raiz: '/estoque',
    titulo: 'Estoque',
    chamada: 'O que existe em cada depósito, o que se moveu e o que está abaixo do mínimo.',
  },
  vendas: {
    raiz: '/vendas',
    titulo: 'Vendas',
    chamada: 'Do orçamento ao pedido: o que está em aberto, o que vence e o que já saiu.',
  },
  crm: {
    raiz: '/crm',
    titulo: 'CRM',
    chamada: 'As oportunidades em curso, o funil onde elas estão e por que se perde.',
  },
}

/** Um bloco da grade: o grupo da taxonomia e as telas dele sob esta raiz. */
export interface GrupoDeAtalhos {
  titulo: string
  itens: NavItem[]
}

/**
 * Os atalhos do módulo, AGRUPADOS como a taxonomia os agrupa — a mesma divisão
 * que o operador já vê na barra lateral. Achatar tudo numa grade só faria o hub
 * de Estoque pôr `Movimentação` e três relatórios lado a lado como se fossem a
 * mesma coisa.
 *
 * O casamento é `=== raiz` ou `startsWith(raiz + '/')`, nunca `startsWith(raiz)`
 * puro — este último faria um futuro `/vendasx` entrar no hub de Vendas, e é o
 * mesmo cuidado que `moduloDaRota` já toma com o `/` do Boletim.
 *
 * A própria raiz sai da lista: card que leva à tela onde o operador já está é
 * ruído, e no caso de `/compras` a raiz nem é destino — é o pai colapsável.
 */
export function gruposDoModulo(
  raiz: string,
  tem: (recurso: RecursoDaEmpresa) => boolean,
): GrupoDeAtalhos[] {
  const sob = (url: string) => url === raiz || url.startsWith(`${raiz}/`)
  return gruposVisiveis(tem)
    .map((grupo) => ({
      titulo: grupo.title,
      itens: grupo.items.filter((item) => !item.externo && sob(item.url) && item.url !== raiz),
    }))
    .filter((grupo) => grupo.itens.length > 0)
}

/** O mesmo recorte, achatado — para quem só quer os destinos. */
export function atalhosDoModulo(
  raiz: string,
  tem: (recurso: RecursoDaEmpresa) => boolean,
): NavItem[] {
  return gruposDoModulo(raiz, tem).flatMap((grupo) => grupo.itens)
}

export interface HubDeModuloProps {
  modulo: ModuloDeHub
  /**
   * Linha explicando por que o operador CAIU aqui, quando ele não pediu esta
   * tela — hoje, só o redirecionamento de `/cadastros`.
   *
   * Vem por propriedade, e o texto mora na rota que redireciona: quem sabe o
   * que mudou é a rota que morreu, não o módulo que a herdou. Embutir a frase
   * aqui faria o hub de Vendas carregar para sempre uma nota sobre um grupo
   * que deixou de existir.
   */
  aviso?: ReactNode
}

export function HubDeModulo({ modulo, aviso }: HubDeModuloProps) {
  const { tem } = useRecursosDaEmpresa()
  const hub = HUBS[modulo]
  const grupos = gruposDoModulo(hub.raiz, tem)
  /**
   * O rótulo do grupo só aparece quando há mais de um: em Compras a taxonomia
   * tem um grupo só, e escrever "COMPRAS" sob o título "Compras" seria repetir
   * a mesma palavra em dois degraus de hierarquia para separar nada.
   */
  const nomearGrupos = grupos.length > 1

  return (
    // Fronteira entre REGIÕES da página (header › atalhos) = espaço `--s-5`,
    // sem linha (§Hierarquia). `data-modulo` é o que faz o header ler a pastel
    // do módulo pela cascata, sem cor por propriedade.
    <div data-modulo={modulo} className="flex flex-col gap-[var(--s-5)]">
      <header className="rounded-[var(--r-card)] bg-modulo px-[var(--s-5)] py-[var(--s-4)]">
        <h1 className="t-pagina">{hub.titulo}</h1>
        <p className="t-meta mt-[var(--s-1)] max-w-[70ch]">{hub.chamada}</p>
      </header>

      {aviso ? (
        // TINT separa a região por natureza (§Hierarquia, ferramenta 3): é um
        // recado do sistema, não um objeto da página. Sem borda junto — tint e
        // hairline na mesma fronteira seriam duas ferramentas para uma.
        // `<output>` e não `<p role="status">`: o papel já vem do elemento, e a
        // região viva é o que faz o leitor de tela anunciar o recado a quem
        // chegou aqui sem pedir — que é o ponto inteiro do aviso.
        <output className="t-corpo block max-w-[70ch] rounded-[var(--r-card)] bg-[var(--tint-sand)] px-[var(--s-4)] py-[var(--s-3)]">
          {aviso}
        </output>
      ) : null}

      <section aria-label={`Indicadores de ${hub.titulo}`}>
        <KpisDoModulo modulo={modulo} />
      </section>

      <section aria-labelledby={`hub-atalhos-${modulo}`} className="flex flex-col gap-[var(--s-4)]">
        <h2 id={`hub-atalhos-${modulo}`} className="t-rotulo">
          Telas do módulo
        </h2>
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="flex flex-col gap-[var(--s-3)]">
            {nomearGrupos ? <h3 className="t-bloco">{grupo.titulo}</h3> : null}
            <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-[var(--s-3)] p-0">
              {grupo.itens.map((item) => (
                <li key={item.url} className="relative">
                  <CardDeAtalho item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

/**
 * A faixa do módulo. Um componente por módulo porque cada um tem seu hook e seu
 * DTO — e hook não se chama dentro de `switch`.
 */
function KpisDoModulo({ modulo }: { modulo: ModuloDeHub }) {
  if (modulo === 'compras') return <KpisDeCompras />
  if (modulo === 'vendas') return <KpisDeVendas />
  if (modulo === 'estoque') return <KpisDeEstoque />
  return <KpisDeCrm />
}

/**
 * Enquanto o agregado não chega, a faixa fica AUSENTE — não em esqueleto e não
 * em zero.
 *
 * Zero é um número, e um KPI mostrando `0` enquanto carrega afirma que não há
 * ordem em aberto. O esqueleto seria honesto, mas reserva quatro caixas de
 * altura total no topo de uma tela que muda de assunto a cada módulo; a faixa
 * some e volta em menos de um quadro, e o pulo é menor que a mentira.
 *
 * Erro também some: o hub é uma tela de partida, e um painel vermelho de falha
 * de agregado no caminho de quem só quer clicar em `Orçamentos` custa mais do
 * que informa. O número reaparece na listagem, onde ele é o assunto.
 */
function faixaOu<T>(dado: T | undefined, render: (dado: T) => ReactNode): ReactNode {
  return dado === undefined ? null : render(dado)
}

function KpisDeCompras() {
  const { data } = useResumoDeOrdensDeCompra()
  return faixaOu(data, (r) => (
    <FaixaDeKpi>
      <KpiTile
        rotulo="Ordens em aberto"
        valor={r.openOrders}
        unidade="ordens"
        nota={<>{formatMoneyBRL(r.openOrdersValueCents)} combinados</>}
      />
      <KpiTile rotulo="Chegando esta semana" valor={r.arrivingThisWeek} unidade="ordens" />
      <KpiTile
        rotulo="Atrasadas"
        valor={r.lateOrders}
        unidade="ordens"
        alerta={r.lateOrders > 0}
        tint={r.lateOrders > 0 ? 'rose' : 'nenhum'}
      />
      <KpiTile
        rotulo="Comprado no mês"
        valorCentavos={r.monthValueCents}
        delta={variacao(r.monthValueCents, r.previousMonthValueCents)}
        serie={r.monthlyValueSeries}
        tint="mint"
      />
    </FaixaDeKpi>
  ))
}

function KpisDeVendas() {
  const { data } = useResumoDeOrcamentos()
  return faixaOu(data, (r) => (
    <FaixaDeKpi>
      <KpiTile
        rotulo="Orçamentos abertos"
        valor={r.openQuotes}
        unidade="orçamentos"
        nota={<>{formatMoneyBRL(r.openQuotesValueCents)} em proposta</>}
      />
      <KpiTile
        rotulo="Vencem esta semana"
        valor={r.expiringThisWeek}
        unidade="orçamentos"
        alerta={r.expiringThisWeek > 0}
        tint={r.expiringThisWeek > 0 ? 'sand' : 'nenhum'}
      />
      <KpiTile rotulo="Aprovados no mês" valor={r.wonThisMonth} unidade="orçamentos" />
      <KpiTile
        rotulo="Vendido no mês"
        valorCentavos={r.monthValueCents}
        delta={variacao(r.monthValueCents, r.previousMonthValueCents)}
        serie={r.monthlyValueSeries}
        tint="mint"
      />
    </FaixaDeKpi>
  ))
}

function KpisDeEstoque() {
  const { data } = useResumoDeEstoque()
  return faixaOu(data, (r) => (
    <FaixaDeKpi>
      <KpiTile rotulo="Variantes" valor={r.variantCount} unidade="SKUs" />
      <KpiTile
        rotulo="Abaixo do mínimo"
        valor={r.criticalItems}
        unidade="itens"
        alerta={r.criticalItems > 0}
        tint={r.criticalItems > 0 ? 'rose' : 'nenhum'}
      />
      <KpiTile rotulo="Sem preço" valor={r.unpricedVariants} unidade="SKUs" tint="sand" />
      <KpiTile
        rotulo="Valor em estoque"
        valorCentavos={r.stockValueCents}
        delta={variacao(r.stockValueCents, r.previousMonthStockValueCents)}
        serie={r.monthlyValueSeries}
        nota={<>{r.movementsThisMonth} movimentos no mês</>}
        tint="mint"
      />
    </FaixaDeKpi>
  ))
}

function KpisDeCrm() {
  const { data } = useResumoDeOportunidades()
  return faixaOu(data, (r) => (
    <FaixaDeKpi>
      <KpiTile
        rotulo="Oportunidades abertas"
        valor={r.openOpportunities}
        unidade="no funil"
        nota={<>{formatMoneyBRL(r.openValueCents)} em jogo</>}
      />
      <KpiTile
        rotulo="Valor ponderado"
        valorCentavos={r.weightedValueCents}
        nota="pela probabilidade da fase"
        tint="lilac"
      />
      <KpiTile rotulo="Ganhas no mês" valor={r.wonThisMonth} unidade="oportunidades" />
      <KpiTile
        rotulo="Ganho no mês"
        valorCentavos={r.wonThisMonthCents}
        delta={variacao(r.wonThisMonthCents, r.previousMonthWonCents)}
        serie={r.monthlyWonSeries}
        tint="mint"
      />
    </FaixaDeKpi>
  ))
}

/**
 * CARD QUIETO — borda n-300 e `--hard-soft`, nunca `--hard-1`.
 *
 * A §Hierarquia dá UMA sombra dura de tinta por tela, e nesta ela é da faixa de
 * KPIs. O atalho é o segundo plano da página: levanta no hover, e esse é o
 * único movimento que ele tem.
 *
 * ## Dois destinos num card, e nenhum `<a>` dentro de outro
 *
 * O card leva à LISTAGEM e traz junto o `Incluir` da tela, que é o clique mais
 * frequente de quem abre um módulo (`item.incluir`, publicado na taxonomia
 * justamente para quem está fora da tela). Anchor aninhado é HTML inválido e o
 * leitor de tela anuncia um link só, então o card não é um `<a>` gigante: o
 * link do título se estica sobre o cartão inteiro (`after:absolute`) e o
 * `Incluir` sobe uma camada. Clicar em qualquer canto abre a lista; clicar no
 * `+` abre o registro em branco.
 *
 * Tela sem `incluir` não ganha o botão, e isso é informação: `Previsão de
 * Chegada` e os relatórios não criam registro — um `+` ali levaria a 404.
 */
function CardDeAtalho({ item }: { item: NavItem }) {
  const Icone = item.icon
  return (
    <div
      className={cn(
        // O `!` não é gosto: `src/index.css` tem `* { border-color: hsl(var(--border)) }`
        // FORA de qualquer `@layer`, e regra sem layer vence toda utility do
        // Tailwind v4 — independentemente da especificidade. Sem o important, o
        // card sai com a borda de tinta do 1.x (medido: `rgb(18,18,18)`) onde a
        // §Hierarquia manda n-300, e "card quieto" viraria o card forte. O `*`
        // é zona de D1; quando ele entrar num layer, este `!` pode cair.
        'flex h-full flex-col gap-[var(--s-2)] rounded-[var(--r-card)] border border-[color:var(--n-300)]! bg-[var(--folha)] p-[var(--s-4)]',
        'shadow-[var(--hard-soft)] transition-shadow hover:shadow-[var(--hard-1)]',
        'focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-2',
      )}
    >
      <div className="flex items-start gap-[var(--s-2)]">
        <Icone aria-hidden className="mt-[2px] size-4 shrink-0 text-muted-foreground" />
        <Link to={item.url} className="t-ui min-w-0 flex-1 truncate after:absolute after:inset-0">
          {item.title}
        </Link>
        {item.incluir ? (
          <Link
            to={item.incluir}
            aria-label={`Incluir em ${item.title}`}
            // `t-ui` e não `t-dado-meta`: mono é DADO na §Hierarquia — o que se
            // copia, compara ou soma. "+ Novo" é ação, e ação é Inter.
            className="t-ui relative shrink-0 rounded-[var(--r-chip)] border border-[color:var(--n-300)]! px-[var(--s-2)] py-[2px] text-[color:var(--n-700)] hover:bg-[var(--n-50)]"
          >
            + Novo
          </Link>
        ) : null}
      </div>
      <p className="t-meta">{item.descricao}</p>
    </div>
  )
}
