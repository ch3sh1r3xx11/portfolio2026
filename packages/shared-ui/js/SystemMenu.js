import { db } from '/js/firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

class SharedSystemMenu extends HTMLElement {
    constructor() {
        super();
        this.isOpen = false;
        this.currentView = 'main'; // Możliwe stany: 'main' lub 'projects'
        this.projectsList = [];
        this.isLoadingProjects = false;
        
        // Struktura menu główniego
        this.menuItems = [
            { label: 'projekty', action: 'show-projects' }, // Teraz to akcja wewnętrzna menu
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
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'system-menu-container';
            
            this.btnElement = document.createElement('div');
            this.btnElement.className = 'system-menu-btn';
            this.btnElement.innerHTML = `
                <div class="hamburger-line"></div>
                <div class="hamburger-line"></div>
                <div class="hamburger-line"></div>
            `;
            
            this.dropdownElement = document.createElement('div');
            this.dropdownElement.className = 'system-menu-dropdown';
            
            this.container.appendChild(this.btnElement);
            this.container.appendChild(this.dropdownElement);
            this.appendChild(this.container);
        }
        
        this.renderDropdownContent();
    }
    
    renderDropdownContent() {
        this.dropdownElement.innerHTML = '';
        
        if (this.currentView === 'main') {
            this.menuItems.forEach(item => {
                if (item.type === 'divider') {
                    const div = document.createElement('div');
                    div.className = 'system-menu-divider';
                    this.dropdownElement.appendChild(div);
                } else {
                    const div = document.createElement('div');
                    div.className = 'system-menu-item';
                    div.textContent = item.label;
                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (item.action === 'show-projects') {
                            this.switchToProjectsView();
                        } else {
                            this.fireEvent(item.event);
                            this.toggleMenu();
                        }
                    });
                    this.dropdownElement.appendChild(div);
                }
            });
        } else if (this.currentView === 'projects') {
            // Przycisk powrotu do Menu
            const backBtn = document.createElement('div');
            backBtn.className = 'system-menu-item';
            backBtn.style.color = 'var(--magenta)';
            backBtn.style.fontWeight = 'bold';
            backBtn.textContent = '< wróć';
            backBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentView = 'main';
                this.renderDropdownContent();
            });
            this.dropdownElement.appendChild(backBtn);
            
            const div = document.createElement('div');
            div.className = 'system-menu-divider';
            this.dropdownElement.appendChild(div);
            
            if (this.isLoadingProjects) {
                const loading = document.createElement('div');
                loading.className = 'system-menu-item';
                loading.style.opacity = '0.5';
                loading.textContent = 'Ładowanie z bazy...';
                this.dropdownElement.appendChild(loading);
            } else {
                // Wyświetlamy listę pobranych projektów
                this.projectsList.forEach(proj => {
                    const item = document.createElement('div');
                    item.className = 'system-menu-item';
                    item.textContent = proj.title || 'Bez nazwy';
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // KLUCZOWE: Zmieniamy tylko ?id=, pozostając w tej samej aplikacji!
                        const currentPath = window.location.pathname;
                        window.location.href = currentPath + '?id=' + proj.id;
                    });
                    this.dropdownElement.appendChild(item);
                });
            }
        }
    }
    
    async switchToProjectsView() {
        this.currentView = 'projects';
        this.isLoadingProjects = true;
        this.renderDropdownContent(); // Pokaż "Ładowanie..."
        
        try {
            const q = query(collection(db, "projects"), where("isPublished", "==", true));
            const querySnapshot = await getDocs(q);
            
            let projects = [];
            querySnapshot.forEach((doc) => {
                projects.push({ id: doc.id, ...doc.data() });
            });
            
            // Sortowanie od najświeższych
            projects.sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt || 0);
                const dateB = new Date(b.updatedAt || b.createdAt || 0);
                return dateB - dateA;
            });
            
            this.projectsList = projects;
        } catch (error) {
            console.error("Błąd podczas ładowania projektów do SystemMenu:", error);
            this.projectsList = [];
        }
        
        this.isLoadingProjects = false;
        if (this.currentView === 'projects') {
            this.renderDropdownContent(); // Podmień na prawdziwą listę
        }
    }

    setupListeners() {
        if (!this.listenersSetup) {
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
            this.listenersSetup = true;
        }
    }

    toggleMenu() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.btnElement.classList.add('active');
            this.dropdownElement.classList.add('open');
            // Zawsze resetuj do głownego widoku przy ponownym otwarciu
            this.currentView = 'main';
            this.renderDropdownContent();
        } else {
            this.btnElement.classList.remove('active');
            this.dropdownElement.classList.remove('open');
        }
    }

    fireEvent(eventName) {
        console.log(`[SystemMenu] Emituję zdarzenie: ${eventName}`);
        const event = new CustomEvent(eventName, { bubbles: true, composed: true });
        document.dispatchEvent(event);
    }
}

customElements.define('shared-system-menu', SharedSystemMenu);
