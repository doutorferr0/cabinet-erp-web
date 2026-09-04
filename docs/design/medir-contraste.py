#!/usr/bin/env python3
"""Mede contraste WCAG dos tokens da 2.0 — a fonte, não a memória.

Por que existe: toda vez que as superfícies mudam, TODO número de contraste
medido contra a superfície velha vira mentira. Remedir na mão é o que já
produziu três números errados na página do DESIGN.md. Este script lê os tokens
REAIS de `src/styles/tokens-2.0.css` (e os aliases de `src/index.css`) e mede os
pares que a régua §Hierarquia e a auditoria §5a prometem.

Uso:  python3 docs/design/medir-contraste.py              # tabela dos dois temas
      python3 docs/design/medir-contraste.py --conferir   # sai 1 se algum par reprova
      python3 docs/design/medir-contraste.py --par A B    # razão entre dois tokens
      python3 docs/design/medir-contraste.py --frontmatter # o YAML do DESIGN.md bate?

**O QUE MUDOU NA 2.0 (#469), e é o motivo de o script ter sido reescrito.** A
versão 1.x lia triplets `h s% l%` do `index.css` e comparava as tabelas geradas
com as que o DESIGN.md publica. Os tokens da 2.0 são cor inteira — hex,
`var()` encadeado e `color-mix(in oklab, …)` —, e a semântica de fundo passou a
ser ALPHA: um valor só que pousa sobre o papel do tema. Medir isso exige
compor a cor sobre a superfície, e é por isso que cada par abaixo diz sobre O
QUÊ ele é medido. Um badge medido no vácuo passa sempre.

As tabelas do corpo do DESIGN.md continuam sendo as da 1.7 — foram medidas
contra tokens que já não existem, e quem as regenera é D30. A medição VÁLIDA da
2.0 é a que sai daqui.

Não altera cor nenhuma: é instrumento de medição. Trocar cor por causa de um
número reprovado é decisão do user.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
TOKENS = RAIZ / "src" / "styles" / "tokens-2.0.css"
INDEX = RAIZ / "src" / "index.css"
DOC = RAIZ / "DESIGN.md"

# ---------------------------------------------------------------- leitura

DECL = re.compile(r"--([a-z0-9-]+)\s*:\s*([^;]+);")


def blocos(css: str) -> list[tuple[str, str]]:
    """(seletor, corpo) de cada bloco de primeiro nível, na ordem do arquivo."""
    saida, i = [], 0
    while True:
        abre = css.find("{", i)
        if abre == -1:
            return saida
        seletor = css[i:abre].strip()
        nivel, j = 1, abre + 1
        while nivel and j < len(css):
            nivel += (css[j] == "{") - (css[j] == "}")
            j += 1
        saida.append((seletor, css[abre + 1 : j - 1]))
        i = j


def sem_comentario(css: str) -> str:
    return re.sub(r"/\*[\s\S]*?\*/", "", css)


def tabelas() -> tuple[dict[str, str], dict[str, str]]:
    """(claro, escuro) — os dois mapas de token cru, aliases do index.css inclusos.

    O escuro parte do claro e recebe por cima o que `.dark` redefine: é a
    cascata do browser reproduzida, e é o que permite os aliases atravessarem o
    tema sem uma segunda tabela (ver a nota do `.dark` no `index.css`).
    """
    claro: dict[str, str] = {}
    escuro_delta: dict[str, str] = {}
    for arquivo in (TOKENS, INDEX):
        for seletor, corpo in blocos(sem_comentario(arquivo.read_text(encoding="utf-8"))):
            pares = dict(DECL.findall(corpo))
            # O seletor é tudo que vem depois do `}` anterior; no primeiro bloco
            # de `index.css` isso inclui os `@import` e o `@custom-variant`.
            # Cortar no último `;` deixa só o seletor — sem isso os aliases do
            # `index.css` nunca entram no mapa, calados.
            alvo = seletor.split(";")[-1].replace("\n", " ").strip()
            if alvo.startswith(":root"):
                claro.update(pares)
            elif alvo.startswith(".dark"):
                escuro_delta.update(pares)
    return claro, {**claro, **escuro_delta}


# ---------------------------------------------------------------- cor

Cor = tuple[float, float, float, float]  # sRGB gama-codificado 0..1 + alfa

HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
VAR = re.compile(r"^var\(\s*(--[a-z0-9-]+)\s*\)$")
HSL = re.compile(r"^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$")
MIX = re.compile(r"^color-mix\(\s*in\s+(\w+)\s*,\s*(.+)\s*\)$")


def _fatias(texto: str) -> list[str]:
    """Separa por vírgula de topo — `color-mix(a, b)` dentro de argumento não conta."""
    saida, nivel, atual = [], 0, ""
    for c in texto:
        if c == "(":
            nivel += 1
        elif c == ")":
            nivel -= 1
        if c == "," and nivel == 0:
            saida.append(atual.strip())
            atual = ""
        else:
            atual += c
    saida.append(atual.strip())
    return saida


def linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def gama(c: float) -> float:
    c = max(0.0, min(1.0, c))
    return c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def para_oklab(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    r, g, b = (linear(v) for v in rgb)
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    return (
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    )


def de_oklab(lab: tuple[float, float, float]) -> tuple[float, float, float]:
    L, a, b = lab
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (
        gama(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        gama(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        gama(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
    )


def resolver(valor: str, mapa: dict[str, str], profundidade: int = 0) -> Cor:
    """Um valor de token → sRGB + alfa. Segue `var()`, entende hex, hsl e color-mix."""
    valor = valor.split("/*")[0].strip()
    if profundidade > 12:
        raise SystemExit(f"var() circular em {valor!r}")

    if valor == "transparent":
        return (0.0, 0.0, 0.0, 0.0)

    m = VAR.match(valor)
    if m:
        nome = m.group(1)[2:]
        if nome not in mapa:
            raise SystemExit(f"token --{nome} não existe")
        return resolver(mapa[nome], mapa, profundidade + 1)

    m = HEX.match(valor)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, 1.0)

    m = HSL.match(valor)
    if m:
        hh, ss, ll = (float(g) for g in m.groups())
        s, l = ss / 100, ll / 100
        c = (1 - abs(2 * l - 1)) * s
        x = c * (1 - abs((hh / 60) % 2 - 1))
        base = [(c, x, 0.0), (x, c, 0.0), (0.0, c, x), (0.0, x, c), (x, 0.0, c), (c, 0.0, x)][
            int(hh // 60) % 6
        ]
        return (*[v + l - c / 2 for v in base], 1.0)

    m = MIX.match(valor)
    if m:
        espaco, resto = m.group(1), m.group(2)
        partes = _fatias(resto)
        if len(partes) != 2:
            raise SystemExit(f"color-mix com {len(partes)} cores: {valor!r}")
        cores, pesos = [], []
        for parte in partes:
            pedaco = parte.rsplit(" ", 1)
            if len(pedaco) == 2 and pedaco[1].endswith("%"):
                cores.append(resolver(pedaco[0], mapa, profundidade + 1))
                pesos.append(float(pedaco[1][:-1]) / 100)
            else:
                cores.append(resolver(parte, mapa, profundidade + 1))
                pesos.append(None)
        # Peso ausente = o que falta para 100%.
        if pesos[0] is None:
            pesos[0] = 1 - (pesos[1] or 0)
        if pesos[1] is None:
            pesos[1] = 1 - pesos[0]
        return misturar(cores[0], pesos[0], cores[1], pesos[1], espaco)

    raise SystemExit(f"valor de cor não reconhecido: {valor!r}")


def misturar(a: Cor, pa: float, b: Cor, pb: float, espaco: str) -> Cor:
    """`color-mix`. Só oklab e srgb — são os dois que a 2.0 usa."""
    total = pa + pb or 1.0
    pa, pb = pa / total, pb / total
    alfa = a[3] * pa + b[3] * pb
    if alfa == 0:
        return (0.0, 0.0, 0.0, 0.0)
    # A cor é ponderada pelo alfa de cada lado (premultiplicação da spec).
    wa, wb = a[3] * pa / alfa, b[3] * pb / alfa
    if espaco == "oklab":
        la, lb = para_oklab(a[:3]), para_oklab(b[:3])
        return (*de_oklab(tuple(la[i] * wa + lb[i] * wb for i in range(3))), alfa)
    return (*[a[i] * wa + b[i] * wb for i in range(3)], alfa)


def sobre(frente: Cor, fundo: Cor) -> Cor:
    """Compõe em sRGB, que é onde o browser pinta."""
    if frente[3] >= 1:
        return frente
    a = frente[3]
    return (*[frente[i] * a + fundo[i] * (1 - a) for i in range(3)], 1.0)


def luminancia(cor: Cor) -> float:
    r, g, b = (linear(v) for v in cor[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def razao(a: Cor, b: Cor) -> float:
    la, lb = luminancia(a), luminancia(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def hexa(cor: Cor) -> str:
    return "#" + "".join(f"{round(v * 255):02x}" for v in cor[:3])


def n(x: float) -> str:
    return f"{x:.2f}".replace(".", ",")


# ---------------------------------------------------------------- os pares

TEXTO, GRAFICO = 4.5, 3.0

# (rótulo, tinta, fundo, sobre-o-quê, piso, exigido)
#   `fundo` pode ser translúcido: ele é composto sobre `base` antes da medição,
#   que é a diferença que faz um badge alpha ser medível de verdade.
PARES: list[tuple[str, str, str | None, str, float, bool]] = [
    # --- leitura: os três degraus de tinta sobre as três superfícies
    ("tinta sobre a folha", "n-900", None, "n-0", TEXTO, True),
    ("tinta sobre a bancada", "n-900", None, "n-100", TEXTO, True),
    ("tinta-2 sobre a folha", "n-700", None, "n-0", TEXTO, True),
    # A régua diz que 4,5:1 é o piso de --t-meta e --t-dado-meta nos dois temas,
    # e nomeia este par como o lugar onde o 1.x reprovava.
    (".t-meta sobre a folha", "n-500", None, "n-0", TEXTO, True),
    (".t-dado-meta sobre a folha-2", "n-500", None, "n-50", TEXTO, True),
    (".t-rotulo sobre a bancada", "n-500", None, "n-100", TEXTO, True),
    # --- acento: chartreuse é FILL, e o que se lê em cima dele é a tinta
    ("tinta sobre o primário", "main-fg", "main", "n-0", TEXTO, True),
    ("--main-text sobre a folha", "main-text", None, "n-0", TEXTO, True),
    ("--main-text sobre o acento suave", "main-text", "main-soft", "n-0", TEXTO, True),
    # --- semântica: tinta forte sobre o próprio fundo em alpha, nas 2 superfícies
    ("ok sobre o badge, na folha", "ok", "ok-bg", "n-0", TEXTO, True),
    ("ok sobre o badge, na bancada", "ok", "ok-bg", "n-100", TEXTO, True),
    ("info sobre o badge, na folha", "info", "info-bg", "n-0", TEXTO, True),
    ("info sobre o badge, na bancada", "info", "info-bg", "n-100", TEXTO, True),
    ("warn sobre o badge, na folha", "warn", "warn-bg", "n-0", TEXTO, True),
    ("warn sobre o badge, na bancada", "warn", "warn-bg", "n-100", TEXTO, True),
    ("bad sobre o badge, na folha", "bad", "bad-bg", "n-0", TEXTO, True),
    ("bad sobre o badge, na bancada", "bad", "bad-bg", "n-100", TEXTO, True),
    ("mut sobre o badge, na folha", "mut", "mut-bg", "n-0", TEXTO, True),
    # --- navegação: item ativo = realce chartreuse + faixa sobre a barra
    ("nav ativa: tinta sobre o realce", "n-900", "primary-soft", "n-50", TEXTO, True),
    # As duas linhas abaixo REGISTRAM e não exigem, e o motivo é uma decisão da
    # rodada: chartreuse é FILL e sobre papel claro ele dá ~1,1:1 por
    # construção — exigir 3:1 aqui seria proibir o acento de existir no tema
    # claro. O que a WCAG 1.4.11 pede é que o ESTADO seja distinguível, e quem o
    # carrega é o conjunto (realce + faixa + peso do rótulo), não a faixa
    # sozinha. Desenhar esse conjunto é trabalho de D4; o número fica aqui para
    # que ele seja desenhado com ele à vista, e não descoberto depois.
    ("nav ativa: faixa sobre a barra", "main", None, "n-50", GRAFICO, False),
    ("nav ativa: realce sobre a barra", "primary-soft", None, "n-50", GRAFICO, False),
    # --- tints por assunto: a região tem de continuar legível
    ("tinta sobre o tint lilás", "n-900", "tint-lilac", "n-0", TEXTO, True),
    ("tinta sobre o tint menta", "n-900", "tint-mint", "n-0", TEXTO, True),
    ("tinta sobre o tint céu", "n-900", "tint-sky", "n-0", TEXTO, True),
    ("tinta sobre o tint areia", "n-900", "tint-sand", "n-0", TEXTO, True),
    ("tinta sobre o tint rosa", "n-900", "tint-rose", "n-0", TEXTO, True),
    # --- cor de módulo: na 2.0 ela pinta quadradinho e monograma, não faixa
    ("módulo compras sobre a folha", "mod-compras", None, "n-0", GRAFICO, True),
    ("módulo estoque sobre a folha", "mod-estoque", None, "n-0", GRAFICO, True),
    ("módulo vendas sobre a folha", "mod-vendas", None, "n-0", GRAFICO, True),
    ("módulo crm sobre a folha", "mod-crm", None, "n-0", GRAFICO, True),
    ("módulo pessoas sobre a folha", "mod-pessoas", None, "n-0", GRAFICO, True),
    ("módulo relatórios sobre a folha", "mod-relatorios", None, "n-0", GRAFICO, True),
    # --- traço e desabilitado
    ("borda de card sobre a folha", "n-300", None, "n-0", GRAFICO, False),
    ("borda de card sobre a bancada", "n-300", None, "n-100", GRAFICO, False),
    ("hairline sobre a folha", "n-200", None, "n-0", GRAFICO, False),
    ("tinta sobre a superfície morta", "n-900", None, "n-100", TEXTO, True),
    ("placeholder sobre a folha", "n-400", None, "n-0", GRAFICO, False),
    # --- foco: as duas metades da receita, medidas separadas. Quem exige é o
    #     par DERIVADO lá embaixo — ver `DERIVADOS`.
    ("anel amarelo sobre a folha", "ring", None, "n-0", GRAFICO, False),
    ("fio do anel sobre a folha", "n-900", None, "n-0", GRAFICO, False),
    # --- destrutivo
    ("tinta do botão destrutivo", "n-0", "bad", "n-0", TEXTO, True),
]


# Pares que não são "tinta sobre fundo", e por isso não cabem na tabela acima.
#
# O foco é o caso: a receita `focus-ring` pinta DOIS anéis, o amarelo por dentro
# e o fio de tinta por fora, e a WCAG 1.4.11 pede que o INDICADOR se distinga do
# que está em volta — não que cada anel se distinga do outro. No tema claro quem
# cumpre é o fio (18:1 contra o papel), porque o amarelo sozinho dá 1,43:1; no
# escuro é o amarelo (12,5:1), porque ali é o fio que se aproxima do papel.
# Medir "fio contra amarelo" reprovava o escuro por um anel que ali está
# funcionando — o número era verdadeiro e a conclusão, falsa.
DERIVADOS: list[tuple[str, list[tuple[str, str]], float]] = [
    ("o anel de foco se distingue do papel (uma das duas metades basta)",
     [("ring", "n-0"), ("n-900", "n-0")], GRAFICO),
]


def medir(mapa: dict[str, str]) -> list[tuple[str, str, float, float, bool, bool]]:
    saida = []
    for rotulo, tinta, fundo, base, piso, exigido in PARES:
        papel = resolver(f"var(--{base})", mapa)
        atras = sobre(resolver(f"var(--{fundo})", mapa), papel) if fundo else papel
        frente = sobre(resolver(f"var(--{tinta})", mapa), atras)
        r = razao(frente, atras)
        saida.append((rotulo, hexa(atras), r, piso, r >= piso, exigido))
    for rotulo, alternativas, piso in DERIVADOS:
        melhor, fundo = 0.0, ""
        for tinta, base in alternativas:
            papel = resolver(f"var(--{base})", mapa)
            r = razao(sobre(resolver(f"var(--{tinta})", mapa), papel), papel)
            if r > melhor:
                melhor, fundo = r, hexa(papel)
        saida.append((rotulo, fundo, melhor, piso, melhor >= piso, True))
    return saida


def tabela(nome: str, mapa: dict[str, str]) -> tuple[str, int]:
    linhas = [
        f"### {nome}",
        "",
        "| par | fundo medido | razão | piso | veredito |",
        "|---|---|---|---|---|",
    ]
    reprovas = 0
    for rotulo, fundo, r, piso, passa, exigido in medir(mapa):
        if passa:
            veredito = "passa"
        elif exigido:
            veredito = "**REPROVA**"
            reprovas += 1
        else:
            veredito = "registra"
        linhas.append(f"| {rotulo} | `{fundo}` | {n(r)}:1 | {n(piso)} | {veredito} |")
    return "\n".join(linhas), reprovas


# ---------------------------------------------------------------- frontmatter

# Nome no YAML → token. O YAML do DESIGN.md é a ficha que ferramenta de design
# lê sem abrir o CSS; divergir dele é publicar a paleta de ontem.
FRONTMATTER = {
    "bench": "n-100",
    "sheet": "n-0",
    "sheet-sunken": "n-50",
    "hairline": "n-200",
    "rule": "n-300",
    "ink-disabled": "n-400",
    "ink-muted": "n-500",
    "ink-secondary": "n-700",
    "ink": "n-900",
    "main": "main",
    "main-hover": "main-hover",
    "main-foreground": "main-fg",
    "main-text": "main-text",
    "ring": "ring",
    "ok": "ok",
    "info": "info",
    "warn": "warn",
    "bad": "bad",
    "money": "money",
}
YAML_COR = re.compile(r'^\s{2}([a-z0-9-]+):\s*"([^"]+)"', re.M)


def conferir_frontmatter(claro: dict[str, str]) -> int:
    bloco = DOC.read_text(encoding="utf-8").split("---")[1]
    divergem, vistos = 0, set()
    for nome, valor in YAML_COR.findall(bloco):
        token = FRONTMATTER.get(nome)
        if token is None:
            continue
        vistos.add(nome)
        real = hexa(resolver(f"var(--{token})", claro))
        if real != valor.strip().lower():
            print(f"×  {nome}: YAML {valor.strip()!r} × --{token} {real!r}")
            divergem += 1
    for nome in FRONTMATTER:
        if nome not in vistos:
            print(f"×  {nome}: mapeado aqui e AUSENTE do YAML do DESIGN.md")
            divergem += 1
    print("frontmatter em dia" if not divergem else f"{divergem} divergência(s)")
    return divergem


# ---------------------------------------------------------------- main


def main() -> None:
    claro, escuro = tabelas()

    if "--frontmatter" in sys.argv:
        raise SystemExit(1 if conferir_frontmatter(claro) else 0)

    if "--par" in sys.argv:
        i = sys.argv.index("--par")
        a, b = sys.argv[i + 1 : i + 3]
        for nome, mapa in (("claro", claro), ("escuro", escuro)):
            ca, cb = resolver(f"var(--{a})", mapa), resolver(f"var(--{b})", mapa)
            print(f"{n(razao(sobre(ca, cb), cb))}  {nome}  ({hexa(ca)} sobre {hexa(cb)})")
        return

    claro_md, reprovas_claro = tabela("Tema claro", claro)
    escuro_md, reprovas_escuro = tabela("Tema escuro", escuro)

    if "--conferir" in sys.argv:
        ruins = reprovas_claro + reprovas_escuro
        if ruins:
            print(claro_md if reprovas_claro else "", escuro_md if reprovas_escuro else "", sep="\n")
        divergem = conferir_frontmatter(claro)
        print(
            f"claro: {reprovas_claro} reprova(s) · escuro: {reprovas_escuro} reprova(s)"
            if ruins
            else "contraste em dia nos dois temas"
        )
        raise SystemExit(1 if ruins or divergem else 0)

    print(claro_md, "", escuro_md, sep="\n")


if __name__ == "__main__":
    main()
