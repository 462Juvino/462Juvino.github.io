import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

window.handleLogin = handleLogin;
window.handleCadastro = handleCadastro;
window.handleLogout = handleLogout;

function limparUsuario(user) {
    return user.trim().toLowerCase().replace(/^@/, '').replace(/\./g, '_');
}

async function normalizarPlanoExpirado(userId, userData) {
    if (userData.expiracao && Date.now() > Number(userData.expiracao) && userData.perfil !== 'gratuito' && userData.perfil !== 'adm') {
        userData.perfil = 'gratuito';
        userData.expiracao = null;
        await update(ref(database, `usuarios/${userId}`), { perfil: 'gratuito', expiracao: null });
    }
    return userData;
}

async function handleLogin(event) {
    event.preventDefault();
    const inputUsuario = document.getElementById('login-email');
    const inputChave = document.getElementById('login-password');
    const originalUser = inputUsuario.value.trim().toLowerCase().replace(/^@/, '');
    const userKey = limparUsuario(originalUser);
    const chaveDigitada = inputChave.value.trim();
    const errorMsg = document.getElementById('login-error');

    if (!originalUser || !chaveDigitada) {
        errorMsg.textContent = 'Preencha todos os campos.';
        return;
    }

    try {
        const userRef = ref(database, `usuarios/${userKey}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            errorMsg.style.color = '#ff8383';
            errorMsg.textContent = 'Usuário não cadastrado. Crie uma conta gratuita para continuar.';
            return;
        }
        let userData = snapshot.val();
        if (userData.chave !== chaveDigitada) {
            errorMsg.style.color = '#ff8383';
            errorMsg.textContent = 'Chave incorreta para este usuário.';
            return;
        }

        userData = await normalizarPlanoExpirado(userKey, userData);
        localStorage.setItem('rdm_user', userKey);
        localStorage.setItem('rdm_user_tiktok', originalUser);
        localStorage.setItem('rdm_perfil', userData.perfil || 'gratuito');
        errorMsg.style.color = '#51d6a4';
        errorMsg.textContent = 'Login realizado com sucesso.';
        window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
        console.error(error);
        errorMsg.style.color = '#ff8383';
        errorMsg.textContent = 'Não foi possível conectar à conta. Tente novamente.';
    }
}

async function handleCadastro() {
    const inputUsuario = document.getElementById('login-email');
    const originalUser = inputUsuario.value.trim().toLowerCase().replace(/^@/, '');
    const userKey = limparUsuario(originalUser);
    const errorMsg = document.getElementById('login-error');
    if (!userKey) {
        errorMsg.style.color = '#ff8383';
        errorMsg.textContent = 'Digite seu usuário do TikTok para criar a conta.';
        inputUsuario.focus();
        return;
    }

    try {
        const userRef = ref(database, `usuarios/${userKey}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            errorMsg.style.color = '#ff8383';
            errorMsg.textContent = 'Este usuário já está cadastrado. Entre com sua chave de acesso.';
            return;
        }
        const chaveGerada = Math.random().toString(36).slice(2, 8).toUpperCase();
        await set(userRef, { usuario: userKey, chave: chaveGerada, perfil: 'gratuito' });
        errorMsg.style.color = '#f6d365';
        errorMsg.innerHTML = `Conta gratuita criada. Sua chave de acesso é <strong>${chaveGerada}</strong>. Anote-a para entrar.`;
    } catch (error) {
        console.error(error);
        errorMsg.style.color = '#ff8383';
        errorMsg.textContent = 'Não foi possível criar a conta. Tente novamente.';
    }
}

function handleLogout() {
    ['rdm_user', 'rdm_user_tiktok', 'rdm_perfil'].forEach((key) => localStorage.removeItem(key));
    window.location.reload();
}

function criarLink(texto, destino, classe = 'button button-small button-outline') {
    const link = document.createElement('a');
    link.className = classe;
    link.href = destino;
    link.textContent = texto;
    return link;
}

function montarMenuUsuario(usuario, perfil) {
    const area = document.getElementById('user-info');
    if (!area) return;
    area.replaceChildren();
    const wrapper = document.createElement('div');
    wrapper.className = 'user-logged-area';
    const nome = document.createElement('span');
    nome.className = 'user-name';
    nome.textContent = `@${usuario}`;
    wrapper.append(nome, criarLink('Meu perfil', 'perfil.html'));
    if (perfil === 'adm') wrapper.append(criarLink('Painel ADM', 'painel-adm.html', 'button button-small button-primary'));
    const sair = document.createElement('button');
    sair.type = 'button';
    sair.className = 'btn-logout';
    sair.textContent = 'Sair';
    sair.addEventListener('click', handleLogout);
    wrapper.append(sair);
    area.append(wrapper);
}

async function atualizarCardsDoCatalogo(userData) {
    const cards = document.querySelectorAll('.card-jogo');
    const perfil = userData.perfil || 'gratuito';
    const liberacoesManuais = userData.jogos || {};
    const controleGratis = userData.controle_gratis || {};
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const escolheuNesteMes = Boolean(controleGratis.jogo_escolhido && controleGratis.mes_escolha === mesAtual && controleGratis.ano_escolha === anoAtual);
    const jogoEscolhido = escolheuNesteMes ? controleGratis.jogo_escolhido : null;

    cards.forEach((card) => {
        const idJogo = card.dataset.gameId || '';
        const idPermissao = card.dataset.accessId || idJogo;
        const acessoTotal = perfil === 'adm' || (perfil === 'pro' && (!userData.expiracao || Date.now() <= Number(userData.expiracao)));
        const acessoGratuitoDoMes = Boolean(jogoEscolhido && jogoEscolhido === idJogo);
        const podeEscolherJogo = perfil === 'gratuito' && !escolheuNesteMes;
        const acessoManual = liberacoesManuais[idPermissao] === true;
        const possuiAcesso = acessoTotal || acessoGratuitoDoMes || podeEscolherJogo || acessoManual;
        card.classList.toggle('bloqueado', !possuiAcesso);
        card.querySelector('.btn-adquirir-plano')?.remove();

        if (!possuiAcesso) {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'btn-adquirir-plano';
            botao.textContent = 'Ver opções de acesso';
            botao.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                window.togglePlanosModal?.(true);
            });
            card.append(botao);
        }
    });
}

async function prepararSessao() {
    const userKey = localStorage.getItem('rdm_user');
    if (!userKey) return;
    const usuarioVisivel = localStorage.getItem('rdm_user_tiktok') || userKey;
    try {
        const snapshot = await get(ref(database, `usuarios/${userKey}`));
        if (!snapshot.exists()) {
            ['rdm_user', 'rdm_user_tiktok', 'rdm_perfil'].forEach((key) => localStorage.removeItem(key));
            return;
        }
        const userData = await normalizarPlanoExpirado(userKey, snapshot.val());
        const perfil = userData.perfil || 'gratuito';
        localStorage.setItem('rdm_perfil', perfil);
        montarMenuUsuario(usuarioVisivel, perfil);
        await atualizarCardsDoCatalogo(userData);
    } catch (error) {
        console.error('Não foi possível carregar a conta Firebase.', error);
    }
}

window.abrirPainelADM = function() {
    window.location.href = 'painel-adm.html';
};

document.addEventListener('DOMContentLoaded', prepararSessao);
