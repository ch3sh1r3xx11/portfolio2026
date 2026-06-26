/**
 * FlowImageManager - Shared module for handling selection and aspect-ratio locked resizing
 * of images and other elements.
 */

export class FlowImageManager {
    constructor(config = {}) {
        // config.getScale: funkcja zwracająca obecny zoom (dla projektownika), default 1.0
        this.getScale = config.getScale || (() => 1);
        // callback po zakończeniu zmiany wymiarów (zwraca id elementu i nowe wymiary)
        this.onResizeComplete = config.onResizeComplete || (() => {});
        // Opcjonalnie: czy manager ma obsługiwać kliknięcie w tło dla odznaczenia
        this.autoDeselect = config.autoDeselect !== undefined ? config.autoDeselect : true;

        this.selectedElement = null;
        this.isResizing = false;
        
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.startLeft = 0;
        this.startTop = 0;
        this.activeHandle = null;
        this.aspectRatio = 1;

        this._bindEvents();
    }

    _bindEvents() {
        // Zdarzenia globalne dla ruchu myszką / dotykiem podczas resizowania
        window.addEventListener('mousemove', this._handleMouseMove.bind(this));
        window.addEventListener('mouseup', this._handleMouseUp.bind(this));
        
        window.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this._handleTouchEnd.bind(this));

