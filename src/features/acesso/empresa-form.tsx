import type { TenantWriteRequest } from '@/api/gerado'
import { ErroDeGravacao } from '@/components/cabinet/erro-do-servidor'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAlterarEmpresa, useCriarEmpresa, useEmpresa } from '@/data/empresas-do-grupo-api'
import { RECURSOS, type RecursoDaEmpresa } from '@/data/recursos-da-empresa'
import { useEffect, useState } from 'react'

/**
 * A EMPRESA DO GRUPO — a IDENTIDADE dela, não o timbre.
 *
 * Código, nome fantasia, se está ativa e **o que ela opera**. O cabeçalho do
 * impresso (razão social, CNPJ, Inscrição Estadual, endereço, fone, e-mail) é
 * outro formulário e outra rota: `/api/company-letterhead`, o singleton da
 * empresa ATIVA. Não é organização de tela — é o contrato: aquela rota não
 * aceita id do cliente porque `tenants` não tem RLS, e publicar os mesmos
 * campos aqui, COM id no caminho, seria abrir por baixo a porta que ela fechou.
 *
 * `null` em `empresaId` = **Incluir**; com id = **Alterar** (carrega pelo
 * `GET /api/tenants/{id}` — a LINHA da listagem não traz `features`).
 */

/** Os recursos, com o nome que o operador reconhece do menu. */
const RECURSOS_ROTULADOS: readonly { valor: RecursoDaEmpresa; label: string; ajuda: string }[] = [
  {
    valor: RECURSOS.suppliers,
    label: 'Fornecedores',
    ajuda: 'A empresa compra. Liga o cadastro de fornecedores e o módulo de Compras.',
  },
  {
    valor: RECURSOS.professionals,
    label: 'Profissionais externos',
    ajuda: 'A empresa trabalha com arquiteto e projetista indicando venda.',
  },
  {
    valor: RECURSOS.employees,
    label: 'Colaboradores',
    ajuda: 'A empresa emprega. Liga o cadastro de Equipe.',
  },
]

export function EmpresaFormDialog({
  aberto,
  empresaId,
  somenteLeitura,
  onFechar,
}: {
  aberto: boolean
  empresaId: string | null
  /**
   * O papel do vínculo não alcança a escrita de empresa. O formulário ABRE
   * assim mesmo — ver o que a empresa opera é leitura —, e o Gravar fica preso.
   */
  somenteLeitura: boolean
  onFechar: () => void
}) {
  const empresa = useEmpresa(aberto ? empresaId : null)
  const criar = useCriarEmpresa()
  const alterar = useAlterarEmpresa()

  const [code, setCode] = useState('')
  const [nome, setNome] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [recursos, setRecursos] = useState<ReadonlySet<RecursoDaEmpresa>>(new Set())

  // O diálogo não desmonta entre aberturas (mesma razão do formulário de
  // papel): sem isto, alterar uma empresa e clicar em Incluir herdaria o
  // formulário cheio — e a filial nova nasceria com o código da Matriz.
  useEffect(() => {
    if (!aberto) return
    criar.reset()
    alterar.reset()
    if (!empresaId) {
      setCode('')
      setNome('')
      setAtivo(true)
      setRecursos(new Set())
      return
    }
    const dados = empresa.data
    if (!dados) return
    setCode(dados.code)
    setNome(dados.name)
    setAtivo(dados.active)
    setRecursos(new Set(dados.features))
    // `empresa.data` na lista: o efeito roda de novo quando a consulta chega, e
    // é o que preenche o formulário aberto antes da resposta.
  }, [aberto, empresaId, empresa.data, criar.reset, alterar.reset])

  function alternarRecurso(recurso: RecursoDaEmpresa) {
    setRecursos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(recurso)) proximo.delete(recurso)
      else proximo.add(recurso)
      return proximo
    })
  }

  function corpo(): TenantWriteRequest {
    return {
      code: code.trim(),
      name: nome.trim(),
      active: ativo,
      // Conjunto FINAL: o contrato substitui, não acrescenta.
      features: [...recursos],
    }
  }

  function gravar() {
    const fechar = { onSuccess: () => onFechar() }
    if (empresaId) alterar.mutate({ id: empresaId, corpo: corpo() }, fechar)
    else criar.mutate(corpo(), fechar)
  }

  const gravando = criar.isPending || alterar.isPending
  const podeGravar = !somenteLeitura && code.trim() !== '' && nome.trim() !== '' && !gravando

  return (
    <Dialog isOpen={aberto} onOpenChange={(estado) => (estado ? undefined : onFechar())}>
      <DialogHeader>
        <DialogTitle>{empresaId ? 'Alterar empresa' : 'Nova empresa'}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-[var(--s-4)]">
        <div className="grid grid-cols-6 gap-[var(--s-3)]">
          <div className="col-span-1 flex flex-col gap-[var(--s-1)]">
            <Label htmlFor="empresa-code">Código</Label>
            <Input
              id="empresa-code"
              value={code}
              maxLength={20}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="col-span-5 flex flex-col gap-[var(--s-1)]">
            <Label htmlFor="empresa-name">Nome fantasia</Label>
            <Input id="empresa-name" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
        </div>

        {/* O fantasia NÃO é a razão social, e a tela diz onde a outra mora —
            senão alguém digita a razão aqui e o impresso continua sem ela. */}
        <p className="t-meta">
          O nome fantasia é o rótulo do seletor de empresa. A razão social, o CNPJ e o endereço que
          o documento impresso carimba são o <strong>timbre</strong>, e ele se edita na empresa
          ativa, pelo botão Timbre da linha.
        </p>

        <div className="flex flex-col gap-[var(--s-2)]">
          <span className="t-bloco">O que esta empresa opera</span>
          {/* Estas caixas mudam a BARRA LATERAL de quem trabalha na empresa — é
              a única alteração desta tela cujo efeito aparece na tela de outra
              pessoa. O texto diz isso; esconder seria deixar alguém desligar
              Fornecedores achando que mexeu num rótulo. */}
          <p className="t-meta">
            Desmarcar some com o menu correspondente para todo mundo desta empresa. Nada é apagado —
            remarcar traz tudo de volta.
          </p>
          {RECURSOS_ROTULADOS.map((recurso) => (
            <Checkbox
              key={recurso.valor}
              isSelected={recursos.has(recurso.valor)}
              onChange={() => alternarRecurso(recurso.valor)}
            >
              <span className="flex flex-col">
                <span>{recurso.label}</span>
                <span className="t-meta">{recurso.ajuda}</span>
              </span>
            </Checkbox>
          ))}
        </div>

        <Checkbox isSelected={ativo} onChange={setAtivo}>
          Ativa
        </Checkbox>

        <ErroDeGravacao erro={criar.error ?? alterar.error} mensagem="Falha ao gravar a empresa." />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button type="button" onClick={gravar} isDisabled={!podeGravar}>
          Gravar
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
