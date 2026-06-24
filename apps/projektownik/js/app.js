import { db, auth, provider, signInWithPopup, onAuthStateChanged, storage, ref, uploadBytes, getDownloadURL, signOut } from './firebase-config.js';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');

// --- LOGOWANIE GOOGLE ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const bottomTools = document.getElementById('bottom-tools');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).then((res) => {
        console.log("Zalogowano pomyślnie jako: " + res.user.email);
    }).catch(error => {
        console.error("Błąd logowania:", error);
    });
});

// Wylogowanie
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.reload();
    } catch (e) {
        console.error("Błąd wylogowania: ", e);
    }
});

// Odświeżenie aplikacji (PWA)
document.getElementById('refresh-btn').addEventListener('click', () => {
    window.location.reload(true);
});

let unsubscribeSnapshot = null;

// Ładowanie notatek dla wszystkich (nawet gości)
unsubscribeSnapshot = onSnapshot(collection(db, "notes"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            createCardElement(change.doc.id, change.doc.data());
        }
        if (change.type === "modified") {
            updateCardElement(change.doc.id, change.doc.data());
        }
        if (change.type === "removed") {
            const el = document.getElementById(change.doc.id);
            if(el) el.remove();
        }
    });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Zalogowano
        console.log("Zalogowany jako:", user.email);
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        bottomTools.style.display = 'flex';
        undoBtn.style.display = 'block';
        redoBtn.style.display = 'block';
    } else {
        // Nie zalogowano (Gość)
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        bottomTools.style.display = 'none';
        undoBtn.style.display = 'none';
        redoBtn.style.display = 'none';
    }
});


// --- STAN TABLICY (PAN & ZOOM) ---
let scale = 1;
let translateX = window.innerWidth / 2 - 5000;
let translateY = window.innerHeight / 2 - 5000;
let isDraggingBoard = false;
let startX, startY;

function updateCanvas() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}
updateCanvas();

viewport.addEventListener('mousedown', (e) => {
    canvas.classList.remove('smooth-pan');
    if (e.target.closest('.card') || e.target.closest('#ui-layer')) return;
    
    isDraggingBoard = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingBoard) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateCanvas();
});

window.addEventListener('mouseup', () => {
    isDraggingBoard = false;
});

viewport.addEventListener('wheel', (e) => {
    // Zoom tylko jeśli login screen jest ukryty
    if (e.target.closest('.card') || e.target.closest('#ui-layer')) return;
    e.preventDefault(); 
    const zoomSensitivity = 0.0015;
    const delta = -e.deltaY * zoomSensitivity;
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    const canvasX = (mouseX - translateX) / scale;
    const canvasY = (mouseY - translateY) / scale;
    
    let newScale = scale * Math.exp(delta);
    newScale = Math.max(0.1, Math.min(newScale, 5));
    
    translateX = mouseX - canvasX * newScale;
    translateY = mouseY - canvasY * newScale;
    scale = newScale;
    updateCanvas();
}, { passive: false });

// --- TOUCH PAN & ZOOM (MOBILE) ---
let initialPinchDistance = null;
let initialScale = 1;
let lastViewportTapStart = 0;
let hasPanned = false;
let panTouchStartX = 0;
let panTouchStartY = 0;
let isOneFingerZoom = false;
let oneFingerZoomStartY = 0;
let initialScaleBeforeOneFingerZoom = 1;

viewport.addEventListener('touchstart', (e) => {
    canvas.classList.remove('smooth-pan');
    if (e.target.closest('#ui-layer')) return;
    if (e.target.closest('#ui-layer')) return;

    if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastViewportTapStart < 300) {
            isOneFingerZoom = true;
            isDraggingBoard = false;
            oneFingerZoomStartY = e.touches[0].clientY;
            initialScaleBeforeOneFingerZoom = scale;
        } else {
            isOneFingerZoom = false;
            isDraggingBoard = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        }
        hasPanned = false;
        panTouchStartX = e.touches[0].clientX;
        panTouchStartY = e.touches[0].clientY;
        lastViewportTapStart = now;
    } else if (e.touches.length === 2) {
        isDraggingBoard = false;
        isOneFingerZoom = false;
        hasPanned = true; // Zoom to też operacja na planszy
        initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = scale;
    }
}, { passive: false });

