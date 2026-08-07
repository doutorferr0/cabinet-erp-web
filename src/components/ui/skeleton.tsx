import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  // Raio de DADO: o esqueleto ocupa o lugar do dado que ainda não chegou, e
  // herda o canto dele — não o do controle nem o do cartão.
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-data bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
