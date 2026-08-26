import { ProblemType } from '@/api/gerado'
import type { PartnerDto } from '@/api/gerado'
import { Nome } from '@/components/cabinet/nome'
import { Ornamento } from '@/components/cabinet/ornamento'
import { SearchDialog } from '@/components/cabinet/search-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { data } from '@/data'
import { OBSERVACAO_MAX } from '@/data/cancelamento-de-documento'
import { useReadOnlyPorPapel } from '@/data/papeis'
import {
  type PedidoDeVenda,
  useConcluirPedidoDeVenda,
  useHistoricoDeProfissional,
  useRegistrarRetornoDaDemonstracao,
  useTransferirProfissional,
} from '@/data/pedidos-venda-api'
import { type FrasesDeRecusa, mensagemDaRecusa } from '@/lib/erros'
import { formatDateBR } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle2, History, PackageCheck, UserCog } from 'lucide-react'
import { useId, useState } from 'react'

/**
 * AS AÇÕES DO CICLO DO PEDIDO — o que acontece com o documento DEPOIS de ele
 * existir, e que nenhum `PUT` faz.
 *
 * Concluir, registrar o retorno da demonstração e transferir a indicação são
 * caminhos PRÓPRIOS no contrato, e é o servidor quem decide se a transição
 * pode acontecer. A tela não repete a regra dele — ela mostra o botão, manda o
 * pedido e traduz a recusa. Espelhar a validação aqui criaria duas autoridades
 * sobre a mesma transição, e a fraca (esta) responderia primeiro.
 *
 * ## Por que os botões somem em vez de desabilitar
 *
 * Botão desabilitado promete uma ação que existe em algum estado que o operador
 * tem de adivinhar. Aqui o estado JÁ está na folha ("Pedido concluído", "Peça
 * ainda fora"), e a ação que não cabe agora simplesmente não é oferecida. A
 * exceção é o `Concluir` da demonstração com peça fora: ele aparece, porque a
 * saída — registrar o retorno — está do lado, e escondê-lo esconderia a ligação
 * entre as duas.
 */

/** As duas recusas do `conclude`, e a diferença entre elas é a SAÍDA. */
const RECUSAS: FrasesDeRecusa = {
  [ProblemType['urn:cabinet:erro:transicao-invalida']]:
    'A situação atual não permite esta ação, e ela não volta atrás. Recarregue a folha para ver como o documento está agora.',
  [ProblemType['urn:cabinet:erro:demonstracao-em-aberto']]:
    'A peça da demonstração ainda não voltou. Registre o retorno primeiro — o botão está nesta mesma barra.',
}

/**
 * A tradução mora em `lib/erros.ts`, junto com a única leitura do `type`. O
 * mapa continua aqui: as frases são desta tela, e é por isso que
 * `transicao-invalida` diz "recarregue a folha" aqui e "recarregue a listagem"
 * na revisão do orçamento — mesma URN, saídas diferentes, porque o operador
 * está olhando para telas diferentes.
 */
function recusaDoCiclo(erro: unknown, generica: string): string | null {
  return mensagemDaRecusa(erro, generica, RECUSAS)
}

const colunasProfissional: ColumnDef<PartnerDto>[] = [
  { accessorKey: 'code', header: 'Código' },
  { accessorKey: 'legalName', header: 'Nome' },
  { accessorKey: 'document', header: 'CNPJ/CPF' },
]

export interface AcoesDoCicloProps {
  pedido: PedidoDeVenda
  /**
   * A folha aberta em CONSULTA (`?modo=consulta`).
   *
   * Concluir e transferir não são edição do documento — nenhuma delas passa
   * pelo `PUT` —, mas uma tela que se anuncia como consulta e oferece duas
   * transições irreversíveis mente sobre o que ela é. O histórico fica: é
   * leitura, que é exatamente o que a consulta promete.
   */
  somenteLeitura?: boolean
}

