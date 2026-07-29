/**
 * Tabelas de apoio do padrão `[combo +...]` — transcrição §9 padrão 2 (19 kinds).
 * TODO(contract): opções reais virão do backend na integração.
 */
export const LOOKUP_KINDS = {
  setor: {
    label: 'Setor',
    options: ['VENDAS', 'ESTOQUE', 'FINANCEIRO', 'ADMINISTRATIVO', 'COMPRAS'],
  },
  grauInstrucao: {
    label: 'Grau de Instrução',
    options: ['FUNDAMENTAL', 'MÉDIO', 'SUPERIOR INCOMPLETO', 'SUPERIOR', 'PÓS-GRADUAÇÃO'],
  },
  profissao: {
    label: 'Profissão',
    options: ['VENDEDOR', 'ARQUITETO', 'DESIGNER DE INTERIORES', 'ENGENHEIRO', 'AUTÔNOMO'],
  },
  racaCor: { label: 'Raça/Cor', options: ['BRANCA', 'PRETA', 'PARDA', 'AMARELA', 'INDÍGENA'] },
  estadoCivil: {
    label: 'Estado Civil',
    options: ['SOLTEIRO(A)', 'CASADO(A)', 'DIVORCIADO(A)', 'VIÚVO(A)', 'UNIÃO ESTÁVEL'],
  },
  nacionalidade: {
    label: 'Nacionalidade',
    options: ['BRASILEIRA', 'PORTUGUESA', 'ITALIANA', 'ALEMÃ'],
  },
  cargo: {
    label: 'Cargo',
    options: ['VENDEDOR', 'CONSULTOR DE VENDAS', 'GERENTE', 'COMPRADOR', 'AUXILIAR DE ESTOQUE'],
  },
  vinculo: { label: 'Vínculo', options: ['CLT', 'PJ', 'ESTÁGIO', 'AUTÔNOMO'] },
  categoria: {
    label: 'Categoria',
    options: ['CONSUMIDOR FINAL', 'ARQUITETO', 'CONSTRUTORA', 'REVENDA', 'CORPORATIVO'],
  },
  profissional: {
    label: 'Profissional',
    options: [
      'MARIANA',
      'ARIADINE',
      'ANA ELIZA',
      'MALU',
      'GIORDANA',
      'FLAVIO COSSA',
      'SILVANIA',
      'RICARDO',
    ],
  },
  tipoProduto: {
    label: 'Tipo de Produto',
    options: [
      'PENDENTE',
      'PLAFON',
      'SPOT',
      'ARANDELA',
      'LUSTRE',
      'ABAJUR',
      'PERFIL LED',
      'LÂMPADA',
    ],
  },
  tipoPeca: {
    label: 'Tipo da Peça',
    options: ['REDONDA', 'QUADRADA', 'LINEAR', 'DIRECIONÁVEL'],
  },
  tipoLinha: {
    label: 'Tipo da Linha',
    options: ['RESIDENCIAL', 'COMERCIAL', 'INDUSTRIAL', 'DECORATIVA'],
  },
  classificacao: {
    label: 'Classificação do Produto',
    options: ['PADRÃO', 'PREMIUM', 'ECONÔMICO', 'SOB MEDIDA'],
  },
  designerModelo: {
    label: 'Designer\\Modelo',
    options: ['LINHA PRÓPRIA', 'STUDIO', 'ASSINADO'],
  },
  fabrica: {
    label: 'Fábrica',
    options: [
      'STELLA',
      'ILUMINAR',
      'INTERLIGHT',
      'ATIVA COMERCIAL',
      'DRAMALUX',
      'VIA HF ILUMINAÇÃO',
    ],
  },
  marca: {
    label: 'Marca',
    options: ['STELLA', 'ILUMINAR', 'INTERLIGHT', 'EVOLED', 'DRAMALUX', 'MISTER LED', 'FILLAMENTO'],
  },
  materiais: {
    label: 'Materiais',
    options: ['ALUMÍNIO', 'AÇO', 'CRISTAL', 'VIDRO', 'TECIDO', 'MADEIRA'],
  },
  impostosPadrao: {
    label: 'Impostos Padrão',
    options: ['ICMS 18% SP', 'ICMS 12% INTERESTADUAL', 'ISENTO', 'ST - SUBSTITUIÇÃO TRIBUTÁRIA'],
  },
} as const

export type LookupKind = keyof typeof LOOKUP_KINDS

export function lookupLabel(kind: LookupKind): string {
  return LOOKUP_KINDS[kind].label
}

export function lookupOptions(kind: LookupKind): readonly string[] {
  return LOOKUP_KINDS[kind].options
}
