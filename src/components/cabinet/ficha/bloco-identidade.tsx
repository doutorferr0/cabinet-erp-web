import { FormBlock, type TintDeBloco } from '@/components/cabinet/form-block'
import { Monograma } from '@/components/cabinet/monograma'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/**
 * Identidade — o card lateral que diz DE QUEM é o registro (D16, issue #484;
 * mockup `Formulário`, coluna lateral).
 *
 * ## Ele é o que sobrou da `BandaDeIdentidade`, e a troca não é cosmética
 *
 * A banda era uma faixa colorida de largura inteira no topo da tela, com o nome
 * da TELA dentro ("Cadastro de fornecedores"). Ela respondia a pergunta errada:
 * quem abre uma ficha já sabe em que tela está — o que ele precisa saber é de
 * quem é o registro aberto, e isso a banda não dizia. Pior: gastava a peça mais
 * cara da página (faixa de cor cheia, largura total, gradiente) para repetir o
 * que o breadcrumb e o título já diziam, e empurrava o dado 60px para baixo.
 *
 * O 2.0 troca a faixa por um CARD LATERAL tintado: mesma informação de
 * identidade, no lugar onde o olho procura contexto (a coluna de 320px), sem
 * roubar a primeira dobra do dado. O tint separa por NATUREZA — é a ferramenta
 * nº 3 da §Hierarquia, e o assunto "quem" tem cor fixa (lilás).
 *
 * ## Os degraus, e onde a auditoria pede o que a régua não tem
 *
 * A auditoria descreve "nome 14px 600, documento/cidade 11px". A §Hierarquia
 * declara onze degraus e nada fora deles, e nomeia **`--t-ui`** como o degrau de
 * "nome de entidade" — 13/500. Fica `--t-ui`: um degrau que existe vale mais do
 * que meio pixel de fidelidade, e a régua é a prioridade nº 1 da rodada.
 * Documento vai em `--t-dado-meta` porque documento é dado (se copia, se
 * compara); cidade vai em `--t-meta` porque é texto.
 *
 * ## O monograma não é avatar
 *
 * Duas letras em mono sobre folha. Não busca imagem, não tem `alt`, é
 * `aria-hidden`: o nome está escrito ao lado em texto de verdade, e um leitor de
 * tela que anunciasse "ML" antes de "Mister LED" leria a mesma coisa duas vezes,
 * a primeira em código.
 */

export interface ParDeIdentidade {
  /** Rótulo do par. Vai em `.t-meta`, alinhado à esquerda, largura fixa. */
  termo: string
  /** Valor. Passe `.t-dado` no próprio nó quando for número, data ou dinheiro. */
  valor: ReactNode
}

export interface BlocoIdentidadeProps {
  /** Nome do bloco. "Identidade" nos cadastros, "Fornecedor" na ordem de compra. */
  titulo?: string
  /** Nome da entidade, por extenso. */
  nome: string
  /** CNPJ/CPF já formatado para exibição — o dado guarda sem máscara. */
  documento?: string | undefined
  /** "Campinas/SP". */
  cidade?: string | undefined
  /**
   * Até quatro pares. Quatro é o que cabe na coluna sem virar tabela; o quinto
   * par é sinal de que a informação quer um bloco próprio.
   */
  pares?: readonly ParDeIdentidade[]
  /** O "Ver cadastro →" do mockup. Fica em `--primary-text`. */
  rodape?: ReactNode
  /** Assunto do card. Identidade é lilás por convenção da auditoria §2.3. */
  tint?: TintDeBloco
  className?: string
}

export function BlocoIdentidade({
  titulo = 'Identidade',
  nome,
  documento,
  cidade,
  pares = [],
  rodape,
  tint = 'lilac',
  className,
}: BlocoIdentidadeProps) {
  const subtitulo = [documento, cidade].filter(Boolean)

  return (
    <FormBlock titulo={titulo} tint={tint} {...(className ? { className } : {})}>
      <div className="flex min-w-0 items-center gap-[var(--s-3)]">
        <Monograma nome={nome} tamanho={34} />
        <div className="min-w-0">
          <p className="t-ui truncate">{nome}</p>
          {subtitulo.length > 0 ? (
            <p className="t-meta truncate">
              {documento ? <span className="t-dado-meta">{documento}</span> : null}
              {documento && cidade ? ' · ' : null}
              {cidade}
            </p>
          ) : null}
        </div>
      </div>

      {pares.length > 0 ? (
        // `dl` de verdade: par termo/valor é a estrutura que o leitor de tela
        // sabe percorrer. Uma pilha de `div` diria as mesmas palavras sem dizer
        // quais delas se pertencem.
        <dl className={cn('mt-[var(--s-3)] flex flex-col gap-[var(--s-2)]')}>
          {pares.map((par) => (
            <div key={par.termo} className="flex min-w-0 items-baseline gap-[var(--s-3)]">
              <dt className="t-meta w-[92px] shrink-0">{par.termo}</dt>
              <dd className="t-ui min-w-0 flex-1">{par.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {rodape ? (
        <div className="t-ui mt-[var(--s-3)] [color:var(--primary-text)]">{rodape}</div>
      ) : null}
    </FormBlock>
  )
}
