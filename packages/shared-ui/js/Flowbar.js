class SharedFlowbar extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
            <div class="bottom-pill-container">
                <div class="bottom-pill" id="bottom-tools" style="display: none;">
                    <button class="pill-btn" id="fb-add-block" title="Dodaj Blok (Cel, Zakres)">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <button class="pill-btn" id="fb-add-note" title="Dodaj Notatkę">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </button>
                    <button class="pill-btn" id="fb-add-text" title="Dodaj Tekst">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke-dasharray="4 2"></rect>
                            <polyline points="9 16 12 8 15 16"></polyline>
                            <line x1="10" y1="13" x2="14" y2="13"></line>
                        </svg>
                    </button>
                    <button class="pill-btn" id="fb-add-image" title="Zdjęcie">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </button>
                    <!-- Input for image upload is usually hidden and handled by the app, but we can put it here or let the app handle it -->
                    <input type="file" id="fb-image-upload" accept="image/*" style="display: none;">
                    
                    <button class="pill-btn" id="fb-add-frame" title="Ramka (Przegroda)">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                    </button>
                    <button class="pill-btn" id="fb-add-kpi" title="Checkbox / Zadanie">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.setupListeners();
    }

    setupListeners() {
        const emit = (eventName, detail = null) => {
            this.dispatchEvent(new CustomEvent(eventName, { 
                detail, 
                bubbles: true, 
                composed: true 
            }));
        };

        this.querySelector('#fb-add-block').addEventListener('click', () => emit('flowbar-add-block'));
        this.querySelector('#fb-add-note').addEventListener('click', () => emit('flowbar-add-note'));
        this.querySelector('#fb-add-text').addEventListener('click', () => emit('flowbar-add-text'));
        
        // Image logic can be slightly coupled here to open the file input directly
        const imageUploadInput = this.querySelector('#fb-image-upload');
        this.querySelector('#fb-add-image').addEventListener('click', () => {
            imageUploadInput.click();
        });

        imageUploadInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                emit('flowbar-add-image', { file: e.target.files[0] });
            }
            // Reset tak by można było wgrać ten sam plik drugi raz
            e.target.value = '';
        });

        this.querySelector('#fb-add-frame').addEventListener('click', () => emit('flowbar-add-frame'));
        this.querySelector('#fb-add-kpi').addEventListener('click', () => emit('flowbar-add-kpi'));
    }

    // Metoda do pokazywania/ukrywania (np. przy logowaniu)
    show() {
        const tools = this.querySelector('#bottom-tools');
        if(tools) tools.style.display = 'flex';
    }

    hide() {
        const tools = this.querySelector('#bottom-tools');
        if(tools) tools.style.display = 'none';
    }
}

customElements.define('shared-flowbar', SharedFlowbar);
