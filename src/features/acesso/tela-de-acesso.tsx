import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { FalhaDoPainel } from '@/components/cabinet/falha-do-painel'
import { Nome } from '@/components/cabinet/nome'
import { PageHeader } from '@/components/cabinet/page-header'
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
import { useGerarSenhaProvisoria, usePapeis, useUsuariosDeAcesso } from '@/data/acesso-api'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { useEmpresasDoGrupo } from '@/data/empresas-do-grupo-api'
import { useReadOnlyPorPapel } from '@/data/papeis'
import { EmpresaFormDialog } from '@/features/acesso/empresa-form'
import { NovoUsuarioDialog } from '@/features/acesso/novo-usuario'
import { PapelFormDialog } from '@/features/acesso/papel-form'
import { SenhaProvisoriaDialog } from '@/features/acesso/senha-provisoria'
import { TimbreFormDialog } from '@/features/acesso/timbre-form'
import { VinculosDoUsuarioDialog } from '@/features/acesso/vinculos-do-usuario'
import { useState } from 'react'

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
  const [busca, setBusca] = useState('')
  const usuarios = useUsuariosDeAcesso(busca)
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
  // leitura não tinha nada.
  const linhasDeUsuario = usuarios.data?.rows ?? []
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

  function gerarSenha(id: string, nome: string) {
    gerar.mutate(id, {
      onSuccess: ({ temporaryPassword }) => setSenha({ nome, valor: temporaryPassword }),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader titulo="Usuários e Empresas" subtitulo="Quem entra, e com qual acesso" />
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="papeis">Papéis</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <div className="flex w-64 flex-col gap-1">
              <Label htmlFor="acesso-busca">Buscar</Label>
              <Input id="acesso-busca" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <Button type="button" onClick={() => setNovoAberto(true)}>
              Novo usuário
            </Button>
          </div>

          {/* O erro do GERAR SENHA mora na tela, não numa linha: a ação é de
              linha mas o diálogo da senha só abre no sucesso — sem este bloco,
              o 409 de colaborador sem e-mail morreria em silêncio. */}
          <ErroDeGravacao erro={gerar.error} mensagem="Falha ao gerar a senha provisória." />

          {usuarios.isPending ? (
            <p className="text-muted-foreground text-sm">Carregando os usuários…</p>
          ) : usuarios.isError ? (
            <FalhaDoPainel
              titulo="A lista de usuários não carregou"
              erro={usuarios.error}
              aoTentar={() => usuarios.refetch()}
            />
          ) : linhasDeUsuario.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {busca
                ? `A busca por “${busca}” não encontrou usuário.`
                : 'Nenhum usuário nesta empresa.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-64">Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasDeUsuario.map((linha) => (
                  <TableRow key={linha.id}>
                    <TableCell>
                      <Nome>{linha.name}</Nome>
                    </TableCell>
                    <TableCell>
                      <CelulaAtivo ativo={linha.active} />
                    </TableCell>
                    <TableCell className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setVinculosDe({ id: linha.id, nome: linha.name })}
                      >
                        Empresas e papel…
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={gerar.isPending}
                        onClick={() => gerarSenha(linha.id, linha.name)}
                      >
                        Gerar senha
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="papeis" className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button type="button" onClick={() => setPapelEmEdicao({ id: null })}>
              Incluir papel
            </Button>
          </div>
          {papeis.isPending ? (
            <p className="text-muted-foreground text-sm">Carregando os papéis…</p>
          ) : papeis.isError ? (
            <FalhaDoPainel
              titulo="A lista de papéis não carregou"
              erro={papeis.error}
              aoTentar={() => papeis.refetch()}
            />
          ) : linhasDePapel.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum papel cadastrado.</p>
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
                      {papel.system ? (
                        <span className="ml-2 border-2 border-border px-1 font-mono text-[0.5625rem] uppercase tracking-[0.06em]">
                          sistema
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {papel.description ?? '—'}
                    </TableCell>
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

        <TabsContent value="empresas" className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <div className="flex w-64 flex-col gap-1">
              <Label htmlFor="empresa-busca">Buscar</Label>
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
            <p className="border-2 border-border p-2.5 text-muted-foreground text-sm leading-snug">
              Seu papel nesta empresa vê o grupo, mas não o altera. Criar e alterar empresa é do
              responsável pelo grupo.
            </p>
          ) : null}

          {/* A lista é a das empresas que EXISTEM, não a das que o usuário
              alcança: a empresa criada aqui nasce sem vínculo nenhum e não
              apareceria no seletor do rodapé. Ver `empresas-do-grupo-api.ts`. */}
          {empresas.isPending ? (
            <p className="text-muted-foreground text-sm">Carregando as empresas…</p>
          ) : empresas.isError ? (
            <FalhaDoPainel
              titulo="A lista de empresas não carregou"
              erro={empresas.error}
              aoTentar={() => empresas.refetch()}
            />
          ) : linhasDeEmpresa.length === 0 ? (
            <p className="text-muted-foreground text-sm">
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
                        className="cursor-pointer font-mono"
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
                      <TableCell className="text-muted-foreground">{empresa.cnpj ?? '—'}</TableCell>
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
            <p className="text-muted-foreground text-sm">
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
