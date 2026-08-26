import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { Pendencias } from '@/components/cabinet/campos-do-modulo'
import { moduloContatos } from '@/features/cadastro/modulos'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * O RODAPÉ DE PENDÊNCIAS NÃO PODE NEGAR O QUE O BLOCO DESENHA.
 *
 * `Pendencias` lista o que o mockup pede e o repo não guarda, e escolhia por
 * `!campo.campo`. Sub-recurso não tem `campo` — e não é lacuna: é dado que
 * EXISTE, em caminho HTTP próprio, desenhado logo acima pelo bloco vizinho
 * (`<ContatosDoParceiro>`). Sem excluir `sub`, declarar a grade na espec do
 * `moduloContatos()` faria a tela imprimir *"Ainda não guardamos: Contatos"*
 * embaixo da grade de contatos daquele cadastro.
 *
 * Foi por isso que a declaração ficou de fora da #331 (web#293): espec certa
 * com tela mentindo é pior que espec incompleta. As duas metades entram juntas,
 * e este arquivo é o que impede de voltarem separadas.
 */
describe('Pendencias não conta sub-recurso como lacuna', () => {
  // O módulo REAL do Cliente: `comunicadores: false` deixa os quatro
  // comunicadores sem `campo`, então este bloco TEM lacuna de verdade. É o
  // cenário em que o rodapé aparece — e é onde o defeito se via.
  const modulo = moduloContatos({ comunicadores: false })

  it('a espec declara a grade de contatos como sub-recurso', () => {
    // Metade oposta do caso abaixo: sem esta linha na espec, "não cita
    // Contatos" passaria por não haver o que citar.
    const grade = modulo.campos.find((campo) => campo.k === 'contatos')
    expect(grade?.sub).toBe('/api/partners/{partnerId}/contacts')
    expect(grade?.campo).toBeUndefined()
  })

  it('o rodapé cita as lacunas reais e NÃO a grade', () => {
    render(<Pendencias modulo={modulo} />)

    const rodape = screen.getByText(/Ainda não guardamos/)
    // A lacuna verdadeira continua dita pelo nome — o filtro novo não pode
    // calar o rodapé inteiro.
    expect(rodape).toHaveTextContent('Comunicador')
    expect(rodape).not.toHaveTextContent('Contatos')
  })

  it('módulo cuja ÚNICA falta é o sub não imprime rodapé nenhum', () => {
    // O caso extremo, e o que mais engana: um bloco onde tudo tem `campo` menos
    // a grade. Filtrando só `!campo.campo`, ele imprimiria um rodapé de uma
    // linha, dizendo que não guardamos exatamente aquilo que a grade lista.
    render(
      <Pendencias
        modulo={{
          id: 'so-sub',
          titulo: 'Outros contatos',
          resumo: 'Fax · Contatos',
          campos: [
            { k: 'fax', r: 'Fax', campo: 'fax' },
            { k: 'contatos', r: 'Contatos', sub: '/api/partners/{partnerId}/contacts' },
          ],
        }}
      />,
    )

    expect(screen.queryByText(/Ainda não guardamos/)).not.toBeInTheDocument()
  })
})

/**
 * A GUARDA QUE SUBSTITUI A DAS DUAS CÓPIAS.
 *
 * Até esta leva `campos-do-modulo.tsx` existia duplicado em `profissional/` e
 * `colaborador/` (decisão de zona da #101), e o caso de pendências corria nas
 * DUAS — porque cópia que diverge calada era o risco inteiro daquele arranjo.
 * A promoção para `components/cabinet/` tirou o risco, e com ele o objeto
 * daquela guarda.
 *
 * Apagá-la sem repor deixaria o repo sem nada dizendo *"não volte a copiar"* —
 * e a próxima tela de cadastro que precisar do render genérico estando fora
 * desta zona faria exatamente o que a #101 fez, com a mesma boa razão. Esta
 * guarda é o bilhete: existe UM render genérico, e ele mora aqui.
 */
describe('o render genérico existe em uma cópia só', () => {
  function arquivos(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
      if (nome === 'node_modules') return []
      const caminho = join(dir, nome)
      return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho]
    })
  }

  it('só há um campos-do-modulo.tsx em src/, e é o de components/cabinet', () => {
    const copias = arquivos('src').filter((caminho) => caminho.endsWith('campos-do-modulo.tsx'))

    expect(copias).toEqual(['src/components/cabinet/campos-do-modulo.tsx'])
  })
})
