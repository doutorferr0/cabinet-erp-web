/**
 * Transportadora, para o `[busca +...]` da Ordem de Compra (transcrição §7.2,
 * §9 padrão 3 — uma das 10 buscas). Só consulta, sem `Incluir`: mesma
 * fronteira de `cidades.ts` — é tabela de apoio, e o cadastro completo
 * ("Transportadoras", item do menu Cadastros §1) segue sem captura, então só
 * os TRÊS campos que a Ordem de Compra já lê de volta (nome, município, UF)
 * entram aqui. Endereço/telefone/CNPJ ficam de fora até existir print.
 */
export interface Transportadora {
  codigo: string
  nome: string
  municipio: string
  uf: string
}

export const transportadoras: Transportadora[] = [
  { codigo: 'T01', nome: 'TRANSPORTES CAMPINAS LTDA', municipio: 'CAMPINAS', uf: 'SP' },
  { codigo: 'T02', nome: 'RÁPIDO VALE DO SOL', municipio: 'SÃO PAULO', uf: 'SP' },
  { codigo: 'T03', nome: 'JAMEF TRANSPORTES', municipio: 'BARUERI', uf: 'SP' },
  { codigo: 'T04', nome: 'BRASPRESS TRANSPORTES', municipio: 'OSASCO', uf: 'SP' },
  { codigo: 'T05', nome: 'TNT MERCÚRIO CARGO', municipio: 'JUNDIAÍ', uf: 'SP' },
]
