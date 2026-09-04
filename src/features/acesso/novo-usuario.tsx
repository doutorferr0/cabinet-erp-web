import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCriarUsuario, usePapeis } from '@/data/acesso-api'
import { useEffect, useState } from 'react'

/**
 * NOVO USUÁRIO — nome, e-mail (a credencial) e papel, num diálogo.
 *
 * Três passos do contrato numa gravação (pessoa → vínculo → senha provisória);
 * a mutação está em `useCriarUsuario` e a razão da composição está lá. Aqui é
 * só o formulário: o e-mail é obrigatório NESTE fluxo — o contrato o aceita
 * nulo porque colaborador de RH sem acesso existe, mas um USUÁRIO sem e-mail
 * não tem como logar, e criá-lo por esta tela seria criar a dúvida.
 *
 * O papel é `<select>` e não combo de busca: a lista de papéis da organização
 * é curta e o operador lê todas as opções de uma vez (mesma razão do motivo de
 * perda). Papel inativo fica de fora — vínculo com papel inativo é 400
 * `papel-invalido` no servidor, e oferecer a opção seria oferecer o erro.
 */
export function NovoUsuarioDialog({
  aberto,
  onFechar,
  onSenha,
}: {
  aberto: boolean
  onFechar: () => void
  /** Chamado com a senha provisória — o pai abre o diálogo de exibição única. */
  onSenha: (nome: string, senha: string) => void
}) {
  const papeis = usePapeis()
  const criar = useCriarUsuario()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')

  useEffect(() => {
    if (!aberto) return
    setNome('')
    setEmail('')
    setRoleId('')
    criar.reset()
  }, [aberto, criar.reset])

  const escolhiveis = (papeis.data?.rows ?? []).filter((p) => p.active)
  const completo = nome.trim() && email.trim() && roleId

  function gravar() {
    if (!completo) return
    criar.mutate(
      { nome: nome.trim(), email: email.trim(), roleId },
      {
        onSuccess: ({ detalhe, temporaryPassword }) => {
          onFechar()
          onSenha(detalhe.name, temporaryPassword)
        },
      },
    )
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>Novo usuário</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-[var(--s-3)]">
        <div className="flex flex-col gap-[var(--s-1)]">
          <Label htmlFor="usuario-nome">Nome</Label>
          <Input
            id="usuario-nome"
            value={nome}
            autoFocus
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-[var(--s-1)]">
          <Label htmlFor="usuario-email">E-mail</Label>
          <Input
            id="usuario-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="t-meta">É a credencial de entrada — única no produto inteiro.</p>
        </div>
        <div className="flex flex-col gap-[var(--s-1)]">
          <Label htmlFor="usuario-papel">Papel</Label>
          <select
            id="usuario-papel"
            className="t-ui flex h-9 w-full border-2 border-input bg-card px-2.5 py-1 outline-none focus-visible:focus-ring"
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

        <ErroDeGravacao erro={criar.error} mensagem="Falha ao criar o usuário." />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="button" onClick={gravar} disabled={!completo || criar.isPending}>
          Criar e gerar senha
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
