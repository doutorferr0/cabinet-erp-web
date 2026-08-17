import type { LucideIcon } from 'lucide-react'
import {
  AtSign,
  Briefcase,
  Building2,
  FileText,
  Handshake,
  IdCard,
  Landmark,
  MapPin,
  Phone,
  PieChart,
  Receipt,
  StickyNote,
  Target,
  UserCheck,
} from 'lucide-react'

/**
 * O SELO de cada módulo — o ícone que o mockup aprovado
 * (`mockup-cadastro-hierarquia.html`) põe num quadrado de borda no cabeçalho
 * de todo bloco. Ordem do user (2026-08-17): "ícones/símbolos onde necessário",
 * junto com a cor forte em todas as opções de cadastro.
 *
 * Mora AQUI e não no schema (`tipos.ts`): o schema é dado puro consumido por
 * form, ficha e grade, e componente React dentro dele obrigaria a grade — que
 * nunca desenha ícone — a carregar `lucide-react` de graça. O mapa é por `id`
 * de módulo, que já é único dentro da entidade e estável entre elas
 * (`endereco` é `endereco` no Cliente e no Fornecedor).
 *
 * Módulo sem entrada aqui renderiza sem selo — é o caso legítimo do bloco
 * novo que ainda não ganhou símbolo, não um erro.
 */
const ICONE_DO_MODULO: Readonly<Record<string, LucideIcon>> = {
  identificacao: IdCard,
  documentos: FileText,
  fiscal: Receipt,
  comercial: Handshake,
  representante: UserCheck,
  participacao: PieChart,
  empresas: Building2,
  trabalhistas: Briefcase,
  metas: Target,
  endereco: MapPin,
  enderecoBanco: MapPin,
  contatos: Phone,
  bancario: Landmark,
  redes: AtSign,
  observacao: StickyNote,
}

/**
 * No formato de spread condicional que os quatro forms já usam para `cor` —
 * `exactOptionalPropertyTypes` não aceita `icone={undefined}`.
 */
export function propsDoIcone(id: string): { icone: LucideIcon } | Record<string, never> {
  const icone = ICONE_DO_MODULO[id]
  return icone ? { icone } : {}
}
