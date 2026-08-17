import type { CrmOpportunityDto, CrmStageDto } from '@/api/gerado'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useMotivosDePerda, useMoverOportunidade } from '@/data/crm-api'
import { Link } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'

/**
 * PERDER O NEGÓCIO — o motivo é pedido ANTES, não cobrado depois.
 *
 * ## O que este diálogo conserta
 *
 * O contrato exige `lostReasonId` para entrar em estágio `isLost` e responde
 * **400** sem ele. Até aqui o quadro mandava o `PATCH` sem motivo nenhum: o
 * servidor recusava, o cartão não se mexia e o operador lia "estágio de perda
 * exige motivo" numa linha vermelha **sem ter, ali, onde informá-lo**. A regra
 * estava certa e o caminho para cumpri-la não existia.
 *
 * ## Por que `<select>` e não o `LookupCombo`
 *
 * O `LookupCombo` do padrão 2 é combobox de busca + botão `...` de cadastro
 * rápido, e as duas metades atrapalham aqui. Busca não serve numa lista de
 * meia dúzia de motivos — o operador lê todos de uma vez. E **cadastro rápido
 * no meio da perda é exatamente o que o catálogo existe para impedir**: quem
 * pode criar motivo na hora cria "preço", "preco alto" e "valor" em três
 * semanas, e o relatório do ano vira três linhas para a mesma coisa. Cadastrar
 * motivo é ato deliberado, em `/crm/motivos` — e o diálogo leva até lá por
 * link, para não esconder o caminho.
 *
 * ## A etapa de perda também se escolhe, quando há mais de uma
 *
 * Vindo do menu do cartão o operador já escolheu a coluna, e ela chega em
 * `etapaSugerida`. Vindo da barra da listagem não há coluna nenhuma escolhida —
 * e um funil pode ter mais de uma etapa `isLost` ("Perdido" e "Sem verba", por
 * exemplo). Com uma só, o seletor não aparece: escolher entre uma coisa é
 * clique cobrado sem decisão.
 */
export function PerderOportunidadeDialog({
  aberto,
  oportunidade,
  etapasDePerda,
  etapaSugerida,
  onFechar,
}: {
  aberto: boolean
  oportunidade: CrmOpportunityDto | null
  /** As etapas `isLost` do funil — vêm da configuração, não de palpite. */
  etapasDePerda: readonly CrmStageDto[]
  etapaSugerida?: string
  onFechar: () => void
}) {
  const motivos = useMotivosDePerda()
  const mover = useMoverOportunidade()
  const campoEtapa = useId()
  const campoMotivo = useId()
  const [etapaId, setEtapaId] = useState('')
  const [motivoId, setMotivoId] = useState('')

  // O diálogo não desmonta entre aberturas: sem isto, perder um negócio e
  // abrir o próximo traria o motivo do anterior já escolhido — e o operador
  // confirmaria sem ler, que é o pior modo de errar um dado de análise.
  useEffect(() => {
    if (!aberto) return
    setEtapaId(etapaSugerida ?? (etapasDePerda.length === 1 ? (etapasDePerda[0]?.id ?? '') : ''))
    setMotivoId('')
    mover.reset()
  }, [aberto, etapaSugerida, etapasDePerda, mover.reset])

  const lista = motivos.data ?? []
  const podeConfirmar = etapaId !== '' && motivoId !== '' && !mover.isPending

  function confirmar() {
    if (!oportunidade || !podeConfirmar) return
    mover.mutate(
      {
        id: oportunidade.id,
        // Fim da coluna, como todo movimento pelo menu: o operador escolheu a
        // etapa, não a posição dentro dela.
        destino: { stageId: etapaId, precedeId: null, lostReasonId: motivoId },
      },
      { onSuccess: onFechar },
    )
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>Marcar como perdida</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        {/* O título do negócio, e não só "esta oportunidade": o diálogo pode ter
            vindo da barra, onde a linha selecionada some de vista ao abrir. */}
        <p className="text-sm text-muted-foreground">
          <span className="font-display font-semibold text-foreground">
            {oportunidade?.name ?? ''}
          </span>{' '}
          sai de <span className="text-foreground">{oportunidade?.stageName ?? ''}</span>.
        </p>

        {etapasDePerda.length > 1 ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={campoEtapa}>Etapa</Label>
            <select
              id={campoEtapa}
              className="flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
              value={etapaId}
              onChange={(e) => setEtapaId(e.target.value)}
            >
              <option value="">Escolha a etapa</option>
              {etapasDePerda.map((etapa) => (
                <option key={etapa.id} value={etapa.id}>
                  {etapa.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <Label htmlFor={campoMotivo}>Motivo da perda</Label>
          <select
            id={campoMotivo}
            className="flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
            disabled={motivos.isPending}
            value={motivoId}
            // Sem `autoFocus` (o lint proíbe, e com razão: foco automático
            // sequestra o leitor de tela do início do diálogo). O `Dialog` do
            // react-aria já leva o foco para o primeiro controle ao abrir —
            // aqui, a etapa quando ela existe, senão o motivo.
            onChange={(e) => setMotivoId(e.target.value)}
          >
            {/* Carregando não pode parecer "não há motivo": o select vazio e
                silencioso mandaria o operador cadastrar o que já existe. */}
            <option value="">{motivos.isPending ? 'Carregando…' : 'Escolha o motivo'}</option>
            {lista.map((motivo) => (
              <option key={motivo.id} value={motivo.id}>
                {motivo.name}
              </option>
            ))}
          </select>
        </div>

        {!motivos.isPending && lista.length === 0 ? (
          // Catálogo vazio é o único caso em que a perda não tem como ser
          // registrada. Dizer "escolha o motivo" numa lista vazia deixaria o
          // operador preso; o caminho para destravar é o cadastro.
          <p className="text-sm text-muted-foreground">
            Nenhum motivo ativo cadastrado.{' '}
            <Link to="/crm/motivos" className="underline underline-offset-2">
              Cadastre em Motivos de Perda
            </Link>
            .
          </p>
        ) : null}

        <ErroDeGravacao erro={mover.error} mensagem="Falha ao marcar como perdida." />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        {/* `destructive` porque a ação FECHA o negócio: o servidor grava
            `closedAt` e o cartão sai do fluxo aberto. Reabrir é possível (e
            limpa o motivo), mas não é desfazer — a data de fechamento
            aconteceu. */}
        <Button type="button" variant="destructive" onClick={confirmar} disabled={!podeConfirmar}>
          Marcar como perdida
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
