#!/usr/bin/env python3
"""Contraste do RÓTULO do `KpiTile` depois da rodada 5 (D34, #529).

O rótulo saiu de `--n-700` fixo para `color-mix(in oklab, --kc P%, --n-900)`,
onde `--kc` é o matiz do ASSUNTO do tile. Cada tinta tem um `--kc` e um fundo
próprios, então são oito pares por tema — e `.t-rotulo` é texto de 10,5px, piso
4,5:1 (§Hierarquia, WCAG 1.4.3).

**A porcentagem é LIDA de `src/components/cabinet/kpi-tile.tsx`**, e não escrita
aqui: instrumento que carrega a própria cópia do número mede o número de ontem.
O mockup pede 70%, e a 70% o tema claro reprova em `sand` e `mint` — a medição é
o que decidiu os 55% que o componente usa.

Uso:  python3 docs/design/medir-rotulo-kpi.py

Reusa as funções de cor de `medir-contraste-2.0.py` (sRGB → OKLab → mistura →
sRGB), porque uma segunda implementação de `color-mix` divergiria da primeira.
"""
import re
from pathlib import Path

fonte = Path('docs/design/medir-contraste-2.0.py').read_text(encoding='utf-8').split('PARES = [')[0]
g = {'__name__': 'medida'}
exec(compile(fonte, 'medir-contraste-2.0.py', 'exec'), g)
razao, _res, raiz, escuro = g['razao'], g['_res'], g['raiz'], g['escuro']

peca = Path('src/components/cabinet/kpi-tile.tsx').read_text(encoding='utf-8')
P = int(re.search(r'MISTURA_DO_ROTULO\s*=\s*(\d+)', peca).group(1))

# O mesmo mapa `tint -> matiz` do componente, e o fundo que cada tinta desenha.
MATIZ = {
    'nenhum': 'n-400',
    'lilac': 'indigo-400',
    'sky': 'sky-400',
    'sand': 'amber-400',
    'mint': 'mint-400',
    'rose': 'rose-400',
    'violet': 'violet-400',
    'teal': 'teal-400',
}
FUNDO = {t: ('n-0' if t == 'nenhum' else f'tint-{t}') for t in MATIZ}


def cor(expressao, tema):
    tabela = dict(raiz)
    if tema == 'escuro':
        tabela.update(escuro)
    return _res(expressao, tabela, 0)


print(f'\n# rótulo do KpiTile — `--kc` a {P}% sobre `--n-900`')
reprovas = 0
for tema in ('claro', 'escuro'):
    print(f'\n### tema {tema}\n')
    print('| tinta | rótulo sobre o fundo do tile | piso | |')
    print('|---|---:|---:|---|')
    for tinta, matiz in MATIZ.items():
        r = razao(
            cor(f'color-mix(in oklab, var(--{matiz}) {P}%, var(--n-900))', tema),
            cor(f'var(--{FUNDO[tinta]})', tema),
        )
        ok = r >= 4.5
        reprovas += 0 if ok else 1
        print(f'| {tinta} | {r:.2f}:1 | 4.5 | {"ok" if ok else "REPROVA"} |')

print(f'\nreprovas: {reprovas}')
