#!/usr/bin/env python3
"""Mede contraste WCAG dos tokens de `src/index.css` — a fonte, não a memória.

Por que existe: toda vez que as superfícies mudam (creme -> cinza, 2026-08-13),
TODO número de contraste do DESIGN.md medido contra a superfície velha vira
mentira. Remedir na mão é o que já produziu dois números errados na página. Este
script lê os tokens REAIS do `src/index.css` e imprime as tabelas que a seção de
medição do DESIGN.md publica.

Uso:  python3 docs/design/medir-contraste.py           # tabelas em markdown
      python3 docs/design/medir-contraste.py --par A B # razão entre 2 tokens

Não altera cor nenhuma: é instrumento de medição. Trocar cor por causa de um
número reprovado é decisão do user.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parents[2] / "src" / "index.css"

# ---------------------------------------------------------------- leitura

TOKEN = re.compile(r"--([a-z0-9-]+)\s*:\s*([^;]+);")
HSL = re.compile(r"^(?:hsl\()?\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)?$")


def blocos(css: str) -> list[tuple[str, str]]:
    """(seletor, corpo) de cada bloco de primeiro nível, na ordem do arquivo."""
    saida, i = [], 0
    while True:
        abre = css.find("{", i)
        if abre == -1:
            return saida
        seletor = css[i:abre].strip().splitlines()[-1].strip()
        nivel, j = 1, abre + 1
        while nivel and j < len(css):
            nivel += (css[j] == "{") - (css[j] == "}")
            j += 1
        saida.append((seletor, css[abre + 1 : j - 1]))
        i = j


def hsl(valor: str) -> tuple[float, float, float] | None:
    m = HSL.match(valor.strip())
    if not m:
        return None
    h, s, ll = (float(g) for g in m.groups())
    return h, s / 100, ll / 100


def tokens() -> tuple[dict[str, str], dict[str, str], dict[str, dict[str, str]], dict[str, dict[str, str]]]:
    """(claro, escuro, modulo_claro, modulo_escuro) — só o que casa com hsl()."""
    css = CSS.read_text(encoding="utf-8")
    claro: dict[str, str] = {}
    escuro: dict[str, str] = {}
    mod_claro: dict[str, dict[str, str]] = {}
    mod_escuro: dict[str, dict[str, str]] = {}
    for seletor, corpo in blocos(css):
        pares = {k: v.split("/*")[0].strip() for k, v in TOKEN.findall(corpo)}
        alvo_modulo = re.search(r'\[data-modulo="([a-z]+)"\]', seletor)
        dark = seletor.startswith(".dark") or " .dark" in seletor
        if alvo_modulo:
            destino = mod_escuro if dark else mod_claro
            destino.setdefault(alvo_modulo.group(1), {}).update(pares)
            if not dark:
                # `.dark [data-modulo=x]` só redefine a /02: a cheia /01 do bloco claro
                # continua na cascata e é ela que pinta no escuro. Herdar aqui reproduz
                # o CSS; não herdar mede um token que não existe.
                mod_escuro.setdefault(alvo_modulo.group(1), {}).update(pares)
        elif seletor.strip() in (":root", ".dark"):
            (escuro if dark else claro).update(pares)
    return claro, escuro, mod_claro, mod_escuro


# ---------------------------------------------------------------- WCAG


def luminancia(cor: tuple[float, float, float]) -> float:
    h, s, ll = cor
    c = (1 - abs(2 * ll - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = ll - c / 2
    seg = int(h // 60) % 6
    rgb = [(c, x, 0.0), (x, c, 0.0), (0.0, c, x), (0.0, x, c), (x, 0.0, c), (c, 0.0, x)][seg]

    def canal(v: float) -> float:
        v += m
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (canal(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def razao(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    la, lb = luminancia(a), luminancia(b)
    claro, escuro = max(la, lb), min(la, lb)
    return (claro + 0.05) / (escuro + 0.05)


def n(x: float) -> str:
    return f"{x:.2f}".replace(".", ",")


def veredito(r: float, piso: float) -> str:
    return "passa" if r >= piso else "REPROVA"


# ---------------------------------------------------------------- tabelas

MODULOS = [
    ("Produtos", "produtos"),
    ("Estoque", "estoque"),
    ("Vendas / Orçamento", "vendas"),
    ("Compras / Pedidos", "compras"),
    ("Clientes", "clientes"),
    ("Fornecedores", "fornecedores"),
    ("Profissionais", "profissionais"),
    ("Boletim", "boletim"),
]

# voz -> (rótulo do papel, token de tinta)
VOZES = [
    ("quem — Newsreader", "nome de entidade, H1", "foreground"),
    ("o quê — Sora", "produto na listagem", "muted-foreground"),
    ("o quê — Sora", "produto como assunto, H2+", "foreground"),
    ("UI — Inter", "rótulo, botão, mensagem", "foreground"),
    ("UI — Inter", "texto secundário", "muted-foreground"),
    ("UI — Inter", "texto forte alternativo", "text-strong"),
    ("quanto — PT Mono", "código, data, quantidade", "foreground"),
    ("quanto — PT Mono", "dinheiro", "money"),
    ("quanto — PT Mono", "valor negativo", "destructive"),
]


def cor(mapa: dict[str, str], chave: str) -> tuple[float, float, float]:
    valor = mapa.get(chave)
    if valor is None:
        raise SystemExit(f"token --{chave} não existe em {CSS}")
    c = hsl(valor)
    if c is None:
        raise SystemExit(f"token --{chave} não é hsl literal: {valor!r}")
    return c


def main() -> None:
    claro, escuro, mod_claro, mod_escuro = tokens()

    if "--par" in sys.argv:
        a, b = sys.argv[sys.argv.index("--par") + 1 : sys.argv.index("--par") + 3]
        print(n(razao(cor(claro, a), cor(claro, b))), "claro")
        print(n(razao(cor(escuro, a), cor(escuro, b))), "escuro")
        return

    print("### Pastéis /02 sobre as superfícies — piso 3:1 (WCAG 1.4.11)\n")
    print("| Módulo | /02 × Folha | /02 × Bancada | escuro: /02 × Folha | veredito |")
    print("|---|---|---|---|---|")
    for rotulo, chave in MODULOS:
        p_claro = cor(mod_claro[chave], "modulo-02")
        p_escuro = cor(mod_escuro[chave], "modulo-02")
        folha = razao(p_claro, cor(claro, "card"))
        bancada = razao(p_claro, cor(claro, "background"))
        folha_e = razao(p_escuro, cor(escuro, "card"))
        pior = min(folha, bancada, folha_e)
        print(f"| {rotulo} | {n(folha)}:1 | {n(bancada)}:1 | {n(folha_e)}:1 | {veredito(pior, 3)} |")

    print("\n### Cheia /01 sobre as superfícies — piso 3:1\n")
    print("| Módulo | /01 × Folha | /01 × Bancada | escuro: /01 × Folha | escuro: /01 × Bancada |")
    print("|---|---|---|---|---|")
    for rotulo, chave in MODULOS:
        c_claro = cor(mod_claro[chave], "modulo-01")
        c_escuro = cor(mod_escuro[chave], "modulo-01")
        print(
            f"| {rotulo} | {n(razao(c_claro, cor(claro, 'card')))}:1 "
            f"| {n(razao(c_claro, cor(claro, 'background')))}:1 "
            f"| {n(razao(c_escuro, cor(escuro, 'card')))}:1 "
            f"| {n(razao(c_escuro, cor(escuro, 'background')))}:1 |"
        )

    print("\n### Zonas por conteúdo /02 sobre as superfícies — piso 3:1\n")
    print("| Zona | × Folha | × Bancada | escuro × Folha |")
    print("|---|---|---|---|")
    for rotulo, chave in [
        ("Valor", "zone-money"),
        ("Identidade", "zone-id"),
        ("Apoio", "zone-info"),
        ("Pendência", "zone-warn"),
        ("Bloqueio", "zone-danger"),
    ]:
        print(
            f"| {rotulo} | {n(razao(cor(claro, chave), cor(claro, 'card')))}:1 "
            f"| {n(razao(cor(claro, chave), cor(claro, 'background')))}:1 "
            f"| {n(razao(cor(escuro, chave), cor(escuro, 'card')))}:1 |"
        )

    print("\n### As 4 vozes sobre as superfícies — piso 4,5:1 (texto normal)\n")
    print("| Voz | papel | tinta | Folha | Bancada | escuro: Folha | escuro: Bancada | veredito |")
    print("|---|---|---|---|---|---|---|---|")
    for voz, papel, chave in VOZES:
        c_folha = razao(cor(claro, chave), cor(claro, "card"))
        c_banc = razao(cor(claro, chave), cor(claro, "background"))
        e_folha = razao(cor(escuro, chave), cor(escuro, "card"))
        e_banc = razao(cor(escuro, chave), cor(escuro, "background"))
        pior = min(c_folha, c_banc, e_folha, e_banc)
        print(
            f"| {voz} | {papel} | `--{chave}` | {n(c_folha)}:1 | {n(c_banc)}:1 "
            f"| {n(e_folha)}:1 | {n(e_banc)}:1 | {veredito(pior, 4.5)} |"
        )

    print("\n### Aferições de apoio\n")
    print(f"- degrau Bancada × Folha: {n(razao(cor(claro, 'background'), cor(claro, 'card')))}:1 claro"
          f" · {n(razao(cor(escuro, 'background'), cor(escuro, 'card')))}:1 escuro")
    print(f"- secundário sobre o Afundado (zebra): {n(razao(cor(claro, 'muted-foreground'), cor(claro, 'surface-sunken')))}:1 claro"
          f" · {n(razao(cor(escuro, 'muted-foreground'), cor(escuro, 'surface-sunken')))}:1 escuro")
    print(f"- traço `--border` sobre a Folha: {n(razao(cor(claro, 'border'), cor(claro, 'card')))}:1 claro"
          f" · {n(razao(cor(escuro, 'border'), cor(escuro, 'card')))}:1 escuro")
    print(f"- desabilitado sobre a Folha: {n(razao(cor(claro, 'text-disabled'), cor(claro, 'card')))}:1 claro"
          f" · {n(razao(cor(escuro, 'text-disabled'), cor(escuro, 'card')))}:1 escuro")
    sobre_pastel_claro = [razao(cor(claro, "foreground"), cor(mod_claro[c], "modulo-02")) for _, c in MODULOS]
    sobre_pastel_escuro = [razao(cor(escuro, "foreground"), cor(mod_escuro[c], "modulo-02")) for _, c in MODULOS]
    print(f"- tinta sobre os 8 pastéis /02: {n(min(sobre_pastel_claro))}–{n(max(sobre_pastel_claro))}:1 claro"
          f" · {n(min(sobre_pastel_escuro))}–{n(max(sobre_pastel_escuro))}:1 escuro")


if __name__ == "__main__":
    main()
