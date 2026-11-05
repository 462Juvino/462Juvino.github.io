(() => {
    const loginModal = document.getElementById('login-modal');
    const catalog = document.getElementById('game-catalog');
    const searchInput = document.getElementById('game-search');
    const emptyState = document.getElementById('empty-games');
    const menuToggle = document.getElementById('menu-toggle');
    const siteNav = document.getElementById('site-nav');
    let activeFilter = 'todos';

    window.toggleLoginModal = function(show) {
        if (!loginModal) return;
        loginModal.style.display = show ? 'flex' : 'none';
        loginModal.setAttribute('aria-hidden', String(!show));
        document.body.classList.toggle('modal-open', Boolean(show));
        if (!show) {
            const error = document.getElementById('login-error');
            if (error) error.textContent = '';
        } else {
            window.setTimeout(() => document.getElementById('login-email')?.focus(), 40);
        }
    };

    // Mantém compatibilidade com botões antigos que abriam o modal de planos.
    window.togglePlanosModal = function(show) {
        if (show) document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    function atualizarCatalogo() {
        if (!catalog) return;
        const termo = (searchInput?.value || '').trim().toLocaleLowerCase('pt-BR');
        let visiveis = 0;

        catalog.querySelectorAll('.card-jogo').forEach((card) => {
            const categoria = card.dataset.category || '';
            const nome = `${card.dataset.search || ''} ${card.querySelector('h3')?.textContent || ''}`.toLocaleLowerCase('pt-BR');
            const correspondeCategoria = activeFilter === 'todos' || categoria === activeFilter;
            const correspondeBusca = !termo || nome.includes(termo);
            const mostrar = correspondeCategoria && correspondeBusca;
            card.hidden = !mostrar;
            if (mostrar) visiveis += 1;
        });

        if (emptyState) emptyState.hidden = visiveis !== 0;
    }

    document.querySelectorAll('[data-filter]').forEach((button) => {
        button.addEventListener('click', () => {
            activeFilter = button.dataset.filter || 'todos';
            document.querySelectorAll('[data-filter]').forEach((option) => {
                const active = option === button;
                option.classList.toggle('is-active', active);
                option.setAttribute('aria-pressed', String(active));
            });
            atualizarCatalogo();
        });
    });

    searchInput?.addEventListener('input', atualizarCatalogo);

    menuToggle?.addEventListener('click', () => {
        const open = menuToggle.getAttribute('aria-expanded') !== 'true';
        menuToggle.setAttribute('aria-expanded', String(open));
        siteNav?.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });

    siteNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
        siteNav.classList.remove('is-open');
        menuToggle?.setAttribute('aria-expanded', 'false');
        menuToggle?.setAttribute('aria-label', 'Abrir menu');
    }));

    loginModal?.addEventListener('click', (event) => {
        if (event.target === loginModal) window.toggleLoginModal(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && loginModal?.style.display === 'flex') window.toggleLoginModal(false);
    });

    if (new URLSearchParams(window.location.search).get('login') === 'true') {
        window.toggleLoginModal(true);
    }

    // Mantém os pulsos que acordam a Torre de Controle usada pelo site original.
    function acordarNuvem() {
        fetch('https://torre-de-controle-rdm.onrender.com', { method: 'GET', mode: 'no-cors' })
            .then(() => console.log('Pulso enviado para a Torre de Controle.'))
            .catch(() => console.log('Torre de Controle indisponível no momento.'));
    }
    window.addEventListener('load', acordarNuvem);

    let torreAwakeSocket = null;
    function despertarTorreDeControle() {
        if (torreAwakeSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(torreAwakeSocket.readyState)) return;
        try {
            torreAwakeSocket = new WebSocket('wss://torre-de-controle-rdm.onrender.com:443/');
            torreAwakeSocket.onopen = () => torreAwakeSocket.send(JSON.stringify({ action: 'ping', origin: 'website_visitor' }));
            torreAwakeSocket.onerror = () => console.log('Torre de Controle indisponível no momento.');
            torreAwakeSocket.onclose = () => { torreAwakeSocket = null; };
        } catch (error) {
            console.error('Não foi possível iniciar a conexão da Torre de Controle.', error);
        }
    }
    despertarTorreDeControle();
    window.setInterval(despertarTorreDeControle, 120000);

    // Remove o service worker legado que podia manter arquivos antigos em cache.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => registration.unregister());
        }).catch((error) => console.warn('Não foi possível verificar o cache antigo.', error));
    }
})();
