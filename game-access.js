import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB2LNWktWEwYLuZxwr8oc9NpcjFz3GU5qc",
    authDomain: "authrdm-a82a6.firebaseapp.com",
    databaseURL: "https://authrdm-a82a6-default-rtdb.firebaseio.com",
    projectId: "authrdm-a82a6",
    storageBucket: "authrdm-a82a6.firebasestorage.app",
    messagingSenderId: "97459319845",
    appId: "1:97459319845:web:8e1a16bbb6269af3b5fbcc"
};

const database = getDatabase(initializeApp(firebaseConfig));
const GAME_SESSION_MS = 2 * 60 * 60 * 1000;
const DAILY_RESET_MS = 24 * 60 * 60 * 1000;
const area = document.getElementById('game-access-area');

function createMessage(text) {
    const message = document.createElement('p');
    message.className = 'access-message';
    message.textContent = text;
    area.append(message);
}

function createLink(text, href, style = 'button button-primary') {
    const link = document.createElement('a');
    link.className = style;
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = text;
    area.append(link);
}

function createButton(text, action) {
    const button = document.createElement('button');
    button.className = 'button button-primary';
    button.type = 'button';
    button.textContent = text;
    button.addEventListener('click', action);
    area.append(button);
}

function createPlanLink() {
    const link = document.createElement('a');
    link.className = 'button button-outline';
    link.href = 'index.html#planos';
    link.textContent = 'Ver opções de acesso';
    area.append(link);
}

function createLoginLink() {
    const link = document.createElement('a');
    link.className = 'button button-primary';
    link.href = 'index.html?login=true';
    link.textContent = 'Entrar ou criar conta gratuita';
    area.append(link);
}

function showPlayableLinks() {
    if (area.dataset.gameUrl) createLink('▶ Abrir jogo', area.dataset.gameUrl);
    if (area.dataset.downloadUrl) createLink('⬇ Baixar jogo', area.dataset.downloadUrl, 'button button-outline');
}

async function startFreeSession(userKey, claimGame) {
    const now = Date.now();
    const date = new Date(now);
    const updates = { inicio_sessao: now };
    if (claimGame) {
        updates.jogo_escolhido = area.dataset.gameId;
        updates.mes_escolha = date.getMonth() + 1;
        updates.ano_escolha = date.getFullYear();
    }
    await update(ref(database, `usuarios/${userKey}/controle_gratis`), updates);
    await renderAccess();
}

async function renderAccess() {
    if (!area) return;
    area.replaceChildren();
    const gameId = area.dataset.gameId;
    const userKey = localStorage.getItem('rdm_user');
    if (!userKey) {
        createMessage('Entre na sua conta para escolher este jogo gratuito ou usar uma licença ativa.');
        createLoginLink();
        createPlanLink();
        return;
    }

    try {
        const userRef = ref(database, `usuarios/${userKey}`);
        const userSnapshot = await get(userRef);
        if (!userSnapshot.exists()) {
            createMessage('Não foi possível localizar a conta. Entre novamente para continuar.');
            createLoginLink();
            return;
        }
        const user = userSnapshot.val();
        let profile = user.perfil || 'gratuito';
        if (user.expiracao && Date.now() > Number(user.expiracao) && profile !== 'gratuito' && profile !== 'adm') {
            profile = 'gratuito';
            user.perfil = profile;
            user.expiracao = null;
            user.pacote_comercial = null;
            await update(userRef, { perfil: 'gratuito', expiracao: null, pacote_comercial: null });
        }
        localStorage.setItem('rdm_perfil', profile);

        if (profile === 'pro' || profile === 'adm') {
            createMessage('Acesso completo ativo. O acesso ao Painel Host acompanha a validade do seu plano.');
            showPlayableLinks();
            return;
        }

        if (profile === 'gratuito') {
            const control = user.controle_gratis || {};
            const nowDate = new Date();
            const currentMonth = nowDate.getMonth() + 1;
            const currentYear = nowDate.getFullYear();
            const selectionIsCurrent = control.mes_escolha === currentMonth && control.ano_escolha === currentYear;
            const selectedGame = selectionIsCurrent ? control.jogo_escolhido : null;

            if (!selectedGame) {
                createMessage('Escolha este como seu único jogo gratuito do mês. A sessão inclui até 2 horas a cada período de 24 horas.');
                createButton('Escolher e iniciar jogo gratuito', () => startFreeSession(userKey, true));
                return;
            }
            if (selectedGame !== gameId) {
                createMessage('Você já escolheu outro jogo gratuito neste mês. Os acessos completos liberam todo o catálogo.');
                createPlanLink();
                return;
            }

            const sessionStart = Number(control.inicio_sessao) || 0;
            if (!sessionStart) {
                createMessage('Este é seu jogo gratuito do mês. Inicie a sessão de até 2 horas.');
                createButton('Iniciar sessão gratuita de 2 horas', () => startFreeSession(userKey, false));
                return;
            }
            const elapsed = Date.now() - sessionStart;
            if (elapsed < GAME_SESSION_MS) {
                const remainingMinutes = Math.floor((GAME_SESSION_MS - elapsed) / 60000);
                createMessage(`Sua sessão gratuita está ativa. Tempo restante: ${remainingMinutes} min.`);
                showPlayableLinks();
                return;
            }
            if (elapsed < DAILY_RESET_MS) {
                createMessage('O limite diário de 2 horas foi atingido. Você poderá jogar novamente quando completar 24 horas ou pode liberar todo o catálogo.');
                createPlanLink();
                return;
            }
            createMessage('Seu limite gratuito diário foi renovado.');
            createButton('Iniciar nova sessão de 2 horas', () => startFreeSession(userKey, false));
            return;
        }

        const manualGameAccess = user.jogos?.[gameId] === true;
        if (manualGameAccess) {
            createMessage('Este jogo está liberado na sua conta.');
            showPlayableLinks();
            return;
        }
        createMessage('Este jogo não está liberado na sua conta. Consulte as opções ou fale com a equipe pelo WhatsApp.');
        createPlanLink();
    } catch (error) {
        console.error('Não foi possível verificar o acesso ao jogo.', error);
        createMessage('Não foi possível verificar sua licença agora. Tente novamente em instantes.');
    }
}

renderAccess();
