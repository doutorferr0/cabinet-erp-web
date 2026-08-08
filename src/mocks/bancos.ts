/**
 * Banco, para o `[busca +...]` de Dados Bancários (transcrição §3, Profissional
 * Externo — "Nº do banco [busca +...] · Nome do banco [texto]"; §9 padrão 3,
 * uma das 10 buscas). Mesma fronteira de `cidades`/`transportadoras`: só
 * consulta, sem `Incluir` — não é cadastro operado por este sistema.
 *
 * Os códigos são o número COMPE oficial (Febraban/Bacen), dado público — não
 * inventado, ao contrário do que valeria pra um cadastro de negócio.
 */
export interface Banco {
  codigo: string
  nome: string
}

export const bancos: Banco[] = [
  { codigo: '001', nome: 'BANCO DO BRASIL S.A.' },
  { codigo: '033', nome: 'BANCO SANTANDER (BRASIL) S.A.' },
  { codigo: '104', nome: 'CAIXA ECONÔMICA FEDERAL' },
  { codigo: '237', nome: 'BANCO BRADESCO S.A.' },
  { codigo: '341', nome: 'ITAÚ UNIBANCO S.A.' },
  { codigo: '422', nome: 'BANCO SAFRA S.A.' },
  { codigo: '070', nome: 'BRB - BANCO DE BRASÍLIA S.A.' },
  { codigo: '077', nome: 'BANCO INTER S.A.' },
  { codigo: '260', nome: 'NU PAGAMENTOS S.A. (NUBANK)' },
  { codigo: '290', nome: 'PAGSEGURO INTERNET S.A.' },
  { codigo: '323', nome: 'MERCADO PAGO IP LTDA.' },
  { codigo: '212', nome: 'BANCO ORIGINAL S.A.' },
]
