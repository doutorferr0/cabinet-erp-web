import { type VinculoDeEmpresa, VinculoDeEmpresaFeaturesItem } from '@/api/gerado'
import { useEmpresasDaSessao } from '@/data/empresas-api'

/**
 * RECURSOS da empresa ativa — o que ESTA empresa opera.
 *
 * Não confundir com `role` (papel): papel é o que a PESSOA pode fazer dentro da
 * empresa (`src/data/papeis.ts`); recurso é o que a EMPRESA contratou. Matriz
 * que compra e emprega vê Fornecedores, Profissional Externo e Colaboradores;
 * uma filial que só vende não vê nenhum dos três — para qualquer papel, até
 * `owner`. Derivar isso do papel diria "este usuário não pode", que é outra
 * frase e outra tela.
 *
 * A fonte é `features` do `VinculoDeEmpresa` (`GET /auth/tenants`), campo
 * `Proposto` no contrato: quem implementar o backend precisa devolvê-lo em todo
 * vínculo, com `[]` quando não há recurso opcional. Enum fechado — valor que o
 * servidor invente cai fora do `RECURSOS` e é ignorado, em vez de acender item
 * de menu que não existe na tela.
 */
export type RecursoDaEmpresa = VinculoDeEmpresaFeaturesItem

export const RECURSOS = VinculoDeEmpresaFeaturesItem

export interface RecursosDaEmpresa {
  /** `true` só quando a empresa ativa declara o recurso. */
  tem: (recurso: RecursoDaEmpresa) => boolean
  /**
   * Se a resposta já é confiável. Enquanto carrega — ou se a consulta falhou —
   * `tem` responde `false`: o menu deixa de afirmar o que ainda não sabe, e o
   * item aparece quando o vínculo chega. O contrário (mostrar tudo até saber)
   * ofereceria tela que a empresa não tem e trocaria erro por sumiço.
   */
  conhecido: boolean
}

/** Recursos declarados pelo vínculo, filtrados pelo enum do contrato. */
export function recursosDoVinculo(vinculo: VinculoDeEmpresa | null): Set<RecursoDaEmpresa> {
  const validos = new Set<string>(Object.values(RECURSOS))
  return new Set((vinculo?.features ?? []).filter((f): f is RecursoDaEmpresa => validos.has(f)))
}

export function useRecursosDaEmpresa(): RecursosDaEmpresa {
  const { ativa, carregando, erro } = useEmpresasDaSessao()
  const conhecido = !carregando && !erro && ativa !== null
  const recursos = conhecido ? recursosDoVinculo(ativa) : new Set<RecursoDaEmpresa>()
  return { tem: (recurso) => recursos.has(recurso), conhecido }
}
