import { db, auth, provider, signInWithPopup, onAuthStateChanged, storage, ref, uploadBytes, getDownloadURL, signOut } from './firebase-config.js';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { FlowImageManager } from '/packages/shared-ui/js/FlowImageManager.js';
import '/packages/shared-ui/js/Flowbar.js';
import '/packages/shared-ui/js/SystemMenu.js';

// Nasłuchiwanie na akcje z SystemMenu (Menu Techniczne)
document.addEventListener('sys-refresh', () => {
    window.location.reload(true);
});

window.debugLog = function(msg) {
    // console.log("[DEBUG]", msg);
};
window.debugLog("App zainicjalizowana");


const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');

// --- LOGOWANIE GOOGLE ---
const systemMenu = document.querySelector('shared-system-menu');
const bottomTools = document.querySelector('shared-flowbar');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

document.addEventListener('sys-login', () => {
    signInWithPopup(auth, provider).then((res) => {
        console.log("Zalogowano pomyślnie jako: " + res.user.email);
    }).catch(error => {
        console.error("Błąd logowania:", error);
    });
});
// Wylogowanie przeniesione na dół do sekcji SYSTEM MENU LISTENERS

// Odświeżenie aplikacji (PWA)
document.getElementById('refresh-btn').addEventListener('click', () => {
    window.location.reload(true);
});

// Odczytanie ID projektu z adresu URL (np. ?id=...)
const urlParams = new URLSearchParams(window.location.search);
const currentProjectId = urlParams.get('id');

let unsubscribeSnapshot = null;

