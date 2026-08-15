import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CampoCadastro, EntidadeCadastro } from '@/features/cadastro/modulos'
import type { FiltroDaTabela } from '@/lib/filtro-de-consulta'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useId, useState } from 'react'
import {
  ativosDoModulo,
  campoDoFiltro,
  filtroDoCampo,
  idDoFiltro,
  moduloDoFiltro,
  modulosFiltraveis,
} from './modulos-da-consulta'

/**
 * FILTRAR POR MÓDULO — a mesma lógica de módulo aplicada à busca (#104).
 *
 * A barra de filtro plana não escala: com quarenta campos por entidade o
 * operador não sabe o que dá para filtrar, e descobre tentando. Aqui a faixa de
 * chips responde isso antes do primeiro clique — cada módulo é um assunto, e o
 * número no chip diz quantas perguntas já estão feitas sobre ele.
 *
 * ## Um painel de cada vez, e é decisão
 *
 * Clicar num chip abre o painel DAQUELE módulo e fecha o anterior. Vários
 * painéis abertos reconstruiriam a barra plana que esta issue existe para
 * desfazer — a diferença seria só o enfeite em volta.
 *
 * O filtro **não some ao fechar o painel**: ele vira pill na faixa de ativos.
 * Fechar é parar de editar, não desfazer.
 *
 * ## A cor vem do MÓDULO, e é a mesma do formulário e da ficha
 *
 * `data-modulo` no elemento e as utilities `bg-modulo`/`bg-modulo-cheia`
 * resolvem o par pela cascata do `index.css` — nenhum hex aqui. Módulo sem cor
 * atribuída (Colaborador não tem, e é decisão do user) cai no neutro, que é
 * desenho legítimo e não falta de acabamento.
 */

export interface FiltroPorModuloProps {
  entidade: EntidadeCadastro
  filtros: readonly FiltroDaTabela[]
  onChange: (filtros: FiltroDaTabela[]) => void
}

