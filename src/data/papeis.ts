/**
 * Papéis de acesso — conjunto FECHADO, vindo do backend.
 *
 * Fonte: `docs/contrato/schema-canonico.sql` do `vitra-erp-dotnet` —
 * `employee_company.role text NOT NULL CHECK (role IN
 * ('owner','admin','operator-full','operator-sales','viewer'))`. Não é lista
 * inventada: o banco recusa qualquer valor fora dela.
 *
 * O rótulo em PT-BR é UI, como já vale para os lookups ("rótulo é UI, não dado").
 * O identificador que trafega continua sendo o do contrato.
 *
 * `super-admin` NÃO está aqui de propósito: o `project-core.md` registra que ele
 * precisa ser quebrado (admin-da-organização ≠ suporte-da-plataforma) e o CHECK
 * do schema não o inclui.
 */
export const PAPEIS = {
  owner: 'Proprietário',
  admin: 'Administrador',
  'operator-full': 'Operador',
  'operator-sales': 'Operador de Vendas',
  viewer: 'Consulta',
} as const

export type Papel = keyof typeof PAPEIS

/**
 * Rótulo do papel; devolve o identificador cru quando ele não é conhecido.
 *
 * Papel novo no backend aparece na tela como veio, em vez de sumir ou virar
 * "desconhecido" — o operador vê algo verdadeiro e o desalinhamento fica visível.
 */
export function papelLabel(role: string): string {
  return PAPEIS[role as Papel] ?? role
}
