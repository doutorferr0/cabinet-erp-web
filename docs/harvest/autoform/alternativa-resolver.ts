import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

/**
 * A ALTERNATIVA ao AutoForm — STAGED, não integrado (ver ../README.md).
 *
 * O que se quer do AutoForm é "validação vinda do contrato". Isso se tem sem
 * ele, sem dependência nova, e sem abrir mão dos 8 padrões de formulário do
 * repo. Ver `avaliacao.md` §"A recomendação".
 *
 * Pressupõe um segundo bloco de saída no `orval.config.ts`:
 *
 *     zod: {
 *       input: { target: './contracts/openapi-v1.json' },
 *       output: { target: 'src/api/gerado/index.zod.ts', client: 'zod', mode: 'single' },
 *     }
 *
 * Gerado e COMMITADO como o resto de `src/api/gerado/` — o CI reprova gerado
 * fora de sincronia com `contracts/`.
 */

// No código integrado isto viria de `@/api/gerado/index.zod`. Aqui é uma
// reprodução fiel do que o Orval 8.23.0 emitiu para `PUT /api/partners/{id}`,
// reduzida aos campos que a demonstração usa.
const UpdatePartnerBody = z.object({
  document: z.string().nullable(),
  legalName: z.string().nullable(),
  email: z.string().nullable(),
  active: z.boolean().nullable(),
})

/**
 * O contrato descreve FORMA; a tela tem regra que o contrato não expressa.
 *
 * A composição é em duas camadas de propósito, e a ordem importa: o schema
 * gerado entra inteiro, sem ser reescrito, e o que a tela sabe a mais entra por
 * cima. Assim o `pnpm codegen` continua sendo a única coisa que mexe na camada
 * de baixo, e o diff de um campo novo no contrato aparece onde deve aparecer.
 *
 * A camada de cima NÃO encolhe até virar nada — o contrato não sabe que
 * `document` é CNPJ, nem que a tela exige razão social. Ela encolhe, só.
 */
export const parceiroFormSchema = UpdatePartnerBody.extend({
  // TODO(contract): sai daqui se o contrato ganhar `minLength` em `legalName`.
  legalName: z
    .string()
    .nullable()
    .refine((v) => v !== null && v.trim().length > 0, 'Informe a razão social.'),

  // O contrato guarda o documento sem máscara (convenção do repo). A máscara é
  // do input; a validação é do dado.
  document: z
    .string()
    .nullable()
    .refine((v) => v === null || /^\d{14}$|^\d{11}$/.test(v), 'CNPJ ou CPF inválido.'),
})

export type ParceiroForm = z.infer<typeof parceiroFormSchema>

/**
 * O `resolver` para o `useForm` da tela. O resto do formulário continua composto
 * à mão com `<FormBlock>`, `<LookupCombo>`, abas e rodapé fixo — que é
 * exatamente o que o AutoForm não conseguiria montar.
 */
export const parceiroResolver = zodResolver(parceiroFormSchema)