if (!currentProjectId) {
    console.warn("Brak ID projektu w URL! Przekierowuję na domyślny projekt (Flow Design).");
    window.location.href = `?id=jLpBepj7Mbleh9TPdJGz`;
} else {
    // Ładowanie notatek z konkretnego projektu
    const q = query(collection(db, "notes"), where("projectId", "==", currentProjectId));
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
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
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Zalogowano
        console.log("Zalogowany jako:", user.email);
        if (systemMenu) systemMenu.setAuthState(true);
        if (bottomTools) bottomTools.show();
        if (undoBtn) undoBtn.style.display = 'block';
        if (redoBtn) redoBtn.style.display = 'block';
    } else {
        // Nie zalogowano (Gość)
        if (systemMenu) systemMenu.setAuthState(false);
        if (bottomTools) bottomTools.hide();
        if (undoBtn) undoBtn.style.display = 'none';
        if (redoBtn) redoBtn.style.display = 'none';
        canvas.innerHTML = '';
        cards = {};
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

viewport.addEventListener('dblclick', (e) => {
    if (e.target.closest('.card') || e.target.closest('#ui-layer')) return;
    
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

const imageManager = new FlowImageManager({
    getScale: () => scale,
    onResizeComplete: (id, finalWidth, finalHeight) => {
        const card = document.getElementById(id);
        if (!card) return;
        const startW = card.dataset.startW ? parseFloat(card.dataset.startW) : finalWidth;
        const startH = card.dataset.startH ? parseFloat(card.dataset.startH) : finalHeight;
        
        if (startW !== finalWidth || startH !== finalHeight) {
            const cmd = new ResizeCommand(id, startW, startH, finalWidth, finalHeight);
            historyManager.execute(cmd);
            card.dataset.startW = finalWidth;
            card.dataset.startH = finalHeight;
        }
    }
});

document.addEventListener('keydown', (e) => {
    // Auto-bullet logic
    if (e.key === 'Enter' && e.target.isContentEditable && !e.shiftKey) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const node = selection.focusNode;
            const text = node.textContent || '';
            const match = text.match(/^(\s*-\s+)/);
            
            if (match) {
                e.preventDefault();
                const bullet = match[1];
                if (text.trim() === '-') {
                    // Pusta linia z myślnikiem - przerywamy listę
                    node.textContent = '';
                } else {
                    document.execCommand('insertHTML', false, '<br>' + bullet);
                }
                return;
            }
        }
    }

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
    constructor(id, startX, startY, endX, endY, startParentId = null, endParentId = null) {
        this.id = id;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.startParentId = startParentId;
        this.endParentId = endParentId;
    }
    async execute() {
        if (!auth.currentUser) return;
        const updates = { x: this.endX, y: this.endY };
        if (this.endParentId !== undefined) updates.parentId = this.endParentId;
        try { await updateDoc(doc(db, "notes", this.id), updates); } catch(e){}
    }
    async undo() {
        if (!auth.currentUser) return;
        const updates = { x: this.startX, y: this.startY };
        if (this.startParentId !== undefined) updates.parentId = this.startParentId;
        try { await updateDoc(doc(db, "notes", this.id), updates); } catch(e){}
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
        if (!auth.currentUser) return;
        window.debugLog(`ResizeCmd exec: ${this.endW}x${this.endH}`);
        try { await updateDoc(doc(db, "notes", this.id), { width: this.endW, height: this.endH }); } catch(e){ window.debugLog('ResizeCmd Error!'); }
    }
    async undo() {
        if (!auth.currentUser) return;
        try { await updateDoc(doc(db, "notes", this.id), { width: this.startW, height: this.startH }); } catch(e){}
    }
}


class AddCommand {
    constructor(id, data) {
        this.id = id;
        this.data = data;
    }
    async execute() {
        try { 
            await setDoc(doc(db, "notes", this.id), this.data); 
        } catch(e) {
            alert("Błąd zapisu AddCommand: " + e.message);
            console.error(e);
        }
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
/*
const anchorBtn = document.getElementById('anchor-btn');
let anchorPos = null;
let anchorElement = null;

if (anchorBtn) {
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
}
*/


// --- TWORZENIE I DRAGOWANIE KART (FIREBASE) ---

// Flowbar Events
document.addEventListener('flowbar-add-block-type', async (e) => {
    console.log("[DEBUG] Otrzymano flowbar-add-block-type w Projektowniku!", e.detail);
    const type = e.detail?.type || 'empty';
    
    const titles = {
        'vision': 'Wizja', 'goal': 'Cel (SMART)', 'scope': 'Zakres',
        'plan': 'Plan', 'timeline': 'Harmonogram', 'resources': 'Zasoby',
        'risks': 'Ryzyka', 'ifthen': 'If>Then', 'success': 'Kryterium Sukcesu',
        'empty': 'Nowy Blok'
    };
    
    const centerX = (window.innerWidth / 2 - translateX) / scale;
    const centerY = (window.innerHeight / 2 - translateY) / scale;
    console.log("[DEBUG] Współrzędne wyliczone:", centerX, centerY);
    
    try {
        console.log("[DEBUG] Tworzę referencję do kolekcji notes...");
        const docRef = doc(collection(db, "notes"));
        console.log("[DEBUG] Referencja utworzona:", docRef.id);
        const data = {
            type: 'block',
            blockType: type,
            title: titles[type] || 'Blok',
            content: (type === 'empty') ? '' : '<div class="block-kpi"><input type="checkbox"><span><br></span></div>',
            x: centerX - 200, // 400px width / 2
            y: centerY - 100,
            width: 400,
            projectId: currentProjectId
        };
        console.log("[DEBUG] Data przygotowana. Inicjuję AddCommand...");
        const command = new AddCommand(docRef.id, data);
        historyManager.execute(command);
        console.log("[DEBUG] Komenda wykonana!");
    } catch (err) {
        console.error("[DEBUG] Błąd zapisu bloku do Firebase:", err);
    }
});

document.addEventListener('flowbar-add-note', async () => {
    const centerX = (window.innerWidth / 2 - translateX) / scale;
    const centerY = (window.innerHeight / 2 - translateY) / scale;
    
    try {
        const docRef = doc(collection(db, "notes"));
        const data = {
            type: 'text',
            x: centerX,
            y: centerY,
            title: "",
            content: "",
            projectId: currentProjectId
        };
        const command = new AddCommand(docRef.id, data);
        historyManager.execute(command);
    } catch (e) {
        console.error("Błąd zapisu do Firebase:", e);
    }
});

document.addEventListener('flowbar-add-text', async () => {
    
    const centerX = (window.innerWidth / 2 - translateX) / scale;
    const centerY = (window.innerHeight / 2 - translateY) / scale;
    
    try {
        const docRef = doc(collection(db, "notes"));
        const data = {
            type: 'textblock',
            x: centerX,
            y: centerY,
            content: "",
            width: 250,
            projectId: currentProjectId
        };
        const command = new AddCommand(docRef.id, data);
        historyManager.execute(command);
    } catch (e) {
        console.error("Błąd zapisu do Firebase:", e);
    }
});


let activeCard = null;
let cardStartX, cardStartY;
let cardInitialX = 0;
let cardInitialY = 0;
let isResizingCard = false;
let hasCardMoved = false;

// --- RESIZE OBSERVER (FALLBACK DLA BRAKUJĄCYCH MOUSEUP) ---
let resizeDebounce = null;
const cardResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const card = entry.target;
        if (isResizingCard && activeCard === card) {
            clearTimeout(resizeDebounce);
            resizeDebounce = setTimeout(() => {
                const currentW = card.offsetWidth;
                const currentH = card.offsetHeight;
                
                if (window.cardInitialW && (window.cardInitialW !== currentW || window.cardInitialH !== currentH)) {
                    window.debugLog(`ResizeObs Save W:${currentW} H:${currentH}`);
                    const cmd = new ResizeCommand(card.id, window.cardInitialW, window.cardInitialH, currentW, currentH);
                    historyManager.execute(cmd);
                    window.cardInitialW = currentW;
                    window.cardInitialH = currentH;
                }
            }, 400);
        }
    }
});
window.cardInitialW = 0;
window.cardInitialH = 0;

function createCardElement(id, data) {
    if (document.getElementById(id)) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = id;
    card.style.left = `${data.x}px`;
    card.style.top = `${data.y}px`;
    
    const handleFlowResize = (id, oldW, oldH, newW, newH, oldL, oldT, newL, newT) => {
        if (oldW !== newW || oldH !== newH) {
            const cmd = new ResizeCommand(id, oldW, oldH, newW, newH);
            historyManager.execute(cmd);
            
            if (oldL !== newL || oldT !== newT) {
                const cmdMove = new MoveCommand(id, oldL, oldT, newL, newT, data.parentId, data.parentId);
                historyManager.execute(cmdMove);
            }
        }
    };
    
    if (data.type === 'image') {
        card.classList.add('flow-resizable-container');
        card.classList.add('image-card');
        card.style.width = data.width ? `${data.width}px` : '300px';
        if (data.height) card.style.height = `${data.height}px`;
        card.dataset.startW = parseFloat(card.style.width);
        card.dataset.startH = parseFloat(card.style.height);
        
        // Force no native resize
        card.style.setProperty('resize', 'none', 'important');
        
        card.innerHTML = `
            <button class="delete-btn" title="Usuń" style="z-index: 1003;">×</button>
            <img class="flow-image-content" src="${data.url}">
        `;
        appendCardToDom(card, data.parentId);
        makeDraggable(card, id);
        
        // Attach FlowImageManager with save callback
        imageManager.attachTo(card, id, handleFlowResize);
    } else if (data.type === 'textblock') {
        card.classList.add('text-card');
        card.style.resize = 'both';
        card.style.overflow = 'hidden';
        
        card.innerHTML = `
            <button class="delete-btn" title="Usuń">×</button>
            <div class="card-body">${data.content || 'Wpisz tekst...'}</div>
        `;
        appendCardToDom(card, data.parentId);
        if(data.width) card.style.width = `${data.width}px`;
        if(data.height) card.style.height = `${data.height}px`;
        makeDraggable(card, id);
        makeEditable(card, id);
    } else if (data.type === 'block') {
        card.classList.add('container-block');
        card.style.resize = 'both';
        card.style.overflow = 'visible';
        card.style.width = data.width ? `${data.width}px` : '400px';
        if (data.height) card.style.height = `${data.height}px`;
        
        card.innerHTML = `
            <button class="delete-btn" title="Usuń">×</button>
            <div class="card-header" contenteditable="true">${data.title || 'Nowy Blok'}</div>
            <div class="card-body" contenteditable="true" style="width: 100%; height: calc(100% - 40px); outline: none; overflow-y: auto; padding: 10px; color: #fff; font-family: sans-serif; font-size: 14px; box-sizing: border-box;">${data.content || ''}</div>
        `;
        appendCardToDom(card, data.parentId);
        makeDraggable(card, id);
        makeEditable(card, id);
        
        // Sprawdź czy jakieś notatki czekają na ten blok jako na rodzica
        document.querySelectorAll(`.card[data-pending-parent-id="${id}"]`).forEach(child => {
            card.appendChild(child);
            delete child.dataset.pendingParentId;
        });

    } else {
        // Zwykła notatka (Sticky Note)
        card.classList.add('sticky-note');
        card.classList.add('flow-resizable-container');
        card.dataset.lockRatio = "false";
        card.style.width = data.width ? `${data.width}px` : '250px';
        card.style.height = data.height ? `${data.height}px` : '250px';
        card.innerHTML = `
            <button class="delete-btn" title="Usuń">×</button>
            <div class="card-body" style="height: 100%; overflow: auto;">${data.content || ''}</div>
        `;
        appendCardToDom(card, data.parentId);
        makeDraggable(card, id);
        makeEditable(card, id);
        imageManager.attachTo(card, id, handleFlowResize);
    }
    
    // Tylko stare elementy korzystają z natywnego mouseup resize.
    if (data.type === 'textblock' || data.type === 'block') {
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
    }
    
    // Obsługa usuwania
    const delBtn = card.querySelector('.delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (window.lastDragEndTime && Date.now() - window.lastDragEndTime < 500) {
                return; // Ignoruj sztuczne kliknięcia po upuszczeniu na mobile
            }
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
    
    // Obsługa relacji rodzic-dziecko
    const currentParentId = card.parentElement.classList.contains('container-block') ? card.parentElement.id : null;
    const newParentId = data.parentId || null;
    if (currentParentId !== newParentId) {
        if (newParentId) {
            const parentBlock = document.getElementById(newParentId);
            if (parentBlock) {
                parentBlock.appendChild(card);
            } else {
                canvas.appendChild(card);
                card.dataset.pendingParentId = newParentId;
            }
        } else {
            canvas.appendChild(card);
        }
    }

    card.style.left = `${data.x}px`;
    card.style.top = `${data.y}px`;
    
    if (data.width) card.style.width = `${data.width}px`;
    if (data.height) card.style.height = `${data.height}px`;
    
    if (data.type === 'text') {
        const body = card.querySelector('.card-body');
        if (body && body.getAttribute('contenteditable') !== 'true') body.innerHTML = data.content || '';
    } else if (data.type === 'textblock') {
        const body = card.querySelector('.card-body');
        if (body && body.getAttribute('contenteditable') !== 'true') body.innerHTML = data.content || '';
    }
    
    if (data.type !== 'image') {
        cardResizeObserver.observe(card);
    }
}

function makeDraggable(element, id) {
    let touchTimer = null;
    let isLongPress = false;

    element.addEventListener('mousedown', (e) => {
        if(e.target.contentEditable === "true" && document.activeElement === e.target) return; 
        if(e.target.closest('.delete-btn')) return;
        if(e.target.classList.contains('flow-resize-handle')) return;
        
        const rect = element.getBoundingClientRect();
        // Sprawdź czy kliknięto w prawy dolny róg (uchwyt resize), biorąc pod uwagę skalowanie!
        const unscaledWidth = rect.width / scale;
        const unscaledHeight = rect.height / scale;
        const mouseX = (e.clientX - rect.left) / scale;
        const mouseY = (e.clientY - rect.top) / scale;
        
        const isResizeHandle = !element.classList.contains('flow-resizable-container') && mouseX > (unscaledWidth - 40) && mouseY > (unscaledHeight - 40);
        isResizingCard = isResizeHandle;
        
        window.debugLog(`Mousedown. isResizeHandle: ${isResizeHandle}`);
        
        activeCard = element;
        hasCardMoved = false;
        window.cardInitialW = element.offsetWidth;
        window.cardInitialH = element.offsetHeight;
        cardInitialX = parseFloat(element.style.left) || 0;
        cardInitialY = parseFloat(element.style.top) || 0;
        cardStartX = e.clientX / scale - cardInitialX;
        cardStartY = e.clientY / scale - cardInitialY;
        e.stopPropagation();
    });

    // --- LOGIKA DLA DOTYKU (Mobile - przytrzymanie) ---
    let lastCardTap = 0;
    
    element.addEventListener('touchstart', (e) => {
        if(e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) return;
        if(e.target.classList.contains('flow-resize-handle')) return;
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
        }
    });
}