viewport.addEventListener('touchmove', (e) => {
    if (e.target.closest('#ui-layer')) return;
    if (e.target.closest('#ui-layer')) return;
    if (e.touches.length > 1) e.preventDefault(); // Blokuj domyślny scroll przy zoomie

    if (e.touches.length === 1) {
        if (isOneFingerZoom) {
            if (Math.abs(e.touches[0].clientY - panTouchStartY) > 10) {
                hasPanned = true;
            }
            const deltaY = e.touches[0].clientY - oneFingerZoomStartY;
            // Przesunięcie w dół (+ delta) przybliża, w górę oddala
            const zoomSensitivity = 0.005;
            const zoomFactor = Math.exp(deltaY * zoomSensitivity);
            let newScale = initialScaleBeforeOneFingerZoom * zoomFactor;
            newScale = Math.max(0.1, Math.min(newScale, 5));
            
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            const canvasCenterX = (screenCenterX - translateX) / scale;
            const canvasCenterY = (screenCenterY - translateY) / scale;
            
            scale = newScale;
            translateX = screenCenterX - canvasCenterX * scale;
            translateY = screenCenterY - canvasCenterY * scale;
            
            updateCanvas();
        } else if (isDraggingBoard) {
            // Jeśli przesunięcie jest większe niż 10px, uznajemy to za celowy Pan (swipe)
            if (Math.abs(e.touches[0].clientX - panTouchStartX) > 10 || Math.abs(e.touches[0].clientY - panTouchStartY) > 10) {
                hasPanned = true;
            }
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            updateCanvas();
        }
    } else if (e.touches.length === 2 && initialPinchDistance) {
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        
        let newScale = initialScale * (currentDistance / initialPinchDistance);
        newScale = Math.max(0.1, Math.min(newScale, 5));
        
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        
        const canvasX = (centerX - translateX) / scale;
        const canvasY = (centerY - translateY) / scale;

        translateX = centerX - canvasX * newScale;
        translateY = centerY - canvasY * newScale;
        scale = newScale;
        updateCanvas();
    }
}, { passive: false });

viewport.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
    if (e.touches.length === 0) {
        // Obsługa double tap na puste pole (zoom out do 1.0)
        if (isOneFingerZoom && !hasPanned && !e.target.closest('.card') && !e.target.closest('#ui-layer')) {
            // To był double tap, ale palec nie został przesunięty
            canvas.classList.add('smooth-pan');
            
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            const canvasCenterX = (screenCenterX - translateX) / scale;
            const canvasCenterY = (screenCenterY - translateY) / scale;
            
            scale = 1;
            
            translateX = screenCenterX - canvasCenterX * scale;
            translateY = screenCenterY - canvasCenterY * scale;
            
            updateCanvas();
            setTimeout(() => canvas.classList.remove('smooth-pan'), 600);
        }
        
        isDraggingBoard = false;
        isOneFingerZoom = false;
    }
});


// --- HISTORY MANAGER (UNDO / REDO) ---
class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack on new action
        this.updateButtons();
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
        this.updateButtons();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const command = this.redoStack.pop();
        command.execute(); // Redo is essentially executing again
        this.undoStack.push(command);
        this.updateButtons();
    }

    updateButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        if(undoBtn) undoBtn.style.opacity = this.undoStack.length > 0 ? '1' : '0.3';
        if(redoBtn) redoBtn.style.opacity = this.redoStack.length > 0 ? '1' : '0.3';
    }
}
const historyManager = new HistoryManager();

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
            historyManager.redo();
        } else {
            historyManager.undo();
        }
        e.preventDefault();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        historyManager.redo();
        e.preventDefault();
    }
});

document.getElementById('undo-btn')?.addEventListener('click', () => historyManager.undo());
document.getElementById('redo-btn')?.addEventListener('click', () => historyManager.redo());
historyManager.updateButtons();

// --- COMMANDS ---
class MoveCommand {
    constructor(id, startX, startY, endX, endY) {
        this.id = id;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
    }
    async execute() {
        if (!auth.currentUser) return;
        try { await updateDoc(doc(db, "notes", this.id), { x: this.endX, y: this.endY }); } catch(e){}
    }
    async undo() {
        if (!auth.currentUser) return;
        try { await updateDoc(doc(db, "notes", this.id), { x: this.startX, y: this.startY }); } catch(e){}
    }
}

class ResizeCommand {
    constructor(id, startW, startH, endW, endH) {
        this.id = id;
        this.startW = startW;
        this.startH = startH;
        this.endW = endW;
        this.endH = endH;
    }
    async execute() {
        try { await updateDoc(doc(db, "notes", this.id), { width: this.endW, height: this.endH }); } catch(e){}
    }
    async undo() {
        try { await updateDoc(doc(db, "notes", this.id), { width: this.startW, height: this.startH }); } catch(e){}
    }
}


