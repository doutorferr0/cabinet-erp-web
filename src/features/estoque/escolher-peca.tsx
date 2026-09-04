import type { ProductDto } from '@/api/gerado'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { data } from '@/data'
import { MINIMO_DE_LETRAS, useTermoAdiado } from '@/data/busca-de-registro'
import { cn } from '@/lib/utils'
import type { ProdutoVariante } from '@/mocks/produtos'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { type RefObject, useId, useState } from 'react'

/**
 * ESCOLHER A PEÇA — produto por busca INLINE, e a variante ao lado.
 *
 * ## Por que o resultado desceu do diálogo para debaixo do campo
 *
 * A tela pedia a peça por janela de busca (§9 padrão 5): clicar na lupa, achar
 * a linha, marcar, confirmar — quatro gestos e uma camada por cima da tela,
 * para responder à pergunta que a tela inteira existe para responder. O padrão
 * 5 não sai do sistema e continua aqui pelo botão da lupa, que é o caminho de
 * quem precisa das colunas e do filtro; o que muda é o CAMINHO CURTO: digitar
 * três letras e ver o punhado de candidatos no lugar onde o valor vai ficar.
 *
 * ## O corte é o mesmo da paleta, e é de propósito
 *
 * `MINIMO_DE_LETRAS` e o adiamento vêm de `busca-de-registro.ts` — não são
 * constantes novas. Duas letras casariam meio catálogo, e consultar a cada
 * tecla transformaria um campo em uma rajada de requisições. Reaproveitar a
 * régua da paleta mantém as duas buscas com o mesmo comportamento: quem
 * aprendeu numa não reaprende na outra.
 *
 * **Cinco resultados, e a tela DIZ quantos ficaram de fora.** Uma lista curta
 * sem essa frase é a mentira clássica: quem procura "PENDENTE" vê cinco e
 * conclui que há cinco. O número que aparece é o `total` do servidor, não o
 * tamanho do que coube.
 *
 * ## A variante fica AO LADO, não numa segunda etapa
 *
 * Estoque existe por variante — o produto é do grupo, a peça com acabamento e
 * tamanho é o que ocupa prateleira. Empurrar a variante para um segundo passo
 * faria a tela mostrar KPIs de produto (que não existem) enquanto espera. Por
 * isso os dois campos vivem na mesma linha e o segundo acende assim que o
 * primeiro responde.
 */

/** Quantos candidatos aparecem embaixo do campo. Ver o cabeçalho. */
export const CANDIDATOS_INLINE = 5

/**
 * O rótulo de uma variante na lista de escolha.
 *
 * `Padrão` quando não há acabamento nem tamanho: a variante existe (estoque
 * pende dela), e um `<option>` em branco faria o operador achar que a lista
 * quebrou. Pura e exportada — é regra que o teste exercita sem montar tela.
 */
export function nomeDaVariante(variante: Pick<ProdutoVariante, 'acabamento' | 'tamanho'>): string {
  return [variante.acabamento, variante.tamanho].filter(Boolean).join(' · ') || 'Padrão'
}