function makeEditable(element, id) {
    const header = element.querySelector('.card-header');
    const body = element.querySelector('.card-body');
    
    let oldTitle = '';
    let oldContent = '';
    
    const enableEdit = (e) => {
        if (window.hasCardMoved || window.hasPanned || window.isResizingCard) return;
        
        const el = e.target.closest('.card-header') || e.target.closest('.card-body');
        if(el) {
            el.setAttribute('contenteditable', 'true');
            oldTitle = header ? header.innerHTML : '';
            oldContent = body ? body.innerHTML : '';
            el.focus();
            
            // Magiczne ustawienie kursora dokładnie w miejscu kliknięcia
            if (document.caretRangeFromPoint && e.clientX && e.clientY) {
                const range = document.caretRangeFromPoint(e.clientX, e.clientY);
                if (range) {
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } else if (document.caretPositionFromPoint && e.clientX && e.clientY) {
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
    
    element.addEventListener('pointerup', enableEdit);
    
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
    if (!activeCard || isResizingCard) return;
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
        const currentW = activeCard.offsetWidth;
        const currentH = activeCard.offsetHeight;
        
        window.debugLog(`DragEnd on ${activeCard.id}. OldW:${window.cardInitialW} NewW:${currentW}`);
        
        // Zapisz zmianę rozmiaru
        if (window.cardInitialW && (window.cardInitialW !== currentW || window.cardInitialH !== currentH)) {
            window.debugLog('Size changed (MouseUp)!');
            const cmd = new ResizeCommand(activeCard.id, window.cardInitialW, window.cardInitialH, currentW, currentH);
            historyManager.execute(cmd);
            window.cardInitialW = currentW;
            window.cardInitialH = currentH;
        }
        
        // Zapisz pozycję i relację rodzica
        if (hasCardMoved && !isResizingCard) {
            let currentX = parseFloat(activeCard.style.left);
            let currentY = parseFloat(activeCard.style.top);
            let newParentId = null;
            const oldParentId = activeCard.parentElement.classList.contains('container-block') ? activeCard.parentElement.id : null;

            if (!activeCard.classList.contains('container-block')) {
                const cardRect = activeCard.getBoundingClientRect();
                const cardCenterX = cardRect.left + cardRect.width / 2;
                const cardCenterY = cardRect.top + cardRect.height / 2;

                const blocks = Array.from(document.querySelectorAll('.container-block'));
                const targetBlock = blocks.find(b => {
                    if (b === activeCard) return false;
                    const bRect = b.getBoundingClientRect();
                    return cardCenterX > bRect.left && cardCenterX < bRect.right &&
                           cardCenterY > bRect.top && cardCenterY < bRect.bottom;
                });

                if (targetBlock) {
                    newParentId = targetBlock.id;
                    if (oldParentId !== newParentId) {
                        targetBlock.appendChild(activeCard);
                        // Convert to local coords safely
                        let tLeft = parseFloat(targetBlock.style.left);
                        if (isNaN(tLeft)) tLeft = 0;
                        let tTop = parseFloat(targetBlock.style.top);
                        if (isNaN(tTop)) tTop = 0;
                        
                        let localX = currentX - tLeft;
                        let localY = currentY - tTop;
                        if (isNaN(localX)) localX = 0;
                        if (isNaN(localY)) localY = 0;
                        
                        activeCard.style.left = `${localX}px`;
                        activeCard.style.top = `${localY}px`;
                        currentX = localX;
                        currentY = localY;
                    }
                } else {
                    if (oldParentId) {
                        canvas.appendChild(activeCard);
                        const parentEl = document.getElementById(oldParentId);
                        const globalX = currentX + parseFloat(parentEl?.style.left || 0);
                        const globalY = currentY + parseFloat(parentEl?.style.top || 0);
                        activeCard.style.left = `${globalX}px`;
                        activeCard.style.top = `${globalY}px`;
                        currentX = globalX;
                        currentY = globalY;
                    }
                }
            } else {
                newParentId = oldParentId; // Blok może na razie nie być zagnieżdżany w blokach
            }

            if (cardInitialX !== currentX || cardInitialY !== currentY || oldParentId !== newParentId) {
                const cmd = new MoveCommand(activeCard.id, cardInitialX, cardInitialY, currentX, currentY, oldParentId, newParentId);
                historyManager.execute(cmd);
            }
        }
        activeCard = null;
        hasCardMoved = false;
        isResizingCard = false;
        window.lastDragEndTime = Date.now();
    }
};

window.addEventListener('mouseup', () => { window.debugLog('window mouseup fired'); handleCardDragEnd(); });
window.addEventListener('pointerup', () => { window.debugLog('window pointerup fired'); handleCardDragEnd(); });
window.addEventListener('touchend', handleCardDragEnd);

const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIMENSION = 1920;
                
                if (width > height && width > MAX_DIMENSION) {
                    height *= MAX_DIMENSION / width;
                    width = MAX_DIMENSION;
                } else if (height > MAX_DIMENSION) {
                    width *= MAX_DIMENSION / height;
                    height = MAX_DIMENSION;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(blob || file);
                }, 'image/webp', 0.85);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};

document.addEventListener('flowbar-add-image', async (e) => {
    if (!auth.currentUser) return;
    const file = e.detail?.file;
    if (!file) return;
    
    console.log("Ładowanie i kompresja obrazka (z Flowbara) do chmury...");
    const compressedBlob = await compressImage(file);
    
    // Zapisujemy jako zoptymalizowany plik .webp
    const fileRef = ref(storage, 'images/' + Date.now() + '_' + Math.floor(Math.random()*1000) + '.webp');
    
    try {
        await uploadBytes(fileRef, compressedBlob);
        const url = await getDownloadURL(fileRef);
        
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const spawnX = (centerX - translateX) / scale;
        const spawnY = (centerY - translateY) / scale;

        const cmd = new AddCommand('image_' + Date.now(), {
            type: 'image',
            url: url,
            x: spawnX,
            y: spawnY,
            width: 300,
            projectId: currentProjectId
        });
        historyManager.execute(cmd);
    } catch(err) {
        console.error("Błąd ładowania obrazka:", err);
    }
});

// --- TWORZENIE BLOKÓW Z FLOWBARA (Globalny nasłuchiwacz uodporniony na canvas) ---
document.addEventListener('pointerdown', async (e) => {
    const btn = e.target.closest('.block-option');
    if (!btn) return;
    
    // Zatrzymujemy propagację, żeby canvas nie przesuwał ekranu!
    e.stopPropagation();

    const type = btn.dataset.type;
    const text = btn.innerText.replace('# ', '').replace('[ ... ] ', '').trim();
    
    if (window.debugLog) window.debugLog(`Przechwycono GLOBALNIE kliknięcie w: ${text}`);

    // Ukrywamy menu
    const blockMenu = document.querySelector('#block-menu');
    if (blockMenu) blockMenu.classList.add('hidden');

    if (!auth.currentUser) {
        console.warn("[Projektownik] Brak zalogowanego użytkownika!");
        return;
    }

    const id = 'block_' + Date.now();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const spawnX = (centerX - translateX) / scale;
    const spawnY = (centerY - translateY) / scale;

    const cmd = new AddCommand(id, {
        type: 'block',
        title: text,
        x: spawnX,
        y: spawnY,
        width: 300,
        height: 400,
        color: '#2a2a2a',
        projectId: currentProjectId
    });
    historyManager.execute(cmd);
});


// Funkcja pomocnicza do renderowania DOM (async parent resolution)
function appendCardToDom(card, parentId) {
    if (parentId) {
        const parentBlock = document.getElementById(parentId);
        if (parentBlock) {
            parentBlock.appendChild(card);
        } else {
            // Rodzic jeszcze nie wyrenderowany, odłóż na planszę i poczekaj
            canvas.appendChild(card);
            card.dataset.pendingParentId = parentId;
        }
    } else {
        canvas.appendChild(card);
    }
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
                    y: centerY,
                    projectId: currentProjectId
                });
                console.log("Obrazek pomyślnie dodany na Biurko!");
            } catch (err) {
                console.error("Błąd wgrywania zdjęcia:", err);
            }
        }
    }
});

