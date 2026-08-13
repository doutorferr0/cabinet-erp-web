import { AutoForm } from '@autoform/react'
import { ZodProvider, fieldConfig } from '@autoform/zod'
import { z } from 'zod'

/**
 * O CUSTO da adoção do AutoForm — STAGED, e escrito para NÃO ser integrado.
 *
 * Este arquivo existe como prova de tamanho. `avaliacao.md` afirma que
 * configurar o AutoForm para o contrato do Cabinet custa escrever à mão o mapa
 * que ele existe para evitar. Aqui está o mapa, para UM formulário, com os
 * campos que o contrato já tem hoje.
 *
 * A dependência `@autoform/*` NÃO foi instalada — nada aqui compila, e
 * `tsconfig.app.json` só inclui `src`.
 */

// -------------------------------------------------------------------
// Por que não dá para usar o schema gerado direto
// -------------------------------------------------------------------
// `@autoform/zod` lê a configuração de campo de DENTRO do schema, por uma
// checagem que carrega um símbolo. Para configurar um campo é preciso escrever
// `.check(fieldConfig({...}))` no schema — e o schema mora em
// `src/api/gerado/index.zod.ts`, que o CLAUDE.md proíbe editar e o `pnpm
// codegen` reescreve.
//
// Sobra reconstruir o schema aqui. E reconstruir é o oposto de gerar: o dia em
// que o contrato ganhar um campo, este arquivo não fica desatualizado com erro
// de tipo — fica desatualizado em silêncio, e o campo novo simplesmente não
// aparece na tela.
const parceiroComRotulos = z.object({
  document: z
    .string()
    .nullable()
    .check(fieldConfig({ label: 'CNPJ / CPF', fieldType: 'documento' })),

  legalName: z
    .string()
    .nullable()
    .check(fieldConfig({ label: 'Razão Social' })),

  tradeName: z
    .string()
    .nullable()
    .check(fieldConfig({ label: 'Nome Fantasia' })),

  email: z
    .string()
    .nullable()
    .check(fieldConfig({ label: 'E-mail' })),

  isCustomer: z
    .boolean()
    .nullable()
    .check(fieldConfig({ label: 'Cliente' })),

  isSupplier: z
    .boolean()
    .nullable()
    .check(fieldConfig({ label: 'Fornecedor' })),

  isProfessional: z
    .boolean()
    .nullable()
    .check(fieldConfig({ label: 'Profissional' })),

  code: z
    .string()
    .nullable()
    .check(fieldConfig({ label: 'Código' })),

  paymentTerms: z
    .string()
    .nullable()
    // Lista de apoio: precisa de `LookupCombo` com botão `...`. O tipo do campo
    // não diz de qual lista, então o componente entra por `fieldType` e a lista
    // por `customData` — mais um mapa a manter.
    .check(
      fieldConfig({
        label: 'Condição de Pagamento',
        fieldType: 'lookup',
        customData: { kind: 'CONDICAO_PAGAMENTO' },
      }),
    ),

  active: z
    .boolean()
    .nullable()
    .check(fieldConfig({ label: 'Ativo' })),

  registration: z
    .string()
    .nullish()
    // Sem este rótulo, o campo sairia rotulado com a nota de contrato inteira:
    // "Proposto. Registro Profissional (CREA, CAU, CFT). `PUT` substitui o
    // registro inteiro: omitir apaga." Ver `avaliacao.md`, defeito 1.
    .check(fieldConfig({ label: 'Registro Profissional' })),

  // `payoutBankInfo` é `union([null, object])` no contrato, e a inferência de
  // tipo do AutoForm não tem ramo para união: cairia em caixa de TEXTO. Aqui
  // teria de ser reconstruído como objeto, campo a campo, mais um componente
  // próprio para a busca de banco — ou seja, o bloco compartilhado escrito de
  // novo por dentro de outro formato.
})

/**
 * E depois de tudo isso, o que ainda NÃO se resolve por configuração:
 *
 * - **Abas** (padrão 4). O AutoForm renderiza a ordem das chaves, num fluxo só.
 *   Dividir em abas exige um schema por aba, e o padrão do repo é 1 form por
 *   TELA, não por aba.
 * - **Ordem.** A ordem das chaves é a do contrato — modelagem do servidor, não
 *   leitura do operador.
 * - **Obrigatoriedade.** Os 10 campos `.nullable()` continuam marcados com `*`,
 *   porque o AutoForm deriva `required` só de `optional`. Não há chave de
 *   `fieldConfig` que desligue isso.
 * - **Rodapé fixo Gravar/Cancelar** e a barra de ações padrão.
 */
export function ParceiroAutoForm() {
  return (
    <AutoForm
      schema={new ZodProvider(parceiroComRotulos)}
      onSubmit={(dados) => console.log(dados)}
      withSubmit
    />
  )
}
