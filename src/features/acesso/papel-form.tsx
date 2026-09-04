import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useAlterarPapel,
  useCatalogoDePermissoes,
  useCriarPapel,
  usePapel,
} from '@/data/acesso-api'
import { useEffect, useState } from 'react'

/**
 * O PAPEL MONTADO POR CAIXAS — o desenho decidido no api#84.
 *
 * O catálogo vem inteiro de `GET /api/permissions`, agrupado por módulo, e o
 * formulário desenha uma caixa por permissão: o papel É o conjunto marcado.
 * Não há hierarquia implícita (`editar` não liga `ver` sozinho) — o que está
 * marcado é o que vale, porque é o que o servidor recebe: `permissions` do
 * `RoleWriteRequest` é o conjunto FINAL, e desmarcar tem efeito.
 *
 * Papel de SISTEMA (`owner`, `admin`) abre para leitura e não grava: o
 * servidor recusaria com 409 `papel-de-sistema`, e um formulário que deixasse
 * editar para tomar o erro no fim seria pior que dizer logo.
 *
 * `null` em `papelId` = **Incluir**; com id = **Alterar** (carrega o conjunto
 * pelo `GET /api/roles/{id}` — a LINHA da listagem não traz as permissões).
 */
export function PapelFormDialog({
  aberto,
  papelId,
  onFechar,
}: {
  aberto: boolean
  papelId: string | null
  onFechar: () => void
}) {
  const catalogo = useCatalogoDePermissoes()
  const papel = usePapel(aberto ? papelId : null)
  const criar = useCriarPapel()
  const alterar = useAlterarPapel()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set())

  // O diálogo não desmonta entre aberturas (mesma razão do motivo de perda):
  // sem isto, alterar um papel e clicar em Incluir herdaria o formulário cheio.
  useEffect(() => {
    if (!aberto) return
    criar.reset()
    alterar.reset()
    if (!papelId) {
      setNome('')
      setDescricao('')
      setAtivo(true)
      setMarcadas(new Set())
    }
  }, [aberto, papelId, criar.reset, alterar.reset])

  // O conjunto chega DEPOIS da abertura (é outra consulta): preencher quando
  // vier, e só enquanto o diálogo estiver aberto para este papel.
  useEffect(() => {
    if (!aberto || !papelId || !papel.data) return
    setNome(papel.data.name)
    setDescricao(papel.data.description ?? '')
    setAtivo(papel.data.active)
    setMarcadas(new Set(papel.data.permissions))
  }, [aberto, papelId, papel.data])

  const deSistema = papel.data?.system === true
  const gravando = criar.isPending || alterar.isPending
  const erro = criar.error ?? alterar.error

  function alternar(chave: string, ligada: boolean) {
    setMarcadas((atual) => {
      const proximo = new Set(atual)
      if (ligada) proximo.add(chave)
      else proximo.delete(chave)
      return proximo
    })
  }

  function gravar() {
    const corpo = {
      name: nome.trim(),
      description: descricao.trim() || null,
      permissions: [...marcadas],
      active: ativo,
    }
    if (!corpo.name || deSistema) return
    if (papelId) {
      alterar.mutate({ id: papelId, corpo }, { onSuccess: onFechar })
      return
    }
    criar.mutate(corpo, { onSuccess: onFechar })
  }

  return (
    <Dialog isOpen={aberto} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>{papelId ? 'Alterar papel' : 'Incluir papel'}</DialogTitle>
      </DialogHeader>

      <div className="flex max-h-[60vh] flex-col gap-[var(--s-3)] overflow-y-auto pr-1">
        <div className="flex flex-col gap-[var(--s-1)]">
          <Label htmlFor="papel-nome">Nome</Label>
          <Input
            id="papel-nome"
            value={nome}
            autoFocus
            disabled={deSistema}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-[var(--s-1)]">
          <Label htmlFor="papel-descricao">Descrição</Label>
          <Input
            id="papel-descricao"
            value={descricao}
            disabled={deSistema}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <Checkbox isSelected={ativo} isDisabled={deSistema} onChange={setAtivo}>
          Ativo
        </Checkbox>

        {deSistema ? (
          <p className="border-2 border-border bg-muted px-2.5 py-1.5 t-meta">
            Papel de sistema: existe em toda organização e não se edita. Para variar, crie um papel
            novo com as caixas que quiser.
          </p>
        ) : null}

        {catalogo.data?.modules.map((modulo) => (
          <fieldset
            key={modulo.key}
            className="flex flex-col gap-[var(--s-2)] border-2 border-border p-2.5"
          >
            <legend className="px-1 t-bloco">{modulo.label}</legend>
            {modulo.permissions.map((permissao) => (
              <Checkbox
                key={permissao.key}
                isSelected={marcadas.has(permissao.key)}
                isDisabled={deSistema}
                onChange={(ligada) => alternar(permissao.key, ligada)}
              >
                <span className="flex flex-col">
                  <span>{permissao.label}</span>
                  {permissao.description ? (
                    <span className="t-meta">{permissao.description}</span>
                  ) : null}
                </span>
              </Checkbox>
            ))}
          </fieldset>
        ))}

        <ErroDeGravacao erro={erro} mensagem="Falha ao gravar o papel." />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="button" onClick={gravar} disabled={!nome.trim() || deSistema || gravando}>
          Gravar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
