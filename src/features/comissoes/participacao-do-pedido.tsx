import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { FormGrid } from '@/components/cabinet/form-grid'
import { ComboDeEscolha } from '@/components/cabinet/lookup-combo'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  type FaixaCongelada,
  type LinhaDeParticipacao,
  type ParticipanteDoPedido,
  ROTULO_DO_PAPEL,
  motivoDaRecusa,
  useGravarParticipantes,
  useParticipantes,
} from '@/data/comissoes-api'
import { useColaboradoresParaEscolha } from '@/data/crm-api'
import { useEspecificadorOptions } from '@/data/parceiros-api'
import { avisar } from '@/lib/avisos'
import { formatDateBR, formatPercent } from '@/lib/formatters'
import { Loader2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

/**
 * A PARTICIPAÇÃO DO PEDIDO — quem ganha por esta venda, com gravação PRÓPRIA.
 *
 * ## N pessoas, e isso é o caso comum
 *
 * `VendaAtendente` tem 37.707 linhas para 34.136 vendas no legado: mais de um
 * atendente por venda é o normal, não a exceção. O `salespersonId` do documento
 * continua existindo e passa a ser LEITURA — o atendente `isPrincipal` desta
 * grade —, não um segundo lugar onde se grava.
 *
 * ## Por que não é campo do formulário do pedido
 *
 * Participação é sub-recurso no contrato (`/api/orders/{id}/participants`), com
 * `PUT` próprio, e não entra no corpo do `PUT` do documento. Uma grade ligada ao
 * formulário pareceria gravar junto com o `Gravar` do rodapé e não gravaria — o
 * mesmo arranjo de `ContatosDoParceiro` e `PainelDeAtividades`, pela mesma razão.
 *
 * ## O ECO DE `id` — a razão de esta tela existir do jeito que existe
 *
 * O `PUT` é INTEGRAL: ele substitui o conjunto. Cada linha que já existe volta
 * com o `id` que veio da leitura, e é esse eco que diz ao servidor "esta linha é
 * a MESMA" — as faixas congeladas nela ficam onde estão. Linha SEM `id` é nova,
 * e é só nela que o servidor copia o perfil de HOJE.
 *
 * Sem o eco, corrigir um percentual num pedido de março regravaria as faixas
 * dele com o perfil de agosto, e a apuração daquele mês mudaria de valor sozinha.
 * É o defeito que o congelamento existe para impedir, entrando pela porta da
 * escrita — e é por isso que o `id` viaja NA LINHA e nunca é recriado aqui.
 */

type Papel = LinhaDeParticipacao['papel']

interface EstadoDoFormulario {
  participantes: LinhaDeParticipacao[]
}

/**
 * As faixas congeladas, por participação — leitura pura, fora do formulário.
 *
 * Elas não se editam e não viajam na escrita. Dentro do estado do formulário
 * virariam campo que o operador pode sujar e que nada grava; aqui são o que
 * são: o retrato do perfil no dia em que a pessoa entrou no documento.
 */
function FaixasCongeladas({ nome, faixas }: { nome: string; faixas: readonly FaixaCongelada[] }) {
  if (faixas.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        <strong>{nome}</strong> não tem faixa por grupo neste documento — vale o percentual geral da
        linha.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="font-medium text-sm">{nome}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Grupo de Produto</TableHead>
            <TableHead>Condição</TableHead>
            <TableHead className="text-right">Participação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faixas.map((faixa) => (
            <TableRow key={`${faixa.grupoId}-${faixa.operador}-${faixa.descontoPercentual}`}>
              {/* O NOME congelado é o que se lê; o id é o que casa. Renomear o
                  grupo no catálogo não reescreve apuração fechada. */}
              <TableCell>{faixa.grupoNome}</TableCell>
              <TableCell className="tabular-nums">
                Desconto {faixa.operador} {formatPercent(faixa.descontoPercentual)}%
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(faixa.percentual)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * O combo que escolhe a pessoa, com o botão que a inclui na grade.
 *
 * A pessoa é escolhida ANTES de a linha existir, e não numa célula da grade,
 * porque ela é o que a linha É: papel e pessoa juntos decidem por qual caminho a
 * apuração paga. Célula editável de pessoa deixaria trocar quem ganha mantendo o
 * `id` da participação — e o eco de `id` diria ao servidor "é a mesma linha",
 * preservando as faixas congeladas de OUTRA pessoa.
 */
function IncluirParticipante({
  papel,
  options,
  carregando,
  erro,
  truncada,
  onIncluir,
}: {
  papel: Papel
  options: readonly { id: string; nome: string }[]
  carregando: boolean
  erro: boolean
  truncada: boolean
  onIncluir: (escolha: { id: string; nome: string }) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const id = useId()

  const opcao = options.find((o) => o.id === escolhido)

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-xs" htmlFor={id}>
          {ROTULO_DO_PAPEL[papel]}
        </label>
        <ComboDeEscolha
          label={ROTULO_DO_PAPEL[papel]}
          options={options}
          truncada={truncada}
          carregando={carregando}
          erro={erro}
          value={escolhido}
          onChange={setEscolhido}
          id={id}
          open={aberto}
          onOpenChange={setAberto}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!opcao}
        onClick={() => {
          if (!opcao) return
          onIncluir(opcao)
          setEscolhido(null)
        }}
      >
        Incluir {ROTULO_DO_PAPEL[papel].toLowerCase()}
      </Button>
    </div>
  )
}

export function ParticipacaoDoPedido({
  pedidoId,
  readOnly = false,
}: {
  /** `null` no `Incluir`: sem documento gravado não há sub-recurso. */
  pedidoId: string | null
  readOnly?: boolean
}) {
  const query = useParticipantes(pedidoId)
  const gravar = useGravarParticipantes(pedidoId ?? '')

  const colaboradores = useColaboradoresParaEscolha()
  const profissionais = useEspecificadorOptions()

  const form = useForm<EstadoDoFormulario>({ defaultValues: { participantes: [] } })

  useEffect(() => {
    if (!query.data) return
    form.reset({ participantes: query.data.map(semFaixas) })
  }, [query.data, form])

  if (pedidoId === null || pedidoId === '') {
    return (
      <p className="text-muted-foreground text-sm">
        A participação entra depois de gravar o pedido — ela pende do documento, que ainda não
        existe.
      </p>
    )
  }

  function incluir(papel: Papel, escolha: { id: string; nome: string }) {
    const atuais = form.getValues('participantes')
    // Pessoa que já participa não entra duas vezes: no legado a pessoa está na
    // PK, e a segunda linha seria 400 do servidor depois de o operador ter
    // digitado um percentual nela.
    const jaEsta = atuais.some((l) =>
      papel === 'attendant' ? l.colaboradorId === escolha.id : l.parceiroId === escolha.id,
    )
    if (jaEsta) {
      avisar(`${escolha.nome} já participa deste pedido.`)
      return
    }

    form.setValue(
      'participantes',
      [
        ...atuais,
        {
          // SEM `id`: linha nova é onde o servidor copia o perfil de hoje.
          id: null,
          papel,
          colaboradorId: papel === 'attendant' ? escolha.id : null,
          parceiroId: papel === 'professional' ? escolha.id : null,
          nome: escolha.nome,
          // `null` = "use o perfil". Nascer com zero faria toda inclusão pagar
          // nada, que é o oposto do que o operador quis dizer ao incluir alguém.
          percentual: null,
          // O primeiro do papel nasce principal: documento sem principal não
          // responde por `salespersonId`, e marcar depois é passo que se esquece.
          principal: atuais.every((l) => l.papel !== papel || !l.principal),
          vigenciaDe: null,
        },
      ],
      { shouldDirty: true },
    )
  }

  async function aoGravar() {
    const linhas = form.getValues('participantes')
    await gravar.mutateAsync(umPrincipalPorPapel(linhas))
    avisar('Participação gravada.')
  }

  const recusa = motivoDaRecusa(gravar.error)
  const doServidor = query.data ?? []

  return (
    <div className="flex flex-col gap-3">
      {query.isPending ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Carregando a participação…
        </p>
      ) : (
        <FormProvider {...form}>
          {readOnly ? null : (
            <div className="flex flex-wrap gap-4">
              <IncluirParticipante
                papel="attendant"
                // O MESMO `GET /api/employees` que o combo de responsável das
                // atividades usa: o `employeeId` da participação é
                // `EmployeeDto.id` por definição do contrato, e montar a lista
                // de outro lugar casaria id de origens diferentes.
                options={(colaboradores.data ?? []).map((c) => ({ id: c.id, nome: c.name }))}
                carregando={colaboradores.isPending}
                erro={colaboradores.isError}
                truncada={false}
                onIncluir={(escolha) => incluir('attendant', escolha)}
              />
              <IncluirParticipante
                papel="professional"
                options={profissionais.options}
                carregando={profissionais.carregando}
                erro={profissionais.erro}
                truncada={profissionais.truncada}
                onIncluir={(escolha) => incluir('professional', escolha)}
              />
            </div>
          )}
          <FormGrid
            name="participantes"
            hideAdd
            columns={[
              { key: 'nome', label: 'Pessoa', type: 'computed', compute: (row) => texto(row.nome) },
              {
                key: 'papel',
                label: 'Papel',
                type: 'computed',
                compute: (row) => ROTULO_DO_PAPEL[(row.papel as Papel) ?? 'attendant'] ?? '—',
              },
              // `null` no percentual NÃO é zero: é "use o perfil". A célula em
              // branco é, portanto, dado — e o rodapé diz isso em voz alta,
              // porque branco que significa alguma coisa não se adivinha.
              { key: 'percentual', label: 'Particip. %', type: 'percent' },
              { key: 'principal', label: 'Principal', type: 'check' },
              {
                key: 'vigenciaDe',
                label: 'Vigência',
                type: 'computed',
                compute: (row) => formatDateBR(row.vigenciaDe as string | null) || '—',
              },
            ]}
            newRow={{ id: null, papel: 'attendant', nome: '', percentual: null, principal: false }}
          />
        </FormProvider>
      )}

      <p className="text-muted-foreground text-sm">
        Participação em branco não é zero: é <strong>use o perfil</strong> — o servidor lê a faixa
        geral do cadastro da pessoa e a congela na linha. Zero digitado é participação sem comissão.
      </p>

      {doServidor.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="font-medium text-sm">Faixas congeladas neste pedido</p>
          {doServidor.map((p) => (
            <FaixasCongeladas key={p.id ?? p.nome} nome={p.nome} faixas={p.faixas} />
          ))}
        </div>
      ) : null}

      {recusa ? <AvisoDeCobertura>{recusa}</AvisoDeCobertura> : null}

      {readOnly ? null : (
        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={aoGravar} disabled={gravar.isPending}>
            {gravar.isPending ? 'Gravando…' : 'Gravar participação'}
          </Button>
          <p className="text-muted-foreground text-sm">
            A participação tem gravação própria — o <strong>Gravar</strong> do rodapé não a leva.
          </p>
        </div>
      )}
    </div>
  )
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

/** A leitura sem as faixas — o que o formulário edita. */
function semFaixas(participante: ParticipanteDoPedido): LinhaDeParticipacao {
  const { faixas: _faixas, ...linha } = participante
  return linha
}

/**
 * UM PRINCIPAL POR PAPEL — a regra do CONJUNTO, aplicada na saída.
 *
 * O contrato responde 400 a duas linhas do mesmo papel com `isPrincipal`, e a
 * grade tem uma caixa por linha: marcar a segunda sem desmarcar a primeira é um
 * clique. Aplicar a regra aqui faz o estado inválido não chegar ao servidor — e
 * o que vale é a ÚLTIMA marcada, que é o que o operador quis dizer ao marcá-la.
 *
 * Não é validação duplicada: a autoridade continua sendo o servidor, e o 400
 * dele continua sendo mostrado. É a diferença entre um rádio e um teste que
 * reprova dois rádios marcados.
 */
export function umPrincipalPorPapel(linhas: readonly LinhaDeParticipacao[]): LinhaDeParticipacao[] {
  const ultimoPrincipal = new Map<Papel, number>()
  linhas.forEach((linha, indice) => {
    if (linha.principal) ultimoPrincipal.set(linha.papel, indice)
  })

  return linhas.map((linha, indice) => ({
    ...linha,
    principal: ultimoPrincipal.get(linha.papel) === indice,
  }))
}
