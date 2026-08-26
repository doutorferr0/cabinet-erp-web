import type { OrderParticipantDto } from '@/api/gerado'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Nome } from '@/components/cabinet/nome'
import { Painel } from '@/components/cabinet/painel'
import { Skeleton } from '@/components/ui/skeleton'
import { useParticipantesDoPedido } from '@/data/pedidos-venda-api'
import { formatPercent } from '@/lib/formatters'

/**
 * A PARTICIPAÇÃO do pedido — quem responde pela venda, e com quanto.
 *
 * `VendaAtendente` e `VendaIndicacao` do legado, que o contrato publica como um
 * sub-recurso só (`GET /api/orders/{id}/participants`). São N por documento, e
 * isso é o caso COMUM e não a exceção: 37.707 linhas de atendente para 34.136
 * vendas.
 *
 * ## Por que ela existe nesta tela
 *
 * Porque o `Consultor(a)` do cabeçalho vem daqui. O contrato é explícito: o
 * `salespersonId` singular do documento é o atendente `isPrincipal` desta
 * lista, "não um segundo lugar onde se grava". Sem o painel, o campo do
 * cabeçalho seria um nome sem procedência — e a pergunta que o operador faz
 * ("por que este e não o outro?") não teria onde ser respondida.
 *
 * ## Monta FORA do `<form>` do documento
 *
 * Mesmo arranjo do `PainelDeAtividades`: a participação tem gravação própria
 * (`PUT .../participants`) e não entra no `PUT` do pedido. Dentro do formulário
 * os controles dela disputariam o submit — e um `Gravar` do documento mandaria
 * junto uma grade que o corpo dele não tem.
 *
 * ## É LEITURA, e a ausência da edição é decisão medida
 *
 * A escrita existe no contrato e o backend a serve. O que não existe é a
 * metade de que ela depende: o CADASTRO de faixas da pessoa
 * (`/api/employees/{id}/commission-tiers`, `/api/partners/{id}/commission-tiers`),
 * que nenhuma tela mostra. O servidor copia o perfil de HOJE para dentro de
 * cada linha nova e o congela ali; editar a grade sem ver o perfil seria
 * escolher quanto alguém ganha às cegas, e o erro só apareceria no fechamento,
 * quando o título já nasceu. A grade editável é a aba Participação do trilho de
 * comissões (G8), que nasce com o cadastro de faixas do lado.
 *
 * Trocar o PROFISSIONAL principal, aliás, não passaria por aqui nem com a
 * escrita pronta: o próprio contrato responde 409 e manda usar
 * `POST .../professional`, que é o botão `Transferir` da barra do ciclo — a
 * troca tem data e justificativa, e a trilha vive dela.
 */

const ROTULO_DO_PAPEL: Record<OrderParticipantDto['role'], string> = {
  attendant: 'Atendente',
  professional: 'Profissional',
}

/**
 * A COSTURA do par local, dita em voz alta — mesmo arranjo de
 * `cobertura-do-colaborador.tsx`.
 *
 * Com `VITE_API_PROXY`, a família `/api/orders` atravessa para o backend e este
 * sub-caminho **não**: `rotas-do-backend.ts` mantém as treze de comissões (G8)
 * fora da passagem. O documento então vem do Postgres, com uuid do servidor, e
 * a participação é procurada no mock, que não conhece esse id — 404, e a tela
 * o desenharia como "não carregou", que é falha de rede e não é o que houve.
 *
 * **Sem o proxy não existe divergência**: o MSW responde as duas pontas e os
 * ids são os mesmos. É o caso do site público, e avisar ali inventaria um
 * defeito que aquele ambiente não tem — aviso que aparece quando não devia é o
 * que ensina o operador a ignorar avisos.
 *
 * Some quando a lista de passagem receber as duas operações. O pré-requisito
 * do lado do servidor JÁ caiu — a Fase B da api#118 ligou `rotasDeComissoes()`
 * em `src/core/http/servidor.ts` —, e o que falta é a MEDIÇÃO ao vivo que
 * aquele arquivo exige de quem acrescenta rota: o bloco das treze foi declarado
 * junto e se re-mede junto, com o par local de pé.
 */
