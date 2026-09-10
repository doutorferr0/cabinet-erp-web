import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { rotaLiberada } from '@/app/navigation'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { FaixaDeKpi, KpiTile } from '@/components/cabinet/kpi-tile'
import { PageHeader } from '@/components/cabinet/page-header'
import { PainelBoletim } from '@/components/cabinet/painel-boletim'
import { Stamp } from '@/components/cabinet/stamp'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  type Boletim,
  fetchBoletim,
  type LinhaCadastro,
  type LinhaMovimento,
  type LinhaOrdemSemEnvio,
} from '@/data/boletim'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'

/**
 * BOLETIM — tela de entrada (`/`). REFACE 2026-08-09: skin "moldura colorida
 * + leveza" (decisão user 2026-08-07).
 *
 * Diagramação: 4 stat cards → grid modular 1.55:1 (movimento + coluna
 * pendências/cadastros). Painéis com moldura dupla colorida por região:
 * movimento=Boletim laranja · pendência=amarelo-FOCO · cadastros=azul.
 * Interior em papel quadriculado, divisórias pontilhadas, sem zebra.
 * Espécie em cor de texto, valores em mono à direita, total na cor do painel.
 */

/** DINHEIRO — verde; SUBTRAI — vermelho. */
function Valor({ centavos, className }: { centavos: number; className?: string }) {
  return (
    <span
      className={cn('tabular-nums', centavos < 0 ? 'text-destructive' : 'text-money', className)}
    >
      {formatMoneyBRL(centavos)}
    </span>
  )
}

/** Stat card — valor grande na cor do módulo, rótulo em Meta. */
function Apuracao({ dados }: { dados: Boletim }) {
  // A MESMA peça do dashboard (`KpiTile`), e não um card branco próprio: o
  // boletim era a única tela com KPI sem tinta e sem relevo — quatro caixas
  // iguais que não diziam qual número era dinheiro e qual era contagem.
  return (
    <FaixaDeKpi>
      <KpiTile
        rotulo="Orçamentos do dia"
        valor={String(dados.orcamentosDoDia)}
        nota={<Valor centavos={dados.valorOrcadoCentavos} />}
        tint="lilac"
      />
      <KpiTile
        rotulo="Ordens do dia"
        valor={String(dados.ordensDoDia)}
        nota={<Valor centavos={dados.valorOrdenadoCentavos} />}
        tint="sky"
      />
      <KpiTile
        rotulo="Ordens sem envio"
        valor={String(dados.ordensSemEnvio)}
        nota="Data Envio em branco"
        tint="sand"
        alerta={dados.ordensSemEnvio > 0}
      />
      <KpiTile rotulo="Documentos no dia" valor={String(dados.movimento.length)} tint="mint" />
    </FaixaDeKpi>
  )
}

