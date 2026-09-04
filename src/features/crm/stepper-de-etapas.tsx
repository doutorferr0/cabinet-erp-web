import type { CrmStageDto } from '@/api/gerado'
import { Button } from '@/components/ui/button'
import { type Oportunidade, useEstagios, useMoverOportunidade } from '@/data/crm-api'
import { mensagemDoErro } from '@/lib/erros'
import { cn } from '@/lib/utils'
import { Check, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { PerderOportunidadeDialog } from './perder-oportunidade-dialog'

/**
 * O ANDAMENTO DA OPORTUNIDADE — a mesma etapa que o quadro mostra como coluna,
 * na ficha, como fita de passos (a statusbar do Odoo).
 *
 * ## Por que a etapa aparece DUAS vezes na tela
 *
 * O formulário já tem um `<select>` de etapa, e ele continua onde está: os dois
 * gestos são diferentes e escrevem por caminhos diferentes.
 *
 * - **A fita** é `PATCH /api/crm/opportunities/{id}/stage` — o mesmo movimento
 *   do quadro, que reinicia `stageChangedAt` e grava/limpa `closedAt`. Age
 *   sozinha, na hora, sem passar pelo `Gravar` do cadastro.
 * - **O `<select>`** viaja no `PUT` do registro inteiro, junto com título,
 *   valor e contato — é a correção de quem está editando a ficha, não o
 *   andamento do negócio.
 *
 * Esconder o `<select>` por causa da fita apagaria a correção; esconder a fita
 * por causa do `<select>` obrigaria a gravar a ficha inteira para mover um
 * negócio. O que NÃO pode existir é a fita escrevendo pelo `PUT`: ela perderia
 * a reinicialização da contagem de tempo parado e o quadro passaria a mostrar
 * um cartão que ninguém moveu como recém-chegado.
 *
 * ## A próxima ação é UMA, e tem nome
 *
 * `Avançar para <próxima etapa>` diz o destino no rótulo em vez de "Avançar".
 * O operador que não decorou o funil não precisa abrir o quadro para saber para
 * onde o botão o leva — e é a mesma frase que ele leria na coluna vizinha.
 *
 * **Perda não é o próximo passo**: ela é ação separada, com diálogo, porque o
 * contrato exige `lostReasonId` e porque perder não é a continuação natural do
 * fluxo. A próxima etapa PULA as etapas de perda por isso: numa configuração
 * em que "Perdido" tem `sort` entre duas etapas abertas, `Avançar` mandaria o
 * negócio para a perda sem motivo — e o servidor responderia 400 a um clique
 * que a tela ofereceu.
 */

/**
 * A próxima etapa ABERTA (ou a de ganho), a partir da atual.
 *
 * Exportada porque é a regra que o rótulo do botão promete, e teste que a
 * exercite pela tela inteira não distingue "não há próxima" de "o botão não
 * apareceu por outra razão".
 */
export function proximaEtapa(
  etapas: readonly CrmStageDto[],
  etapaAtualId: string | null,
): CrmStageDto | null {
  const ordenadas = [...etapas].sort((a, b) => a.sort - b.sort)
  const indice = ordenadas.findIndex((e) => e.id === etapaAtualId)
  // Etapa desconhecida (ou ausente): o próximo passo é a primeira do funil —
  // a mesma regra do servidor quando o `stageId` não vem na criação.
  const seguintes = indice < 0 ? ordenadas : ordenadas.slice(indice + 1)
  return seguintes.find((etapa) => !etapa.isLost) ?? null
}

export function StepperDeEtapas({
  oportunidade,
  readOnly = false,
}: {
  oportunidade: Oportunidade
  readOnly?: boolean
}) {
  const etapas = useEstagios(oportunidade.funilId)
  const mover = useMoverOportunidade()
  const [perdaAberta, setPerdaAberta] = useState(false)

  const lista = [...(etapas.data ?? [])].sort((a, b) => a.sort - b.sort)
  const atual = lista.find((etapa) => etapa.id === oportunidade.etapaId) ?? null
  const etapasDePerda = lista.filter((etapa) => etapa.isLost)
  const proxima = proximaEtapa(lista, oportunidade.etapaId)

  /**
   * A fita mostra o FLUXO — as etapas abertas e a de ganho.
   *
   * As de perda ficam de fora enquanto o negócio não está numa delas: são
   * saídas laterais, não degraus, e desenhá-las na linha diria que todo negócio
   * passa por "Perdido" antes de fechar. Quando o cartão ESTÁ perdido, a etapa
   * entra no fim — a fita tem de dizer onde o registro está, sempre.
   */
  const passos = lista.filter((etapa) => !etapa.isLost || etapa.id === oportunidade.etapaId)
  const indiceAtual = passos.findIndex((etapa) => etapa.id === oportunidade.etapaId)

  // Sem etapa nenhuma configurada não há andamento a mostrar. A tela do funil
  // já manda configurar; repetir o recado na ficha seria dizer duas vezes o que
  // o operador não pode resolver daqui.
  if (etapas.isPending || passos.length === 0) return null

  function avancar() {
    if (!proxima) return
    // Fim da coluna, como todo movimento que não escolhe posição: quem escolhe
    // posição é o menu do cartão, no quadro.
    mover.mutate({ id: oportunidade.id, destino: { stageId: proxima.id, precedeId: null } })
  }

  function irPara(etapa: CrmStageDto) {
    if (etapa.id === oportunidade.etapaId) return
    // Etapa de perda pela fita cai no MESMO diálogo do quadro: o motivo é dado
    // novo, e só o operador o tem.
    if (etapa.isLost) {
      setPerdaAberta(true)
      return
    }
    mover.mutate({ id: oportunidade.id, destino: { stageId: etapa.id, precedeId: null } })
  }

  return (
    <section
      aria-label="Andamento do negócio"
      // Card quieto — a fita é um objeto sobre a página, não uma região dela, e
      // ela vem ANTES do formulário: o operador olha onde o negócio está antes
      // de olhar o que ele é.
      className="flex flex-col gap-[var(--s-3)] rounded-[var(--r-panel)] border border-[var(--n-300)] bg-[var(--n-0)] p-[var(--s-4)] shadow-[var(--hard-soft)]"
    >
      <div className="flex flex-wrap items-center gap-[var(--s-4)]">
        <nav aria-label="Etapas do funil" className="min-w-0 flex-1">
          <ol className="flex flex-wrap items-center gap-[var(--s-1)]">
            {passos.map((etapa, i) => {
              const eAtual = etapa.id === oportunidade.etapaId
              const cumprida = indiceAtual >= 0 && i < indiceAtual

              /**
               * O passo de AGORA não é botão — é onde o registro está.
               *
               * Era um `<Button disabled>`, e o `disabled` trazia junto a pele de
               * desabilitado do sistema (superfície rebaixada): medido na tela, o
               * passo atual ficava CINZA-CLARO, o mais apagado da fita, quando é
               * o único que precisa gritar. Botão desligado também promete um
               * clique que não existe. Um `<span>` diz a verdade: aqui não há
               * nada a acionar.
               */
              if (eAtual) {
                return (
                  <li key={etapa.id}>
                    <span
                      aria-current="step"
                      // A tinta do passo atual vai por `style` porque `.t-ui`
                      // declara `color` fora do layer de utilities: com
                      // `text-[var(--n-0)]` o texto ficava PRETO sobre o
                      // preenchimento preto — invisível. Medido na captura.
                      style={{
                        color: etapa.isWon || etapa.isLost ? 'var(--n-900)' : 'var(--n-0)',
                      }}
                      className={cn(
                        't-ui flex h-7 items-center rounded-[var(--r-chip)] px-[var(--s-3)]',
                        // Tinta cheia com papel invertido — como o resto do
                        // sistema diz "é aqui". O primário chartreuse fica livre
                        // para a AÇÃO, que é o botão à direita.
                        'bg-[var(--n-900)]',
                        // Ganho e perda são etapas de outra natureza, e a fita
                        // diz qual: tint com contorno de tinta, não o preenchido.
                        etapa.isWon && 'bg-[var(--tint-mint)] ring-1 ring-[var(--n-900)]',
                        etapa.isLost && 'bg-[var(--tint-rose)] ring-1 ring-[var(--n-900)]',
                      )}
                    >
                      {etapa.name}
                    </span>
                  </li>
                )
              }

              return (
                <li key={etapa.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    // Passo é NAVEGAÇÃO de estado, não link: mover escreve no
                    // servidor.
                    disabled={readOnly || mover.isPending}
                    onClick={() => irPara(etapa)}
                    className={cn(
                      't-ui h-7 rounded-[var(--r-chip)] px-[var(--s-3)]',
                      // A marca (✓) e a tinta separam cumprido de por-vir sem
                      // depender de uma pista só.
                    )}
                    style={{ color: cumprida ? 'var(--n-500)' : 'var(--n-700)' }}
                  >
                    {cumprida ? <Check className="size-3.5" aria-hidden="true" /> : null}
                    {etapa.name}
                  </Button>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="flex items-center gap-[var(--s-2)]">
          {/* A PRÓXIMA AÇÃO da ficha (D19): uma só, com o destino no rótulo.
              Some quando não há para onde ir — negócio ganho não avança, e
              botão que não faz nada ensina a desconfiar dos outros. */}
          {proxima && !readOnly ? (
            <Button type="button" onClick={avancar} disabled={mover.isPending}>
              Avançar para {proxima.name}
            </Button>
          ) : null}
          {etapasDePerda.length > 0 && !readOnly && !atual?.isLost ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setPerdaAberta(true)}
              disabled={mover.isPending}
            >
              <TrendingDown aria-hidden="true" />
              Marcar perdida
            </Button>
          ) : null}
        </div>
      </div>

      {mover.isError ? (
        <p role="alert" className="t-meta" style={{ color: 'var(--bad)' }}>
          {mensagemDoErro(mover.error, 'Falha ao mover a oportunidade.')}
        </p>
      ) : null}

      <PerderOportunidadeDialog
        aberto={perdaAberta}
        oportunidade={{
          id: oportunidade.id,
          name: oportunidade.nome,
          stageName: atual?.name ?? '',
        }}
        etapasDePerda={etapasDePerda}
        onFechar={() => setPerdaAberta(false)}
      />
    </section>
  )
}