class AddCommand {
    constructor(id, data) {
        this.id = id;
        this.data = data;
    }
    async execute() {
        try { await setDoc(doc(db, "notes", this.id), this.data); } catch(e){}
    }
    async undo() {
        // Soft Delete (lub hard delete dla uproszczenia przy nowym elemencie)
        try { await deleteDoc(doc(db, "notes", this.id)); } catch(e){}
    }
}

class DeleteCommand {
    constructor(id, data) {
        this.id = id;
        this.data = data;
    }
    async execute() {
        try { await deleteDoc(doc(db, "notes", this.id)); } catch(e){}
    }
    async undo() {
        try { await setDoc(doc(db, "notes", this.id), this.data); } catch(e){}
    }
}

class EditCommand {
    constructor(id, oldData, newData) {
        this.id = id;
        this.oldData = oldData;
        this.newData = newData;
    }
    async execute() {
        try { await updateDoc(doc(db, "notes", this.id), this.newData); } catch(e){}
    }
    async undo() {
        try { await updateDoc(doc(db, "notes", this.id), this.oldData); } catch(e){}
    }
}


// --- KOTWICA (ANCHOR) ---
const anchorBtn = document.getElementById('anchor-btn');
let anchorPos = null;
let anchorElement = null;

anchorBtn.addEventListener('click', () => {
    if (!anchorPos) {
        const centerX = (window.innerWidth / 2 - translateX) / scale;
        const centerY = (window.innerHeight / 2 - translateY) / scale;
        anchorPos = { x: centerX, y: centerY };
        
        anchorElement = document.createElement('div');
        anchorElement.className = 'anchor-marker';
        anchorElement.innerText = '⚓';
        anchorElement.style.left = `${centerX}px`;
        anchorElement.style.top = `${centerY}px`;
        canvas.appendChild(anchorElement);
        
        anchorBtn.style.borderColor = "var(--teal)";
        anchorBtn.style.color = "var(--teal)";
    } else {
        canvas.classList.add('smooth-pan');
        translateX = window.innerWidth / 2 - (anchorPos.x * scale);
        translateY = window.innerHeight / 2 - (anchorPos.y * scale);
        updateCanvas();
        setTimeout(() => { canvas.classList.remove('smooth-pan'); }, 600);
    }
});

anchorBtn.addEventListener('dblclick', () => {
    if (anchorPos && anchorElement) {
        anchorElement.remove();
        anchorElement = null;
        anchorPos = null;
        anchorBtn.style.borderColor = "rgba(255,255,255,0.1)";
        anchorBtn.style.color = "#fff";
    }
});


// --- TWORZENIE I DRAGOWANIE KART (FIREBASE) ---
const addNoteBtn = document.getElementById('add-note');
const addTextBtn = document.getElementById('add-text-btn');

addNoteBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return; // Zabezpieczenie przed niezalogowanymi
    
    const centerX = (window.innerWidth / 2 - translateX) / scale;
    const centerY = (window.innerHeight / 2 - translateY) / scale;
    
    try {
        const docRef = doc(collection(db, "notes"));
        const data = {
            type: 'text',
            x: centerX,
            y: centerY,
            title: "Nowa Notatka",
            content: "Zacznij pisać..."
        };
        const command = new AddCommand(docRef.id, data);
        historyManager.execute(command);
    } catch (e) {
        console.error("Błąd zapisu do Firebase:", e);
    }
});

if(addTextBtn) {
    addTextBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return; 
        
        const centerX = (window.innerWidth / 2 - translateX) / scale;
        const centerY = (window.innerHeight / 2 - translateY) / scale;
        
        try {
            const docRef = doc(collection(db, "notes"));
            const data = {
                type: 'textblock',
                x: centerX,
                y: centerY,
                content: "Wpisz tekst...",
                width: 250
            };
            const command = new AddCommand(docRef.id, data);
            historyManager.execute(command);
        } catch (e) {
            console.error("Błąd zapisu do Firebase:", e);
        }
    });
}


let activeCard = null;
let cardStartX, cardStartY;
let cardInitialX = 0;
let cardInitialY = 0;
let isResizingCard = false;
window.cardInitialW = 0;
window.cardInitialH = 0;

