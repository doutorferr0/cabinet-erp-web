#!/usr/bin/env python3
"""Mede contraste WCAG dos tokens de `src/index.css` — a fonte, não a memória.

Por que existe: toda vez que as superfícies mudam (creme -> cinza, 2026-08-13),
TODO número de contraste do DESIGN.md medido contra a superfície velha vira
mentira. Remedir na mão é o que já produziu dois números errados na página. Este
script lê os tokens REAIS do `src/index.css` e imprime as tabelas que a seção de
medição do DESIGN.md publica.

Uso:  python3 docs/design/medir-contraste.py               # tabelas em markdown
      python3 docs/design/medir-contraste.py --conferir    # o DESIGN.md ainda diz a verdade?
      python3 docs/design/medir-contraste.py --escrever    # regrava as tabelas no DESIGN.md
      python3 docs/design/medir-contraste.py --par A B     # razão entre 2 tokens
      python3 docs/design/medir-contraste.py --frontmatter # só a conferência do YAML

As tabelas do DESIGN.md moram entre marcadores `<!-- tabela:nome -->` e são GERADAS: número
colado à mão foi o que produziu os três valores errados que esta página já publicou.

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



ZONAS = [
    ("Valor", "zone-money"),
    ("Identidade", "zone-id"),
    ("Apoio", "zone-info"),
    ("Pendência", "zone-warn"),
    ("Bloqueio", "zone-danger"),
]

# (rótulo, tinta, fundo) — o par REAL que o componente resolve, não preto por suposição.
ESTADOS = [
    ("texto sobre hover de item (`--neutral`)", "foreground", "neutral"),
    ("secundário sobre hover de item", "muted-foreground", "neutral"),
    ("linha selecionada: `--primary-foreground` × `--primary`", "primary-foreground", "primary"),
    ("linha selecionada × folha (a mudança de estado)", "primary", "card"),
    ("carimbo `open` (`bg-stamp-open` + `text-foreground`)", "foreground", "stamp-open"),
    ("carimbo `done` (`bg-stamp-done` + `text-primary-foreground`)", "primary-foreground", "stamp-done"),
    ("carimbo `neutral` (`text-stamp-neutral`, fundo transparente)", "stamp-neutral", "card"),
    ("carimbo `void` (`text-stamp-void`, fundo transparente)", "stamp-void", "card"),
]

# Chave do frontmatter YAML do DESIGN.md -> token do `src/index.css` que ela copia.
# Existe porque a cor mora em DOIS lugares: o corpo do doc e o bloco YAML que o
# impeccable lê. Já divergiram uma vez (o YAML ficou com os cinzas antigos depois
# da troca das superfícies) e a divergência é MUDA — o sidecar velho mente para o
# próximo agente sem quebrar nada.
FRONTMATTER = {
    "bench": "background",
    "sheet": "card",
    "sheet-sunken": "surface-sunken",
    "neutral": "neutral",
    "ink": "foreground",
    "ink-muted": "muted-foreground",
    "ink-strong": "text-strong",
    "ink-disabled": "text-disabled",
    "rule-hair": "rule-hair",
    "main": "primary",
    "main-hover": "primary-hover",
    "main-foreground": "primary-foreground",
    "accent": "accent",
    "info": "info",
    "money": "money",
    "danger": "destructive",
    "warn": "warn",
    "ring": "ring",
    "empresa": "empresa",
    "fill-money": "fill-money",
    "fill-focus": "fill-focus",
    "fill-error": "fill-error",
    "zone-money": "zone-money",
    "zone-id": "zone-id",
    "zone-info": "zone-info",
    "zone-warn": "zone-warn",
    "zone-danger": "zone-danger",
    "shadow-1": "shadow-1",
    "shadow-2": "shadow-2",
    "shadow-3": "shadow-3",
    "shadow-4": "shadow-4",
    "shadow-5": "shadow-5",
}

DOC = Path(__file__).resolve().parents[2] / "DESIGN.md"
YAML_COR = re.compile(r'^\s{2}([a-z0-9-]+):\s*"hsl\(([^)]+)\)"', re.M)


def conferir_frontmatter(claro: dict[str, str]) -> int:
    """Compara o bloco `colors:` do DESIGN.md com os tokens do CSS. Devolve nº de divergências."""
    bloco = DOC.read_text(encoding="utf-8").split("---")[1]
    divergem = 0
    vistos = set()
    for nome, valor in YAML_COR.findall(bloco):
        token = FRONTMATTER.get(nome)
        if token is None:
            print(f"?  {nome}: no YAML e sem token correspondente no mapa deste script")
            divergem += 1
            continue
        vistos.add(nome)
        real = (claro.get(token) or "").strip()
        if real != valor.strip():
            print(f"×  {nome}: YAML {valor.strip()!r} × --{token} {real!r}")
            divergem += 1
    for nome in FRONTMATTER:
        if nome not in vistos:
            print(f"×  {nome}: mapeado aqui e AUSENTE do YAML do DESIGN.md")
            divergem += 1
    print("frontmatter em dia" if not divergem else f"{divergem} divergência(s)")
    return divergem


def cor(mapa: dict[str, str], chave: str) -> tuple[float, float, float]:
    valor = mapa.get(chave)
    if valor is None:
        raise SystemExit(f"token --{chave} não existe em {CSS}")
    c = hsl(valor)
    if c is None:
        raise SystemExit(f"token --{chave} não é hsl literal: {valor!r}")
    return c


TABELAS: dict[str, str] = {}


def tabela(nome: str):
    """Registra um gerador de tabela sob um nome — o mesmo nome do marcador no DESIGN.md."""

    def registrar(fn):
        TABELAS[nome] = fn
        return fn

    return registrar


def gerar(claro, escuro, mod_claro, mod_escuro) -> dict[str, str]:
    """Todas as tabelas, já em markdown, indexadas pelo nome do marcador."""
    return {nome: fn(claro, escuro, mod_claro, mod_escuro).strip() for nome, fn in TABELAS.items()}


@tabela("vozes")
def _vozes(claro, escuro, _mc, _me) -> str:
    linhas = [
        "| Voz | papel | tinta | Folha | Bancada | escuro: Folha | escuro: Bancada | veredito |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for voz, papel, chave in VOZES:
        c_folha = razao(cor(claro, chave), cor(claro, "card"))
        c_banc = razao(cor(claro, chave), cor(claro, "background"))
        e_folha = razao(cor(escuro, chave), cor(escuro, "card"))
        e_banc = razao(cor(escuro, chave), cor(escuro, "background"))
        pior = min(c_folha, c_banc, e_folha, e_banc)
        linhas.append(
            f"| {voz} | {papel} | `--{chave}` | {n(c_folha)}:1 | {n(c_banc)}:1 "
            f"| {n(e_folha)}:1 | {n(e_banc)}:1 | {veredito(pior, 4.5)} |"
        )
    return "\n".join(linhas)


@tabela("pasteis-02")
def _pasteis(claro, escuro, mod_claro, mod_escuro) -> str:
    linhas = [
        "| Módulo | /02 × Folha | /02 × Bancada | escuro: /02 × Folha | veredito |",
        "|---|---|---|---|---|",
    ]
    for rotulo, chave in MODULOS:
        p_claro = cor(mod_claro[chave], "modulo-02")
        p_escuro = cor(mod_escuro[chave], "modulo-02")
        folha = razao(p_claro, cor(claro, "card"))
        bancada = razao(p_claro, cor(claro, "background"))
        folha_e = razao(p_escuro, cor(escuro, "card"))
        pior = min(folha, bancada, folha_e)
        linhas.append(
            f"| {rotulo} | {n(folha)}:1 | {n(bancada)}:1 | {n(folha_e)}:1 | {veredito(pior, 3)} |"
        )
    return "\n".join(linhas)


@tabela("cheia-01")
def _cheia(claro, escuro, mod_claro, mod_escuro) -> str:
    linhas = [
        "| Módulo | /01 × Folha | /01 × Bancada | escuro: /01 × Folha | escuro: /01 × Bancada |",
        "|---|---|---|---|---|",
    ]
    for rotulo, chave in MODULOS:
        c_claro = cor(mod_claro[chave], "modulo-01")
        c_escuro = cor(mod_escuro[chave], "modulo-01")
        linhas.append(
            f"| {rotulo} | {n(razao(c_claro, cor(claro, 'card')))}:1 "
            f"| {n(razao(c_claro, cor(claro, 'background')))}:1 "
            f"| {n(razao(c_escuro, cor(escuro, 'card')))}:1 "
            f"| {n(razao(c_escuro, cor(escuro, 'background')))}:1 |"
        )
    return "\n".join(linhas)


@tabela("zonas")
def _zonas(claro, escuro, _mc, _me) -> str:
    linhas = ["| Zona | × Folha | × Bancada | escuro × Folha |", "|---|---|---|---|"]
    for rotulo, chave in ZONAS:
        linhas.append(
            f"| {rotulo} | {n(razao(cor(claro, chave), cor(claro, 'card')))}:1 "
            f"| {n(razao(cor(claro, chave), cor(claro, 'background')))}:1 "
            f"| {n(razao(cor(escuro, chave), cor(escuro, 'card')))}:1 |"
        )
    return "\n".join(linhas)


@tabela("estados-fundo")
def _estados_fundo(claro, escuro, mod_claro, mod_escuro) -> str:
    """A cheia /01 no papel de FUNDO de texto — o par de `data-active:bg-modulo-cheia`."""
    linhas = ["| Módulo | claro: tinta × /01 | escuro: tinta × /01 |", "|---|---|---|"]
    for rotulo, chave in MODULOS:
        c_claro = razao(cor(claro, "sidebar-foreground"), cor(mod_claro[chave], "modulo-01"))
        c_escuro = razao(cor(escuro, "sidebar-foreground"), cor(mod_escuro[chave], "modulo-01"))
        forte = lambda x: f"**{n(x)}:1**" if x < 4.5 else f"{n(x)}:1"
        linhas.append(f"| {rotulo} | {forte(c_claro)} | {forte(c_escuro)} |")
    return "\n".join(linhas)


@tabela("estados-demais")
def _estados_demais(claro, escuro, _mc, _me) -> str:
    linhas = ["| par | claro | escuro |", "|---|---|---|"]
    for rotulo, tinta, fundo in ESTADOS:
        linhas.append(
            f"| {rotulo} | {n(razao(cor(claro, tinta), cor(claro, fundo)))}:1 "
            f"| {n(razao(cor(escuro, tinta), cor(escuro, fundo)))}:1 |"
        )
    return "\n".join(linhas)


@tabela("apoio")
def _apoio(claro, escuro, mod_claro, mod_escuro) -> str:
    def par(rotulo: str, tinta: str, fundo: str) -> str:
        return (
            f"- {rotulo}: **{n(razao(cor(claro, tinta), cor(claro, fundo)))}:1** claro"
            f" · **{n(razao(cor(escuro, tinta), cor(escuro, fundo)))}:1** escuro"
        )

    sobre_claro = [razao(cor(claro, "foreground"), cor(mod_claro[c], "modulo-02")) for _, c in MODULOS]
    sobre_escuro = [razao(cor(escuro, "foreground"), cor(mod_escuro[c], "modulo-02")) for _, c in MODULOS]
    return "\n".join(
        [
            par("degrau Bancada × Folha", "background", "card"),
            par("secundário sobre o Afundado (zebra)", "muted-foreground", "surface-sunken"),
            par("traço `--border` sobre a Folha", "border", "card"),
            par("`--text-disabled` sobre a Folha", "text-disabled", "card"),
            f"- tinta sobre os 8 pastéis /02: **{n(min(sobre_claro))}–{n(max(sobre_claro))}:1** claro"
            f" · **{n(min(sobre_escuro))}–{n(max(sobre_escuro))}:1** escuro",
        ]
    )


def blocos_do_doc(doc: str) -> dict[str, str]:
    """O que está publicado hoje entre `<!-- tabela:nome -->` e `<!-- /tabela:nome -->`."""
    achados = {}
    for nome in TABELAS:
        m = re.search(
            rf"<!-- tabela:{re.escape(nome)} -->\n(.*?)\n<!-- /tabela:{re.escape(nome)} -->",
            doc,
            re.S,
        )
        if m:
            achados[nome] = m.group(1).strip()
    return achados


def escrever_no_doc(doc: str, gerados: dict[str, str]) -> str:
    for nome, corpo in gerados.items():
        doc = re.sub(
            rf"(<!-- tabela:{re.escape(nome)} -->\n).*?(\n<!-- /tabela:{re.escape(nome)} -->)",
            lambda m: m.group(1) + corpo + m.group(2),
            doc,
            flags=re.S,
        )
    return doc


def conferir(gerados: dict[str, str], doc: str) -> int:
    """O DESIGN.md publicou o que o CSS diz hoje? Devolve nº de tabelas divergentes."""
    publicados = blocos_do_doc(doc)
    ruins = 0
    for nome, corpo in gerados.items():
        if nome not in publicados:
            print(f"×  tabela:{nome} — marcador ausente do DESIGN.md")
            ruins += 1
        elif publicados[nome] != corpo:
            print(f"×  tabela:{nome} — o publicado não bate com o medido")
            for a, b in zip(publicados[nome].splitlines(), corpo.splitlines()):
                if a != b:
                    print(f"     doc: {a}\n     css: {b}")
            ruins += 1
    print("tabelas em dia" if not ruins else f"{ruins} tabela(s) divergente(s)")
    return ruins


def main() -> None:
    claro, escuro, mod_claro, mod_escuro = tokens()

    if "--frontmatter" in sys.argv:
        raise SystemExit(1 if conferir_frontmatter(claro) else 0)

    if "--par" in sys.argv:
        a, b = sys.argv[sys.argv.index("--par") + 1 : sys.argv.index("--par") + 3]
        print(n(razao(cor(claro, a), cor(claro, b))), "claro")
        print(n(razao(cor(escuro, a), cor(escuro, b))), "escuro")
        return

    gerados = gerar(claro, escuro, mod_claro, mod_escuro)

    if "--escrever" in sys.argv:
        DOC.write_text(escrever_no_doc(DOC.read_text(encoding="utf-8"), gerados), encoding="utf-8")
        print(f"{len(gerados)} tabelas escritas em {DOC.name}")
        return

    if "--conferir" in sys.argv:
        divergem = conferir(gerados, DOC.read_text(encoding="utf-8"))
        divergem += conferir_frontmatter(claro)
        raise SystemExit(1 if divergem else 0)

    for nome, corpo in gerados.items():
        print(f"<!-- tabela:{nome} -->\n{corpo}\n<!-- /tabela:{nome} -->\n")


if __name__ == "__main__":
    main()
