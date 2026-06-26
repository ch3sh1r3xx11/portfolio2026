class SharedSystemMenu extends HTMLElement {
    constructor() {
        super();
        this.isOpen = false;
        
        // Struktura menu zgodna ze screenem od usera
        this.menuItems = [
            { label: 'projekty', event: 'sys-projects' },
            { label: 'zapisz', event: 'sys-save' },
            { label: 'zmień nazwę', event: 'sys-rename' },
            { label: 'odśwież', event: 'sys-refresh' },
            { label: 'cofnij', event: 'sys-undo' },
            { label: 'ponów', event: 'sys-redo' },
            { type: 'divider' },
            { label: 'udostępnij > export md i pdf i link', event: 'sys-share' },
            { label: 'dodaj do ulubionych', event: 'sys-favorite' },
            { type: 'divider' },
            { label: 'przezroczystość szkła bg', event: 'sys-glass-bg' },
            { label: 'bloki', event: 'sys-blocks' },
            { label: 'przezroczystość szkła bloków', event: 'sys-glass-blocks' },
            { label: 'kolory', event: 'sys-colors' },
            { label: 'tło', event: 'sys-bg' },
            { type: 'divider' },
            { label: 'opcje widoku', event: 'sys-view-opts' },
            { type: 'divider' },
            { label: 'pomoc', event: 'sys-help' },
            { label: 'wyloguj', event: 'sys-logout' }
        ];
    }

    connectedCallback() {
        this.render();
        this.setupListeners();
    }

    render() {
        // Wstrzykujemy CSS jeśli jeszcze go nie ma (dla bezpieczeństwa i izolacji)
        // Ale zakładamy, że link do CSS jest w index.html aplikacji.
        
        const container = document.createElement('div');
        container.className = 'system-menu-container';
        
        const btn = document.createElement('div');
        btn.className = 'system-menu-btn';
        btn.innerHTML = `
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
        `;
        
        const dropdown = document.createElement('div');
        dropdown.className = 'system-menu-dropdown';
        
        this.menuItems.forEach(item => {
            if (item.type === 'divider') {
                const div = document.createElement('div');
                div.className = 'system-menu-divider';
                dropdown.appendChild(div);
            } else {
                const div = document.createElement('div');
                div.className = 'system-menu-item';
                div.textContent = item.label;
                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.fireEvent(item.event);
                    this.toggleMenu(); // Zamknij po kliknięciu
                });
                dropdown.appendChild(div);
            }
        });
        
        container.appendChild(btn);
        container.appendChild(dropdown);
        
        this.appendChild(container);
        
        this.btnElement = btn;
        this.dropdownElement = dropdown;
    }

    setupListeners() {
        this.btnElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
        });

        // Zamknij klikając gdziekolwiek indziej
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.contains(e.target)) {
                this.toggleMenu();
            }
        });
    }

    toggleMenu() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.btnElement.classList.add('active');
            this.dropdownElement.classList.add('open');
        } else {
            this.btnElement.classList.remove('active');
            this.dropdownElement.classList.remove('open');
        }
    }

    fireEvent(eventName) {
        console.log(`[SystemMenu] Emituję zdarzenie: ${eventName}`);
        // Emitujemy globalne zdarzenie, które aplikacja (app.js) może wyłapać
        const event = new CustomEvent(eventName, { bubbles: true, composed: true });
        document.dispatchEvent(event);
    }
}

customElements.define('shared-system-menu', SharedSystemMenu);
