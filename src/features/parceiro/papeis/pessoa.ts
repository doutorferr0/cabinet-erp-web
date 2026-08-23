import type { PartnerDto } from '@/api/gerado'

/**
 * TRADUÇÃO ENTRE O FORMULÁRIO E O CONTRATO — quem é a PESSOA (bloco 3, #270).
 *
 * Irmão de `contato-e-endereco`, e pelo mesmo motivo: Cliente e Profissional
 * guardam os dados pessoais na mesma forma (`tipoPessoa`, `rg`,
 * `orgaoExpedicao`, `ufRg`, `sexo`, `dtNascimento`) e o contrato tem uma só
 * (`personType`, `identityDocument`, `identityIssuer`, `identityIssuerState`,
 * `gender`, `birthDate`). Copiar a conversão nos dois papéis daria duas chances
 * de trocar o órgão expedidor pela UF.
 *
 * ## `personType` é o único que muda de VOCABULÁRIO, não só de nome
 *
 * O formulário fala `FISICA`/`JURIDICA` — os rótulos do radio da aba
 * `Principal` do legado. O contrato fala `individual`/`company`, porque a
 * whitelist do servidor é em inglês como todo o resto do `PartnerDto`. Mandar
 * `'FISICA'` dá **400 na validação do enum**, medido no par local em
 * 2026-08-21: `body/personType must be equal to one of the allowed values`.
 * Por isso a tradução é uma tabela e não um `as`.
 *
 * ## Ausência não vira `FISICA`
 *
 * O radio é obrigatório e o registro em branco nasce `FISICA` — é o que faz o
 * controle ser controlado. Só que cadastro que existe desde antes deste campo
 * tem `personType: null` no servidor, e o default então **afirma** que a pessoa
 * é física. É o defeito que `registro-para-ficha` já mediu com dado real
 * ("um cliente com CNPJ de 14 dígitos dizia Tipo de pessoa: FISICA"), e a
 * resposta é a mesma: o formulário fica com o default, porque precisa; a FICHA
 * recebe o campo apagado, via `ausentesNoServidor`.
 */

/** O vocabulário do contrato. `null` = o servidor nunca soube. */
export type TipoDePessoaDoContrato = 'individual' | 'company'

/** O vocabulário do formulário — os rótulos do radio do legado. */
export type TipoDePessoaDoForm = 'FISICA' | 'JURIDICA'

const PARA_O_FORM: Record<TipoDePessoaDoContrato, TipoDePessoaDoForm> = {
  individual: 'FISICA',
  company: 'JURIDICA',
}

const PARA_O_CONTRATO: Record<TipoDePessoaDoForm, TipoDePessoaDoContrato> = {
  FISICA: 'individual',
  JURIDICA: 'company',
}

/**
 * `personType` → radio. Ausente fica `FISICA` porque o controle precisa de
 * valor; quem impede a ficha de repetir esse default é `ausentesNoServidor`.
 */
export function tipoDePessoaDoContrato(personType: string | null | undefined): TipoDePessoaDoForm {
  if (personType === 'individual' || personType === 'company') return PARA_O_FORM[personType]
  return 'FISICA'
}

/** Radio → `personType`. Valor fora do par vira `null`: melhor não afirmar. */
export function tipoDePessoaParaContrato(
  tipoPessoa: string | null | undefined,
): TipoDePessoaDoContrato | null {
  if (tipoPessoa === 'FISICA' || tipoPessoa === 'JURIDICA') return PARA_O_CONTRATO[tipoPessoa]
  return null
}

/**
 * Os campos do formulário que o servidor NÃO preencheu e que só têm valor por
 * default do registro em branco.
 *
 * Hoje é um só. Ele está aqui, e não numa constante solta na rota, porque a
 * pergunta é sobre o DTO — só quem lê o `PartnerDto` sabe responder — e porque
 * o dia em que um segundo campo obrigatório entrar no contrato a resposta muda
 * neste arquivo, não em três rotas.
 */
export function ausentesNoServidor(dto: PartnerDto | null): string[] {
  if (!dto) return []
  return dto.personType == null ? ['tipoPessoa'] : []
}