function createCardElement(id, data) {
    if (document.getElementById(id)) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = id;
    card.style.left = `${data.x}px`;
    card.style.top = `${data.y}px`;
    
    if (data.type === 'image') {
        card.style.width = data.width ? `${data.width}px` : '300px';
        if (data.height) card.style.height = `${data.height}px`;
        card.style.padding = '8px';
        card.style.resize = 'both';
        card.style.overflow = 'hidden';
        card.innerHTML = `
            <button class="delete-btn" title="Usuń">×</button>
            <img src="${data.url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block; pointer-events: none;">
        `;
        canvas.appendChild(card);
        makeDraggable(card, id);
    } else if (data.type === 'textblock') {
        card.classList.add('text-card');
        card.style.resize = 'both';
        card.style.overflow = 'hidden';
        
        card.innerHTML = `
            <button class="delete-btn" title="Usuń">×</button>
            <div class="card-body">${data.content || 'Wpisz tekst...'}</div>
        `;
        canvas.appendChild(card);
        if(data.width) card.style.width = `${data.width}px`;
        if(data.height) card.style.height = `${data.height}px`;
        makeDraggable(card, id);
        makeEditable(card, id);
    } else {
        // Zwykła notatka
        card.style.width = '250px';
        card.innerHTML = `
            <button class="delete-btn" title="Usuń">×</button>
            <div class="card-header">${data.title || ''}</div>
            <div class="card-body">${data.content || ''}</div>
        `;
        canvas.appendChild(card);
        makeDraggable(card, id);
        makeEditable(card, id);
    }
    
    
    let initialWidth = 0;
    let initialHeight = 0;
    
    card.addEventListener('mousedown', () => {
        initialWidth = parseFloat(window.getComputedStyle(card).width);
        initialHeight = parseFloat(window.getComputedStyle(card).height);
    });
    
    card.addEventListener('mouseup', async () => {
        const currentW = parseFloat(window.getComputedStyle(card).width);
        const currentH = parseFloat(window.getComputedStyle(card).height);
        if (data.width !== currentW || data.height !== currentH) {
            const cmd = new ResizeCommand(id, data.width || initialWidth, data.height || initialHeight, currentW, currentH);
            historyManager.execute(cmd);
            data.width = currentW;
            data.height = currentH;
        }
    });
    
    // Obsługa usuwania
    const delBtn = card.querySelector('.delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (delBtn.dataset.confirming === "true") {
                const cmd = new DeleteCommand(id, data);
                historyManager.execute(cmd);
            } else {
                delBtn.dataset.confirming = "true";
                const oldHTML = delBtn.innerHTML;
                delBtn.innerHTML = "?";
                delBtn.style.backgroundColor = "var(--magenta)";
                delBtn.style.color = "white";
                delBtn.style.borderColor = "var(--magenta)";
                setTimeout(() => {
                    delBtn.dataset.confirming = "false";
                    delBtn.innerHTML = oldHTML;
                    delBtn.style.backgroundColor = "";
                    delBtn.style.color = "";
                    delBtn.style.borderColor = "";
                }, 3000);
            }
        });
    }
}

function updateCardElement(id, data) {
    const card = document.getElementById(id);
    if (!card) return;
    
    if (activeCard && activeCard.id === id) return;
    
    card.style.left = `${data.x}px`;
    card.style.top = `${data.y}px`;
    
    if (data.width) card.style.width = `${data.width}px`;
    if (data.height) card.style.height = `${data.height}px`;
    
    if (data.type === 'text') {
        const header = card.querySelector('.card-header');
        const body = card.querySelector('.card-body');
        if (header && header.getAttribute('contenteditable') !== 'true') header.innerHTML = data.title || '';
        if (body && body.getAttribute('contenteditable') !== 'true') body.innerHTML = data.content || '';
    } else if (data.type === 'textblock') {
        const body = card.querySelector('.card-body');
        if (body && body.getAttribute('contenteditable') !== 'true') body.innerHTML = data.content || '';
    }
}

