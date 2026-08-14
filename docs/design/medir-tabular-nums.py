#!/usr/bin/env python3
"""Mede se as fontes da identidade servem para número em coluna — a FONTE, não a fama.

Por que existe: `font-variant-numeric: tabular-nums` só faz efeito se a fonte
trouxer a feature OpenType `tnum`. A estimativa que circula é de que poucas
webfonts a trazem, e decidir a tipografia de TODA coluna numérica do ERP por
estimativa é o mesmo erro que a medição de contraste já corrigiu aqui: número
colado à mão vira mentira na primeira troca de arquivo.

O que ele faz, e por que assim: abre os `.woff` que o `@fontsource` instalou em
`node_modules` — os MESMOS bytes que o `src/index.css` importa e o navegador
baixa — e lê duas coisas na tabela do arquivo:

  1. a lista de features do `GSUB`, procurando `tnum`;
  2. a largura de avanço (`hmtx`) dos dígitos `0`–`9`.

As duas juntas, porque uma sem a outra engana. Fonte **monoespaçada** não declara
`tnum` e não precisa: os dígitos dela já nascem todos com a mesma largura, e a
ausência da feature seria lida como reprovação. O contrário também acontece —
fonte com `tnum` cujos dígitos JÁ são iguais por padrão (a feature existe, mas
não muda nada).

Uso:  python3 docs/design/medir-tabular-nums.py            # tabela em markdown
      python3 docs/design/medir-tabular-nums.py --json     # o mesmo, para script

Lê `.woff` (WOFF1, comprimido com zlib, que a stdlib abre) e não `.woff2` (Brotli,
que exigiria dependência). São o mesmo desenho no mesmo pacote: o `@fontsource`
publica os dois lado a lado, e o `.woff2` é só a compressão mais nova. O que se
mede aqui — features e larguras — está na tabela do arquivo, não na compressão.

Não altera CSS nenhum: é instrumento de medição. Trocar a fonte de uma zona por
causa de um resultado é decisão do user.
"""

from __future__ import annotations

import json
import re
import struct
import sys
import zlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CSS = RAIZ / "src" / "index.css"
FONTES = RAIZ / "node_modules" / "@fontsource"

# As quatro vozes do DESIGN.md, com o peso em que cada uma de fato aparece na
# tela. Peso importa: a feature é declarada por ARQUIVO, e nada obriga o regular
# e o semibold da mesma família a concordarem.
VOZES = [
    ("quem", "--font-nome", "newsreader", "400", "nome de entidade, título de tela"),
    ("o quê", "--font-display", "sora", "600", "nome de produto, descrição"),
    ("UI", "--font-sans", "inter", "400", "rótulo, cabeçalho de coluna, botão"),
    ("quanto", "--font-mono", "pt-mono", "400", "número, código, data, valor"),
]


# ---------------------------------------------------------------- WOFF


def tabelas(caminho: Path) -> dict[str, bytes]:
    """As tabelas de um WOFF1, já descomprimidas."""
    b = caminho.read_bytes()
    if b[:4] != b"wOFF":
        raise SystemExit(f"{caminho.name}: não é WOFF1 (assinatura {b[:4]!r})")
    quantas = struct.unpack(">H", b[12:14])[0]
    saida: dict[str, bytes] = {}
    p = 44
    for _ in range(quantas):
        tag, offset, comprimido, original, _soma = struct.unpack(">4sIIII", b[p : p + 20])
        p += 20
        dado = b[offset : offset + comprimido]
        # Tabela cabe sem comprimir quando zlib não ajudaria: o WOFF grava crua.
        if comprimido != original:
            dado = zlib.decompress(dado)
        saida[tag.decode("latin1")] = dado
    return saida


def features_gsub(gsub: bytes | None) -> list[str]:
    """Tags de feature declaradas no GSUB (`tnum`, `pnum`, `liga`…)."""
    if not gsub:
        return []
    lista = struct.unpack(">H", gsub[6:8])[0]
    quantas = struct.unpack(">H", gsub[lista : lista + 2])[0]
    return [gsub[lista + 2 + i * 6 : lista + 6 + i * 6].decode("latin1") for i in range(quantas)]


