function ajustarEscala() {
    const app = document.getElementById('app');
    const larguraBase = 1280;
    const alturaBase = 720;

    const escalaX = window.innerWidth / larguraBase;
    const escalaY = window.innerHeight / alturaBase;

    // Estica cada eixo separadamente para ocupar a janela toda
    app.style.transform = `scale(${escalaX}, ${escalaY})`;

    //const escala = Math.min(escalaX, escalaY);

    //app.style.transform = `scale(${escala})`;
}

window.addEventListener('load', ajustarEscala);
window.addEventListener('resize', ajustarEscala);


// Botão redondo da direita: fecha o programa
function fecharPrograma() {
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.fechar();
    } else {
        console.warn('pywebview.api ainda não está pronto.');
    }
}


// ========================================
// BARRA DE TEXTO (caixa que mostra o que foi digitado)
// ========================================

const CHAVE_TEXTO = 'textoDigitado';

function getTextoAtual() {
    return localStorage.getItem(CHAVE_TEXTO) || '';
}

const CHAVE_ARQUIVO = 'arquivoAtual';

function salvarTexto(texto) {
    localStorage.setItem(CHAVE_TEXTO, texto);
    if (!texto) {
        localStorage.removeItem(CHAVE_ARQUIVO);
    }
}

function atualizarBarraDeTexto() {
    const conteudo = document.getElementById('conteudo-texto');
    if (conteudo) {
        conteudo.textContent = getTextoAtual();
    }
}

// Chamada pelos botões de letra: onclick="digitarTexto('A')"
function digitarTexto(caractere) {
    const textoAtual = getTextoAtual();
    salvarTexto(textoAtual + caractere);
    atualizarBarraDeTexto();
}

// Usada pelos botões que devem digitar E voltar para a página inicial em seguida
// (qualquer botão de ação, exceto os que já navegam para outra página do teclado)
function digitarEVoltar(caractere) {
    digitarTexto(caractere);
    voltarParaPaginaInicial();
}

function voltarParaPaginaInicial() {
    window.location.href = '/';
}


// Remove a última palavra digitada, incluindo espaços em branco que estejam sobrando no final do texto.
function apagarUltimaPalavra() {
    let texto = getTextoAtual();

    // Tira espaços do final (ex: usuário apertou a barra de espaço por último)
    texto = texto.replace(/\s+$/, '');

    // Acha o espaço anterior à última palavra restante
    const posUltimoEspaco = texto.lastIndexOf(' ');

    if (posUltimoEspaco === -1) {
        // Não tem mais nenhum espaço = só sobrava uma palavra: apaga tudo
        texto = '';
    } else {
        // Corta a partir daquele espaço, removendo a última palavra
        texto = texto.substring(0, posUltimoEspaco);
    }

    salvarTexto(texto);
    atualizarBarraDeTexto();
}


// Apaga o conteúdo inteiro da barra de texto
function apagarTudo() {
    salvarTexto('');
    atualizarBarraDeTexto();
}

// Versões que, além de apagar, voltam para a página inicial
// (mesmo padrão do digitarEVoltar, usadas nos onclick dos botões)
function apagarPalavraEVoltar() {
    apagarUltimaPalavra();
    voltarParaPaginaInicial();
}

function apagarTudoEVoltar() {
    apagarTudo();
    voltarParaPaginaInicial();
}


//========================================
// FALA (text-to-speech)
//========================================

const NOME_VOZ_PREFERIDA = 'Google português do Brasil';  

function falarTexto() {
    const texto = getTextoAtual().trim();
    
    if (!texto) return; // nada escrito, não faz nada

    if (!('speechSynthesis' in window)) {
        console.warn('Este navegador não suporta text-to-speech.');
        return;
    }
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';

    speechSynthesis.cancel(); // interrompe qualquer fala anterior que ainda esteja rolando
    speechSynthesis.speak(fala);
    
}

function obterVozPreferida() {
    const vozes = speechSynthesis.getVoices();

    if (NOME_VOZ_PREFERIDA) {
        const escolhida = vozes.find(v => v.name === NOME_VOZ_PREFERIDA);
        if (escolhida) return escolhida;
        console.warn(`Voz "${NOME_VOZ_PREFERIDA}" não encontrada, usando alternativa em pt-BR.`);
    }
    return vozes.find(v => v.lang === 'pt-BR') || vozes.find(v => v.lang.startsWith('pt'));
}


function falarEVoltar() {
    const texto = getTextoAtual().trim();

    if (!texto || !('speechSynthesis' in window)) {
        voltarParaPaginaInicial();
        return;
    }

    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = 'pt-BR';
    fala.voice = obterVozPreferida();

    fala.onend = () => voltarParaPaginaInicial();
    fala.onerror = () => voltarParaPaginaInicial();

    speechSynthesis.cancel();
    speechSynthesis.speak(fala);
}



// ========================================
// SIRENE (chamar atenção)
// ========================================

