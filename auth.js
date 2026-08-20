import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. CONEXÃO COM O SEU FIREBASE (Chaves reais preenchidas com sucesso!)
const firebaseConfig = {
    apiKey: "AIzaSyB2LNWktWEwYLuZxwr8oc9NpcjFz3GU5qc",
    authDomain: "authrdm-a82a6.firebaseapp.com",
    databaseURL: "https://authrdm-a82a6-default-rtdb.firebaseio.com",
    projectId: "authrdm-a82a6",
    storageBucket: "authrdm-a82a6.firebasestorage.app",
    messagingSenderId: "97459319845",
    appId: "1:97459319845:web:8e1a16bbb6269af3b5fbcc"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Deixa as funções visíveis para o HTML
window.handleLogin = handleLogin;
window.handleCadastro = handleCadastro;
window.handleLogout = handleLogout;

// Função auxiliar para limpar o @ do TikTok e proteger o Firebase
function limparUsuario(user) {
    user = user.trim().toLowerCase();
    if (user.startsWith("@")) user = user.substring(1);

    // MÁGICA AQUI: Troca todos os pontos (.) por underline (_)
    // porque o Firebase não aceita pontos no nome do banco de dados!
    user = user.replace(/\./g, '_');

    return user;
}

// 2. LÓGICA DE LOGIN (VERIFICA TEXTO PURO NO BANCO)
async function handleLogin(event) {
    event.preventDefault();

    // Pega o nome EXATO que o usuário digitou (com o PONTO)
    let originalUser = document.getElementById("login-email").value.trim().toLowerCase();
    if (originalUser.startsWith("@")) originalUser = originalUser.substring(1);

    // Cria a versão segura para o Firebase (com UNDERLINE)
    const tiktokUser = limparUsuario(originalUser);

    const chaveDigitada = document.getElementById("login-password").value.trim();
    const errorMsg = document.getElementById("login-error");

    if (!originalUser || !chaveDigitada) {
        errorMsg.innerText = "Preencha todos os campos!";
        return;
    }

    try {
        const userRef = ref(database, 'usuarios/' + tiktokUser);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();

            if (userData.chave === chaveDigitada) {
                // 🪄 MÁGICA AQUI: Salvamos DUAS variáveis no navegador!
                localStorage.setItem("rdm_user", tiktokUser);          // Com "_" para o Firebase
                localStorage.setItem("rdm_user_tiktok", originalUser); // Com "." para a Torre de Controle
                localStorage.setItem("rdm_perfil", userData.perfil);

                errorMsg.style.color = "#22c55e";
                errorMsg.innerText = "Login realizado com sucesso!";

                setTimeout(() => {
                    window.toggleLoginModal(false);
                    window.location.reload();
                }, 1000);
            } else {
                errorMsg.style.color = "#ef4444";
                errorMsg.innerText = "Chave incorreta para este usuário!";
            }
        } else {
            errorMsg.style.color = "#ef4444";
            errorMsg.innerText = "Usuário não cadastrado! Clique abaixo para registrar.";
        }
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Erro ao conectar com o banco de dados.";
    }
}

// 3. LÓGICA DE CADASTRO AUTOMÁTICO (PERFIL GRATUITO + SENHA ALEATÓRIA)
async function handleCadastro() {
    const tiktokUser = limparUsuario(document.getElementById("login-email").value);
    const errorMsg = document.getElementById("login-error");

    if (!tiktokUser) {
        errorMsg.style.color = "#ef4444";
        errorMsg.innerText = "Digite o seu @ do TikTok primeiro para cadastrar!";
        return;
    }

    try {
        const userRef = ref(database, 'usuarios/' + tiktokUser);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            errorMsg.style.color = "#ef4444";
            errorMsg.innerText = "Este @ já está cadastrado!";
        } else {
            // Gerador de senha rápida (6 caracteres aleatórios misturando letras e números)
            const chaveGerada = Math.random().toString(36).substring(2, 8).toUpperCase();

            // Grava no Firebase como texto simples
            await set(userRef, {
                usuario: tiktokUser,
                chave: chaveGerada,
                perfil: "gratuito" // Sempre entra como gratuito por padrão
            });

            errorMsg.style.color = "#eab308";
            errorMsg.innerHTML = `Cadastrado! Sua chave de acesso é: <strong style="font-size:1.2rem; color:#fff;">${chaveGerada}</strong><br>Anote ela para entrar!`;
        }
    } catch (error) {
        console.error(error);
        errorMsg.innerText = "Erro ao criar cadastro.";
    }
}

// 4. LÓGICA DE LOGOUT
function handleLogout() {
    localStorage.clear();
    window.location.reload();
}

