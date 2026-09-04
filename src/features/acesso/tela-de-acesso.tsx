import type { EmployeeDto } from '@/api/gerado'
import { AvisoDeCobertura } from '@/components/cabinet/aviso-de-cobertura'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { VitraDataTable } from '@/components/cabinet/data-table'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Nome } from '@/components/cabinet/nome'
import { PageHeader } from '@/components/cabinet/page-header'
import { Stamp } from '@/components/cabinet/stamp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  listarUsuariosDeAcesso,
  useConvidarUsuario,
  useGerarSenhaProvisoria,
  usePapeis,
} from '@/data/acesso-api'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { useEmpresasDoGrupo } from '@/data/empresas-do-grupo-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { EmpresaFormDialog } from '@/features/acesso/empresa-form'
import { NovoUsuarioDialog } from '@/features/acesso/novo-usuario'
import { PapelFormDialog } from '@/features/acesso/papel-form'
import { SenhaProvisoriaDialog } from '@/features/acesso/senha-provisoria'
import { TimbreFormDialog } from '@/features/acesso/timbre-form'
import { VinculosDoUsuarioDialog } from '@/features/acesso/vinculos-do-usuario'
import { avisar } from '@/lib/avisos'
import { formatDateBR } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useState } from 'react'

/**
 * As colunas da listagem de usuários — a entidade, a situação e a PRÓXIMA AÇÃO.
 *
 * A entidade é nome + subtítulo (cargo · setor) numa célula só: são o mesmo
 * assunto — quem é a pessoa —, e três colunas as separariam em três perguntas
 * quando a linha responde uma. Cargo e setor entram na whitelist de `sortBy` do
 * contrato, mas a coluna composta não ordena por nenhum dos dois sozinho, então
 * a ordenação fica no `name`, que é por onde se procura gente.
 *
 * A ação da linha é UMA — `Convidar` —, e a segunda existe porque a primeira
 * tem uma recusa nomeada: o 409 de `InviteEmployee` é "colaborador sem e-mail,
 * ou desativado", e quem cai nele precisa da senha provisória sem sair da tela.
 * A terceira decisão (empresas e papel) é o clique na LINHA, não um botão.
 */
function colunasDeUsuario({
  convidar,
  convidando,
  gerarSenha,
  gerando,
}: {
  convidar: (linha: EmployeeDto) => void
  convidando: boolean
  gerarSenha: (linha: EmployeeDto) => void
  gerando: boolean
}): ColumnDef<EmployeeDto>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Usuário',
      cell: ({ row }) => {
        const cargo = [row.original.jobTitle, row.original.sector].filter(Boolean).join(' · ')
        return (
          <div className="flex flex-col">
            <Nome>{row.original.name}</Nome>
            {cargo ? <span className="t-meta">{cargo}</span> : null}
          </div>
        )
      },
    },
    {
      accessorKey: 'active',
      header: 'Situação',
      cell: ({ row }) => <CelulaAtivo ativo={row.original.active} />,
    },
    {
      id: 'proximaAcao',
      header: 'Próxima ação',
      enableSorting: false,
      cell: ({ row }) => (
        // `stopPropagation` na SUBIDA, nunca na captura: a linha inteira abre o
        // vínculo, e sem barreira clicar em `Convidar` mandaria o convite E
        // abriria o diálogo por cima dele. Na captura a barreira desceria antes
        // do botão e mataria o próprio clique — foi o que o teste do `Gerar
        // senha` mediu, com zero escritas.
        <div
          className="flex gap-[var(--s-2)]"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            size="sm"
            disabled={convidando || !row.original.active}
            title={row.original.active ? undefined : 'Colaborador inativo não recebe convite.'}
            onClick={() => convidar(row.original)}
          >
            Convidar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={gerando}
            onClick={() => gerarSenha(row.original)}
          >
            Gerar senha
          </Button>
        </div>
      ),
    },
  ]
}

