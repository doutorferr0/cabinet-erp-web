import { cn } from '@/lib/utils'

/**
 * MONOGRAMA — as duas letras do nome numa caixa de tint. Reface 2.0, #471 (D3).
 *
 * Marca uma ENTIDADE (cliente, profissional, colaborador, fornecedor) numa
 * lista ou num cabeçalho de ficha. Não é avatar: o app não guarda foto de
 * ninguém, e um círculo cinza com silhueta genérica ocuparia o mesmo espaço
 * dizendo menos que duas letras. (mockup 2.0: `.mono-av` na coluna de
 * fornecedor da Listagem.)
 *
 * ## A cor é hash, e é de propósito
 *
 * Sem cor declarada, o tint sai do nome — soma dos code points nas 5 tints. O
 * ponto NÃO é identificar a entidade pela cor (5 tints e centenas de clientes
 * colidem o tempo todo); é dar à lista uma textura que o olho usa para voltar
 * ao mesmo lugar depois de rolar. Cor estável para o mesmo nome é o que torna
 * a lista reconhecível numa segunda passada.
 *
 * Por isso o monograma é `aria-hidden`: quem carrega o sentido é o nome ao
 * lado, sempre. Duas letras coloridas sozinhas seriam um rótulo mudo no leitor
 * de tela, e o hash não é informação que se possa narrar.
 *
 * ## Separação: hairline, e aqui ela vence a sombra do Badge
 *
 * O `<Badge>` se recorta por sombra dura de 1px; este se recorta por hairline
 * `--n-200`, que é o que o mockup desenha. Não é incoerência: o badge pousa
 * sobre a folha da célula, onde a sombra é a ferramenta mais barata que
 * resolve; o monograma pousa também sobre CARD TINTADO (`.card[class*=tint-]`
 * no mockup), e ali uma sombra de tinta a 18% sobre pastel some — a hairline
 * não. Continua sendo UMA ferramenta por fronteira, que é o que a §Hierarquia
 * pede; a escolha é por fronteira, não por peça.
 *
 * ## Tamanho: `--t-dado`, e aqui a régua vence o mockup
 *
 * O mockup escreve `font-size:10.5px`. A §Hierarquia é explícita — "4 papéis,
 * 11 degraus, nada fora deles" — e 10.5 mono não é degrau (o de 10.5 é
 * `--t-rotulo`, que é Inter uppercase). As duas letras são DADO em mono, então
 * o degrau é `--t-dado` (mono 500 · 12.5 · tabular). Duas letras a 12.5px numa
 * caixa de 26px sobram folga de 5px de cada lado. Onde a régua e o mockup
 * divergem em NÚMERO, a régua é lei ("prioridade nº 1 da rodada"); onde
 * divergem em DESENHO, o mockup vence.
 */
const TINTS = {
  lilac: 'bg-[var(--tint-lilac)]',
  mint: 'bg-[var(--tint-mint)]',
  sky: 'bg-[var(--tint-sky)]',
  sand: 'bg-[var(--tint-sand)]',
  rose: 'bg-[var(--tint-rose)]',
} as const

export type TintDeMonograma = keyof typeof TINTS

const ORDEM_DAS_TINTS = Object.keys(TINTS) as TintDeMonograma[]

/** Partículas não são iniciais: "Maria da Silva" é MS, não MD. */
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'di', 'du', 'y'])

/**
 * Sufixo de razão social. Não é nome de ninguém — é a forma jurídica, e ela
 * repete no cadastro inteiro: por primeira+última, metade dos fornecedores
 * terminaria no `L` de `Ltda`. `s/a` entra com a barra porque é assim que o
 * operador digita.
 */
const SUFIXOS_SOCIETARIOS = new Set([
  'ltda',
  'ltda.',
  'me',
  'sa',
  's/a',
  's.a.',
  'epp',
  'eireli',
  'mei',
  'cia',
  'cia.',
])

