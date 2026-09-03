import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/**
 * CARTÃO LATERAL — a coluna de apoio do registro, tintada por ASSUNTO
 * (Reface 2.0, D18).
 *
 * A lateral não é "o que sobrou do formulário". Ela existe porque um documento
 * tem dois tipos de conteúdo com leituras diferentes: o que se PREENCHE (itens,
 * valores, datas — coluna principal) e o que se CONSULTA de relance (com quem,
 * onde está, quem leva, como se paga). Empilhar os dois numa coluna só é o que
 * transformava a ficha numa parede de campos.
 *
 * ## Por que a cor entra aqui e não na linha de dado
 *
 * §Hierarquia lista quatro ferramentas de separação e manda usar a mais barata
 * que resolve. Entre cartões da lateral, espaço bastaria para separar — mas não
 * bastaria para dizer DE QUE ASSUNTO cada um trata, que é a pergunta que o olho
 * faz ao varrer a coluna. Tint é a ferramenta nº 3 exatamente para isso:
 * "separa região por natureza". A cor é do CARTÃO, nunca do texto dentro dele.
 *
 * O vocabulário é fixo e emprestado do emprego de zona que o repo já tem —
 * `lilac` identidade · `mint` andamento · `sky` logística · `sand` financeiro ·
 * `rose` recusa. Cartão novo escolhe entre esses cinco; assunto que não couber
 * em nenhum é sinal de que o cartão está juntando dois assuntos.
 *
 * ## Tint não empilha
 *
 * Regra da §Hierarquia: **tint nunca dentro de tint**. Por isso o cartão é a
 * borda externa do assunto — o que vive dentro dele se separa por espaço e, no
 * máximo, hairline. Um `FormBlock` colorido aqui dentro seria zona sobre zona,
 * e a segunda apagaria a primeira.
 *
 * ## Campo dentro de tint
 *
 * O tint é claro, e campo de formulário com fundo transparente sobre ele
 * desaparece: o operador perde a borda do que é editável. Os controles ganham
 * branco a 70% — o suficiente para o campo se destacar do fundo sem virar um
 * segundo cartão branco dentro do cartão colorido.
 */

export type TintDoCartao = 'lilac' | 'mint' | 'sky' | 'sand' | 'rose'

/**
 * O mapa passa pelos ALIASES `--zone-*`, que a D1 (#469) mantém apontando para
 * os `--tint-*` 2.0. Escrever `bg-tint-mint` hoje daria classe sem token; assim
 * o cartão está certo nas duas fases e a D30, que apaga os aliases, troca só
 * este objeto.
 */
const TINT: Record<TintDoCartao, string> = {
  lilac: 'bg-zone-id',
  mint: 'bg-zone-money',
  sky: 'bg-zone-info',
  sand: 'bg-zone-warn',
  rose: 'bg-zone-danger',
}

export interface ParDoCartao {
  rotulo: string
  /** `ReactNode` porque valor de documento é `<Nome>`, `<Money>`, `—`. */
  valor: ReactNode
}

export function CartaoLateral({
  titulo,
  tint,
  pares,
  children,
  className,
}: {
  titulo: string
  tint: TintDoCartao
  /** Os pares de leitura. O que é EDITÁVEL entra por `children`. */
  pares?: ParDoCartao[]
  children?: ReactNode
  className?: string
}) {
  return (
    <section
      data-slot="cartao-lateral"
      data-tint={tint}
      aria-label={titulo}
      className={cn(
        // `border` fino e sombra macia: card QUIET. A caixa de traço grosso é
        // a gramática do documento principal — repeti-la na lateral daria duas
        // vozes com o mesmo volume, e a coluna de apoio gritaria junto.
        'flex flex-col gap-3 rounded-data border p-4 shadow-el1',
        TINT[tint],
        // Branco a 70% em tudo que se digita ou escolhe. Vale para o que vier
        // por `children`, sem cada chamador ter de lembrar.
        '[&_input]:bg-card/70 [&_select]:bg-card/70 [&_textarea]:bg-card/70',
        className,
      )}
    >
      {/* `--t-bloco`: título de card. Não é Gambarino — a régua dá um display
          por tela, e ele já está no cabeçalho do registro. */}
      <h3 className="t-bloco">{titulo}</h3>

      {pares && pares.length > 0 ? (
        // Irmãos separados por `gap`, nunca por margin nem por linha: pares de
        // kv são a fronteira mais barata da régua.
        <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-2">
          {pares.map((par) => (
            <div key={par.rotulo} className="col-span-2 grid grid-cols-subgrid items-baseline">
              {/* `--t-rotulo`: caixa alta pequena, e NUNCA com caixa, borda ou
                  fundo próprio — o fundo aqui já é o tint do cartão. */}
              <dt className="t-rotulo">{par.rotulo}</dt>
              <dd className="t-corpo min-w-0">{par.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children}
    </section>
  )
}
