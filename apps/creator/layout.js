// Flow Motion Engine & Auto Layout Manager dla Kreatora

const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const editorContent = document.getElementById('editor-content');

// --- FLOW MOTION (PAN & ZOOM) ---
let scale = 1;
let translateX = 0;
let translateY = 0;
let isDraggingBoard = false;
let startX, startY;

function updateCanvas() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

// Obsługa Panningu myszką (lewy przycisk na pustym tle lub środkowy przycisk)
viewport.addEventListener('mousedown', (e) => {
    // Scrollujemy środkowym (1) lub lewym, o ile to nie jest wnętrze karty ani interfejs
    if (e.button !== 1 && e.target.closest('.glass-card, .mandatory-section, .bottom-pill-container, .block-menu')) return;
    
    isDraggingBoard = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    document.body.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingBoard) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateCanvas();
});

window.addEventListener('mouseup', () => {
    if (isDraggingBoard) {
        isDraggingBoard = false;
        document.body.style.cursor = 'default';
    }
});

// Obsługa Zoomu (rolka myszy)
viewport.addEventListener('wheel', (e) => {
    if (e.target.closest('.glass-card') && e.target.closest('.glass-card').scrollHeight > e.target.closest('.glass-card').clientHeight) {
        return; // Jeśli sama karta wewnętrznie się scrolluje
    }
    
    // Jeśli użytkownik używa Pinch-to-zoom (na gładziku to ctrlKey)
    if (e.ctrlKey) {
        e.preventDefault(); 
        const zoomSensitivity = 0.0015;
        const delta = -e.deltaY * zoomSensitivity;
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const canvasX = (mouseX - translateX) / scale;
        const canvasY = (mouseY - translateY) / scale;
        
        scale = Math.max(0.1, Math.min(scale * Math.exp(delta), 5));
        
        translateX = mouseX - canvasX * scale;
        translateY = mouseY - canvasY * scale;
        updateCanvas();
    } else {
        // Zwykłe przewijanie rolką - przesuwa płótno w pionie
        translateY -= e.deltaY;
        translateX -= e.deltaX; 
        
        // Zabezpieczenie przed przewinięciem "ponad górę" dokumentu
        if (translateY > 0) translateY = 0;
        
        updateCanvas();
    }
}, { passive: false });


// --- AUTO-LAYOUT MANAGER ---
const GAP = 32; // 2rem margin between cards

// Zmienne do Drag & Drop
let isDraggingCard = false;
let draggedCard = null;
let dragStartY = 0;
let initialCardY = 0;
let cardIndex = -1;

function reflowCards(ignoreCard = null) {
    if (!editorContent) return;
    const cards = Array.from(editorContent.querySelectorAll('.glass-card'));
    let currentY = 0;
    
    cards.forEach(card => {
        if (card !== ignoreCard) {
            // Ustawiamy absolutne pozycjonowanie tylko dla kart na płótnie
            card.style.transform = `translateY(${currentY}px)`;
        }
        // Dodajemy wysokość karty oraz margines dla kolejnego elementu
        currentY += card.offsetHeight + GAP;
    });
    
    // Ustawienie minimalnej wysokości, by canvas rósł
    editorContent.style.minHeight = `${currentY}px`;
}

// Nasłuchujemy zmian wysokości za pomocą ResizeObserver
const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
        reflowCards();
    });
});

