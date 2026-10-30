// ========================================
// SUGESTÕES DE PALAVRAS (os 3 botões da área verde)
// ========================================
// Precisa do escala.js carregado antes (usa getTextoAtual, salvarTexto,
// atualizarBarraDeTexto e voltarParaPaginaInicial).
//
// Fluxo: ao abrir qualquer página, pega a palavra que está sendo digitada,
// pergunta ao Python (rota /sugestoes) quais palavras combinam e escreve
// as 3 primeiras nos botões. Ao clicar num botão, a palavra completa
// substitui o que foi digitado dela e entra um espaço no final.

const SUGERIR_EM_MAIUSCULAS = true;   // o teclado escreve em maiúsculas; false = minúsculas
const FONTE_SUGESTAO_MAXIMA = 44;     // tamanho da letra quando a palavra é curta
const FONTE_SUGESTAO_MINIMA = 18;     // palavras muito longas encolhem até aqui

let sugestoesAtuais = [];
let numeroDaBusca = 0;   // evita que uma resposta antiga sobrescreva uma mais nova


// A palavra em digitação é tudo que vem depois do último espaço
function palavraEmDigitacao(texto) {
    return texto.slice(texto.lastIndexOf(' ') + 1);
}


// Encolhe a letra até a palavra caber dentro do botão
function ajustarFonteDaSugestao(botao, palavraEl) {
    const estilo = getComputedStyle(botao);
    const espacoLivre = botao.clientWidth
        - parseFloat(estilo.paddingLeft)
        - parseFloat(estilo.paddingRight);

    let tamanho = FONTE_SUGESTAO_MAXIMA;
    botao.style.fontSize = tamanho + 'px';

    // offsetWidth não é afetado pelo scale() que o escala.js aplica no app
    while (palavraEl.offsetWidth > espacoLivre && tamanho > FONTE_SUGESTAO_MINIMA) {
        tamanho -= 2;
        botao.style.fontSize = tamanho + 'px';
    }
}


function desenharSugestoes() {
    for (let i = 0; i < 3; i++) {
        const botao = document.getElementById('sugestao-' + (i + 1));
        if (!botao) continue;

        botao.textContent = '';   // limpa o que tinha antes
        const palavra = sugestoesAtuais[i];
        if (!palavra) continue;   // sem sugestão: botão fica vazio

        const palavraEl = document.createElement('span');
        palavraEl.className = 'sugestao-texto';
        palavraEl.textContent = palavra;
        botao.appendChild(palavraEl);

        ajustarFonteDaSugestao(botao, palavraEl);
    }
}


async function atualizarSugestoes() {
    const minhaBusca = ++numeroDaBusca;
    const prefixo = palavraEmDigitacao(getTextoAtual());

    try {
        const resposta = await fetch('/sugestoes?prefixo=' + encodeURIComponent(prefixo));
        const lista = await resposta.json();

        if (minhaBusca !== numeroDaBusca) return;   // já existe uma busca mais nova

        sugestoesAtuais = lista.map(p => SUGERIR_EM_MAIUSCULAS ? p.toUpperCase() : p);
    } catch (erro) {
        console.warn('Não foi possível buscar sugestões:', erro);
        sugestoesAtuais = [];
    }

    desenharSugestoes();
}


// Chamada pelos botões: onclick="aceitarSugestao(0)" (0, 1 ou 2)
function aceitarSugestao(indice) {
    const palavra = sugestoesAtuais[indice];
    if (!palavra) return;   // botão vazio, nada a fazer

    // Troca a palavra em digitação pela sugestão e deixa um espaço pronto
    const texto = getTextoAtual();
    const inicioDaPalavra = texto.lastIndexOf(' ') + 1;
    salvarTexto(texto.slice(0, inicioDaPalavra) + palavra + ' ');

    if (window.location.pathname === '/') {
        // Já está na página inicial: só atualiza a tela, sem recarregar
        atualizarBarraDeTexto();
        atualizarSugestoes();
    } else {
        // Mesmo padrão dos outros botões de ação: volta para a página 1
        voltarParaPaginaInicial();
    }
}


window.addEventListener('load', atualizarSugestoes);