function makeDraggable(element, id) {
    let touchTimer = null;
    let isLongPress = false;

    element.addEventListener('mousedown', (e) => {
        if(e.target.contentEditable === "true" && document.activeElement === e.target) return; 
        if(e.target.closest('.delete-btn')) return;
        
        activeCard = element;
        hasCardMoved = false;
        cardInitialX = parseFloat(element.style.left) || 0;
        cardInitialY = parseFloat(element.style.top) || 0;
        cardStartX = e.clientX / scale - cardInitialX;
        cardStartY = e.clientY / scale - cardInitialY;
        e.stopPropagation();
    });

    // --- LOGIKA DLA DOTYKU (Mobile - przytrzymanie) ---
    let lastCardTap = 0;
    
    element.addEventListener('touchstart', (e) => {
        if(e.target.classList.contains('delete-btn')) return;
        if(e.touches.length > 1) return;
        
        isLongPress = false;
        
        const initialTouchX = e.touches[0].clientX;
        const initialTouchY = e.touches[0].clientY;
        
        touchTimer = setTimeout(() => {
            isLongPress = true;
            activeCard = element;
            hasCardMoved = false;
            
            cardInitialX = parseFloat(element.style.left) || 0;
            cardInitialY = parseFloat(element.style.top) || 0;
            cardStartX = initialTouchX / scale - cardInitialX;
            cardStartY = initialTouchY / scale - cardInitialY;
            
            isDraggingBoard = false;
            
            element.style.boxShadow = '0 0 25px var(--magenta)';
            element.style.transform = 'scale(1.02)';
            element.style.zIndex = '1000';
            
            if (navigator.vibrate) navigator.vibrate(50);
            
        }, 400);
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (!isLongPress) {
            clearTimeout(touchTimer);
        }
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        clearTimeout(touchTimer);
        if (isLongPress) {
            if (hasCardMoved) {
                const currentX = parseFloat(element.style.left);
                const currentY = parseFloat(element.style.top);
                if (cardInitialX !== currentX || cardInitialY !== currentY) {
                    const cmd = new MoveCommand(id, cardInitialX, cardInitialY, currentX, currentY);
                    historyManager.execute(cmd);
                }
            }
            element.style.boxShadow = '';
            element.style.transform = '';
            element.style.zIndex = '';
            activeCard = null;
        } else if (!hasCardMoved && !hasPanned) {
            const now = Date.now();
            if (now - lastCardTap < 300) {
                const header = element.querySelector('.card-header');
                const body = element.querySelector('.card-body');
                let target = e.target;
                if (!target.classList.contains('card-body') && !target.classList.contains('card-header')) {
                    target = body || header;
                }
                
                if (target) {
                    target.setAttribute('contenteditable', 'true');
                    target.focus();
                }
            } else {
                const cardLeft = parseFloat(element.style.left);
                const cardTop = parseFloat(element.style.top);
                const cardWidth = element.offsetWidth;
                const cardHeight = element.offsetHeight;
                
                const targetScale = 1.5;
                const windowCenterX = window.innerWidth / 2;
                const windowTargetY = window.innerHeight / 3;
                
                const newTranslateX = windowCenterX - (cardLeft + cardWidth / 2) * targetScale;
                const newTranslateY = windowTargetY - (cardTop + cardHeight / 2) * targetScale;
                
                canvas.classList.add('smooth-pan');
                translateX = newTranslateX;
                translateY = newTranslateY;
                scale = targetScale;
                updateCanvas();
                
                setTimeout(() => {
                    canvas.classList.remove('smooth-pan');
                }, 600);
            }
            lastCardTap = now;
        }
    });

    // NIEZAWODNE WYKRYWANIE ZMIANY ROZMIARU KARTY (RESIZE)
    let resizeTimeout;
    let initialW = element.offsetWidth;
    let initialH = element.offsetHeight;
    
    const ro = new ResizeObserver(() => {
        const currentW = element.offsetWidth;
        const currentH = element.offsetHeight;
        
        if (currentW !== initialW || currentH !== initialH) {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (auth.currentUser && (currentW !== initialW || currentH !== initialH)) {
                    const cmd = new ResizeCommand(id, initialW, initialH, currentW, currentH);
                    historyManager.execute(cmd);
                    initialW = currentW;
                    initialH = currentH;
                }
            }, 500); // 500ms po puszczeniu myszki/zakończeniu resize
        }
    });
    ro.observe(element);
}

