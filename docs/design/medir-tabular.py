#!/usr/bin/env python3
"""Mede se as fontes da identidade alinham dígito a dígito.

A pergunta da issue #123 é concreta: `1111` e `9999` ocupam a mesma largura? Numa
coluna de valores, se não ocuparem, o olho perde a casa decimal e a conferência
contra o orçamento deixa de ser conferência — vira leitura de números soltos.

## Por que ler o BINÁRIO e não renderizar num browser

Renderizar exigiria browser headless, e o número que sairia dali dependeria do
rasterizador, do hinting e do zoom. A largura de avanço do glifo (`hmtx`) é o
dado que o layout usa, está no arquivo e não muda com a máquina. É a mesma
escolha do `medir-contraste.py`: medir a FONTE do valor, não a foto dele.

## O que se mede, e são duas coisas diferentes

1. **Os dígitos já são uniformes por padrão?** Compara o avanço de `0`–`9`. Se
   todos batem, a coluna alinha sem `font-variant-numeric` nenhum.
2. **A fonte publica o recurso `tnum`?** É a saída para quando (1) falha: o
   OpenType `tnum` troca os algarismos proporcionais pelos tabulares. Só existe
   se a família o trouxer — e a maioria das webfonts não traz.

As duas juntas dizem o que a folha de estilo precisa fazer: nada, `tabular-nums`,
ou cair para a mono.

Uso: `python3 docs/design/medir-tabular.py` na raiz do repo.
"""

from __future__ import annotations

import re
import struct
import sys
import zlib
from pathlib import Path

# As famílias da identidade, com o papel de cada uma — quatro até a fusão v5 r3,
# CINCO desde que o display condensado entrou. O PESO não vem
# escrito aqui: sai dos `@import` do `src/index.css`, que é a lista do que a
# aplicação de fato baixa.
#
# A diferença é real. `tnum` é declarado por ARQUIVO, não por família, e nada
# obriga dois pesos da mesma família a concordarem — o WOFF de cada peso tem o
# seu próprio `GSUB`. Fixar 400 aqui media, no caso do Sora, um arquivo que o
# navegador nunca pede: o CSS importa **600 e 700**, e 400 não está entre eles.
# (Hoje os dois dão o mesmo veredito; a medição é que apontava para o lugar
# errado, e é ela que precisa continuar certa quando a família mudar.)
FAMILIAS = [
    ("Inter", "corpo (--font-sans)", "inter"),
    ("Sora", "títulos (--font-display)", "sora"),
    ("Newsreader", "nome próprio (--font-nome)", "newsreader"),
    ("PT Mono", "meta e número grande (--font-mono)", "pt-mono"),
    # A QUINTA, e ela chegou depois desta lista: a fusão v5 r3 trouxe o display
    # condensado para o nome do documento e o número-herói (issue #236, decisão
    # do user sobre o teto de quatro famílias). Ficou dois dias fora da medição
    # — ver `familias_nao_medidas`, que existe por causa disto.
    ("Bebas Neue", "display condensado (--font-display-condensada)", "bebas-neue"),
    # REFACE 2.0 (fundação, 2026-09-02): a mono nova. Substitui PT Mono como
    # `--font-mono` em D1 (#469); até lá as duas coexistem e as duas são medidas.
    ("JetBrains Mono", "dado: id, data, valor (--font-mono 2.0)", "jetbrains-mono"),
]

RAIZ = Path(__file__).resolve().parents[2]
CSS = RAIZ / "src" / "index.css"


def pesos_importados(pacote: str) -> list[str]:
    """Os pesos que o `src/index.css` importa deste pacote, na ordem do arquivo.

    Lê a fonte da verdade em vez de repetir a lista: importar um peso novo e
    esquecer de medi-lo é o silêncio que esta função existe para evitar.
    """
    css = CSS.read_text(encoding="utf-8")
    achados = re.findall(rf'@import\s+"@fontsource/{re.escape(pacote)}/(\d+)\.css"', css)
    if not achados:
        raise SystemExit(f"{pacote}: nenhum @import em src/index.css — a família ainda é usada?")
    # `dict.fromkeys` tira repetido preservando a ordem em que o CSS declara.
    return list(dict.fromkeys(achados))


