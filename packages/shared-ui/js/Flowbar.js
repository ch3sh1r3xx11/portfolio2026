class SharedFlowbar extends HTMLElement {
    constructor() {
        super();
        this.innerHTML = `
            <style>
                .block-menu {
                    position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
                    background: rgba(30, 30, 35, 0.6);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 20px;
                    padding: 12px;
                    width: 330px;
                    max-height: 400px; overflow-y: auto;
                    backdrop-filter: saturate(180%) blur(30px);
                    -webkit-backdrop-filter: saturate(180%) blur(30px);
                    box-shadow: 0 8px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
                    z-index: 1050; display: flex; flex-direction: column; gap: 4px;
                }
                .block-menu.hidden { display: none; }
                .block-option {
                    background: transparent; border: none; color: #fff;
                    text-align: left; padding: 8px 12px; cursor: pointer;
                    font-family: monospace; font-size: 14px;
                    border-radius: 12px; transition: background 0.15s, transform 0.1s;
                }
                .block-option:hover { background: rgba(255, 255, 255, 0.12); }
                .block-option:active { background: rgba(255, 255, 255, 0.08); transform: scale(0.96); }
                .color-palette-menu {
                    position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
                    background: rgba(30, 30, 35, 0.6);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 20px;
                    padding: 8px 12px;
                    display: flex; gap: 12px;
                    backdrop-filter: saturate(180%) blur(30px);
                    -webkit-backdrop-filter: saturate(180%) blur(30px);
                    box-shadow: 0 8px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
                    z-index: 1050; transition: opacity 0.2s, transform 0.2s;
                }
                .color-palette-menu.hidden { display: none; opacity: 0; transform: translate(-50%, 10px); }
                .color-dot {
                    width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent;
                    cursor: pointer; transition: transform 0.15s, border 0.15s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }
                .color-dot:hover { transform: scale(1.15); }
                .color-dot.active { border: 2px solid #fff; transform: scale(1.2); }
                .pill-btn.active { background: rgba(255,255,255,0.1); color: var(--magenta, #ff00ff); }
            </style>
            
            <!-- block-menu musi byc poza bottom-pill-container, zeby transformX na nim nie zaburzał fixed positioning -->
            <div id="block-menu" class="block-menu hidden">
                <button class="block-option" data-type="vision"><span style="color: var(--teal, #00c9c8)">#</span> Wizja</button>
                <button class="block-option" data-type="goal"><span style="color: var(--magenta, #ff00ff)">#</span> Cel (SMART)</button>
                <button class="block-option" data-type="scope"><span style="color: var(--teal, #00c9c8)">#</span> Zakres</button>
                <button class="block-option" data-type="plan"><span style="color: var(--magenta, #ff00ff)">#</span> Plan</button>
                <button class="block-option" data-type="timeline"><span style="color: var(--teal, #00c9c8)">#</span> Harmonogram</button>
                <button class="block-option" data-type="resources"><span style="color: var(--magenta, #ff00ff)">#</span> Zasoby</button>
                <button class="block-option" data-type="risks"><span style="color: var(--teal, #00c9c8)">#</span> Ryzyka</button>
                <button class="block-option" data-type="ifthen"><span style="color: var(--magenta, #ff00ff)">#</span> If>Then</button>
                <button class="block-option" data-type="success"><span style="color: var(--teal, #00c9c8)">#</span> Kryterium Sukcesu</button>
                <button class="block-option" data-type="empty"><span style="color: var(--magenta, #ff00ff)">[ ... ]</span> Pusty Blok</button>
            </div>
            
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
                    <input type="file" id="fb-image-upload" accept="image/*" style="display: none;">
                    
                    <button class="pill-btn" id="fb-toggle-draw" title="Pisak (Rysowanie)">
                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Podmenu kolorów dla pisaka -->
            <div id="draw-color-menu" class="color-palette-menu hidden">
                <button class="color-dot active" data-color="var(--teal)" style="background-color: var(--teal);"></button>
                <button class="color-dot" data-color="var(--neon-yellow)" style="background-color: var(--neon-yellow);"></button>
                <button class="color-dot" data-color="var(--sunset-orange)" style="background-color: var(--sunset-orange);"></button>
                <button class="color-dot" data-color="var(--magenta)" style="background-color: var(--magenta);"></button>
                <button class="color-dot" data-color="var(--purple)" style="background-color: var(--purple);"></button>
            </div>
            </div>
        `;
    }

    connectedCallback() {
        this.setupListeners();
    }

    setupListeners() {
        const emit = (eventName, detail = null) => {
            console.log("[Flowbar] Emituję event:", eventName, detail);
            this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
        };

        const blockMenu = this.querySelector('#block-menu');

        this.querySelector('#fb-add-block').addEventListener('click', (e) => {
            blockMenu.classList.toggle('hidden');
            e.stopPropagation();
        });

        // Przywrócona logika nasłuchiwania wewnątrz komponentu (Hermetyzacja).
        // Każdy przycisk emituje globalne zdarzenie "flowbar-add-block-type" zrozumiałe dla obu edytorów.
        const blockOptions = this.querySelectorAll('.block-option');
        blockOptions.forEach(btn => {
            // Zabezpieczenie przed wielokrotnym bindowaniem w Web Components
            btn.onclick = (e) => {
                e.stopImmediatePropagation();
                e.preventDefault();
                const type = btn.getAttribute('data-type');
                emit('flowbar-add-block-type', { type });
                blockMenu.classList.add('hidden');
            };
        });

        document.addEventListener('click', (e) => {
            if (!this.contains(e.target)) {
                blockMenu.classList.add('hidden');
            }
        });

        this.querySelector('#fb-add-note').addEventListener('click', () => emit('flowbar-add-note'));
        this.querySelector('#fb-add-text').addEventListener('click', () => emit('flowbar-add-text'));
        
        const fileInput = this.querySelector('#fb-image-upload');
        this.querySelector('#fb-add-image').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                emit('flowbar-upload-image', e.target.files[0]);
                e.target.value = '';
            }
        });

        const drawBtn = this.querySelector('#fb-toggle-draw');
        const colorMenu = this.querySelector('#draw-color-menu');
        const colorDots = this.querySelectorAll('.color-dot');
        
        drawBtn.addEventListener('click', (e) => {
            const isActive = drawBtn.classList.toggle('active');
            if (isActive) {
                colorMenu.classList.remove('hidden');
                emit('flowbar-toggle-draw', { active: true, color: this.querySelector('.color-dot.active').getAttribute('data-color') });
            } else {
                colorMenu.classList.add('hidden');
                emit('flowbar-toggle-draw', { active: false });
            }
            e.stopPropagation();
        });

        colorDots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                colorDots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                emit('flowbar-draw-color-change', { color: dot.getAttribute('data-color') });
                e.stopPropagation();
            });
        });

        document.addEventListener('click', (e) => {
            if (!this.contains(e.target)) {
                blockMenu.classList.add('hidden');
            }
        });
    }

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
