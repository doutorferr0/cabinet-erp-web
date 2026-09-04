import { COR_DE_ZONA, DCard, MarcaDeCard } from '@/components/cabinet/painel'
import type { LucideIcon } from 'lucide-react'

/**
 * SEÇÃO de documento — a caixa-filha que agrupa um assunto do formulário.
 *
 * Na Reface 2.0 ela é um `DCard` quieto, igual ao painel: **a mesma caixa
 * desenhada uma vez só.** Antes eram duas construções para a mesma ideia
 * (`painel.tsx` com faixa tingida e selo; `secao.tsx` com barra de 4px, título
 * dentro de caixa pastel, ordinal em display condensado e um filete tracejado
 * até a margem), e a página que tinha as duas mostrava dois vocabulários de
 * agrupamento na mesma rolagem.
 *
 * ## O que saiu, contado por regra da §Hierarquia
 *
 * - **A barra de zona de 4px + a caixa pastel do título** eram DUAS ferramentas
 *   de separação na mesma fronteira (tint e card), mais uma terceira marca de
 *   cor no próprio texto. Sobra o quadradinho de 8px, que é o que a 2.0 usa
 *   para dizer de que zona é a região.
 * - **`--t-rotulo` nunca tem caixa/borda/fundo próprio** — e o título em caixa
 *   pastel com contorno era exatamente isso, um degrau acima. Agora é `.t-bloco`
 *   no cabeçalho do card, como todo título de bloco do sistema.
 * - **O ordinal em display condensado de 18px** não existe na régua: Gambarino
 *   nunca abaixo de 20px, e `--font-display-condensada` deixou de ser família
 *   própria na D1. Número de seção é DADO que se conta ("estou na 2 de 5"), e
 *   dado fala em mono: vai para `.t-dado-meta`, na nota do cabeçalho.
 * - **O filete tracejado** separava o título do vazio à direita, que não é
 *   fronteira nenhuma. A hairline do cabeçalho já separa cabeçalho de corpo.
 *
 * Cores por ZONA (emprego fixo do repo), não por módulo: `id` identidade ·
 * `info` leitura · `warn` pendência/ajuste · `money` valor. Os valores vêm de
 * `COR_DE_ZONA`, em `painel.tsx` — inclusive o desvio que `--info` e `--warn`
 * exigem enquanto o `index.css` 1.x os define como tripla HSL.
 */
export type SecaoCor = keyof typeof COR_DE_ZONA

export function Secao({
  numero,
  titulo,
  cor = 'id',
  icone: Icone,
  nota,
  className,
  children,
}: {
  /**
   * Símbolo da seção. Quando vem, ele é a MARCA e o quadradinho não desenha —
   * dois marcadores lado a lado no mesmo cabeçalho seriam duas coisas dizendo
   * "esta região é de tal assunto". Herda a cor da zona.
   */
  icone?: LucideIcon
  /** Meia-frase que qualifica o título. Entra em `.t-meta`, na nota. */
  nota?: string
  /** Ordinal ("01", "02"…) — o mapa da página, em `.t-dado-meta`. */
  numero?: string
  titulo: string
  cor?: SecaoCor
  className?: string
  children: React.ReactNode
}) {
  const tinta = COR_DE_ZONA[cor]

  // Ordinal e nota dividem a MESMA nota do cabeçalho, e não duas: dois blocos
  // no canto direito competiriam pelo mesmo canto com pesos diferentes.
  const notaDoCabecalho =
    numero || nota ? (
      <span className="inline-flex items-baseline" style={{ gap: 'var(--s-2)' }}>
        {numero ? <span className="t-dado-meta">{numero}</span> : null}
        {nota ? <span>{nota}</span> : null}
      </span>
    ) : undefined

  return (
    <DCard
      data-slot="secao"
      titulo={titulo}
      marca={
        Icone ? (
          <Icone
            aria-hidden="true"
            data-slot="secao-icone"
            className="size-3.5 shrink-0"
            style={{ color: tinta }}
          />
        ) : (
          <MarcaDeCard cor={tinta} />
        )
      }
      {...(notaDoCabecalho ? { nota: notaDoCabecalho } : {})}
      corpoComPadding
      {...(className ? { className } : {})}
    >
      {children}
    </DCard>
  )
}
