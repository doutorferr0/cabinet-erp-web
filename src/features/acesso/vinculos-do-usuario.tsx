import { CelulaAtivo } from '@/components/cabinet/celula-ativo'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Stamp } from '@/components/cabinet/stamp'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAlterarVinculo, usePapeis, useVinculosDoUsuario } from '@/data/acesso-api'
import { useEmpresasDaSessao } from '@/data/empresas-api'
import { useState } from 'react'

/**
 * EM QUAIS EMPRESAS DO GRUPO esta pessoa entra, e com que papel.
 *
 * A aba Usuários lista quem existe; este diálogo responde a outra pergunta, e é
 * a que faz um grupo ser um grupo: a mesma pessoa é Financeiro na Matriz e nada
 * na Filial. `EmployeeDto` não a responde de propósito (seria um detalhe por
 * linha), e o `EmployeeDetailDto` só conhece a empresa ATIVA — por isso a
 * leitura tem caminho próprio, `GET /api/employees/{id}/links`.
 *
 * ## Por que só a linha da empresa ativa é editável
 *
 * O vínculo é a linha que define o poder da pessoa NAQUELA empresa, e o
 * servidor a escreve dentro do recorte da empresa ativa — é a mesma trava que
 * impede um orçamento da Matriz de aparecer na Filial. Gravar o vínculo da
 * empresa B a partir da empresa A seria decidir o poder de B com a autorização
 * obtida em A.
 *
 * A tela não esconde isso nem finge que o botão não existe: cada linha das
 * OUTRAS empresas traz **Ativar e editar**, que é `PUT /auth/active-tenant`
 * seguido do mesmo formulário. O operador troca de empresa de propósito, vendo
 * que trocou, em vez de descobrir pelo 403.
 */
export function VinculosDoUsuarioDialog({
  usuario,
  onFechar,
}: {
  usuario: { id: string; nome: string } | null
  onFechar: () => void
}) {
  const vinculos = useVinculosDoUsuario(usuario?.id ?? null)
  const papeis = usePapeis()
  const alterar = useAlterarVinculo()
  const { ativa, trocar, trocando } = useEmpresasDaSessao()

  const [roleId, setRoleId] = useState('')

  const escolhiveis = (papeis.data?.rows ?? []).filter((p) => p.active)
  const linhas = vinculos.data ?? []

  function gravar() {
    if (!usuario || !roleId) return
    alterar.mutate(
      { id: usuario.id, roleId },
      {
        onSuccess: () => setRoleId(''),
      },
    )
  }

  return (
    <Dialog isOpen={usuario !== null} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>Empresas de {usuario?.nome ?? ''}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-[var(--s-4)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((vinculo) => {
              const eAtiva = vinculo.tenantId === ativa?.tenantId
              return (
                <TableRow key={vinculo.tenantId}>
                  <TableCell>
                    {vinculo.tenantName}
                    {/* Selo, não caixa própria: o chip trazia `text-[0.5625rem]`
                        — literal fora da rampa, que a §Hierarquia proíbe em
                        componente — e desenhava uma segunda borda dentro de uma
                        célula que a hairline da linha já delimita. `Stamp` é o
                        mesmo selo de `Ativo` no resto do sistema. */}
                    {eAtiva ? (
                      <span className="ml-[var(--s-2)] inline-flex align-middle">
                        <Stamp tom="neutral" label="ativa" />
                      </span>
                    ) : null}
                  </TableCell>
                  {/* Papel `null` é vínculo herdado de antes de o papel
                      existir. "—" e não um papel plausível: inventar aqui
                      esconderia exatamente a linha que precisa de conserto. */}
                  <TableCell className="t-meta">{vinculo.roleName ?? '— sem papel'}</TableCell>
                  <TableCell>
                    <CelulaAtivo ativo={vinculo.active} />
                  </TableCell>
                  <TableCell>
                    {eAtiva ? null : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={trocando}
                        onClick={() => trocar(vinculo.tenantId)}
                      >
                        Ativar e editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {linhas.length === 0 && !vinculos.isPending ? (
              <TableRow>
                {/* Lista vazia é ESTADO, não falha: é o de quem foi criado e
                    ainda não entrou em empresa nenhuma. */}
                <TableCell colSpan={4} className="t-meta">
                  Esta pessoa ainda não entra em nenhuma empresa do grupo.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-[var(--s-1)] border-2 border-border p-2.5">
          <Label htmlFor="vinculos-papel">Papel em {ativa?.name ?? 'nenhuma empresa ativa'}</Label>
          <p className="t-meta">
            A escrita é sempre na empresa ATIVA. Para mexer noutra, use “Ativar e editar” na linha
            dela.
          </p>
          <div className="flex gap-[var(--s-2)]">
            <select
              id="vinculos-papel"
              className="t-ui flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 outline-none focus-visible:focus-ring"
              value={roleId}
              disabled={!ativa}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Escolha o papel</option>
              {escolhiveis.map((papel) => (
                <option key={papel.id} value={papel.id}>
                  {papel.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={gravar}
              disabled={!roleId || !ativa || alterar.isPending}
            >
              Gravar
            </Button>
          </div>
          <ErroDeGravacao erro={alterar.error} mensagem="Falha ao definir o papel." />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Fechar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
