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
    attachTo(containerElement, id, onResizeEnd = null) {
        // Prevent double attach
        if (containerElement.dataset.flowResizable === "true") return;
        containerElement.dataset.flowResizable = "true";
        containerElement.dataset.flowId = id;
        
        // Ensure NO native resize
        containerElement.style.setProperty('resize', 'none', 'important');
        
        // Dodaj brakujące handles jeśli ich nie ma w HTMLu
        if (!containerElement.querySelector('.flow-resize-handle')) {
            const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
            handles.forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `flow-resize-handle ${pos}`;
                handle.dataset.pos = pos;
                containerElement.appendChild(handle);
            });
            
            // Tooltip z wymiarami
            const tooltip = document.createElement('div');
            tooltip.className = 'flow-resize-tooltip';
            containerElement.appendChild(tooltip);
        }

        // Event: Wybranie obrazka
        const selectHandler = (e) => {
            // Ignoruj kliknięcia na same handles lub jeśli już coś resizujemy
            if (e.target.classList.contains('flow-resize-handle') || this.isResizing) return;
            this.selectElement(containerElement);
            
            // DEBUG: Sprawdzamy dlaczego nadal jest native resize
            if (window.debugLog) {
                const comp = window.getComputedStyle(containerElement);
                window.debugLog(`Selected Image! CSS Resize: ${comp.resize}`);
                window.debugLog(`Classes: ${containerElement.className}`);
                
                const img = containerElement.querySelector('img');
                if (img) {
                    window.debugLog(`Inner IMG resize: ${window.getComputedStyle(img).resize}`);
                }
            }
        };

        containerElement.addEventListener('mousedown', selectHandler);
        // Do touch: passive true żeby nie blokować scrolla domyślnie, dopóki nie ciągniemy uchwytu
        containerElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) selectHandler(e);
        }, { passive: true });

        // Event: Rozpoczęcie resizowania (na handles)
        const handleElements = containerElement.querySelectorAll('.flow-resize-handle');
        handleElements.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                this._startResize(e.clientX, e.clientY, containerElement, handle);
                e.stopPropagation();
                e.preventDefault();
            });
            handle.addEventListener('touchstart', (e) => {
                this._startResize(e.touches[0].clientX, e.touches[0].clientY, containerElement, handle);
                e.stopPropagation();
            }, { passive: false });
        });

        // Store callback reference in instance map
        if (!this.callbacks) this.callbacks = new Map();
        if (id && onResizeEnd) this.callbacks.set(id, onResizeEnd);
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

    _startResize(clientX, clientY, container, handleElement) {
        this.isResizing = true;
        this.activeHandle = handleElement.dataset.pos;
        this.selectedElement = container;
        
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
        const deltaY = (clientY - this.startY) / scale;

        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newLeft = this.startLeft;
        let newTop = this.startTop;
        const isAbsolute = window.getComputedStyle(this.selectedElement).position === 'absolute';
        const lockRatio = this.selectedElement.dataset.lockRatio !== "false";

        // Oś obliczeń: dla uchwytów prawych bierzemy deltaX wprost, dla lewych odwracamy,
        // bo ruch w lewo (deltaX < 0) oznacza zwiększenie szerokości.
        if (this.activeHandle === 'bottom-right' || this.activeHandle === 'top-right') {
            newWidth = this.startWidth + deltaX;
        } else if (this.activeHandle === 'bottom-left' || this.activeHandle === 'top-left') {
            newWidth = this.startWidth - deltaX;
        }

        // Limity minimalne (np. min width = 50px)
        if (newWidth < 50) newWidth = 50;
        
        if (lockRatio) {
            newHeight = newWidth / this.aspectRatio;
        } else {
            if (this.activeHandle === 'bottom-right' || this.activeHandle === 'bottom-left') {
                newHeight = this.startHeight + deltaY;
            } else if (this.activeHandle === 'top-right' || this.activeHandle === 'top-left') {
                newHeight = this.startHeight - deltaY;
            }
            if (newHeight < 50) newHeight = 50;
        }

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

        const tooltip = this.selectedElement.querySelector('.flow-resize-tooltip');
        if (tooltip) {
            tooltip.innerHTML = `szer.: ${Math.round(newWidth)}px wys.: ${Math.round(newHeight)}px`;
        }
    }

    _handleMouseMove(e) {
        if (!this.isResizing) return;
        this._updateDimensions(e.clientX, e.clientY);
    }

    _handleTouchMove(e) {
        if (!this.isResizing) return;
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
        const finalLeft = parseFloat(this.selectedElement.style.left) || 0;
        const finalTop = parseFloat(this.selectedElement.style.top) || 0;
        const flowId = this.selectedElement.dataset.flowId || this.selectedElement.id;
        
        if (this.callbacks && this.callbacks.has(flowId)) {
            const cb = this.callbacks.get(flowId);
            cb(flowId, this.startWidth, this.startHeight, finalWidth, finalHeight, this.startLeft, this.startTop, finalLeft, finalTop);
        } else {
            this.onResizeComplete(flowId, finalWidth, finalHeight);
        }
    }
}
