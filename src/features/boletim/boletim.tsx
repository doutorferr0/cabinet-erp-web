import { rotaLiberada } from '@/app/navigation'
import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { FormBlock } from '@/components/cabinet/form-block'
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
 * BOLETIM — a tela de entrada (`/`).
 *
 * O `PRODUCT.md` chama a entrada atual de "menu vazio" e nomeia o dashboard
 * como uma das quatro superfícies de visibilidade que o legado não tem. Esta
 * tela é a primeira delas.
 *
 * Não é um dashboard de cartões: o norte do `DESIGN.md` é Papel Funcional, e
 * a forma certa aqui é o **boletim do dia** — a folha que a operação
 * imprimiria na abertura. Tudo é régua, coluna que fecha e número tabular;
 * nenhum cartão, nenhuma métrica-herói, nenhuma cor fora dos dois empregos.
 *
 * Toda grandeza é derivada de campo que a transcrição captura. Onde o legado
 * não registra (a enumeração de `Situação`), o boletim mostra a derivação e
 * marca — não inventa nome.
 */

/**
 * DINHEIRO — verde; o que SUBTRAI — vermelho (DESIGN.md §Acentos, e a mesma
 * receita que os totais do `FormGrid` já usam).
 *
 * Não é enfeite: neste boletim toda linha é "R$ alguma coisa", e num ledger
 * assim a cor é o que separa entrada de desconto ANTES de o olho chegar ao
 * sinal. Escrito num lugar só para a regra não divergir entre a tira de
 * apuração e a grade — foi divergindo assim que o valor daqui ficou preto
 * enquanto o do formulário já saía verde.
 */
function Valor({ centavos, className }: { centavos: number; className?: string }) {
  return (
    <span
      className={cn('tabular-nums', centavos < 0 ? 'text-destructive' : 'text-money', className)}
    >
      {formatMoneyBRL(centavos)}
    </span>
  )
}

/** Um número da apuração: rótulo em Meta acima, valor tabular abaixo. */
function Grandeza({
  rotulo,
  valor,
  apoio,
}: { rotulo: string; valor: string; apoio?: React.ReactNode }) {
  return (
    // A coluna fecha: rótulo e valor partilham a mesma borda esquerda, e o
    // valor é tabular para alinhar verticalmente com as grandezas vizinhas.
    <div className="flex min-w-0 flex-col gap-1 px-3 first:pl-0 last:pr-0">
      <span className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {rotulo}
      </span>
      <span className="text-lg font-semibold tabular-nums">{valor}</span>
      {apoio ? <span className="text-sm text-muted-foreground">{apoio}</span> : null}
    </div>
  )
}

/**
 * Tira de apuração: as grandezas do dia numa fileira só, separadas por régua
 * vertical. É a tira de totais do invoice, não uma grade de cartões — por
 * isso divide, não empilha caixas.
 */
function Apuracao({ dados }: { dados: Boletim }) {
  return (
    <div className="flex flex-wrap gap-y-3 divide-x divide-rule-hair">
      <Grandeza
        rotulo="Orçamentos do dia"
        valor={String(dados.orcamentosDoDia)}
        apoio={<Valor centavos={dados.valorOrcadoCentavos} className="text-sm" />}
      />
      <Grandeza
        rotulo="Ordens do dia"
        valor={String(dados.ordensDoDia)}
        apoio={<Valor centavos={dados.valorOrdenadoCentavos} className="text-sm" />}
      />
      <Grandeza
        rotulo="Ordens sem envio"
        valor={String(dados.ordensSemEnvio)}
        apoio="Data Envio em branco"
      />
      <Grandeza rotulo="Documentos no dia" valor={String(dados.movimento.length)} />
    </div>
  )
}

/** Movimento do dia — ledger de documentos, valor fechando a coluna. */
function Movimento({ linhas }: { linhas: LinhaMovimento[] }) {
  const total = linhas.reduce((soma, l) => soma + l.valorCentavos, 0)

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
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
                <TableRow key={`${linha.especie}-${linha.numero}`} className="hover:bg-muted">
                  <TableCell>
                    {/* A linha inteira leva ao documento; o link ocupa a célula. */}
                    <Link to={linha.href} className="block hover:underline">
                      {linha.especie}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.06em]">
                    {linha.numero}
                  </TableCell>
                  <TableCell className="truncate">{linha.contraparte}</TableCell>
                  {/* A célula de valor leva o fundo da ZONA (DESIGN.md
                      §Superfície tintada): a coluna que o operador soma é a
                      que ele encontra sem procurar. */}
                  <TableCell className="bg-zone-money text-right">
                    <Valor centavos={linha.valorCentavos} />
                  </TableCell>
                </TableRow>
              ))}
              {/* Total nas fileiras finais da própria grade, sob a coluna de
                  valor — nunca numa tira à parte (DESIGN.md §DocumentoTotais). */}
              <TableRow className="border-rule-strong border-t hover:bg-transparent">
                <TableCell colSpan={2} className="border-l-0" />
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