def familias_nao_medidas() -> list[str]:
    """Pacotes que o CSS importa e que a lista acima não cobre.

    `pesos_importados` já impede que um PESO novo escape da medição, lendo os
    `@import` em vez de repetir a lista. Mas o mesmo silêncio existia um nível
    acima: **família nova não escapava por peso, escapava por família.** Foi o
    que aconteceu com a Bebas Neue — importada na fusão v5 r3, medida só dois
    dias depois, e só porque alguém foi olhar.

    A conta é a mesma do outro lado do problema: o CSS é a lista do que a
    aplicação de fato baixa, e o que ela baixa é o que precisa alinhar dígito.
    """
    css = CSS.read_text(encoding="utf-8")
    importados = dict.fromkeys(re.findall(r'@import\s+"@fontsource/([a-z0-9-]+)/', css))
    declarados = {pacote for _, _, pacote in FAMILIAS}
    return [pacote for pacote in importados if pacote not in declarados]


def tabelas_do_woff(caminho: Path) -> dict[str, bytes]:
    """Tabelas SFNT de dentro de um WOFF, já descomprimidas.

    WOFF é o SFNT com cada tabela opcionalmente comprimida em zlib — formato
    simples o bastante para ler sem dependência. (WOFF2 usa Brotli e transforma
    as tabelas de glifo; não vale o custo aqui, e o `.woff` acompanha todo
    pacote do fontsource.)
    """
    dados = caminho.read_bytes()
    if dados[:4] != b"wOFF":
        raise ValueError(f"{caminho.name} não é WOFF")
    num_tabelas = struct.unpack(">H", dados[12:14])[0]

    tabelas: dict[str, bytes] = {}
    for i in range(num_tabelas):
        base = 44 + i * 20
        tag, offset, comp_len, orig_len = struct.unpack(">4sIII", dados[base : base + 16])
        bruto = dados[offset : offset + comp_len]
        tabelas[tag.decode("latin-1")] = zlib.decompress(bruto) if comp_len < orig_len else bruto
    return tabelas


def glifos_dos_digitos(cmap: bytes) -> dict[str, int]:
    """`'0'`–`'9'` → id do glifo, pela subtabela cmap do Windows/Unicode."""
    num = struct.unpack(">H", cmap[2:4])[0]
    escolhida: int | None = None
    for i in range(num):
        plat, enc, offset = struct.unpack(">HHI", cmap[4 + i * 8 : 12 + i * 8])
        # (3,1) é a subtabela BMP do Windows: a que todo renderizador usa e a
        # única garantida em webfont latina.
        if (plat, enc) == (3, 1):
            escolhida = offset
            break
    if escolhida is None:
        raise ValueError("sem subtabela cmap (3,1)")

    sub = cmap[escolhida:]
    formato = struct.unpack(">H", sub[0:2])[0]
    if formato != 4:
        raise ValueError(f"cmap formato {formato} não suportado por esta medição")

    seg_x2 = struct.unpack(">H", sub[6:8])[0]
    segs = seg_x2 // 2
    fim = struct.unpack(f">{segs}H", sub[14 : 14 + seg_x2])
    inicio = struct.unpack(f">{segs}H", sub[16 + seg_x2 : 16 + seg_x2 * 2])
    delta = struct.unpack(f">{segs}h", sub[16 + seg_x2 * 2 : 16 + seg_x2 * 3])
    base_range = 16 + seg_x2 * 3
    range_offset = struct.unpack(f">{segs}H", sub[base_range : base_range + seg_x2])

    def glifo(codigo: int) -> int:
        for s in range(segs):
            if inicio[s] <= codigo <= fim[s]:
                if range_offset[s] == 0:
                    return (codigo + delta[s]) & 0xFFFF
                pos = base_range + s * 2 + range_offset[s] + (codigo - inicio[s]) * 2
                id_glifo = struct.unpack(">H", sub[pos : pos + 2])[0]
                return (id_glifo + delta[s]) & 0xFFFF if id_glifo else 0
        return 0

    return {chr(c): glifo(c) for c in range(ord("0"), ord("9") + 1)}