def glifos_dos_digitos(cmap: bytes) -> dict[int, int]:
    """U+0030..U+0039 → id do glifo, pelo subtable formato 4."""
    quantas = struct.unpack(">H", cmap[2:4])[0]
    escolhido = None
    for i in range(quantas):
        p = 4 + i * 8
        plataforma, codificacao, offset = struct.unpack(">HHI", cmap[p : p + 8])
        if struct.unpack(">H", cmap[offset : offset + 2])[0] != 4:
            continue
        escolhido = offset
        # (3, 1) é o Windows/Unicode BMP, o que todo navegador usa.
        if (plataforma, codificacao) == (3, 1):
            break
    if escolhido is None:
        return {}

    o = escolhido
    dobro = struct.unpack(">H", cmap[o + 6 : o + 8])[0]
    n = dobro // 2

    def vetor(base: int, sinal: str) -> list[int]:
        return [struct.unpack(sinal, cmap[base + i * 2 : base + 2 + i * 2])[0] for i in range(n)]

    fim = vetor(o + 14, ">H")
    ini_base = o + 16 + dobro  # +2 do reservedPad
    ini = vetor(ini_base, ">H")
    delta_base = ini_base + dobro
    delta = vetor(delta_base, ">h")
    range_base = delta_base + dobro
    alcance = vetor(range_base, ">H")

    saida: dict[int, int] = {}
    for ponto in range(0x30, 0x3A):
        for i in range(n):
            if not (ini[i] <= ponto <= fim[i]):
                continue
            if alcance[i] == 0:
                glifo = (ponto + delta[i]) & 0xFFFF
            else:
                p = range_base + i * 2 + alcance[i] + (ponto - ini[i]) * 2
                glifo = struct.unpack(">H", cmap[p : p + 2])[0]
                if glifo:
                    glifo = (glifo + delta[i]) & 0xFFFF
            saida[ponto] = glifo
            break
    return saida


def larguras_dos_digitos(t: dict[str, bytes]) -> tuple[dict[str, int], int]:
    """Largura de avanço de cada dígito, e as unidades por em da fonte."""
    metricas = struct.unpack(">H", t["hhea"][34:36])[0]
    upem = struct.unpack(">H", t["head"][18:20])[0]
    saida: dict[str, int] = {}
    for ponto, glifo in sorted(glifos_dos_digitos(t["cmap"]).items()):
        # Glifo além de numberOfHMetrics herda a última largura do vetor.
        i = min(glifo, metricas - 1)
        saida[chr(ponto)] = struct.unpack(">H", t["hmtx"][i * 4 : i * 4 + 2])[0]
    return saida, upem


# ---------------------------------------------------------------- medição


def familia_do_token(token: str) -> str | None:
    """A primeira família declarada no token do `src/index.css` (a real; o resto é fallback)."""
    achado = re.search(rf"{re.escape(token)}\s*:\s*\"([^\"]+)\"", CSS.read_text(encoding="utf-8"))
    return achado.group(1) if achado else None


def medir(pacote: str, peso: str) -> dict:
    arquivos = sorted((FONTES / pacote / "files").glob(f"{pacote}-latin-{peso}-normal.woff"))
    if not arquivos:
        raise SystemExit(
            f"não achei {pacote}-latin-{peso}-normal.woff em node_modules/@fontsource/ — "
            "rode `pnpm install` antes de medir"
        )
    t = tabelas(arquivos[0])
    fs = features_gsub(t.get("GSUB"))
    larguras, upem = larguras_dos_digitos(t)
    iguais = len(set(larguras.values())) == 1
    return {
        "arquivo": arquivos[0].name,
        "features": sorted(set(fs)),
        "tnum": "tnum" in fs,
        "pnum": "pnum" in fs,
        "upem": upem,
        "larguras": larguras,
        "ja_tabular": iguais,
        # É o que decide o CSS: a coluna alinha se a fonte já é tabular por
        # padrão OU se `tabular-nums` tem o que ligar.
        "serve": iguais or "tnum" in fs,
    }


def veredito(m: dict) -> str:
    if m["ja_tabular"] and not m["tnum"]:
        return "já tabular (não precisa da feature)"
    if m["ja_tabular"]:
        return "já tabular, e ainda declara `tnum`"
    if m["tnum"]:
        return "proporcional por padrão, `tnum` corrige"
    return "**proporcional e sem `tnum` — não serve para coluna**"


def main() -> int:
    resultado = {}
    for voz, token, pacote, peso, papel in VOZES:
        m = medir(pacote, peso)
        m["voz"] = voz
        m["token"] = token
        m["familia"] = familia_do_token(token)
        m["papel"] = papel
        m["peso"] = peso
        resultado[pacote] = m

    if "--json" in sys.argv:
        print(json.dumps(resultado, ensure_ascii=False, indent=2))
        return 0

    print("| voz | família | peso | `tnum` | dígitos iguais sem a feature | veredito |")
    print("|---|---|---|---|---|---|")
    for m in resultado.values():
        print(
            "| %s | %s | %s | %s | %s | %s |"
            % (
                m["voz"],
                m["familia"],
                m["peso"],
                "sim" if m["tnum"] else "não",
                "sim" if m["ja_tabular"] else "não",
                veredito(m),
            )
        )

    print()
    ruins = [m for m in resultado.values() if not m["serve"]]
    if ruins:
        print("Não servem para coluna numérica: " + ", ".join(m["familia"] for m in ruins))
    else:
        print("Todas as quatro servem para coluna numérica.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