/**
 * Primeira letra da primeira palavra + primeira da SEGUNDA. Nome de uma palavra
 * só usa as duas primeiras letras dela ("Vertz" → VE) — uma letra sozinha
 * ficaria perdida no meio da caixa e colidiria com metade do cadastro.
 *
 * ## Era primeira+ÚLTIMA, e a D37 trocou (decisão de convenção)
 *
 * Primeira+última é a convenção para NOME DE GENTE, e este repositório é um ERP
 * onde a maioria dos nomes é razão social. **A última palavra de razão social é
 * `Ltda`, `ME` ou `S/A`** — primeira+última faria metade do cadastro terminar na
 * mesma letra (`Vertz Iluminação Ltda` → `VL`, `Mister LED Comercio de
 * Iluminação Ltda` → `ML` só por acaso).
 *
 * A troca não é preferência: **dois lugares independentes já tinham chegado
 * nela, e um deles mediu na tela.** `bloco-identidade.test.tsx` (D16) cobrava
 * `Vertz Iluminação Ltda` → `VI` — e reprovava, porque esta função dizia `VL`;
 * `features/crm/monograma.tsx` (D22) escreveu a própria cópia com a regra dos
 * dois primeiros, registrando que `MARIA HELENA ARQUITETURA ME` daria `MM` pela
 * outra. Três implementações, duas convenções, um teste vermelho na base — a
 * D37 ficou com a que dois deles pediam e tem argumento de domínio.
 *
 * O que a mudança alcança: nome de PESSOA com três partes ou mais passa a usar
 * o nome do meio (`José dos Santos Oliveira` → `JS`, não `JO`). Trocar de volta
 * é editar estas quatro linhas — mas então `bloco-identidade` volta a reprovar,
 * e é isso que precisa ser decidido junto, não em silêncio.
 */
export function iniciaisDe(nome: string): string {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !PARTICULAS.has(p.toLowerCase()))

  // Sufixo societário não distingue ninguém: metade do cadastro termina em
  // `Ltda`. O critério é a PALAVRA, não o comprimento — a D16 cortava tudo com
  // menos de três letras e comia `VIA HF` (que virava `VI`) e `Al`. Preferência,
  // não exclusão: sobrando só sufixo, ele vale, senão `HF Ltda` não teria sigla.
  const nomes = palavras.filter((p) => !SUFIXOS_SOCIETARIOS.has(p.toLowerCase()))
  const uteis = nomes.length > 0 ? nomes : palavras

  const primeira = uteis.at(0)
  const segunda = uteis.at(1)
  if (!primeira) return '—'
  // Por comprimento, não por igualdade de texto: "Ana Ana" tem duas palavras e
  // devolve AA, não AN.
  if (!segunda) return primeira.slice(0, 2).toUpperCase()

  return `${primeira.slice(0, 1)}${segunda.slice(0, 1)}`.toUpperCase()
}

/**
 * Hash estável do nome nas 5 tints. Soma de code points, não `hashCode` de
 * string: o nome é curto, a distribuição não precisa ser criptográfica e a
 * soma é a única forma de o mesmo nome cair sempre na mesma cor sem tabela.
 */
export function tintDe(nome: string): TintDeMonograma {
  let soma = 0
  for (const ch of nome.trim()) soma += ch.codePointAt(0) ?? 0
  return ORDEM_DAS_TINTS[soma % ORDEM_DAS_TINTS.length] ?? 'lilac'
}

export interface MonogramaProps {
  nome: string
  /** Lado da caixa em px. 26 na grade (D3); 34 no bloco de identidade e 22 no lookup (D16). */
  tamanho?: number
  /**
   * Fixa o tint em vez de derivá-lo do nome. Use quando a entidade JÁ tem cor
   * no contexto — a ficha dentro de um `[data-modulo]`, por exemplo —, para o
   * monograma não brigar com a cor da região.
   */
  cor?: TintDeMonograma
  className?: string
}

export function Monograma({ nome, cor, tamanho, className }: MonogramaProps) {
  const tint = cor ?? tintDe(nome)

  return (
    <span
      aria-hidden="true"
      data-slot="monograma"
      data-tint={tint}
      style={tamanho ? { width: tamanho, height: tamanho } : undefined}
      className={cn(
        // 26px, raio 6 (`--r-ctrl`), `.t-dado` para a tipografia.
        't-dado grid size-[26px] shrink-0 place-content-center rounded-[var(--r-ctrl)] border border-[var(--n-200)]',
        TINTS[tint],
        className,
      )}
    >
      {iniciaisDe(nome)}
    </span>
  )
}

/**
 * `monograma` É `iniciaisDe` (D37).
 *
 * Este arquivo chegou a ter DUAS funções de iniciais, com a segunda anunciando a
 * dívida: *"é o que `BlocoIdentidade` e `LookupCombo` esperam; `iniciaisDe` (D3)
 * fica para a grade. Unificar é item da D37"*. Duas regras para a mesma pergunta,
 * no mesmo arquivo, cada uma com o seu teste — e a mesma entidade saía com duas
 * siglas conforme a tela que a mostrasse.
 *
 * A regra que ficou junta o que cada uma acertava: as DUAS PRIMEIRAS palavras
 * (D16/D22, porque a última de uma razão social é `Ltda`), partícula fora (D3,
 * porque `Maria da Silva` é MS e não MD) e palavra curta preterida mas não
 * proibida (D16 cortava por comprimento e perdia `Al`). Os casos de borda dos
 * três testes passam sem exceção nenhuma.
 */
export const monograma = iniciaisDe
