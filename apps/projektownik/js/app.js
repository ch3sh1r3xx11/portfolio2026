import { db, auth, provider, signInWithPopup, onAuthStateChanged, storage, ref, uploadBytes, getDownloadURL, signOut } from './firebase-config.js';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');

// --- LOGOWANIE GOOGLE ---
const loginOverlay = document.getElementById('login-overlay');
const loginBtn = document.getElementById('login-btn');

loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).then((res) => {
        console.log("Zalogowano pomyślnie jako: " + res.user.email);
    }).catch(error => {
        console.error("Błąd logowania:", error);
    });
});

const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).catch(err => console.error(err));
    });
}

let unsubscribeSnapshot = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Zalogowano z sukcesem
        loginOverlay.style.display = 'none';
        console.log("Zalogowany jako:", user.email);
        
        // Rozpocznij nasłuchiwanie notatek dopiero po zalogowaniu
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
    } else {
        // Nie zalogowano
        loginOverlay.style.display = 'flex';
        if (unsubscribeSnapshot) unsubscribeSnapshot(); // Przestań pobierać notatki
        canvas.innerHTML = ''; // Wyczyść biurko z ewentualnych starych danych
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
    if (e.target.closest('.card') || e.target.closest('#ui-layer') || e.target.closest('#login-overlay')) return;
    
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
    if (loginOverlay.style.display === 'flex') return;
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

viewport.addEventListener('touchstart', (e) => {
    canvas.classList.remove('smooth-pan');
    if (loginOverlay.style.display === 'flex') return;
    if (e.target.closest('.card') || e.target.closest('#ui-layer')) return;

    if (e.touches.length === 1) {
        isDraggingBoard = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    } else if (e.touches.length === 2) {
        isDraggingBoard = false;
        initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = scale;
    }
}, { passive: false });

viewport.addEventListener('touchmove', (e) => {
    if (loginOverlay.style.display === 'flex') return;
    if (e.target.closest('.card') || e.target.closest('#ui-layer')) return;
    if (e.touches.length > 1) e.preventDefault(); // Blokuj domyślny scroll przy zoomie

    if (e.touches.length === 1 && isDraggingBoard) {
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        updateCanvas();
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
        isDraggingBoard = false;
    }
});


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

addNoteBtn.addEventListener('click', async () => {
    if (!auth.currentUser) return; // Zabezpieczenie przed niezalogowanymi
    
    const centerX = (window.innerWidth / 2 - translateX) / scale;
    const centerY = (window.innerHeight / 2 - translateY) / scale;
    
    try {
        await addDoc(collection(db, "notes"), {
            type: 'text',
            x: centerX,
            y: centerY,
            title: "Nowa Notatka",
            content: "Zacznij pisać..."
        });
    } catch (e) {
        console.error("Błąd zapisu do Firebase:", e);
    }
});


let activeCard = null;
let cardStartX, cardStartY;
let hasCardMoved = false;

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
        card.style.padding = '8px'; // mniejszy padding dla zdjęć
        card.style.resize = 'both';
        card.style.overflow = 'hidden';
        card.innerHTML = `
            <button class="delete-btn" title="Usuń">×</button>
            <img src="${data.url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block; pointer-events: none;">
        `;
        canvas.appendChild(card);
        makeDraggable(card, id);
        
        card.addEventListener('mouseup', async () => {
            const currentW = parseFloat(window.getComputedStyle(card).width);
            const currentH = parseFloat(window.getComputedStyle(card).height);
            if (data.width !== currentW || data.height !== currentH) {
                data.width = currentW;
                data.height = currentH;
                try {
                    await updateDoc(doc(db, "notes", id), { width: currentW, height: currentH });
                } catch(err) {}
            }
        });
    } else {
        card.style.width = '250px';
        card.innerHTML = `
            <button class="delete-btn" title="Usuń">×</button>
            <div class="card-header" contenteditable="true">${data.title || ''}</div>
            <div class="card-body" contenteditable="true">${data.content || ''}</div>
        `;
        canvas.appendChild(card);
        makeDraggable(card, id);
        makeEditable(card, id);
    }
    
    // Obsługa usuwania
    const delBtn = card.querySelector('.delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if(confirm("Na pewno usunąć?")) {
                await deleteDoc(doc(db, "notes", id));
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
    
    if (data.type !== 'image') {
        const header = card.querySelector('.card-header');
        const body = card.querySelector('.card-body');
        if (header && document.activeElement !== header) header.innerHTML = data.title;
        if (body && document.activeElement !== body) body.innerHTML = data.content;
    }
}

function makeDraggable(element, id) {
    const handleDragStart = (e) => {
        if(e.target.contentEditable === "true") return; 
        if(e.target.classList.contains('delete-btn')) return;
        
        // Zabezpieczenie: jeśli to zdjęcie i kliknięto prawy dolny róg (resize), to ignoruj drag
        if (window.getComputedStyle(element).resize !== 'none') {
            const rect = element.getBoundingClientRect();
            let clientX = e.clientX;
            let clientY = e.clientY;
            if(e.type === 'touchstart') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            if (clientX > rect.right - 25 && clientY > rect.bottom - 25) {
                return; 
            }
        }
        
        activeCard = element;
        hasCardMoved = false;
        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        
        cardStartX = clientX / scale - parseFloat(element.style.left || 0);
        cardStartY = clientY / scale - parseFloat(element.style.top || 0);
        e.stopPropagation();
    };

    element.addEventListener('mousedown', handleDragStart);
    element.addEventListener('touchstart', handleDragStart, { passive: false });
}

function makeEditable(element, id) {
    const header = element.querySelector('.card-header');
    const body = element.querySelector('.card-body');
    
    const saveContent = async () => {
        await updateDoc(doc(db, "notes", id), {
            title: header.innerHTML,
            content: body.innerHTML
        });
    };
    
    header.addEventListener('blur', saveContent);
    body.addEventListener('blur', saveContent);
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
    e.preventDefault(); // Zapobiega przewijaniu ekranu przy przeciąganiu notatki
    
    const newX = e.touches[0].clientX / scale - cardStartX;
    const newY = e.touches[0].clientY / scale - cardStartY;
    
    activeCard.style.left = `${newX}px`;
    activeCard.style.top = `${newY}px`;
}, { passive: false });

const handleCardDragEnd = async () => {
    if(activeCard) {
        if (hasCardMoved) {
            const id = activeCard.id;
            const finalX = parseFloat(activeCard.style.left);
            const finalY = parseFloat(activeCard.style.top);
            
            try {
                await updateDoc(doc(db, "notes", id), { x: finalX, y: finalY });
            } catch (e) {
                console.error("Błąd zapisu pozycji:", e);
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
    
    // Ignoruj wklejanie jeśli użytkownik właśnie pisze w notatce tekstowej
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
