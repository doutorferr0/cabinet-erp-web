/** Cidade para `[busca +...]` (transcrição §9 padrão 5). TODO(contract). */
export interface Cidade {
  codigo: string
  nome: string
  uf: string
}

export const cidades: Cidade[] = [
  { codigo: '354', nome: 'CAMPINAS', uf: 'SP' },
  { codigo: '510', nome: 'SÃO PAULO', uf: 'SP' },
  { codigo: '187', nome: 'BARUERI', uf: 'SP' },
  { codigo: '390', nome: 'OSASCO', uf: 'SP' },
  { codigo: '489', nome: 'SANTO ANDRÉ', uf: 'SP' },
  { codigo: '523', nome: 'SÃO BERNARDO DO CAMPO', uf: 'SP' },
  { codigo: '107', nome: 'AMERICANA', uf: 'SP' },
  { codigo: '290', nome: 'JUNDIAÍ', uf: 'SP' },
  { codigo: '386', nome: 'PIRACICABA', uf: 'SP' },
  { codigo: '280', nome: 'HOLAMBRA', uf: 'SP' },
  { codigo: '276', nome: 'HORTOLÂNDIA', uf: 'SP' },
  { codigo: '460', nome: 'RIO DE JANEIRO', uf: 'RJ' },
  { codigo: '355', nome: 'CURITIBA', uf: 'PR' },
  { codigo: '120', nome: 'BELO HORIZONTE', uf: 'MG' },
]