function makeEditable(element, id) {
    const header = element.querySelector('.card-header');
    const body = element.querySelector('.card-body');
    
    let oldTitle = '';
    let oldContent = '';
    
    const enableEdit = (e) => {
        const el = e.target.closest('.card-header') || e.target.closest('.card-body');
        if(el) {
            el.setAttribute('contenteditable', 'true');
            oldTitle = header ? header.innerHTML : '';
            oldContent = body ? body.innerHTML : '';
            el.focus();
            
            // Magiczne ustawienie kursora dokładnie w miejscu kliknięcia
            if (document.caretRangeFromPoint) {
                const range = document.caretRangeFromPoint(e.clientX, e.clientY);
                if (range) {
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } else if (document.caretPositionFromPoint) {
                const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                if (pos) {
                    const range = document.createRange();
                    range.setStart(pos.offsetNode, pos.offset);
                    range.collapse(true);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }
    };
    
    element.addEventListener('dblclick', enableEdit);
    
    const saveContent = async (e) => {
        const el = e.target;
        el.setAttribute('contenteditable', 'false');
        
        let newData = { content: body ? body.innerHTML : '' };
        if(header) newData.title = header.innerHTML;
        
        let oldData = { content: oldContent };
        if(header) oldData.title = oldTitle;
        
        if (newData.content !== oldData.content || newData.title !== oldData.title) {
            const cmd = new EditCommand(id, oldData, newData);
            historyManager.execute(cmd);
        }
    };
    
    if (header) header.addEventListener('blur', saveContent);
    if (body) body.addEventListener('blur', saveContent);
}

window.addEventListener('mousemove', (e) => {
    if (!activeCard) return;
    hasCardMoved = true;
    
    const newX = e.clientX / scale - cardStartX;
    const newY = e.clientY / scale - cardStartY;
    
    activeCard.style.left = `${newX}px`;
    activeCard.style.top = `${newY}px`;
});

window.addEventListener('touchmove', (e) => {
    if (!activeCard || e.touches.length > 1) return;
    hasCardMoved = true;
    e.preventDefault();
    
    const newX = e.touches[0].clientX / scale - cardStartX;
    const newY = e.touches[0].clientY / scale - cardStartY;
    
    activeCard.style.left = `${newX}px`;
    activeCard.style.top = `${newY}px`;
}, { passive: false });

const handleCardDragEnd = async () => {
    if(activeCard) {
        if (hasCardMoved) {
            const currentX = parseFloat(activeCard.style.left);
            const currentY = parseFloat(activeCard.style.top);
            if (cardInitialX !== currentX || cardInitialY !== currentY) {
                const cmd = new MoveCommand(activeCard.id, cardInitialX, cardInitialY, currentX, currentY);
                historyManager.execute(cmd);
            }
        }
        activeCard = null;
    }
};

window.addEventListener('mouseup', handleCardDragEnd);
window.addEventListener('touchend', handleCardDragEnd);

// --- WKLEJANIE / DODAWANIE ZDJĘĆ ---
const addImageBtn = document.getElementById('add-image-btn');
const imageUploadInput = document.getElementById('image-upload');

if(addImageBtn && imageUploadInput) {
    addImageBtn.addEventListener('click', () => {
        imageUploadInput.click();
    });

    imageUploadInput.addEventListener('change', async (e) => {
        if (!auth.currentUser) return;
        const file = e.target.files[0];
        if (!file) return;
        
        console.log("Ładowanie obrazka (mobile/button) do chmury...");
        const fileRef = ref(storage, 'images/' + Date.now() + '_' + file.name);
        
        try {
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            
            const centerX = (window.innerWidth / 2 - translateX) / scale;
            const centerY = (window.innerHeight / 2 - translateY) / scale;
            
            await addDoc(collection(db, "notes"), {
                type: 'image',
                url: url,
                x: centerX,
                y: centerY
            });
            console.log("Obrazek z przycisku pomyślnie dodany na Biurko!");
        } catch (err) {
            console.error("Błąd wgrywania zdjęcia:", err);
        }
        imageUploadInput.value = ""; // Reset
    });
}

window.addEventListener('paste', async (e) => {
    if (!auth.currentUser) return; // Tylko zalogowani
    
    if (e.target.contentEditable === "true") return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
        const item = items[index];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;
            
            console.log("Ładowanie obrazka do chmury...");
            const fileRef = ref(storage, 'images/' + Date.now() + '_' + file.name);
            
            try {
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                
                const centerX = (window.innerWidth / 2 - translateX) / scale;
                const centerY = (window.innerHeight / 2 - translateY) / scale;
                
                await addDoc(collection(db, "notes"), {
                    type: 'image',
                    url: url,
                    x: centerX,
                    y: centerY
                });
                console.log("Obrazek pomyślnie dodany na Biurko!");
            } catch (err) {
                console.error("Błąd wgrywania zdjęcia:", err);
            }
        }
    }
});

// Usunięcie początkowej karty w HTML na rzecz bazy
