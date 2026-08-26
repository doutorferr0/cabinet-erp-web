import { rotaLiberada } from '@/app/navigation'
import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
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
  type LinhaCadastro,
  type LinhaMovimento,
  type LinhaOrdemSemEnvio,
  fetchBoletim,
} from '@/data/boletim'
import { useRecursosDaEmpresa } from '@/data/recursos-da-empresa'
import { formatDateBR, formatMoneyBRL } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

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
function StatCard({
  rotulo,
  valor,
  apoio,
}: { rotulo: string; valor: string; apoio?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-card border-2 bg-card px-3 py-2.5 shadow-el1">
      <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {rotulo}
      </span>
      <span className="text-xl font-semibold tabular-nums">{valor}</span>
      {apoio ? <span className="text-sm text-muted-foreground">{apoio}</span> : null}
    </div>
  )
}

/** 4 stat cards em fileira. */
function Apuracao({ dados }: { dados: Boletim }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        rotulo="Orçamentos do dia"
        valor={String(dados.orcamentosDoDia)}
        apoio={<Valor centavos={dados.valorOrcadoCentavos} className="text-sm" />}
      />
      <StatCard
        rotulo="Ordens do dia"
        valor={String(dados.ordensDoDia)}
        apoio={<Valor centavos={dados.valorOrdenadoCentavos} className="text-sm" />}
      />
      <StatCard
        rotulo="Ordens sem envio"
        valor={String(dados.ordensSemEnvio)}
        apoio="Data Envio em branco"
      />
      <StatCard rotulo="Documentos no dia" valor={String(dados.movimento.length)} />
    </div>
  )
}

/** Movimento do dia — ledger em papel quadriculado, sem zebra. */
function Movimento({ linhas }: { linhas: LinhaMovimento[] }) {
  const total = linhas.reduce((soma, l) => soma + l.valorCentavos, 0)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-dotted border-rule-hair">
            <TableHead>Espécie</TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Cliente / Fornecedor</TableHead>
            <TableHead className="text-right">Valor</TableHead>
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
                  <TableCell className="truncate">{linha.contraparte}</TableCell>
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
      <BandaDeIdentidade titulo="Boletim" contexto="Movimento do dia">
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
      </BandaDeIdentidade>

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