export function EscolherPeca({
  produto,
  variantes,
  variantId,
  aoEscolherProduto,
  aoLimparProduto,
  aoEscolherVariante,
  aoBuscarNaJanela,
  inputRef,
  className,
}: {
  produto: ProductDto | null
  variantes: readonly ProdutoVariante[]
  variantId: string | null
  aoEscolherProduto: (produto: ProductDto) => void
  aoLimparProduto: () => void
  aoEscolherVariante: (variantId: string | null) => void
  /**
   * A janela de busca (§9 padrão 5) — o caminho longo, para quem quer colunas.
   * Ausente = sem lupa: é assim DENTRO da gaveta de lançamento, onde abrir um
   * dialog por cima de um sheet empilharia duas camadas modais sobre a folha, e
   * a segunda prenderia o foco da primeira.
   */
  aoBuscarNaJanela?: (() => void) | undefined
  inputRef?: RefObject<HTMLInputElement | null>
  className?: string
}) {
  const [termo, setTermo] = useState('')
  const adiado = useTermoAdiado(termo)
  const idDaBusca = useId()
  const idDaVariante = useId()

  const procurando = adiado.trim().length >= MINIMO_DE_LETRAS && produto === null
  const busca = useQuery({
    queryKey: ['produtos', 'busca-inline-estoque', adiado] as const,
    enabled: procurando,
    queryFn: () =>
      data.produtos.list({
        q: adiado.trim(),
        sort: null,
        page: 1,
        pageSize: CANDIDATOS_INLINE,
      }),
  })

  const candidatos = busca.data?.rows ?? []
  const total = busca.data?.total ?? 0
  const sobraram = total - candidatos.length

  function escolher(linha: ProductDto) {
    setTermo('')
    aoEscolherProduto(linha)
  }

  return (
    <div className={cn('flex flex-wrap items-start gap-4', className)}>
      {/* O campo GRANDE: é a pergunta da tela, e ocupa o espaço de uma. */}
      <div className="flex min-w-72 flex-1 flex-col gap-1">
        <Label htmlFor={idDaBusca}>Produto</Label>

        {produto ? (
          // Escolhido, o campo vira o VALOR — mono no código, sans na
          // descrição: o código é o que se copia e compara, a descrição é o que
          // se lê. Misturar as duas vozes num campo só faz a descrição parecer
          // identificador.
          <div className="flex h-9 items-center gap-2 rounded-control border-2 border-input bg-card px-2.5">
            <span className="t-dado">{produto.code}</span>
            <span className="t-corpo min-w-0 flex-1 truncate">{produto.description}</span>
            <button
              type="button"
              aria-label="Trocar de produto"
              className="shrink-0 text-muted-foreground hover:text-foreground focus-visible:focus-ring"
              onClick={() => {
                setTermo('')
                aoLimparProduto()
              }}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="relative flex items-center gap-1">
            <Input
              id={idDaBusca}
              ref={inputRef}
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              placeholder="Código ou descrição — três letras bastam"
              autoComplete="off"
            />
            {aoBuscarNaJanela ? (
              <button
                type="button"
                aria-label="Buscar produto"
                className="flex size-9 shrink-0 items-center justify-center rounded-control border-2 border-input bg-card hover:bg-surface-sunken focus-visible:focus-ring"
                onClick={aoBuscarNaJanela}
              >
                <Search className="size-4" />
              </button>
            ) : null}
          </div>
        )}

        {/* Os candidatos moram DEBAIXO do campo, no fluxo — não numa camada
            flutuante. Camada exigiria fechar-ao-clicar-fora, foco preso e
            z-index sobre a folha; aqui a lista some sozinha quando a escolha
            acontece, que é o único jeito de sair dela. */}
        {produto === null && procurando ? (
          <div className="rounded-control border-2 border-input bg-card">
            {busca.isPending ? (
              <p className="t-meta px-2.5 py-2">Procurando…</p>
            ) : busca.isError ? (
              // Falha nunca sai como "nada encontrado": quem procurou concluiria
              // que a peça não existe e a cadastraria de novo.
              <p role="alert" className="t-corpo px-2.5 py-2 text-[var(--bad)]">
                A busca de produto não respondeu.
              </p>
            ) : candidatos.length === 0 ? (
              <p className="t-meta px-2.5 py-2">Nenhum produto casa “{adiado.trim()}”.</p>
            ) : (
              <>
                <ul>
                  {candidatos.map((linha) => (
                    <li key={linha.id} className="border-[var(--n-200)] border-b last:border-b-0">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface-sunken focus-visible:focus-ring"
                        onClick={() => escolher(linha)}
                      >
                        <span className="t-dado">{linha.code}</span>
                        <span className="t-corpo min-w-0 flex-1 truncate">{linha.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {sobraram > 0 ? (
                  // O número é o `total` do servidor. Sem esta linha, cinco
                  // resultados se leem como cinco existentes.
                  <p className="t-meta border-[var(--n-200)] border-t px-2.5 py-1.5">
                    <span className="t-dado-meta">{sobraram}</span> não couberam — use a busca
                    completa.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={idDaVariante}>Variante</Label>
        <select
          id={idDaVariante}
          className="t-ui h-9 rounded-control border-2 border-input bg-card px-2.5 outline-none focus-visible:focus-ring"
          value={variantId ?? ''}
          onChange={(evento) => aoEscolherVariante(evento.target.value || null)}
          disabled={variantes.length === 0}
        >
          <option value="">
            {variantes.length === 0 ? 'Escolha um produto' : 'Escolha a variante'}
          </option>
          {variantes.map((variante) => (
            <option key={variante.id} value={variante.id ?? ''}>
              {nomeDaVariante(variante)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
