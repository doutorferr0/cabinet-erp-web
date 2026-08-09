import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ReactNode } from 'react'

export type Aba = readonly [value: string, label: string]

export interface AbasSemCapturaProps {
  capturada: Aba
  abas: readonly Aba[]
  children: ReactNode
}

/** Emite a moldura repetida das abas capturadas e ainda não transcritas. */
export function AbasSemCaptura({ capturada, abas, children }: AbasSemCapturaProps) {
  return (
    <>
      <TabsList className="flex-wrap">
        <TabsTrigger value={capturada[0]}>{capturada[1]}</TabsTrigger>
        {abas.map(([value, label]) => (
          <TabsTrigger key={value} value={value}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={capturada[0]}>{children}</TabsContent>
      {abas.map(([value, label]) => (
        <TabsContent key={value} value={value}>
          <p className="py-6 text-sm text-muted-foreground">
            Aba {label} não capturada na transcrição do SoftLux — aguardando nova rodada de prints
            (transcrição §10).
          </p>
        </TabsContent>
      ))}
    </>
  )
}