/** Movimento do dia — ledger em papel quadriculado, sem zebra. */
function Movimento({ linhas }: { linhas: LinhaMovimento[] }) {
  const total = linhas.reduce((soma, l) => soma + l.valorCentavos, 0)

  return (
    <div className="overflow-x-auto">
      {/* `table-fixed`: a 1440px o card tem ~530px e a largura de min-content
          das quatro colunas passava disso — a coluna do VALOR saía do card
          (só a tinta dela aparecia). Com layout fixo o nome trunca e o valor
          fica sempre à vista. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="border-dotted border-rule-hair">
            <TableHead className="w-[28%]">Espécie</TableHead>
            <TableHead className="w-[16%]">Número</TableHead>
            <TableHead>Cliente / Fornecedor</TableHead>
            <TableHead className="w-[24%] text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Nenhum documento na data de referência.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {linhas.map((linha) => (
                <TableRow
                  key={`${linha.especie}-${linha.numero}`}
                  className="border-dotted border-rule-hair"
                >
                  <TableCell className="text-modulo">
                    <Link to={linha.href} className="block hover:underline">
                      {linha.especie}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
                    {linha.numero}
                  </TableCell>
                  <TableCell className="truncate" title={linha.contraparte}>
                    {linha.contraparte}
                  </TableCell>
                  <TableCell className="bg-zone-money text-right">
                    <Valor centavos={linha.valorCentavos} />
                  </TableCell>
                </TableRow>
              ))}
              {/* Total sem barra preta — a cor do painel basta. */}
              <TableRow className="border-dotted border-rule-hair">
                <TableCell colSpan={2} />
                <TableCell className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  Total do dia
                </TableCell>
                <TableCell className="bg-zone-money text-right">
                  <Valor centavos={total} className="text-lg font-extrabold" />
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/** Ordens paradas — tabela sem zebra, divisórias pontilhadas. */
function SemEnvio({ linhas }: { linhas: LinhaOrdemSemEnvio[] }) {
  if (linhas.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma ordem parada.</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-dotted border-rule-hair">
            <TableHead>Código</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Data Ordem</TableHead>
            <TableHead className="text-right">Parada há</TableHead>
            <TableHead>Envio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => (
            <TableRow key={linha.codigo} className="border-dotted border-rule-hair">
              <TableCell className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
                <Link to={linha.href} className="block hover:underline">
                  {linha.codigo}
                </Link>
              </TableCell>
              <TableCell className="truncate">{linha.fornecedor}</TableCell>
              <TableCell className="tabular-nums">{formatDateBR(linha.dataOrdem)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {linha.diasParado} {linha.diasParado === 1 ? 'dia' : 'dias'}
              </TableCell>
              <TableCell>
                <Stamp tom={linha.diasParado >= 3 ? 'void' : 'open'} label="Em branco" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Cadastros — tabela sem zebra, divisórias pontilhadas. */
function Cadastros({ linhas }: { linhas: LinhaCadastro[] }) {
  const { tem } = useRecursosDaEmpresa()
  const visiveis = linhas.filter((linha) => rotaLiberada(linha.href, tem))

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-dotted border-rule-hair">
            <TableHead>Cadastro</TableHead>
            <TableHead className="text-right">Registros</TableHead>
            <TableHead className="text-right">Desativados</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.map((linha) => (
            <TableRow key={linha.nome} className="border-dotted border-rule-hair">
              <TableCell>
                <Link to={linha.href} className="block hover:underline">
                  {linha.nome}
                </Link>
              </TableCell>
              {linha.total === null ? (
                <TableCell colSpan={2} className="text-right text-sm text-muted-foreground italic">
                  Indisponível
                </TableCell>
              ) : (
                <>
                  <TableCell className="text-right tabular-nums">{linha.total}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {linha.inativos === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        title={
                          linha.inativosParcial
                            ? 'Piso: a consulta não cobre todos os registros, pode haver mais inativos'
                            : undefined
                        }
                      >
                        {linha.inativos}
                        {linha.inativosParcial ? '+' : ''}
                      </span>
                    )}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Cinco linhas de esqueleto. */
function BoletimSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((chave) => (
        <Skeleton key={chave} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function BoletimTela() {
  const query = useQuery({ queryKey: ['boletim'], queryFn: () => fetchBoletim() })
  const dados = query.data

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titulo="Boletim" subtitulo="Movimento do dia">
        {dados ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Data de referência
            </span>
            <span className="font-mono text-xl font-semibold tracking-[-0.01em] tabular-nums">
              {dados.dataReferenciaBR}
            </span>
          </div>
        ) : null}
      </PageHeader>

      {query.isPending ? (
        <BoletimSkeleton />
      ) : /* `isError || !dados`, e nunca `!dados` sozinho — a forma que estava aqui
            segurava o ESQUELETO no erro: `isPending` cai para falso, `dados` fica
            indefinido, e o segundo termo do `||` prendia a folha no carregamento que
            nunca termina. O par certo é o de `indicadores.tsx`, dois arquivos ao lado. */
      query.isError || !dados ? (
        <FalhaDoPainel
          titulo="O boletim não carregou"
          erro={query.error}
          aoTentar={() => query.refetch()}
        />
      ) : (
        <>
          <Apuracao dados={dados} />

          {/* Grid 1.55:1 — movimento largo à esquerda, pendências + cadastros à direita. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
            <PainelBoletim cor="boletim" legend="Movimento do dia">
              <Movimento linhas={dados.movimento} />
            </PainelBoletim>

            <div className="flex flex-col gap-4">
              <PainelBoletim cor="foco" legend="Ordens sem Data Envio">
                <SemEnvio linhas={dados.semEnvio} />
              </PainelBoletim>

              <PainelBoletim cor="cadastros" legend="Cadastros">
                <Cadastros linhas={dados.cadastros} />
              </PainelBoletim>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Fase mock: a data de referência é a mais recente entre os documentos carregados — o
            retrato do dia da captura do SoftLux, não a data corrente.
          </p>
        </>
      )}
    </div>
  )
}
