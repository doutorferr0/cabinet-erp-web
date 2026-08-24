import { moduloContatos } from '@/features/cadastro/modulos'
import { Pendencias as PendenciasDoColaborador } from '@/features/colaborador/campos-do-modulo'
import { Pendencias } from '@/features/profissional/campos-do-modulo'
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
 *
 * ## Por que as DUAS cópias são exercitadas aqui
 *
 * `campos-do-modulo.tsx` existe duplicado em `profissional/` e `colaborador/`
 * por decisão de zona registrada na #101 (peça compartilhada moraria em
 * `components/cabinet/`, fora da zona daquela issue). Cópia que diverge calada é
 * o risco inteiro do arranjo — então o mesmo caso corre nas duas, e a que ficar
 * para trás reprova aqui em vez de reprovar na tela de alguém.
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

  it.each([
    ['profissional', Pendencias],
    ['colaborador', PendenciasDoColaborador],
  ])('%s: o rodapé cita as lacunas reais e NÃO a grade', (_, Componente) => {
    render(<Componente modulo={modulo} />)

    const rodape = screen.getByText(/Ainda não guardamos/)
    // A lacuna verdadeira continua dita pelo nome — o filtro novo não pode
    // calar o rodapé inteiro.
    expect(rodape).toHaveTextContent('Comunicador')
    expect(rodape).not.toHaveTextContent('Contatos')
  })

  it.each([
    ['profissional', Pendencias],
    ['colaborador', PendenciasDoColaborador],
  ])('%s: módulo cuja ÚNICA falta é o sub não imprime rodapé nenhum', (_, Componente) => {
    // O caso extremo, e o que mais engana: um bloco onde tudo tem `campo` menos
    // a grade. Filtrando só `!campo.campo`, ele imprimiria um rodapé de uma
    // linha, dizendo que não guardamos exatamente aquilo que a grade lista.
    render(
      <Componente
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
