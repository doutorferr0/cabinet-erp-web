import { useEffect, useState } from 'react'
import { FunilColuna } from './FunilColuna'
import { agruparPorEtapa, mover } from './funil-agrupa'
import type { DestinoDoMovimento, EtapaDoFunil, OportunidadeDoFunil } from './funil-tipos'

/**
 * QUADRO do funil — STAGED, não integrado (ver ../README.md).
 *
 * Derivado de `DealListContent.tsx` do Atomic CRM (MIT, ver NOTICE).
 *
 * ## O quadro não fala com servidor nenhum
 *
 * No original, este componente recebe o `dataProvider` do react-admin e dispara
 * ele mesmo as chamadas de reindexação — uma por linha que muda de posição. Aqui
 * ele recebe `onMover` e entrega UMA intenção: "esta oportunidade vai para esta
 * etapa, na frente daquela". Quantas linhas isso mexe é problema de quem
 * persiste, não da tela.
 *
 * Dois motivos, os dois do CLAUDE.md:
 * 1. Tela não chama servidor — pede a `src/data/`. Componente que conhece
 *    provider não é portável para o modo mock nem testável sem servidor falso.
 * 2. Reordenação em N requisições não é atômica. Ver `integracao.md`
 *    §"A reindexação não atravessa".
 *
 * ## O estado local é otimista, e volta sozinho quando a promessa falha
 *
 * O movimento aparece na tela antes da confirmação — arrasto que espera resposta
 * parece travado. Se `onMover` rejeitar, o quadro reagrupa a partir das
 * `oportunidades` que recebeu, e o cartão volta para onde estava. Sem toast de
 * erro inventado aqui: quem sabe o que deu errado é a camada de dado.
 */
export function FunilQuadro({
  etapas,
  oportunidades,
  onMover,
  onAbrir,
}: {
  etapas: readonly EtapaDoFunil[]
  oportunidades: readonly OportunidadeDoFunil[]
  /** Persiste a intenção. Rejeitar desfaz o movimento na tela. */
  onMover: (oportunidadeId: string, destino: DestinoDoMovimento) => Promise<void>
  onAbrir: (id: string) => void
}) {
  const [porEtapa, setPorEtapa] = useState(() => agruparPorEtapa(oportunidades, etapas))
  const [arrastandoId, setArrastandoId] = useState<string | null>(null)

  // Reagrupa quando a lista do servidor muda. Comparação por REFERÊNCIA basta
  // porque `agruparPorEtapa` e `mover` são puros — o original precisou de um
  // `isEqual` de lodash aqui justamente porque mutava os arrays do estado.
  useEffect(() => {
    setPorEtapa(agruparPorEtapa(oportunidades, etapas))
  }, [oportunidades, etapas])

  function aplicar(oportunidadeId: string | null, destino: DestinoDoMovimento) {
    setArrastandoId(null)
    // Soltura sem arrasto em curso (o navegador cancelou, ou o drop veio de
    // fora da página): não há o que mover, e adivinhar um cartão seria pior.
    if (oportunidadeId === null) return

    const anterior = porEtapa
    const proximo = mover(anterior, oportunidadeId, destino)
    if (proximo === anterior) return

    setPorEtapa(proximo)
    onMover(oportunidadeId, destino).catch(() => setPorEtapa(anterior))
  }

  return (
    // `overflow-x-auto` no quadro: com sete etapas a rolagem é horizontal e
    // pertence a ESTA caixa. Página que rola de lado é defeito.
    <div className="flex gap-3 overflow-x-auto pb-4">
      {etapas.map((etapa) => (
        <FunilColuna
          key={etapa.valor}
          etapa={etapa}
          etapas={etapas}
          cartoes={porEtapa[etapa.valor] ?? []}
          arrastandoId={arrastandoId}
          onArrastar={setArrastandoId}
          onSoltar={(destino) => aplicar(arrastandoId, destino)}
          onMoverCartao={aplicar}
          onAbrir={onAbrir}
        />
      ))}
    </div>
  )
}