def avancos(tabelas: dict[str, bytes]) -> dict[str, int]:
    """Largura de avanço de cada dígito, em unidades de em."""
    num_metricas = struct.unpack(">H", tabelas["hhea"][34:36])[0]
    hmtx = tabelas["hmtx"]
    largura: dict[str, int] = {}
    for digito, glifo in glifos_dos_digitos(tabelas["cmap"]).items():
        # Glifo além de `numberOfHMetrics` herda o último avanço — convenção do
        # formato, e é onde as fontes monoespaçadas economizam espaço.
        indice = min(glifo, num_metricas - 1)
        largura[digito] = struct.unpack(">H", hmtx[indice * 4 : indice * 4 + 2])[0]
    return largura


def recursos_gsub(tabelas: dict[str, bytes]) -> set[str]:
    """Tags de feature do GSUB. `tnum` aqui = a fonte tem algarismo tabular."""
    gsub = tabelas.get("GSUB")
    if not gsub:
        return set()
    offset_features = struct.unpack(">H", gsub[6:8])[0]
    lista = gsub[offset_features:]
    quantos = struct.unpack(">H", lista[0:2])[0]
    return {
        struct.unpack(">4s", lista[2 + i * 6 : 6 + i * 6])[0].decode("latin-1") for i in range(quantos)
    }


def medir() -> int:
    print("MEDIÇÃO — algarismo tabular nas famílias da identidade\n")
    falhou = False

    # Antes de medir, cobrar a LISTA: família que o CSS baixa e ninguém mediu é
    # exatamente o caso que passou despercebido, e ele não se anuncia — a saída
    # continua bonita, só que menor.
    for pacote in familias_nao_medidas():
        print(f"× @fontsource/{pacote} — importado em src/index.css e FORA de FAMILIAS")
        print("  A aplicação baixa esta família e esta medição não a cobre.")
        print("  Acrescente-a a FAMILIAS com o papel dela, ou tire o @import.\n")
        falhou = True

    for nome, papel, pacote in FAMILIAS:
        for peso in pesos_importados(pacote):
            arquivo = f"{pacote}-latin-{peso}-normal.woff"
            caminho = RAIZ / "node_modules" / "@fontsource" / pacote / "files" / arquivo
            if not caminho.exists():
                print(f"{nome} {peso}: arquivo não encontrado ({caminho}) — rode `pnpm install`")
                falhou = True
                continue

            tabelas = tabelas_do_woff(caminho)
            unidades = struct.unpack(">H", tabelas["head"][18:20])[0]
            larguras = avancos(tabelas)
            distintas = sorted(set(larguras.values()))
            uniforme = len(distintas) == 1
            tem_tnum = "tnum" in recursos_gsub(tabelas)

            print(f"{nome} {peso} — {papel}")
            print(f"  unidades por em: {unidades}")
            print(f"  avanço dos dígitos 0–9: {', '.join(str(v) for v in distintas)}")
            print(f"  uniformes por padrão: {'SIM' if uniforme else 'NÃO'}")
            print(f"  publica `tnum`: {'SIM' if tem_tnum else 'NÃO'}")
            if uniforme:
                veredito = "alinha sem precisar de `font-variant-numeric`"
            elif tem_tnum:
                veredito = "alinha COM `font-variant-numeric: tabular-nums`"
            else:
                veredito = "NÃO alinha — coluna numérica precisa cair para a mono"
            print(f"  → {veredito}\n")

    return 1 if falhou else 0


if __name__ == "__main__":
    sys.exit(medir())
