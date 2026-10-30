from flask import Flask, render_template, jsonify, request
import threading
import time
import webview
import os
import re
from datetime import datetime
import ctypes
import sugestor

app = Flask(__name__)

# Pasta ao lado do app.py, criada automaticamente se não existir
PASTA_TEXTOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "textos_salvos")

# Fração da altura da tela ocupada pela barra do OpiKey (ajuste fino aqui)
FRACAO_TOPO = 0.07
TITULO_JANELA = "Teclado Digital"
DESCER_PX = 20        # quantos pixels empurrar o programa para baixo (ajuste aqui)


# Função para gerar nomes de arquivos
def _nome_base(texto):
    """Pega as duas primeiras palavras e tira caracteres inválidos em nome de arquivo."""
    palavras = []
    for palavra in texto.split()[:2]:
        limpa = re.sub(r"[^\w-]", "", palavra)[:30]
        if limpa:
            palavras.append(limpa)
    return "_".join(palavras) or "texto"


# Funções expostas para o JavaScript via pywebview.api para arquivos de texto
class Api:
    def fechar(self):
        webview.windows[0].destroy()

    def salvar_texto(self, texto, arquivo_atual=None):
        texto = (texto or "").strip()
        if not texto:
            return {"ok": False, "erro": "Texto vazio"}
        try:
            os.makedirs(PASTA_TEXTOS, exist_ok=True)

            # Já salvou esse texto antes? Se o arquivo ainda existe, atualiza ele.
            if arquivo_atual:
                nome = os.path.basename(arquivo_atual)  # basename evita caminhos maliciosos
                caminho = os.path.join(PASTA_TEXTOS, nome)
                if nome.endswith(".txt") and os.path.isfile(caminho):
                    with open(caminho, "w", encoding="utf-8") as f:
                        f.write(texto)
                    return {"ok": True, "arquivo": nome, "atualizado": True}

            # Senão, cria um novo: primeiras_duas_palavras_DD-MM-AAAA_HH-MM.txt
            data_hora = datetime.now().strftime("%d-%m-%Y_%H-%M")
            base = f"{_nome_base(texto)}_{data_hora}"
            nome = f"{base}.txt"

            # Evita sobrescrever outro texto salvo no mesmo minuto com as mesmas palavras
            contador = 2
            while os.path.exists(os.path.join(PASTA_TEXTOS, nome)):
                nome = f"{base}_{contador}.txt"
                contador += 1

            with open(os.path.join(PASTA_TEXTOS, nome), "w", encoding="utf-8") as f:
                f.write(texto)
            return {"ok": True, "arquivo": nome, "atualizado": False}

        except OSError as erro:
            return {"ok": False, "erro": str(erro)}

    def abrir_texto(self, nome):
        # basename impede que alguém peça um caminho fora da pasta
        nome = os.path.basename(nome or "")
        caminho = os.path.join(PASTA_TEXTOS, nome)

        if not nome.endswith(".txt") or not os.path.isfile(caminho):
            return {"ok": False, "erro": "Arquivo não encontrado"}

        try:
            with open(caminho, "r", encoding="utf-8") as f:
                return {"ok": True, "texto": f.read(), "arquivo": nome}
        except OSError as erro:
            return {"ok": False, "erro": str(erro)}


# ROTAS PAGINAS
# Pagina inicial
@app.route("/")
def index():
    return render_template("pagina1.html")

# indice A, B, C, D, E, F
@app.route("/pagina2")
def pagina2():
    return render_template("pagina2.html")

# indice G, H, I, J, K, L
@app.route("/pagina3")
def pagina3():
    return render_template("pagina3.html")

# indice M, N, O, P, Q, R
@app.route("/pagina4")
def pagina4():
    return render_template("pagina4.html")

# indice S, T, U, V, W, +
@app.route("/pagina5")
def pagina5():
    return render_template("pagina5.html")

# indice X, Y, Z
@app.route("/pagina6")
def pagina6():
    return render_template("pagina6.html")

# indice 0, 1, 2, 3, 4, +
@app.route("/pagina7")
def pagina7():
    return render_template("pagina7.html")

# indice mais opções (alarme, falar, numeros, apagar e +)
@app.route("/pagina8")
def pagina8():
    return render_template("pagina8.html")

# indice 5, 6, 7, 8, 9, :
@app.route("/pagina9")
def pagina9():
    return render_template("pagina9.html")

# pagina de listagem de textos salvos
@app.route("/textos")
@app.route("/textos/<int:pagina>")
def pagina10(pagina=0):
    arquivos = []
    if os.path.isdir(PASTA_TEXTOS):
        arquivos = [f for f in os.listdir(PASTA_TEXTOS) if f.endswith(".txt")]
        # mais recentes primeiro
        arquivos.sort(
            key=lambda f: os.path.getmtime(os.path.join(PASTA_TEXTOS, f)),
            reverse=True
        )

    por_pagina = 4
    inicio = pagina * por_pagina
    fim = inicio + por_pagina

    return render_template(
        "pagina10.html",
        arquivos=arquivos[inicio:fim],
        pagina=pagina,
        tem_proxima=fim < len(arquivos)
    )

# indice pagina de arquivos e 
@app.route("/pagina11")
def pagina11():
    return render_template("pagina11.html")


# Sugestões de palavras (usada pelos 3 botões de cima da tela)
@app.route("/sugestoes")
def sugestoes():
    prefixo = request.args.get("prefixo", "")
    return jsonify(sugestor.sugerir(prefixo))


# iniciar o servidor Flask em uma thread separada
def iniciar_flask():
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False
    )


# Ajustar a posição da janela do pywebview
def ajustar_janela():

    time.sleep(1)  # espera 

    user32 = ctypes.windll.user32
    user32.FindWindowW.restype = ctypes.c_void_p
    user32.SetWindowPos.argtypes = [
        ctypes.c_void_p, ctypes.c_void_p,
        ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
        ctypes.c_uint,
    ]

    hwnd = user32.FindWindowW(None, TITULO_JANELA)
    if not hwnd:
        print("Janela não encontrada para ajustar.")
        return

    largura = user32.GetSystemMetrics(0)       # largura total da tela
    altura_tela = user32.GetSystemMetrics(1)   # altura total da tela
    topo = int(altura_tela * FRACAO_TOPO)

    topo_base = int(altura_tela * FRACAO_TOPO)
    topo = topo_base + DESCER_PX          # posição final, mais para baixo
    altura = altura_tela - topo_base      # mantém a altura de antes; o excedente sai da tela

    HWND_TOPMOST = ctypes.c_void_p(-1)   # fica por cima da barra de tarefas
    SWP_SHOWWINDOW = 0x0040

    user32.SetWindowPos(
        hwnd, HWND_TOPMOST,
        0, topo,                      # x, y
        largura, altura, # largura e altura
        SWP_SHOWWINDOW
    )




# Inicia o Flask e a janela do pywebview
if __name__ == "__main__":

    # Inicia o Flask em segundo plano
    flask_thread = threading.Thread(target=iniciar_flask, daemon=True)
    flask_thread.start()

    # Dá um pequeno tempo para o Flask iniciar
    time.sleep(1)

    webview.create_window(
        TITULO_JANELA,
        "http://127.0.0.1:5000",
        frameless=True,
        resizable=False,
        on_top=True,
        js_api=Api()
    )

    # roda o ajuste numa thread separada assim que a janela abre
    webview.start(ajustar_janela)