function observeCards() {
    if (!editorContent) return;
    
    // --- AUTO-FIX: Cleanup or wrap orphaned elements ---
    let domChanged = false;
    Array.from(editorContent.children).forEach(child => {
        if (!child.classList.contains('glass-card')) {
            if (child.textContent.trim() === '') {
                child.remove();
                domChanged = true;
            } else {
                const wrapper = document.createElement('div');
                wrapper.className = 'glass-card';
                child.parentNode.insertBefore(wrapper, child);
                wrapper.appendChild(child);
                domChanged = true;
            }
        }
    });
    
    if (domChanged) {
        document.getElementById('update-project-btn')?.click();
    }
    
    const cards = editorContent.querySelectorAll('.glass-card');
    cards.forEach(card => {
        if (!card.hasAttribute('data-observed')) {
            resizeObserver.observe(card);
            card.setAttribute('data-observed', 'true');
            
            // Wstrzyknięcie przycisku usuwania, jeśli go nie ma
            if (!card.querySelector('.card-delete-btn')) {
                const delBtn = document.createElement('button');
                delBtn.className = 'card-delete-btn';
                delBtn.textContent = 'x';
                card.appendChild(delBtn);
                
                let confirmState = false;
                delBtn.addEventListener('click', (e) => {
                    if (!confirmState) {
                        confirmState = true;
                        delBtn.textContent = '?';
                        delBtn.classList.add('confirm-mode');
                        setTimeout(() => {
                            if (card.parentNode) { // if not deleted
                                confirmState = false;
                                delBtn.textContent = 'x';
                                delBtn.classList.remove('confirm-mode');
                            }
                        }, 3000); // 3 seconds to confirm
                    } else {
                        // Usuwamy kartę
                        card.style.transform = 'scale(0.8) translateY(-20px)';
                        card.style.opacity = '0';
                        setTimeout(() => {
                            card.remove();
                            reflowCards();
                            document.getElementById('update-project-btn')?.click();
                        }, 300);
                    }
                });
            }
        }
    });
}

// Obserwowanie DOM pod kątem nowych kart
if (editorContent) {
    const mutationObserver = new MutationObserver((mutations) => {
        let shouldReflow = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                shouldReflow = true;
            }
        });
        if (shouldReflow) {
            observeCards();
            reflowCards();
        }
    });

    mutationObserver.observe(editorContent, { childList: true, subtree: true });
}

// --- NATYWNY DRAG AND DROP (ZA NAGŁÓWEK) ---
window.addEventListener('mousedown', (e) => {
    // Chwytamy za .module-heading
    const heading = e.target.closest('.module-heading');
    if (!heading) return;
    
    const card = heading.closest('.glass-card');
    if (!card) return;
    
    e.preventDefault();
    
    isDraggingCard = true;
    draggedCard = card;
    draggedCard.classList.add('is-dragging');
    
    const transform = draggedCard.style.transform;
    initialCardY = parseInt(transform.replace('translateY(', '').replace('px)', '')) || 0;
    
    draggedCard.style.transition = 'none';
    dragStartY = e.clientY;
    
    const cards = Array.from(editorContent.querySelectorAll('.glass-card'));
    cardIndex = cards.indexOf(draggedCard);
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingCard || !draggedCard) return;
    
    const deltaY = (e.clientY - dragStartY) / scale;
    const newY = initialCardY + deltaY;
    
    draggedCard.style.transform = `translateY(${newY}px)`;
    
    const cards = Array.from(editorContent.querySelectorAll('.glass-card'));
    const cardCenterY = newY + (draggedCard.offsetHeight / 2);
    
    let targetIndex = 0;
    let currentYCounter = 0;
    for (let i = 0; i < cards.length; i++) {
        if (cards[i] === draggedCard) continue;
        currentYCounter += cards[i].offsetHeight + GAP;
        if (cardCenterY < currentYCounter - (cards[i].offsetHeight / 2)) {
            break;
        }
        targetIndex++;
    }
    
    if (targetIndex !== cardIndex) {
        const referenceNode = cards.filter(c => c !== draggedCard)[targetIndex];
        if (referenceNode) {
            editorContent.insertBefore(draggedCard, referenceNode);
        } else {
            editorContent.appendChild(draggedCard);
        }
        cardIndex = targetIndex;
        reflowCards(draggedCard);
    }
});

window.addEventListener('mouseup', () => {
    if (isDraggingCard && draggedCard) {
        isDraggingCard = false;
        draggedCard.classList.remove('is-dragging');
        draggedCard.style.transition = ''; 
        draggedCard = null;
        reflowCards();
        
        // Wyślij event, że trzeba zsynchronizować zmiany (Firebase save)
        document.getElementById('update-project-btn')?.click();
    }
});

window.addEventListener('load', () => {
    observeCards();
    setTimeout(reflowCards, 100);
});