function CoberturaDaParticipacao() {
  if (!import.meta.env.VITE_API_PROXY) return null

  return (
    <AvisoDeCobertura>
      <p>
        Com o servidor real ligado, o pedido vem <strong>dele</strong> e a participação ainda vem da{' '}
        <strong>base de demonstração</strong>. As duas não se encontram, então esta lista pode
        aparecer vazia ou não carregar — não é falha de rede.
      </p>
    </AvisoDeCobertura>
  )
}

export function ParticipacaoDoPedido({ pedidoId }: { pedidoId: string }) {
  // Documento que ainda não existe não tem participação: o id vazio é o
  // `Incluir`, e a lista dele seria um 404 com cara de "ninguém participa".
  const query = useParticipantesDoPedido(pedidoId, Boolean(pedidoId))
  if (!pedidoId) return null

  const linhas = query.data?.rows ?? []
  const total = query.data?.total ?? 0

  return (
    <Painel titulo="Participação" modulo="vendas">
      <CoberturaDaParticipacao />
      {query.isPending ? (
        <div className="flex flex-col gap-2">
          {['p1', 'p2'].map((chave) => (
            <Skeleton key={chave} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <FalhaDoPainel
          titulo="A participação não carregou"
          erro={query.error}
          aoTentar={() => query.refetch()}
        />
      ) : linhas.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ninguém lançado neste pedido. Venda de balcão sem consultor e sem indicação é caso
          legítimo — o cabeçalho fica em branco por isso, não por falta de dado.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map((linha) => (
            <LinhaDeParticipacao key={linha.id} participacao={linha} />
          ))}
        </ul>
      )}

      {total > linhas.length ? (
        <p className="text-muted-foreground text-[0.75rem]">
          Mostrando {linhas.length} de {total}.
        </p>
      ) : null}
    </Painel>
  )
}

/**
 * Uma linha da grade.
 *
 * O `personName` é o nome que a grade mostra — o contrato o publica justamente
 * para a tela não ter de escolher entre `employeeName` e `partnerName` a cada
 * linha. O par id+nome específico continua ao lado, e é ele que se casa com o
 * cabeçalho.
 *
 * As FAIXAS aparecem contadas, não abertas: elas são o que a pessoa ganha por
 * grupo de produto, congelado na emissão, e abrir N linhas de percentual dentro
 * de uma tela de VENDA poria dinheiro de comissão no meio do documento. O
 * número diz que existem; a leitura delas é da tela de comissões.
 */
function LinhaDeParticipacao({ participacao }: { participacao: OrderParticipantDto }) {
  const faixas = participacao.tiers?.length ?? 0

  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card border-2 bg-card px-3 py-2">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-muted-foreground">
        {ROTULO_DO_PAPEL[participacao.role]}
      </span>
      <Nome className="flex-1">{participacao.personName}</Nome>
      {participacao.isPrincipal ? (
        // O `Principal` do legado, e um por papel no máximo. É ele que responde
        // por `salespersonId` (atendente) e por `professionalId` (profissional),
        // então a marca não é decoração: é a ligação com o cabeçalho.
        <span className="rounded-sm border-2 px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.06em]">
          Principal
        </span>
      ) : null}
      {/* Percentual com 4 casas implícitas (10000 = 1%) — a escala do contrato. */}
      <span className="tabular-nums text-sm">{formatPercent(participacao.percent)} %</span>
      {faixas > 0 ? (
        <span className="text-[0.75rem] text-muted-foreground">
          {faixas} {faixas === 1 ? 'faixa' : 'faixas'} por grupo
        </span>
      ) : null}
    </li>
  )
}