// 5. CHECAGEM DE SESSÃO E CONTROLE DE CORES/BLOQUEIOS AUTOMÁTICOS
document.addEventListener("DOMContentLoaded", async () => {
    const logado = localStorage.getItem("rdm_user");
    const perfil = localStorage.getItem("rdm_perfil");
    const userInfoArea = document.getElementById("user-info");
    const cards = document.querySelectorAll(".card-jogo");

    // Deixa a navegação livre para visitantes olharem as páginas dos jogos.
    // O bloqueio de download acontece lá dentro da página do próprio jogo.
    if (!logado) {
        return;
    }

    // Se estiver logado, renderiza a barra superior com o cargo correspondente
    let corPerfil = "#94a3b8";
    let coroa = "🎮";
    if (perfil === "plus") corPerfil = "#3b82f6";
    if (perfil === "plus premium") corPerfil = "#06b6d4";
    if (perfil === "pro") corPerfil = "#a855f7";
    if (perfil === "adm") { corPerfil = "#facc15"; coroa = "👑"; }

    userInfoArea.innerHTML = `
        <div class="user-logged-area">
            <span style="color: ${corPerfil}; font-weight: bold;">${coroa} @${logado} (${perfil.toUpperCase()})</span>
            ${perfil === 'adm' ? '<button onclick="abrirPainelADM()" class="btn-login-header" style="background:#facc15; color:#000; padding:5px 10px; font-size:0.9rem; margin:0 10px;">Gerenciar Contas</button>' : ''}
            <button class="btn-logout" onclick="handleLogout()">Sair</button>
        </div>
    `;

    // SISTEMA AUTOMÁTICO DE FILTRO PRETO E BRANCO BASEADO NO BANCO DE DADOS
    try {
        const userRef = ref(database, 'usuarios/' + logado);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            const jogosLiberadosManualmente = userData.jogos || {};
            const controleGratis = userData.controle_gratis || {};

            // Função que lê o link do botão e descobre qual é o ID do jogo no Firebase
            const identificarJogoPorLink = (href) => {
                if (href.includes("pro-arena")) return "pro_arena";
                if (href.includes("bomba-bomba")) return "bomba_bomba";
                if (href.includes("roblox")) return "roblox";
                if (href.includes("x1")) return "x1";
                if (href.includes("estope")) return "estope";
                if (href.includes("war")) return "war";
                if (href.includes("rdm-fc")) return "fc";
                if (href.includes("stickman")) return "stickman";
                if (href.includes("kof")) return "kof";
                if (href.includes("painel-host")) return "host";
                if (href.includes("snake")) return "snake";
                if (href.includes("brainbom")) return "brain";
                return "";
            };

            // Varre todos os cards de jogos da página inicial
            cards.forEach(card => {
                const href = card.getAttribute("href");
                const idJogo = identificarJogoPorLink(href);
                let possuiAcesso = false;

                // Regras Universais de Acesso
                if (perfil === "adm" || perfil === "pro") {
                    possuiAcesso = true; // ADM e PRO têm tudo colorido
                } else {
                    const dataHoje = new Date();
                    const mesAtual = dataHoje.getMonth() + 1;
                    const anoAtual = dataHoje.getFullYear();

                    // Verifica se este jogo é o escolhido do mês dele
                    const ehOJogoGratisDoMes = (controleGratis.jogo_escolhido === idJogo && controleGratis.mes_escolha === mesAtual && controleGratis.ano_escolha === anoAtual);

                    // Se ele for gratuito e NÃO escolheu nenhum jogo ainda no mês, tudo fica colorido para ele poder escolher
                    const naoEscolheuNenhumAinda = (perfil === "gratuito" && (!controleGratis.jogo_escolhido || controleGratis.mes_escolha !== mesAtual || controleGratis.ano_escolha !== anoAtual));

                    // Verifica se o ADM marcou a caixinha desse jogo para ele (Útil para Plus e Plus Premium)
                    const liberadoManualmente = (jogosLiberadosManualmente[idJogo] === true);

                    if (ehOJogoGratisDoMes || naoEscolheuNenhumAinda || liberadoManualmente) {
                        possuiAcesso = true;
                    }
                }

                // Se o usuário logado NÃO tiver acesso a este jogo específico:
                if (!possuiAcesso) {
                    card.classList.add("bloqueado"); // Ativa o filtro preto e branco via CSS

                    // Cria o botão "Adquirir Plano" dinamicamente embaixo do texto do card
                    const btnAdquirir = document.createElement("button");
                    btnAdquirir.className = "btn-adquirir-plano";
                    btnAdquirir.innerText = "💎 Adquirir Plano";

                    // Ao clicar em Adquirir Plano, abre o painel flutuante de assinaturas
                    btnAdquirir.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Evita que clique abra a página do jogo por acidente
                        window.togglePlanosModal(true);
                    });

                    card.appendChild(btnAdquirir);
                }
            });
        }
    } catch (error) {
        console.error("Erro ao processar cores do portfólio:", error);
    }
});

// Mantém a função de redirecionamento do ADM ativa no escopo global
window.abrirPainelADM = function() {
    window.location.href = "painel-adm.html";
};