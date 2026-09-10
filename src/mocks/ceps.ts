/**
 * Base de CEP mockada para a "busca endereço por CEP" (botão lupa — transcrição §5).
 * TODO(contract): substituir por consulta real na integração.
 */
export interface CepResult {
  cep: string
  logradouro: string
  bairro: string
  cidadeCodigo: string
  cidadeNome: string
  uf: string
}

const CEPS: Record<string, CepResult> = {
  '13010111': {
    cep: '13010-111',
    logradouro: 'Avenida Francisco Glicério',
    bairro: 'Centro',
    cidadeCodigo: '354',
    cidadeNome: 'CAMPINAS',
    uf: 'SP',
  },
  '13083871': {
    cep: '13083-871',
    logradouro: 'Avenida Albert Einstein',
    bairro: 'Cidade Universitária',
    cidadeCodigo: '354',
    cidadeNome: 'CAMPINAS',
    uf: 'SP',
  },
  '01310100': {
    cep: '01310-100',
    logradouro: 'Avenida Paulista',
    bairro: 'Bela Vista',
    cidadeCodigo: '510',
    cidadeNome: 'SÃO PAULO',
    uf: 'SP',
  },
}

/** Retorna null quando o CEP não está na base (o legado deixaria o usuário digitar). */
export function fetchCep(cep: string, delayMs = 200): Promise<CepResult | null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(CEPS[somenteDigitos(cep)] ?? null), delayMs)
  })
}

import { somenteDigitos } from '@/lib/cep'
