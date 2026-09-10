#!/usr/bin/env python3
"""Contraste WCAG dos pares da NAVEGAÇÃO 2.0, lendo `src/styles/tokens-2.0.css`.

Por que existe ao lado de `medir-contraste.py`: aquele lê `src/index.css`, onde
os tokens são `hsl(H S% L%)`. A fundação 2.0 escreve hexadecimal e compõe cor com
`color-mix(in oklab, A p%, B)` — e uma aproximação de `color-mix` daria número
errado com cara de medição. Aqui a mistura é feita de verdade:
sRGB -> linear -> OKLab -> interpola -> sRGB.

Uso:  python3 docs/design/medir-contraste-2.0.py

Não altera cor nenhuma: é instrumento. Trocar token por causa de um número
reprovado é decisão do user (e, na rodada Reface 2.0, é a D1 quem edita
`tokens-2.0.css`).
"""
import re, sys
from pathlib import Path

css = Path('src/styles/tokens-2.0.css').read_text(encoding='utf-8')

def bloco(sel):
    i = css.index(sel)
    j = css.index('{', i); k = css.index('}', j)
    return css[j+1:k]

raiz = dict(re.findall(r'--([a-z0-9-]+)\s*:\s*([^;]+);', bloco(':root')))
escuro = dict(re.findall(r'--([a-z0-9-]+)\s*:\s*([^;]+);', bloco('[data-theme="dark"]')))

def srgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))

def lin(c): return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
def unlin(c): return c*12.92 if c <= 0.0031308 else 1.055*c**(1/2.4)-0.055

def to_oklab(rgb):
    r, g, b = (lin(c) for c in rgb)
    l = (0.4122214708*r + 0.5363325363*g + 0.0514459929*b)**(1/3)
    m = (0.2119034982*r + 0.6806995451*g + 0.1073969566*b)**(1/3)
    s = (0.0883024619*r + 0.2817188376*g + 0.6299787005*b)**(1/3)
    return (0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
            1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
            0.0259040371*l + 0.7827717662*m - 0.8086757660*s)

def from_oklab(lab):
    L, a, bb = lab
    l = (L + 0.3963377774*a + 0.2158037573*bb)**3
    m = (L - 0.1055613458*a - 0.0638541728*bb)**3
    s = (L - 0.0894841775*a - 1.2914855480*bb)**3
    r = +4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    b = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    return tuple(min(1, max(0, unlin(c))) for c in (r, g, b))

def resolver(nome, tema):
    tabela = dict(raiz)
    if tema == 'escuro':
        tabela.update(escuro)
    return _res(tabela[nome].strip(), tabela, 0)

def _res(v, tabela, d):
    if d > 8: raise RecursionError(v)
    v = v.strip()
    if v.startswith('#'): return srgb(v)
    m = re.fullmatch(r'var\(--([a-z0-9-]+)\)', v)
    if m: return _res(tabela[m.group(1)].strip(), tabela, d+1)
    m = re.fullmatch(r'color-mix\(in oklab,\s*(.+?)\s+([\d.]+)%,\s*(.+?)\)', v)
    if m:
        a = _res(m.group(1), tabela, d+1); p = float(m.group(2))/100
        outro = m.group(3).strip()
        if outro == 'transparent':
            raise ValueError('alpha sobre fundo: usar composto()')
        b = _res(outro, tabela, d+1)
        la, lb = to_oklab(a), to_oklab(b)
        return from_oklab(tuple(la[i]*p + lb[i]*(1-p) for i in range(3)))
    raise ValueError(v)

def lum(rgb):
    r, g, b = (lin(c) for c in rgb)
    return 0.2126*r + 0.7152*g + 0.0722*b

def razao(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi+0.05)/(lo+0.05)

# Cada linha é um par que a barra REALMENTE desenha, com o piso da WCAG que se
# aplica a ele: 4,5:1 para texto (1.4.3) e 3:1 para fronteira e sinal de estado
# (1.4.11). Par que reprova não é necessariamente defeito — o item ativo tem
# TRÊS marcas sobrepostas, e basta uma passar; mas o número tem de estar escrito
# para quem vier depois não "consertar" a que estava carregando o peso.
PARES = [
    ('rotulo do item ATIVO sobre o fundo do ativo', 'ink', 'main-soft', 4.5),
    ('rotulo do item em repouso sobre a bancada', 'ink-2', 'bancada', 4.5),
    # `nav.css` sobe estes dois de --n-500 para --ink-2: o degrau da fundacao
    # reprova AA nas tres superficies do sistema no tema claro (3,62 na bancada,
    # 3,99 na folha-2, 4,35 na folha). Comentado na #469; o desvio sai quando
    # a D1 resolver o degrau.
    ('rotulo do GRUPO (t-rotulo, com o desvio do nav.css)', 'ink-2', 'bancada', 4.5),
    ('contador/tempo (t-dado-meta, com o desvio)', 'ink-2', 'bancada', 4.5),
    ('degrau CRU da fundacao (--n-500) sobre a bancada', 'ink-3', 'bancada', 4.5),
    ('degrau CRU da fundacao (--n-500) sobre a folha', 'ink-3', 'folha', 4.5),
    ('icone do item em repouso sobre a bancada', 'ink-3', 'bancada', 3.0),
    ('borda do item ATIVO contra a bancada', 'ink', 'bancada', 3.0),
    ('faixa chartreuse contra o fundo do ativo', 'main', 'main-soft', 3.0),
    ('borda da faixa (tinta) contra a chartreuse', 'ink', 'main', 3.0),
    ('fundo do item ATIVO contra a bancada', 'main-soft', 'bancada', 3.0),
    ('borda direita da barra contra a folha da pagina', 'hairline-2', 'folha', 3.0),
    ('tela FUTURA (--disabled) sobre a bancada', 'disabled', 'bancada', 4.5),
]

for tema in ('claro', 'escuro'):
    print(f'\n### tema {tema}\n')
    print('| par | razão | piso | |')
    print('|---|---:|---:|---|')
    for rotulo, a, b, piso in PARES:
        r = razao(resolver(a, tema), resolver(b, tema))
        marca = 'ok' if r >= piso else 'REPROVA'
        print(f'| {rotulo} | {r:.2f}:1 | {piso} | {marca} |')
