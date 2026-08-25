import { BandaDeIdentidade } from '@/components/cabinet/banda-identidade'
import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Nome } from '@/components/cabinet/nome'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  useAlterarVinculo,
  useGerarSenhaProvisoria,
  usePapeis,
  useUsuariosDeAcesso,
} from '@/data/acesso-api'
import { NovoUsuarioDialog } from '@/features/acesso/novo-usuario'
import { PapelFormDialog } from '@/features/acesso/papel-form'
import { SenhaProvisoriaDialog } from '@/features/acesso/senha-provisoria'
import { useState } from 'react'

/**
 * USUÁRIOS E EMPRESAS — a tela que a navegação prometia como `futuro`.
 *
 * Quem entra (usuários), com qual acesso (papéis por caixas) e como entra pela
 * primeira vez (senha provisória de exibição única). Duas abas e não duas
 * telas: papel e usuário são as duas metades da mesma decisão — o papel é o
 * conjunto de caixas, o usuário é quem o carrega — e o admin alterna entre
 * elas na mesma tarefa ("criei o papel, agora crio quem o usa").
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
  const [vinculoDe, setVinculoDe] = useState<{ id: string; nome: string } | null>(null)

  const gerar = useGerarSenhaProvisoria()

  function gerarSenha(id: string, nome: string) {
    gerar.mutate(id, {
      onSuccess: ({ temporaryPassword }) => setSenha({ nome, valor: temporaryPassword }),
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <BandaDeIdentidade titulo="Usuários e Empresas" contexto="Quem entra, e com qual acesso" />
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="papeis">Papéis</TabsTrigger>
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-64">Acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(usuarios.data?.rows ?? []).map((linha) => (
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
                      onClick={() => setVinculoDe({ id: linha.id, nome: linha.name })}
                    >
                      Papel…
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
        </TabsContent>

        <TabsContent value="papeis" className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button type="button" onClick={() => setPapelEmEdicao({ id: null })}>
              Incluir papel
            </Button>
          </div>
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
              {(papeis.data?.rows ?? []).map((papel) => (
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
      <VinculoDialog vinculo={vinculoDe} onFechar={() => setVinculoDe(null)} />
    </div>
  )
}

/**
 * DEFINIR O PAPEL de um usuário existente — `PUT` no vínculo, com `POST` de
 * criação quando ainda não há (a ordem e a razão estão em `useAlterarVinculo`).
 *
 * O diálogo não mostra o papel atual: a linha da listagem não o traz (decisão
 * do `EmployeeDto`) e buscá-lo por usuário seria o N+1 que aquele DTO evita.
 * O que o operador faz aqui é AFIRMAR o papel, não conferi-lo.
 */
function VinculoDialog({
  vinculo,
  onFechar,
}: {
  vinculo: { id: string; nome: string } | null
  onFechar: () => void
}) {
  const papeis = usePapeis()
  const alterar = useAlterarVinculo()
  const [roleId, setRoleId] = useState('')

  const escolhiveis = (papeis.data?.rows ?? []).filter((p) => p.active)

  function gravar() {
    if (!vinculo || !roleId) return
    alterar.mutate(
      { id: vinculo.id, roleId },
      {
        onSuccess: () => {
          setRoleId('')
          onFechar()
        },
      },
    )
  }

  return (
    <Dialog isOpen={vinculo !== null} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>Papel de {vinculo?.nome ?? ''}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="vinculo-papel">Papel na empresa ativa</Label>
          <select
            id="vinculo-papel"
            className="flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 text-sm outline-none focus-visible:focus-ring"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            <option value="">Escolha o papel</option>
            {escolhiveis.map((papel) => (
              <option key={papel.id} value={papel.id}>
                {papel.name}
              </option>
            ))}
          </select>
        </div>
        <ErroDeGravacao erro={alterar.error} mensagem="Falha ao definir o papel." />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="button" onClick={gravar} disabled={!roleId || alterar.isPending}>
          Gravar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