/**
 * Ordens paradas. O tom do carimbo vem do tempo parado, e o rótulo é a
 * própria derivação — `Data Envio` em branco é fato do campo capturado.
 * TODO(transcricao): substituir pela enumeração real de `Situação` quando ela
 * existir; o menu `Consultar Situação do Pedido de Venda` prova que existe,
 * mas a transcrição não registra os valores.
 */
function SemEnvio({ linhas }: { linhas: LinhaOrdemSemEnvio[] }) {
  if (linhas.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma ordem parada.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Data Ordem</TableHead>
            <TableHead className="text-right">Parada há</TableHead>
            <TableHead>Envio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((linha) => (
            <TableRow key={linha.codigo} className="hover:bg-muted">
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

/**
 * Cadastro: total e a fatia desativada (§9 padrão 8 — desativar, não excluir).
 *
 * A tabela é da EMPRESA ATIVA como o menu é: linha de cadastro que ela não
 * opera sai daqui também. O boletim é caminho de entrada — deixá-lo oferecendo
 * `Fornecedores` numa empresa que não compra levaria o operador, por um clique,
 * ao aviso de recurso indisponível, e ainda exibiria uma contagem de registros
 * que não são dela.
 */
function Cadastros({ linhas }: { linhas: LinhaCadastro[] }) {
  const { tem } = useRecursosDaEmpresa()
  const visiveis = linhas.filter((linha) => rotaLiberada(linha.href, tem))

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cadastro</TableHead>
            <TableHead className="text-right">Registros</TableHead>
            <TableHead className="text-right">Desativados</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.map((linha) => (
            <TableRow key={linha.nome} className="hover:bg-muted">
              <TableCell>
                <Link to={linha.href} className="block hover:underline">
                  {linha.nome}
                </Link>
              </TableCell>
              {linha.total === null ? (
                // A lista deste cadastro falhou (409 sem empresa ativa, 401,
                // proxy fora do ar…) — dizer isso é melhor que fingir zero.
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

/** Cinco linhas de esqueleto — nunca spinner, nunca tela vazia (DESIGN.md). */
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
      {/* Cabeçalho de boletim: quem é a folha à esquerda, a data de referência
          em mono à direita — a mesma anatomia do DocumentoHeader, fechada por
          régua forte. */}
      {/* A MESMA banda das 19 outras telas, e não um `<h1>` próprio: o Boletim
          era a única folha do sistema que dizia o próprio nome em tinta preta
          solta — o operador chegava aqui e a tela não se apresentava como as
          outras. A banda traz junto a zona de identidade e o ornamento do
          módulo (coral, anéis concêntricos = panorama), que é o que faz a
          entrada se distinguir de uma listagem ao trocar de tela.

          A data de referência entra como `children`: é DADO, e por isso vem
          antes da marca d'água na ordem de leitura, exatamente como o carimbo
          e o número do documento fazem nas outras telas. */}
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
      <p className="text-sm text-muted-foreground">
        O movimento da operação na data de referência.
      </p>

      {query.isPending || !dados ? (
        <BoletimSkeleton />
      ) : (
        <>
          <Apuracao dados={dados} />

          <FormBlock legend="Movimento do dia">
            <Movimento linhas={dados.movimento} />
          </FormBlock>

          <FormBlock legend="Ordens sem Data Envio">
            <SemEnvio linhas={dados.semEnvio} />
          </FormBlock>

          <FormBlock legend="Cadastros">
            <Cadastros linhas={dados.cadastros} />
          </FormBlock>

          {/* A data de referência é artefato da fase mock: os dados são o
              retrato do dia da captura. Dizer isso na tela evita que alguém
              leia o boletim como "hoje". */}
          <p className="text-sm text-muted-foreground">
            Fase mock: a data de referência é a mais recente entre os documentos carregados — o
            retrato do dia da captura do SoftLux, não a data corrente.
          </p>
        </>
      )}
    </div>
  )
}