export function AcoesDoCiclo({ pedido, somenteLeitura = false }: AcoesDoCicloProps) {
  const { readOnly: papelSoLe } = useReadOnlyPorPapel('orders')
  const readOnly = papelSoLe || somenteLeitura
  const [confirmandoConclusao, setConfirmandoConclusao] = useState(false)
  const [confirmandoRetorno, setConfirmandoRetorno] = useState(false)
  const [transferindo, setTransferindo] = useState(false)
  const [vendoHistorico, setVendoHistorico] = useState(false)

  const concluir = useConcluirPedidoDeVenda()
  const retornar = useRegistrarRetornoDaDemonstracao()

  // Documento que ainda não existe não tem ciclo: id vazio é o `Incluir`, e
  // concluir o que nem foi gravado não é uma transição, é um 404.
  if (!pedido.id) return null

  const ativo = pedido.situacao === 'active'
  const demoNaRua = pedido.tipo === 'demo' && !pedido.retornoDemonstracao
  const erroConclusao = recusaDoCiclo(concluir.error, 'Não foi possível concluir o pedido.')
  const erroRetorno = recusaDoCiclo(retornar.error, 'Não foi possível registrar o retorno.')

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ativo && !readOnly ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              concluir.reset()
              setConfirmandoConclusao(true)
            }}
          >
            <CheckCircle2 aria-hidden="true" />
            Concluir
          </Button>
          {demoNaRua ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                retornar.reset()
                setConfirmandoRetorno(true)
              }}
            >
              <PackageCheck aria-hidden="true" />
              Registrar retorno
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => setTransferindo(true)}>
            <UserCog aria-hidden="true" />
            Transferir profissional
          </Button>
        </>
      ) : null}
      {/* O histórico é LEITURA, e vale para documento fechado também: a pergunta
          "de quem era esta venda?" aparece depois de concluída, não antes. */}
      <Button type="button" variant="ghost" size="sm" onClick={() => setVendoHistorico(true)}>
        <History aria-hidden="true" />
        Histórico da indicação
      </Button>

      <AlertDialog
        isOpen={confirmandoConclusao}
        onOpenChange={(aberto) => !aberto && setConfirmandoConclusao(false)}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertDialogMedia>
              <Ornamento shape="alerta" tom="info" tamanho={40} />
            </AlertDialogMedia>
            <AlertDialogTitle>Concluir pedido {pedido.numero}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            A venda passa à situação <strong>Concluído</strong> e o documento deixa de ser editável.{' '}
            <strong>Não há como reabrir</strong>: as duas situações finais do pedido são terminais.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erroConclusao ? (
          <p role="alert" className="text-xs text-destructive">
            {erroConclusao}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" onClick={() => setConfirmandoConclusao(false)}>
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={() =>
              concluir.mutate(pedido.id, { onSuccess: () => setConfirmandoConclusao(false) })
            }
            disabled={concluir.isPending}
          >
            {concluir.isPending ? 'Concluindo…' : 'Concluir pedido'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <AlertDialog
        isOpen={confirmandoRetorno}
        onOpenChange={(aberto) => !aberto && setConfirmandoRetorno(false)}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertDialogMedia>
              <Ornamento shape="alerta" tom="info" tamanho={40} />
            </AlertDialogMedia>
            <AlertDialogTitle>A peça voltou?</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            O pedido <Nome peso="forte">{pedido.numero}</Nome> é uma demonstração
            {pedido.prazoDemonstracao ? (
              <>
                , com retorno previsto para{' '}
                <strong>{formatDateBR(pedido.prazoDemonstracao)}</strong>
              </>
            ) : null}
            . Registrar o retorno carimba a data de hoje e libera a conclusão do pedido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erroRetorno ? (
          <p role="alert" className="text-xs text-destructive">
            {erroRetorno}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel type="button" onClick={() => setConfirmandoRetorno(false)}>
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={() =>
              retornar.mutate(pedido.id, { onSuccess: () => setConfirmandoRetorno(false) })
            }
            disabled={retornar.isPending}
          >
            {retornar.isPending ? 'Registrando…' : 'Registrar retorno'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>

      <TransferenciaDeProfissional
        pedido={pedido}
        aberto={transferindo}
        onFechar={() => setTransferindo(false)}
      />
      <HistoricoDaIndicacao
        pedido={pedido}
        aberto={vendoHistorico}
        onFechar={() => setVendoHistorico(false)}
      />
    </div>
  )
}

/**
 * A TRANSFERÊNCIA — escolher o profissional novo e dizer por quê.
 *
 * Duas etapas de propósito: a busca escolhe, o diálogo confirma. Transferir no
 * clique da linha da busca faria a troca acontecer antes de a nota existir — e
 * a nota é a única coisa que responde "por que esta venda mudou de dono?".
 */
function TransferenciaDeProfissional({
  pedido,
  aberto,
  onFechar,
}: { pedido: PedidoDeVenda; aberto: boolean; onFechar: () => void }) {
  const idNota = useId()
  const [escolhido, setEscolhido] = useState<{ id: string; nome: string } | null>(null)
  const [nota, setNota] = useState('')
  const [buscando, setBuscando] = useState(false)
  const transferir = useTransferirProfissional()

  function fechar() {
    setEscolhido(null)
    setNota('')
    transferir.reset()
    onFechar()
  }

  const erro = recusaDoCiclo(transferir.error, 'Não foi possível transferir a venda.')

  return (
    <>
      {/* Fica ABERTO enquanto a busca está por cima. Fechá-lo aqui dispararia
          `onOpenChange(false)` — que é o gesto de desistir — e o `fechar()`
          apagaria o profissional recém-escolhido no caminho de volta. */}
      <Dialog isOpen={aberto} onOpenChange={(open) => !open && fechar()}>
        <DialogHeader>
          <DialogTitle>Transferir venda {pedido.numero}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Indicação atual</Label>
            <p className="text-sm text-muted-foreground">
              {pedido.profissionalExterno || 'Sem profissional indicado.'}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nova indicação</Label>
            <div className="flex items-center gap-2">
              <p className="text-sm">{escolhido?.nome ?? 'Nenhum escolhido.'}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setBuscando(true)}>
                Escolher…
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idNota}>Observação (opcional)</Label>
            <Textarea
              id={idNota}
              rows={2}
              maxLength={OBSERVACAO_MAX}
              value={nota}
              disabled={transferir.isPending}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Por que a venda mudou de profissional…"
            />
          </div>
          {erro ? (
            <p role="alert" className="text-xs text-destructive">
              {erro}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={fechar}>
            Voltar
          </Button>
          <Button
            type="button"
            disabled={!escolhido || transferir.isPending}
            onClick={() => {
              if (!escolhido) return
              transferir.mutate(
                { id: pedido.id, profissionalId: escolhido.id, observacao: nota },
                { onSuccess: fechar },
              )
            }}
          >
            {transferir.isPending ? 'Transferindo…' : 'Transferir'}
          </Button>
        </DialogFooter>
      </Dialog>
      <SearchDialog
        open={buscando}
        onOpenChange={setBuscando}
        title="Busca de Profissional Externo"
        columns={colunasProfissional}
        queryKey={['busca-profissional-transferencia']}
        fetcher={(state) => data.profissionais.list(state, 0)}
        onSelect={(p) => {
          setEscolhido({ id: p.id, nome: p.legalName })
          setBuscando(false)
        }}
      />
    </>
  )
}

/** A trilha — quem indicou, de quando a quando, e a nota da troca. */
function HistoricoDaIndicacao({
  pedido,
  aberto,
  onFechar,
}: { pedido: PedidoDeVenda; aberto: boolean; onFechar: () => void }) {
  const historico = useHistoricoDeProfissional(pedido.id, aberto)
  const linhas = historico.data?.rows ?? []

  return (
    <Dialog isOpen={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogHeader>
        <DialogTitle>Histórico da indicação — pedido {pedido.numero}</DialogTitle>
      </DialogHeader>
      {historico.isPending ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : historico.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar o histórico.
        </p>
      ) : linhas.length === 0 ? (
        // Documento nunca transferido não tem trilha, e isso NÃO é falha: a
        // indicação original é campo do pedido, não linha de histórico.
        <p className="text-sm text-muted-foreground">
          Esta venda nunca foi transferida. A indicação é a que está na folha.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {linhas.map((linha) => (
            <li key={linha.id} className="border-border border-b pb-2 last:border-0">
              <p className="font-medium text-sm">{linha.professionalName ?? '—'}</p>
              <p className="text-muted-foreground text-xs">
                De {formatDateBR(linha.startedAt)}
                {linha.endedAt ? ` até ${formatDateBR(linha.endedAt)}` : ' até hoje'}
              </p>
              {linha.note ? <p className="mt-1 text-sm">{linha.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Fechar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