        // Globalne zdarzenie odznaczania kliknięciem w tło
        if (this.autoDeselect) {
            document.addEventListener('mousedown', (e) => {
                if (this.selectedElement && !this.isResizing) {
                    const isClickInside = this.selectedElement.contains(e.target);
                    // Odznacz tylko jeśli kliknięto poza obrazkiem i poza tooltipem/toolbarami
                    if (!isClickInside && !e.target.closest('.bottom-pill-container')) {
                        this.deselectAll();
                    }
                }
            });
            document.addEventListener('touchstart', (e) => {
                if (this.selectedElement && !this.isResizing) {
                    const isClickInside = this.selectedElement.contains(e.target);
                    if (!isClickInside && !e.target.closest('.bottom-pill-container')) {
                        this.deselectAll();
                    }
                }
            }, { passive: true });
        }
    }

    /**
     * Główna funkcja, którą wywołuje aplikacja, by "uzbroić" kontener obrazka
     */
    attachTo(containerElement, id) {
        // Nadaj id dla łatwej identyfikacji przy zapisie
        if (id) containerElement.dataset.id = id;
        
        // Dodaj brakujące handles jeśli ich nie ma w HTMLu
        if (!containerElement.querySelector('.flow-resize-handle.top-left')) {
            const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
            handles.forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `flow-resize-handle ${pos}`;
                handle.dataset.handle = pos;
                containerElement.appendChild(handle);
            });
            
            // Tooltip z wymiarami
            const tooltip = document.createElement('div');
            tooltip.className = 'flow-resize-tooltip';
            tooltip.innerHTML = 'szer.: 0 px wys.: 0 px';
            containerElement.appendChild(tooltip);
        }

        // Event: Wybranie obrazka
        const selectHandler = (e) => {
            // Ignoruj kliknięcia na same handles lub jeśli już coś resizujemy
            if (e.target.classList.contains('flow-resize-handle') || this.isResizing) return;
            this.selectElement(containerElement);
            // Zatrzymujemy propagację, żeby nie odpalił się mousedown na tle
            e.stopPropagation();
        };

        containerElement.addEventListener('mousedown', selectHandler);
        // Do touch: passive true żeby nie blokować scrolla domyślnie, dopóki nie ciągniemy uchwytu
        containerElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) selectHandler(e);
        }, { passive: true });

        // Event: Rozpoczęcie resizowania (na handles)
        const handles = containerElement.querySelectorAll('.flow-resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                this._startResize(e.clientX, e.clientY, containerElement, handle);
                e.stopPropagation();
                e.preventDefault();
            });
            handle.addEventListener('touchstart', (e) => {
                this._startResize(e.touches[0].clientX, e.touches[0].clientY, containerElement, handle);
                e.stopPropagation();
                // e.preventDefault(); w touchstart musi być zrobione ostrożnie, ale tu robimy resize
            }, { passive: false });
        });
    }

    selectElement(el) {
        this.deselectAll();
        this.selectedElement = el;
        el.classList.add('selected');
    }

    deselectAll() {
        if (this.selectedElement) {
            this.selectedElement.classList.remove('selected');
            this.selectedElement = null;
        }
    }

    _startResize(clientX, clientY, container, handle) {
        this.isResizing = true;
        this.selectedElement = container;
        this.activeHandle = handle.dataset.handle;
        
        container.classList.add('resizing');
        
        this.startX = clientX;
        this.startY = clientY;
        this.startWidth = container.offsetWidth;
        this.startHeight = container.offsetHeight;
        this.startLeft = parseFloat(container.style.left) || 0;
        this.startTop = parseFloat(container.style.top) || 0;
        
        // Zabezpieczenie przed dzieleniem przez zero
        this.aspectRatio = this.startHeight === 0 ? 1 : this.startWidth / this.startHeight;
    }

    _updateDimensions(clientX, clientY) {
        if (!this.isResizing || !this.selectedElement) return;

        const scale = this.getScale();
        const deltaX = (clientX - this.startX) / scale;

        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newLeft = this.startLeft;
        let newTop = this.startTop;
        const isAbsolute = window.getComputedStyle(this.selectedElement).position === 'absolute';

        // Oś obliczeń: dla uchwytów prawych bierzemy deltaX wprost, dla lewych odwracamy,
        // bo ruch w lewo (deltaX < 0) oznacza zwiększenie szerokości.
        if (this.activeHandle === 'bottom-right' || this.activeHandle === 'top-right') {
            newWidth = this.startWidth + deltaX;
        } else if (this.activeHandle === 'bottom-left' || this.activeHandle === 'top-left') {
            newWidth = this.startWidth - deltaX;
        }

        // Limity minimalne (np. min width = 50px)
        if (newWidth < 50) newWidth = 50;
        
        newHeight = newWidth / this.aspectRatio;

        // Jeśli pozycja absolutna (Projektownik), musimy skorygować left/top by zachować odpowiednią kotwicę
        if (isAbsolute) {
            const dWidth = newWidth - this.startWidth;
            const dHeight = newHeight - this.startHeight;

            if (this.activeHandle === 'top-left') {
                newLeft = this.startLeft - dWidth;
                newTop = this.startTop - dHeight;
            } else if (this.activeHandle === 'top-right') {
                // Kotwica to dolny-lewy róg
                newTop = this.startTop - dHeight;
            } else if (this.activeHandle === 'bottom-left') {
                // Kotwica to górny-prawy róg
                newLeft = this.startLeft - dWidth;
            }
        }

        this.selectedElement.style.width = `${newWidth}px`;
        this.selectedElement.style.height = `${newHeight}px`;
        
        if (isAbsolute) {
            this.selectedElement.style.left = `${newLeft}px`;
            this.selectedElement.style.top = `${newTop}px`;
        }

        // Update tooltip. Obliczamy wymiar rzeczywisty ("fizyczny" np. cm dla efektu, tu po prostu pokażemy px lub wirtualne cm)
        // Zakładając że 100px = 2cm, więc mnożnik to 0.02 dla uzyskania "szer: X cm"
        const cmWidth = (newWidth * 0.02).toFixed(2).replace('.', ',');
        const cmHeight = (newHeight * 0.02).toFixed(2).replace('.', ',');
        
        const tooltip = this.selectedElement.querySelector('.flow-resize-tooltip');
        if (tooltip) {
            tooltip.innerHTML = `szer.: ${cmWidth} cm wys.: ${cmHeight} cm`;
        }
    }

    _handleMouseMove(e) {
        if (!this.isResizing) return;
        e.preventDefault();
        this._updateDimensions(e.clientX, e.clientY);
    }

    _handleTouchMove(e) {
        if (!this.isResizing) return;
        e.preventDefault(); // Zatrzymanie natywnego scrollowania podczas resize
        this._updateDimensions(e.touches[0].clientX, e.touches[0].clientY);
    }

    _handleMouseUp(e) {
        if (this.isResizing) this._endResize();
    }

    _handleTouchEnd(e) {
        if (this.isResizing) this._endResize();
    }

    _endResize() {
        if (!this.selectedElement) return;
        
        this.isResizing = false;
        this.selectedElement.classList.remove('resizing');
        
        const finalWidth = this.selectedElement.offsetWidth;
        const finalHeight = this.selectedElement.offsetHeight;
        const id = this.selectedElement.dataset.id;
        
        this.onResizeComplete(id, finalWidth, finalHeight);
    }
}
