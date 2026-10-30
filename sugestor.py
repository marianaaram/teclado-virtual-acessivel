"""Sugestor de palavras em português (completa a palavra pelas primeiras letras).

Como funciona:
  - dados/palavras_pt.txt tem as palavras da mais usada para a menos usada.
  - A busca ignora acentos: quem digita "VOCE" recebe "você", quem digita
    "CORA" recebe "coração" (o teclado do programa não tem teclas de acento).
  - As sugestões saem na ordem do arquivo, então as palavras mais comuns vêm primeiro.
"""

import os
import unicodedata

PASTA = os.path.dirname(os.path.abspath(__file__))
ARQUIVO_PALAVRAS = os.path.join(PASTA, "dados", "palavras_pt.txt")

# Quantas sugestões devolver (um botão para cada)
QUANTIDADE = 3

# Mostradas quando não há nenhuma letra da palavra atual
# (texto vazio ou logo depois de um espaço). Troque pelas palavras que quiser.
SUGESTOES_INICIAIS = ["eu", "não", "sim"]


def _sem_acento(texto):
    """'Coração' -> 'coracao' (minúsculo e sem acentos/cedilha)."""
    decomposto = unicodedata.normalize("NFD", texto)
    return "".join(c for c in decomposto if not unicodedata.combining(c)).lower()


def _carregar_palavras():
    """Lê o arquivo uma única vez, quando o programa abre."""
    palavras = []
    try:
        with open(ARQUIVO_PALAVRAS, encoding="utf-8") as arquivo:
            for linha in arquivo:
                palavra = linha.strip()
                if palavra:
                    palavras.append((palavra, _sem_acento(palavra)))
    except OSError as erro:
        print(f"[sugestor] Não consegui abrir {ARQUIVO_PALAVRAS}: {erro}")
    return palavras


# (palavra com acento, palavra sem acento), na ordem de frequência
_PALAVRAS = _carregar_palavras()


def sugerir(prefixo, quantidade=QUANTIDADE):
    """Devolve até `quantidade` palavras que começam com `prefixo`."""
    chave = _sem_acento((prefixo or "").strip())[:40]

    # Nada digitado ainda na palavra atual
    if not chave:
        return SUGESTOES_INICIAIS[:quantidade]

    # Números ou símbolos (ex.: "12"): não existe palavra para sugerir
    if not (chave.isascii() and chave.isalpha()):
        return []

    resultado = []
    for palavra, sem_acento in _PALAVRAS:
        if sem_acento.startswith(chave):
            resultado.append(palavra)
            if len(resultado) == quantidade:
                break
    return resultado
