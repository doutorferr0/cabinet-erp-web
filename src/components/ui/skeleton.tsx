import { cn } from '@/lib/utils'

/**
 * ESQUELETO — o retângulo que ocupa o lugar do dado que ainda não chegou.
 *
 * ## Sem brilho (D29)
 *
 * Nada de shimmer: o gradiente que atravessa a caixa é a única animação da tela
 * que se move sozinha, e numa listagem de vinte linhas são vinte varreduras
 * simultâneas no canto do olho de quem está lendo outra coisa. O 2.0 deixa só a
 * respiração de opacidade — a caixa desmaia e volta, sem nada percorrendo.
 *
 * ## `motion-safe`, e não animação sempre
 *
 * Quem pediu movimento reduzido no sistema operacional pediu por um motivo, e
 * carregamento é exatamente o momento em que a tela pisca mais. Com
 * `prefers-reduced-motion: reduce` o esqueleto fica PARADO na tinta cheia —
 * continua dizendo "aqui vem dado", sem se mexer. `animate-pulse` cru não olha
 * a preferência.
 *
 * **Dívida declarada, e é da D1:** a espec da D29 pede opacidade oscilando de
 * 0.6 a 1; `animate-pulse` do Tailwind desce a 0.5. Fechar os 0.1 exige
 * `@keyframes` próprio em `src/index.css`, que na rodada 2.0 tem dono único
 * (D1) — mexer aqui seria sair de zona. Quando a D1 publicar a curva, esta
 * classe troca de nome e mais nada muda.
 *
 * Tinta `neutral` (n-100): é o degrau que a escala reserva para trilho e
 * esqueleto — fundo, nunca conteúdo.
 *
 * Raio de DADO: o esqueleto ocupa o lugar do dado que ainda não chegou, e herda
 * o canto dele — não o do controle nem o do cartão.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      // `aria-hidden`: o esqueleto é forma, não informação. Sem isto, o leitor
      // de tela anuncia uma pilha de caixas vazias enquanto a consulta corre.
      aria-hidden="true"
      className={cn('rounded-data bg-neutral motion-safe:animate-pulse', className)}
      {...props}
    />
  )
}

export { Skeleton }
