import type { PartnerDto } from '@/api/gerado'
import type { PapelDeCadastro } from '@/features/parceiro/usar-parceiro'
import { type Profissional, profissionalVazio } from '@/mocks/profissionais'

/**
 * Linha da listagem → registro do formulário.
 *
 * Base em `profissionalVazio`: o que o `PartnerDto` não cobre nasce em branco,
 * e é assim que deve ficar. Herdar de mock daria dado de mentira com cara de
 * dado do servidor. O `id` numérico do mock fica em 0 — a chave real é o uuid,
 * e quem o guarda é a rota, não o formulário.
 */
function dtoParaForm(dto: PartnerDto): Profissional {
  return {
    ...profissionalVazio(0),
    nome: dto.legalName,
    nomeApresentacao: dto.tradeName ?? '',
    cpf: dto.document ?? '',
    email: dto.email ?? '',
    ativo: dto.active,
  }
}

export const papelProfissional: PapelDeCadastro<Profissional> = {
  role: 'professional',
  rota: '/cadastros/profissionais',
  queryKeyListagem: ['profissionais'],
  camposDeEdicao: 'Nome, Nome de Apresentação, CPF/CNPJ, E-mail e Ativo',
  vazio: profissionalVazio,
  dtoParaForm,
  paraEscrita: (values) => ({
    legalName: values.nome,
    tradeName: values.nomeApresentacao,
    document: values.cpf,
    email: values.email,
    active: values.ativo,
  }),
  paraInclusao: (values) => ({
    legalName: values.nome,
    tradeName: values.nomeApresentacao,
    document: values.cpf,
    email: values.email,
    active: values.ativo,
  }),
}