/** O controle de um campo, na variante que o schema pediu. */
function ControleDoCampo({
  campo,
  valor,
  onChange,
}: {
  campo: CampoCadastro
  valor: string | string[]
  onChange: (valor: string | string[]) => void
}) {
  const id = useId()
  const par = Array.isArray(valor) ? valor : ['', '']

  if (campo.fil === 'data' || campo.fil === 'faixa') {
    const tipo = campo.fil === 'data' ? 'date' : 'number'
    const rotulo = campo.fil === 'data' ? 'período' : 'de / até'
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-de`}>
          {campo.r} <span className="text-muted-foreground">— {rotulo}</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={`${id}-de`}
            type={tipo}
            value={par[0] ?? ''}
            aria-label={`${campo.r} de`}
            onChange={(e) => onChange([e.target.value, par[1] ?? ''])}
          />
          <span aria-hidden="true" className="font-bold">
            →
          </span>
          <Input
            type={tipo}
            value={par[1] ?? ''}
            aria-label={`${campo.r} até`}
            onChange={(e) => onChange([par[0] ?? '', e.target.value])}
          />
        </div>
      </div>
    )
  }

  if (campo.fil === 'sel' && campo.op) {
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{campo.r}</Label>
        <select
          id={id}
          className="h-9 border-2 border-input bg-card px-2 text-sm outline-none focus-visible:focus-ring"
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Qualquer</option>
          {campo.op.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (campo.fil === 'bool') {
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{campo.r}</Label>
        <select
          id={id}
          className="h-9 border-2 border-input bg-card px-2 text-sm outline-none focus-visible:focus-ring"
          value={typeof valor === 'string' ? valor : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Qualquer</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{campo.r}</Label>
      <Input
        id={id}
        value={typeof valor === 'string' ? valor : ''}
        placeholder="contém…"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function FiltroPorModulo({ entidade, filtros, onChange }: FiltroPorModuloProps) {
  const [aberto, setAberto] = useState<string | null>(null)
  const modulos = modulosFiltraveis(entidade)
  const ativo = modulos.find((item) => item.modulo.id === aberto)

  function valorDe(campo: CampoCadastro): string | string[] {
    const id = idDoFiltro(entidade, campo)
    return (
      filtros.find((filtro) => filtro.id === id)?.valor ??
      (campo.fil === 'data' || campo.fil === 'faixa' ? ['', ''] : '')
    )
  }

  function aplicar(campo: CampoCadastro, valor: string | string[]) {
    const id = idDoFiltro(entidade, campo)
    if (!id) return
    const outros = filtros.filter((filtro) => filtro.id !== id)
    const vazio = Array.isArray(valor) ? valor.every((v) => !v) : !valor
    if (vazio) {
      onChange(outros)
      return
    }
    const novo = filtroDoCampo(entidade, campo, valor)
    onChange(novo ? [...outros, novo] : outros)
  }

  if (modulos.length === 0) return null

  return (
    <div data-slot="filtro-por-modulo" className="flex flex-col gap-2">
      <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.12em]">
        Filtrar por módulo
      </p>

      <div className="flex flex-wrap gap-2">
        {modulos.map(({ modulo }) => {
          const n = ativosDoModulo(entidade, modulo, filtros)
          const abertoAqui = aberto === modulo.id
          return (
            <button
              key={modulo.id}
              type="button"
              // O chip é alternador: clicar no aberto fecha, e é o mesmo gesto.
              onClick={() => setAberto(abertoAqui ? null : modulo.id)}
              aria-expanded={abertoAqui}
              {...(modulo.cor ? { 'data-modulo': modulo.cor } : {})}
              className={cn(
                'flex items-center gap-2 border-2 border-border px-2.5 py-1 text-sm font-semibold',
                abertoAqui ? 'bg-modulo' : 'bg-card',
                'focus-visible:focus-ring',
              )}
            >
              <span aria-hidden="true" className="size-3 border-2 border-border bg-modulo-cheia" />
              {modulo.titulo}
              {n > 0 ? (
                <span className="border-2 border-border bg-card px-1 font-mono text-[11px] tabular-nums">
                  {n}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {ativo ? (
        <div
          {...(ativo.modulo.cor ? { 'data-modulo': ativo.modulo.cor } : {})}
          className="flex flex-col gap-3 border-2 border-border bg-modulo p-3"
        >
          <div className="flex items-center gap-2">
            <strong className="text-sm">Filtros de {ativo.modulo.titulo}</strong>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => setAberto(null)}
            >
              Fechar
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ativo.campos.map((campo) => (
              <ControleDoCampo
                key={campo.k}
                campo={campo}
                valor={valorDe(campo)}
                onChange={(valor) => aplicar(campo, valor)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <FiltrosAtivos entidade={entidade} filtros={filtros} onChange={onChange} />
    </div>
  )
}

/**
 * As pills do que está filtrando agora, na cor do módulo de origem.
 *
 * Existem porque o painel fecha e o filtro fica: sem elas, a listagem estreita
 * e o operador não tem onde ler por quê. Cada uma remove EXATAMENTE um filtro —
 * o `filtroId` é identidade de linha, e duas condições sobre o mesmo campo são
 * duas pills.
 */
function FiltrosAtivos({
  entidade,
  filtros,
  onChange,
}: {
  entidade: EntidadeCadastro
  filtros: readonly FiltroDaTabela[]
  onChange: (filtros: FiltroDaTabela[]) => void
}) {
  if (filtros.length === 0) return null

  return (
    <div data-slot="filtros-ativos" className="flex flex-wrap items-center gap-2">
      {filtros.map((filtro) => {
        const campo = campoDoFiltro(entidade, filtro.id)
        const modulo = moduloDoFiltro(entidade, filtro.id)
        const texto = Array.isArray(filtro.valor)
          ? filtro.valor.filter(Boolean).join(' → ')
          : filtro.valor
        return (
          <span
            key={filtro.filtroId}
            {...(modulo?.cor ? { 'data-modulo': modulo.cor } : {})}
            className="flex items-center gap-1.5 border-2 border-border bg-modulo px-2 py-0.5 text-sm"
          >
            <strong>{campo?.r ?? filtro.id}:</strong>
            {texto}
            <button
              type="button"
              aria-label={`Remover filtro ${campo?.r ?? filtro.id}`}
              className="focus-visible:focus-ring"
              onClick={() => onChange(filtros.filter((f) => f.filtroId !== filtro.filtroId))}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        )
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([])}>
        Limpar tudo
      </Button>
    </div>
  )
}