function chamarAtencao() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    // Navegador sem suporte: só volta pra página inicial
    if (!AudioCtx) {
        voltarParaPaginaInicial();
        return;
    }

    const ctx = new AudioCtx();
    const oscilador = ctx.createOscillator();
    const volume = ctx.createGain();

    oscilador.type = 'sawtooth';   // timbre "áspero", mais forte e chamativo
    volume.gain.value = 0.3;       // volume máximo do app (0.0 a 1.0)

    const agora = ctx.currentTime;
    const duracaoCiclo = 1.0;      // segundos para subir e descer uma vez
    const ciclos = 3;              // 3 x 1,0s = 3,0 segundos de sirene
    const freqBaixa = 600;         // Hz
    const freqAlta = 1200;         // Hz

    // Programa a variação de frequência: sobe e desce a cada ciclo
    oscilador.frequency.setValueAtTime(freqBaixa, agora);
    for (let i = 0; i < ciclos; i++) {
        const inicio = agora + i * duracaoCiclo;
        oscilador.frequency.linearRampToValueAtTime(freqAlta, inicio + duracaoCiclo / 2);
        oscilador.frequency.linearRampToValueAtTime(freqBaixa, inicio + duracaoCiclo);
    }

    oscilador.connect(volume);
    volume.connect(ctx.destination);

    oscilador.start(agora);
    oscilador.stop(agora + ciclos * duracaoCiclo);

    // Só volta pra página 1 quando a sirene terminar
    oscilador.onended = () => {
        ctx.close();
        voltarParaPaginaInicial();
    };
}




// ========================================
// SALVAR TEXTO (arquivo .txt + área de transferência)
// ========================================

async function copiarParaAreaDeTransferencia(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch (erro) {
        // Plano B para webviews que bloqueiam a API moderna de clipboard
        const area = document.createElement('textarea');
        area.value = texto;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        let copiou = false;
        try {
            copiou = document.execCommand('copy');
        } catch (e) {}
        document.body.removeChild(area);
        return copiou;
    }
}

async function salvarEVoltar() {
    const texto = getTextoAtual().trim();

    // Sem texto: não salva nada, só volta
    if (!texto) {
        voltarParaPaginaInicial();
        return;
    }

    // 1) Deixa o texto pronto para colar com Ctrl+V
    await copiarParaAreaDeTransferencia(texto);

    // 2) Pede ao Python para gravar (ou atualizar) o arquivo .txt
    if (window.pywebview && window.pywebview.api) {
        try {
            const resultado = await window.pywebview.api.salvar_texto(
                texto,
                localStorage.getItem(CHAVE_ARQUIVO)
            );
            if (resultado.ok) {
                localStorage.setItem(CHAVE_ARQUIVO, resultado.arquivo);
            } else {
                console.error('Erro ao salvar:', resultado.erro);
            }
        } catch (erro) {
            console.error('Falha ao chamar o Python:', erro);
        }
    } else {
        console.warn('pywebview.api ainda não está pronto.');
    }

    // 3) Só volta para a página inicial depois que tudo terminou
    voltarParaPaginaInicial();
}



async function abrirTextoSalvo(nome) {
    if (window.pywebview && window.pywebview.api) {
        try {
            const r = await window.pywebview.api.abrir_texto(nome);
            if (r.ok) {
                localStorage.setItem(CHAVE_TEXTO, r.texto);
                // marca este arquivo como o "atual": o próximo salvar atualiza ele
                localStorage.setItem(CHAVE_ARQUIVO, r.arquivo);
            } else {
                console.error('Erro ao abrir:', r.erro);
            }
        } catch (erro) {
            console.error('Falha ao chamar o Python:', erro);
        }
    }
    voltarParaPaginaInicial();
}

// Tamanho da fonte da barra de texto: diminui se o texto for grande demais para caber na barra

const FONTE_MAXIMA = 44;   // tamanho quando o texto é curto (o mesmo do CSS)
const FONTE_MINIMA = 16;   // menor tamanho permitido

// Começa no tamanho máximo e vai diminuindo até o texto caber na barra
function ajustarTamanhoDaFonte() {
    const caixa = document.getElementById('texto-digitado');
    const linhas = caixa ? caixa.querySelector('.texto-linhas') : null;
    if (!caixa || !linhas) return;

    let tamanho = FONTE_MAXIMA;
    caixa.style.fontSize = tamanho + 'px';

    while (linhas.scrollHeight > caixa.clientHeight && tamanho > FONTE_MINIMA) {
        tamanho -= 2;
        caixa.style.fontSize = tamanho + 'px';
    }
}

function atualizarBarraDeTexto() {
    const conteudo = document.getElementById('conteudo-texto');
    if (conteudo) {
        conteudo.textContent = getTextoAtual();
        ajustarTamanhoDaFonte();   // <-- linha nova
    }
}





// Preenche a barra assim que a página carrega (ou troca de página)
window.addEventListener('load', atualizarBarraDeTexto);

// Bloqueia qualquer tentativa de digitar com o teclado físico do computador.
// "true" no final faz capturar o evento antes que qualquer outro código o veja.
document.addEventListener('keydown', function (evento) {
    evento.preventDefault();
}, true);