// --- SYSTEM MENU LISTENERS ---
document.addEventListener('sys-logout', async () => {
    try {
        await signOut(auth);
        window.location.href = '../login/index.html';
    } catch(err) {
        console.error("Błąd podczas wylogowywania:", err);
    }
});

const applyGlassBg = (val) => {
    const bgLayer = document.querySelector('.bg-layer');
    if (!bgLayer) return;
    
    const ratio = val / 100;
    const blurVal = ratio * 20; 
    const brightnessVal = 1.0 - (ratio * 0.95); 
    
    bgLayer.style.transition = 'filter 0.1s ease';
    bgLayer.style.filter = `blur(${blurVal}px) brightness(${brightnessVal})`;
    bgLayer.style.opacity = '1';
};

const savedGlassBg = localStorage.getItem('sys-glass-bg-slider') || 50;
applyGlassBg(savedGlassBg);

document.addEventListener('sys-glass-bg-slider', (e) => {
    applyGlassBg(e.detail.value);
});

document.addEventListener('sys-save', () => {
    // Projektownik zapisuje w locie. To tylko wizualny feedback
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '80px'; // Trochę wyżej by nie zasłaniać Flowbara
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'var(--teal, rgba(0, 201, 200, 0.9))';
    toast.style.color = '#000';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.fontFamily = 'sans-serif';
    toast.style.fontWeight = 'bold';
    toast.style.zIndex = '9999';
    toast.style.transition = 'opacity 0.3s ease';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    toast.innerText = 'Zapisano w chmurze!';
    
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 1500);
    setTimeout(() => { toast.remove(); }, 1800);
});
