import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ReactNode } from 'react'

export type Aba = readonly [value: string, label: string]

export interface AbasSemCapturaProps {
  capturada: Aba
  abas: readonly Aba[]
  children: ReactNode
  /**
   * Abas REAIS além da capturada — as que existem no contrato e não vieram da
   * transcrição.
   *
   * Existe porque a participação do pedido (`/api/orders/{id}/participants`) é
   * aba de verdade, com grade e gravação próprias, e não uma moldura à espera de
   * print. Sem esta porta ela teria de morar embaixo da faixa de abas, onde o
   * operador não a procuraria — ou obrigaria a tela a remontar `TabsList` à mão,
   * que é a duplicação que este componente existe para impedir.
   *
   * Elas entram DEPOIS da capturada e ANTES das não capturadas: o que funciona
   * fica junto do que funciona.
   */
  adicionais?: readonly { aba: Aba; conteudo: ReactNode }[]
}

/** Emite a moldura repetida das abas capturadas e ainda não transcritas. */
export function AbasSemCaptura({
  capturada,
  abas,
  children,
  adicionais = [],
}: AbasSemCapturaProps) {
  return (
    <>
      <TabsList className="flex-wrap">
        <TabsTrigger value={capturada[0]}>{capturada[1]}</TabsTrigger>
        {adicionais.map(({ aba: [value, label] }) => (
          <TabsTrigger key={value} value={value}>
            {label}
          </TabsTrigger>
        ))}
        {abas.map(([value, label]) => (
          <TabsTrigger key={value} value={value}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={capturada[0]}>{children}</TabsContent>
      {adicionais.map(({ aba: [value], conteudo }) => (
        <TabsContent key={value} value={value}>
          {conteudo}
        </TabsContent>
      ))}
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