/**
 * USUÁRIOS E EMPRESAS — a tela que a navegação prometia como `futuro`.
 *
 * Quem entra (usuários), com qual acesso (papéis por caixas), como entra pela
 * primeira vez (senha provisória de exibição única) e ONDE entra (as empresas
 * do grupo). Três abas e não três telas: papel, usuário e empresa são as três
 * pontas da mesma decisão — o papel é o conjunto de caixas, o usuário é quem o
 * carrega, a empresa é onde ele o carrega — e o admin alterna entre elas na
 * mesma tarefa ("criei a filial, agora crio quem trabalha nela").
 *
 * **A aba Empresas fecha uma promessa que o título já fazia.** Esta tela se
 * chamava "Usuários e Empresas" desde que nasceu, com duas abas e nenhuma delas
 * de empresa: o grupo existia no seletor do rodapé e em lugar nenhum onde
 * pudesse ser cadastrado ou corrigido.
 *
 * A listagem de usuários é a MESMA `GET /api/employees` do cadastro de RH:
 * usuário não é outra entidade, é o colaborador olhado pelo lado do acesso.
 * A linha não traz o papel (o `EmployeeDto` não o publica — seria o N+1 de um
 * detalhe por linha); o papel aparece e muda pelas ações da linha.
 */
export function TelaDeAcesso() {
  const papeis = usePapeis()

  const [novoAberto, setNovoAberto] = useState(false)
  const [senha, setSenha] = useState<{ nome: string; valor: string } | null>(null)
  const [papelEmEdicao, setPapelEmEdicao] = useState<{ id: string | null } | null>(null)
  const [vinculosDe, setVinculosDe] = useState<{ id: string; nome: string } | null>(null)
  const [empresaEmEdicao, setEmpresaEmEdicao] = useState<{ id: string | null } | null>(null)
  const [timbreAberto, setTimbreAberto] = useState(false)
  const [buscaDeEmpresa, setBuscaDeEmpresa] = useState('')
  const empresas = useEmpresasDoGrupo(buscaDeEmpresa)
  // Nomeadas porque agora são lidas DUAS vezes — pelo vazio e pela grade. Inline nos dois
  // lugares, o `?? []` diria "sem linha" também no ERRO, e numa tela de permissão tabela
  // vazia lê-se como "ninguém tem acesso": o operador conclui que o acesso sumiu e vai
  // conceder de novo o que já está concedido. A gravação já tinha `ErroDeGravacao`; a
  // leitura não tinha nada. (Usuários saiu desta lista: a `VitraDataTable` já
  // distingue vazio de falha por conta própria.)
  const linhasDePapel = papeis.data?.rows ?? []
  const linhasDeEmpresa = empresas.data?.rows ?? []
  const { ativa, trocar, trocando } = useEmpresasDaSessao()
  /**
   * Montar o grupo é `owner`, e a aba DIZ isso em vez de deixar o botão aceso.
   *
   * A LEITURA fica: quem administra acesso precisa ver em que empresas pôr as
   * pessoas. O que o papel insuficiente tira é criar e alterar — e tirar aqui
   * não é adivinhação: `/api/tenants` é caminho novo, e caminho de domínio sem
   * linha na matriz do servidor cai em `owner`. Botão aceso levaria ao 403.
   */
  const empresaSomenteLeitura = useReadOnlyPorPapel('tenants').readOnly

  const gerar = useGerarSenhaProvisoria()
  const convidar = useConvidarUsuario()

  function gerarSenha(id: string, nome: string) {
    gerar.mutate(id, {
      onSuccess: ({ temporaryPassword }) => setSenha({ nome, valor: temporaryPassword }),
    })
  }

  /**
   * O recibo do convite é AVISO, não diálogo: não há segredo para ler na tela
   * (o token foi para o e-mail, e é essa a diferença entre convidar e gerar
   * senha). O que o administrador precisa saber é para ONDE saiu — para
   * conferir que o endereço é o certo — e até quando o link vale, para
   * responder a quem voltar dizendo que não deu.
   */
  function convidarUsuario(id: string, nome: string) {
    convidar.mutate(id, {
      onSuccess: ({ sentTo, expiresAt }) =>
        avisar(
          `Convite enviado a ${nome}`,
          `Para ${sentTo} — o link vale até ${formatDateBR(expiresAt)}.`,
        ),
    })
  }

  return (
    <div className="flex flex-col gap-[var(--s-5)]">
      <PageHeader titulo="Usuários e Empresas" subtitulo="Quem entra, e com qual acesso" />
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="papeis">Papéis</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="flex flex-col gap-[var(--s-3)]">
          {/* O que a listagem 2.0 pede e o contrato não publica. `EmployeeDto`
              tem `id`, `name`, `sector`, `jobTitle` e `active` — não há papel
              nem último acesso. A coluna SAI em vez de aparecer em branco ou de
              custar um pedido por linha; o papel de agora se lê em
              `Empresas e papel…`, que é onde ele também se muda.
              Blocker registrado na issue #495. */}
          {/* Um `<p>` só: o `AvisoDeCobertura` empilha children num `flex-col`,
              e três `<strong>` inline viravam três linhas próprias. */}
          <AvisoDeCobertura>
            <p className="t-corpo">
              A listagem não traz <strong>papel</strong> nem <strong>último acesso</strong> — o
              contrato não os publica na linha. O papel desta empresa se lê e se muda em{' '}
              <strong>Empresas e papel…</strong>, uma linha por vez.
            </p>
          </AvisoDeCobertura>

          {/* Os erros das ações de LINHA moram na tela: a ação é da linha, mas o
              que se abre no sucesso é um diálogo — sem este bloco, o 409 de
              colaborador sem e-mail morreria em silêncio nas duas. */}
          <ErroDeGravacao erro={gerar.error} mensagem="Falha ao gerar a senha provisória." />
          <ErroDeGravacao erro={convidar.error} mensagem="Falha ao enviar o convite." />

          <VitraDataTable<EmployeeDto>
            columns={colunasDeUsuario({
              convidar: (linha) => convidarUsuario(linha.id, linha.name),
              convidando: convidar.isPending,
              gerarSenha: (linha) => gerarSenha(linha.id, linha.name),
              gerando: gerar.isPending,
            })}
            queryKey={['acesso', 'employees', 'listagem']}
            fetcher={listarUsuariosDeAcesso}
            searchPlaceholder="Buscar por nome…"
            actions={[
              {
                id: 'incluir',
                label: 'Novo usuário',
                icon: Plus,
                onClick: () => setNovoAberto(true),
              },
            ]}
            // Abrir a linha é ir ao vínculo — a decisão que a tela existe para
            // tomar. Sem isto, "Empresas e papel…" seria um terceiro botão numa
            // coluna que já carrega a próxima ação.
            aoAbrirLinha={(linha) => setVinculosDe({ id: linha.id, nome: linha.name })}
            acaoDoVazio={{ label: 'Novo usuário', onClick: () => setNovoAberto(true) }}
          />
        </TabsContent>

        <TabsContent value="papeis" className="flex flex-col gap-[var(--s-3)]">
          <div className="flex justify-end">
            <Button type="button" onClick={() => setPapelEmEdicao({ id: null })}>
              Incluir papel
            </Button>
          </div>
          {papeis.isPending ? (
            <p className="t-meta">Carregando os papéis…</p>
          ) : papeis.isError ? (
            <FalhaDoPainel
              titulo="A lista de papéis não carregou"
              erro={papeis.error}
              aoTentar={() => papeis.refetch()}
            />
          ) : linhasDePapel.length === 0 ? (
            <p className="t-meta">Nenhum papel cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasDePapel.map((papel) => (
                  <TableRow
                    key={papel.id}
                    className="cursor-pointer"
                    onClick={() => setPapelEmEdicao({ id: papel.id })}
                  >
                    <TableCell>
                      <Nome>{papel.name}</Nome>
                      {/* Selo, não caixa própria: o chip tinha `font-size`
                          literal fora da rampa (§Hierarquia proíbe literal em
                          componente) e desenhava a quarta borda numa linha que
                          já tem hairline. `Stamp` é o mesmo selo de `Ativo`. */}
                      {papel.system ? (
                        <span className="ml-2 inline-flex align-middle">
                          <Stamp tom="neutral" label="sistema" />
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="t-meta">{papel.description ?? '—'}</TableCell>
                    <TableCell>{papel.permissionCount}</TableCell>
                    <TableCell>
                      <CelulaAtivo ativo={papel.active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="empresas" className="flex flex-col gap-[var(--s-3)]">
          <div className="flex items-end justify-between gap-[var(--s-2)]">
            <div className="flex w-64 flex-col gap-[var(--s-1)]">
              <Label htmlFor="empresa-busca" className="t-rotulo">
                Buscar
              </Label>
              <Input
                id="empresa-busca"
                value={buscaDeEmpresa}
                onChange={(e) => setBuscaDeEmpresa(e.target.value)}
              />
            </div>
            <Button
              type="button"
              isDisabled={empresaSomenteLeitura}
              onClick={() => setEmpresaEmEdicao({ id: null })}
            >
              Nova empresa
            </Button>
          </div>

          {empresaSomenteLeitura ? (
            <p className="t-meta border-2 border-border p-2.5">
              Seu papel nesta empresa vê o grupo, mas não o altera. Criar e alterar empresa é do
              responsável pelo grupo.
            </p>
          ) : null}

          {/* A lista é a das empresas que EXISTEM, não a das que o usuário
              alcança: a empresa criada aqui nasce sem vínculo nenhum e não
              apareceria no seletor do rodapé. Ver `empresas-do-grupo-api.ts`. */}
          {empresas.isPending ? (
            <p className="t-meta">Carregando as empresas…</p>
          ) : empresas.isError ? (
            <FalhaDoPainel
              titulo="A lista de empresas não carregou"
              erro={empresas.error}
              aoTentar={() => empresas.refetch()}
            />
          ) : linhasDeEmpresa.length === 0 ? (
            <p className="t-meta">
              {buscaDeEmpresa
                ? `A busca por “${buscaDeEmpresa}” não encontrou empresa.`
                : 'Nenhuma empresa no grupo.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Nome fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="w-44" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasDeEmpresa.map((empresa) => {
                  const eAtiva = empresa.id === ativa?.tenantId
                  return (
                    <TableRow key={empresa.id}>
                      <TableCell
                        className="t-dado cursor-pointer"
                        onClick={() => setEmpresaEmEdicao({ id: empresa.id })}
                      >
                        {empresa.code}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => setEmpresaEmEdicao({ id: empresa.id })}
                      >
                        <Nome>{empresa.name}</Nome>
                      </TableCell>
                      <TableCell className="t-dado-meta">{empresa.cnpj ?? '—'}</TableCell>
                      <TableCell>
                        <CelulaAtivo ativo={empresa.active} />
                      </TableCell>
                      {/* O TIMBRE é singleton da empresa ATIVA — o id não viaja
                        na rota, de propósito. Por isso só esta linha o oferece,
                        e as outras oferecem o gesto que torna o botão possível
                        em vez de um Timbre que gravaria na empresa errada. */}
                      <TableCell>
                        {eAtiva ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setTimbreAberto(true)}
                          >
                            Timbre…
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isDisabled={trocando}
                            onClick={() => trocar(empresa.id)}
                          >
                            Ativar para o timbre
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {/* O teto de 100 do contrato DITO em voz alta. Cortar em silêncio
              faria quem tem 120 empresas concluir que tem 100. */}
          {(empresas.data?.total ?? 0) > (empresas.data?.rows.length ?? 0) ? (
            <p className="t-meta">
              Mostrando {empresas.data?.rows.length} de {empresas.data?.total} empresas — use a
              busca para chegar às demais.
            </p>
          ) : null}
        </TabsContent>
      </Tabs>

      <NovoUsuarioDialog
        aberto={novoAberto}
        onFechar={() => setNovoAberto(false)}
        onSenha={(nome, valor) => setSenha({ nome, valor })}
      />
      <PapelFormDialog
        aberto={papelEmEdicao !== null}
        papelId={papelEmEdicao?.id ?? null}
        onFechar={() => setPapelEmEdicao(null)}
      />
      <SenhaProvisoriaDialog
        aberto={senha !== null}
        nome={senha?.nome ?? ''}
        senha={senha?.valor ?? ''}
        onFechar={() => setSenha(null)}
      />
      <VinculosDoUsuarioDialog usuario={vinculosDe} onFechar={() => setVinculosDe(null)} />
      <EmpresaFormDialog
        aberto={empresaEmEdicao !== null}
        empresaId={empresaEmEdicao?.id ?? null}
        somenteLeitura={empresaSomenteLeitura}
        onFechar={() => setEmpresaEmEdicao(null)}
      />
      <TimbreFormDialog
        aberto={timbreAberto}
        somenteLeitura={empresaSomenteLeitura}
        onFechar={() => setTimbreAberto(false)}
      />
    </div>
  )
}
