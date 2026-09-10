import { lookupPostalCode, type PartnerAddress } from '@/api/gerado'
import { dadosOuErro, type RespostaDaApi } from '@/data/api-provider'

export async function buscarCep(cep: string): Promise<PartnerAddress | null> {
  const resposta: RespostaDaApi = await lookupPostalCode(cep.replace(/\D/g, ''))
  if (resposta.status === 404) return null
  return dadosOuErro<PartnerAddress>(resposta, 'Falha ao consultar o CEP.')
}
