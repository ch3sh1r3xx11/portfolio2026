import { db } from '/js/firebase-config.js';
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { serializeToMarkdown, parseFromMarkdown } from './js/markdown-engine.js';
import { FlowImageManager } from '/packages/shared-ui/js/FlowImageManager.js';

// Removed on-screen-debugger
console.log('App loaded v1.2');
let projectData = {
    title: "",
    version: "0.71",
    content: "",
    activity: {}
};
let currentProjectId = null;
let lastLocalSaveTime = 0;
let lastCharCount = 0;
let lastCheckedCount = 0;

const imageManager = new FlowImageManager({
    getScale: () => 1, // Brak zooma w Kreatorze
    onResizeComplete: (id, w, h) => {
        if (currentProjectId) {
            collectProjectData().then(() => initProject());
        }
    }
});

function rehydrateImages() {
    const images = editorContent.querySelectorAll('.flow-resizable-container');
    images.forEach(img => {
        // Usuwamy stare handles (mogły zostać zapisane w HTML), manager doda je od nowa
        img.querySelectorAll('.flow-resize-handle, .flow-resize-tooltip').forEach(el => el.remove());
        imageManager.attachTo(img);
    });
}

// Elements
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const titleInput = document.getElementById('project-title');
const versionInput = document.getElementById('project-version');
const dateInput = document.getElementById('project-date');
const editorContent = document.getElementById('editor-content');
const addBlockBtn = document.getElementById('add-block-btn');
const menu = document.getElementById('block-menu');
const glassSlider = document.getElementById('glass-slider');

// Set today's date
dateInput.value = new Date().toISOString().split('T')[0];

// --- PROGRESS BAR LOGIC ---
function calculateProgress() {
    let score = 0;
    let maxScore = 100;
    
    // Title is worth 30%
    if (titleInput.value.trim().length > 2) score += 30;
    // Version is worth 20%
    if (versionInput.value.trim().length > 0) score += 20;
    
    // Content structure is worth up to 50%
    const content = editorContent.innerHTML;
    let modules = 0;
    if (content.includes('module-heading')) {
        modules = (content.match(/module-heading/g) || []).length;
    }
    
    if (modules >= 1) score += 25;
    if (modules >= 2) score += 25; // Reaches 100% with 2+ modules
    
    // If they typed a lot but didn't use headings, give some points
    if (modules === 0 && editorContent.innerText.length > 50) score += 20;
    
    return Math.min(score, maxScore);
}

function updateProgress() {
    const p = calculateProgress();
    progressBar.style.width = p + '%';
    progressText.textContent = `${p}% Gotowości`;
    
    if (p === 100) {
        progressText.style.color = 'var(--magenta)';
        progressBar.style.boxShadow = '0 0 15px var(--magenta)';
        progressBar.style.background = 'var(--magenta)';
    } else {
        progressText.style.color = 'var(--teal)';
        progressBar.style.boxShadow = '0 0 5px var(--teal)';
        progressBar.style.background = 'linear-gradient(90deg, var(--teal), var(--magenta))';
    }
}

// Listeners for progress
titleInput.addEventListener('input', updateProgress);
versionInput.addEventListener('input', updateProgress);
editorContent.addEventListener('input', updateProgress);

// Utrwal stan checkboxów w DOM, aby innerHTML go zapisał
editorContent.addEventListener('click', (e) => {
    if (e.target.type === 'checkbox') {
        setTimeout(() => {
            if (e.target.checked) {
                e.target.setAttribute('checked', 'checked');
            } else {
                e.target.removeAttribute('checked');
            }
            collectProjectData(); // Przelicz heatmapę od razu
        }, 10);
    }
});


// --- GLASS SLIDER LOGIC ---
glassSlider.addEventListener('input', (e) => {
    const val = e.target.value; // 0 to 100
    const opacity = val / 100; // W górę (100) = max blur (1.0)
    document.documentElement.style.setProperty('--glass-opacity', opacity);
    
    // Dynamiczna jasność tła: przy 100% bluru tło staje się prawie czarne
    const brightness = Math.max(0.02, 0.5 - (opacity * 0.48));
    document.documentElement.style.setProperty('--bg-brightness', brightness);
});
// Trigger once to apply default style
glassSlider.dispatchEvent(new Event('input'));


// --- NOTION-STYLE EDITOR LOGIC ---
document.execCommand('defaultParagraphSeparator', false, 'p');

editorContent.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        let currentNode = range.startContainer;
        
        // Handle H2 (prevent creating a new H2, create a normal P instead)
        const heading = currentNode.nodeType === 3 ? currentNode.parentNode.closest('h2') : (currentNode.closest ? currentNode.closest('h2') : null);
        if (heading) {
            e.preventDefault();
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            
            let insertAfter = heading;
            // Skip over SMART warnings if they exist directly after heading
            while (insertAfter.nextElementSibling && (insertAfter.nextElementSibling.classList.contains('smart-inline-warning') || insertAfter.nextElementSibling.classList.contains('smart-inline-success'))) {
                insertAfter = insertAfter.nextElementSibling;
            }
            
            insertAfter.parentNode.insertBefore(p, insertAfter.nextSibling);
            
            // Move cursor
            range.setStart(p, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
        }

        // Handle KPI Checkboxes (Enter creates a new checkbox list item, or exits if empty)
        const kpiBlock = currentNode.nodeType === 3 ? currentNode.parentNode.closest('.block-kpi') : (currentNode.closest ? currentNode.closest('.block-kpi') : null);
        if (kpiBlock) {
            e.preventDefault();
            
            const kpiText = kpiBlock.textContent.trim();
            if (kpiText === '') {
                // Exit list
                const parent = kpiBlock.parentNode;
                const nextSibling = kpiBlock.nextSibling;
                kpiBlock.remove();
                
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                parent.insertBefore(p, nextSibling);
                
                range.setStart(p, 0);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }

            // Create new KPI block
            const newKpi = document.createElement('div');
            newKpi.className = 'block-kpi';
            newKpi.innerHTML = '<input type="checkbox"><span><br></span>';
            kpiBlock.parentNode.insertBefore(newKpi, kpiBlock.nextSibling);
            
            range.setStart(newKpi.querySelector('span'), 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
        }

        // Handle Styled Notes and AI blocks.
        // Shift+Enter = nowa linia wewnątrz. Enter = wyjście z bloku.
        const noteBlock = currentNode.nodeType === 3 ? currentNode.parentNode.closest('.block-note, .block-ai') : (currentNode.closest ? currentNode.closest('.block-note, .block-ai') : null);
        if (noteBlock) {
            if (e.shiftKey) {
                e.preventDefault();
                document.execCommand('insertLineBreak');
            } else {
                e.preventDefault();
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                
                // Jeśli jesteśmy w szklanej karcie, wychodzimy pod nią, by nie psuć struktury
                const glassCard = noteBlock.closest('.glass-card');
                if (glassCard) {
                    glassCard.parentNode.insertBefore(p, glassCard.nextSibling);
                } else {
                    noteBlock.parentNode.insertBefore(p, noteBlock.nextSibling);
                }
                
                range.setStart(p, 0);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            return;
        }
    } else if (e.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        
        if (range.startOffset === 0 && range.collapsed) {
            let currentNode = range.startContainer;
            const kpiBlock = currentNode.nodeType === 3 ? currentNode.parentNode.closest('.block-kpi') : (currentNode.closest ? currentNode.closest('.block-kpi') : null);
            
            if (kpiBlock) {
                const textContent = kpiBlock.textContent.replace(/\u200B/g, '').trim();
                if (textContent === '' || textContent.length === 0) {
                    e.preventDefault();
                    const parent = kpiBlock.parentNode;
                    const nextSibling = kpiBlock.nextSibling;
                    kpiBlock.remove();
                    const p = document.createElement('p');
                    p.innerHTML = '<br>';
                    parent.insertBefore(p, nextSibling);
                    range.setStart(p, 0);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }
    }
});

editorContent.addEventListener('keyup', (e) => {
    // Markdown checkboxy [] lub [ ]
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        
        if (node.nodeType === 3) {
            const text = node.textContent;
            if (text.endsWith('[] ') || text.endsWith('[ ] ')) {
                const glassCard = node.parentNode.closest('.glass-card');
                if (glassCard) {
                    const kpiBlock = document.createElement('div');
                    kpiBlock.className = 'block-kpi';
                    kpiBlock.innerHTML = '<input type="checkbox"><span><br></span>';
                    
                    const pNode = node.parentNode.closest('p, .block-content, .block-note');
                    if (pNode && pNode.parentNode) {
                        pNode.parentNode.insertBefore(kpiBlock, pNode);
                        if (pNode.textContent.trim() === '[]' || pNode.textContent.trim() === '') {
                            pNode.remove();
                        } else {
                            node.textContent = text.replace(/\[\s*\] $/, '');
                        }
                    }
                    
                    // Set cursor inside new span
                    const newRange = document.createRange();
                    newRange.setStart(kpiBlock.querySelector('span'), 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
        }
    }

    handleSmartAnalysis(e);
});

addBlockBtn.addEventListener('click', () => {
    menu.classList.toggle('hidden');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!addBlockBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

document.querySelectorAll('.block-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.closest('button').dataset.type;
        insertModule(type);
        menu.classList.add('hidden');
        updateProgress();
    });
});

// Toolbar Actions (Shared Mechanics)
document.getElementById('add-note').addEventListener('click', () => {
    const html = `<div class="glass-card" contenteditable="true"><div class="block-note">Nowa notatka...</div></div><p><br></p>`;
    safeInsertBlock(html);
});

document.getElementById('add-text-btn').addEventListener('click', () => {
    const html = `<p>Wpisz tekst tutaj...</p>`;
    safeInsertBlock(html);
});

document.getElementById('add-image-btn').addEventListener('click', () => {
    // Generujemy unikalne ID dla obrazka
    const uniqueId = 'img-' + Date.now();
    const html = `<div class="flow-resizable-container" id="${uniqueId}" style="width: 300px; position: relative; margin: 1rem 0;" contenteditable="false">
        <img class="flow-image-content" src="https://picsum.photos/600/400" alt="Placeholder">
    </div><p><br></p>`;
    safeInsertBlock(html);
    
    // Po wstawieniu do DOM, podpinamy eventy
    setTimeout(() => {
        const el = document.getElementById(uniqueId);
        if (el) imageManager.attachTo(el, uniqueId);
    }, 50);
});

document.getElementById('add-frame').addEventListener('click', () => {
    const html = `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 2rem 0;"><p><br></p>`;
    safeInsertBlock(html);
});

document.getElementById('add-kpi').addEventListener('click', () => {
    const html = `<div class="block-kpi"><input type="checkbox"><span><br></span></div>`;
    safeInsertBlock(html);
});

function insertModule(type) {
    const titles = {
        'vision': 'Wizja',
        'goal': 'Cel (SMART)',
        'scope': 'Zakres',
        'plan': 'Plan',
        'timeline': 'Harmonogram',
        'resources': 'Zasoby',
        'risks': 'Ryzyka',
        'ifthen': 'If>Then',
        'success': 'Kryterium Sukcesu',
        'empty': 'Nowy Blok'
    };
    
    const colorClass = (type === 'resources' || type === 'timeline' || type === 'empty') ? 'teal' : 'magenta';
    let html = '';
    
    if (type === 'empty') {
        html = `
            <div class="glass-card" contenteditable="true">
                <h2 class="module-heading ${colorClass}" data-type="empty">${titles[type]}</h2>
                <div class="block-content"><br></div>
            </div><p><br></p>
        `;
    } else {
        html = `
            <div class="glass-card" contenteditable="true">
                <h2 class="module-heading ${colorClass}" data-type="${type}">${titles[type]}</h2>
                <div class="block-kpi"><input type="checkbox"><span><br></span></div>
            </div><p><br></p>
        `;
    }
    
    safeInsertBlock(html);
}

// Bezpieczne wstawianie bloków (zapobiega wstawianiu bloku w środek innego bloku)
function safeInsertBlock(html) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        let node = selection.getRangeAt(0).startContainer;
        
        // Szukamy najbliższej szklanej karty, by wstawić nowy blok pod nią (a nie w środku!)
        let targetContainer = node.nodeType === 3 ? node.parentNode.closest('.glass-card') : (node.closest ? node.closest('.glass-card') : null);
        
        if (!targetContainer) {
            targetContainer = node.nodeType === 3 ? node.parentNode.closest('.block-kpi, .block-note, .module-heading') : (node.closest ? node.closest('.block-kpi, .block-note, .module-heading') : null);
        }
        
        if (targetContainer) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            let currentInsertPos = targetContainer;
            
            Array.from(tempDiv.childNodes).forEach(child => {
                targetContainer.parentNode.insertBefore(child, currentInsertPos.nextSibling);
                currentInsertPos = child;
            });
            
            editorContent.focus();
            const range = document.createRange();
            const spanOrP = Array.from(targetContainer.parentNode.children).find(el => el.innerHTML === '<br>');
            if (spanOrP) {
                range.setStart(spanOrP, 0);
            } else {
                range.setStartAfter(currentInsertPos);
            }
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
        }
    }
    
    // Fallback: append at the end
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    Array.from(tempDiv.childNodes).forEach(child => {
        editorContent.appendChild(child);
    });
    
    // Always ensure there is an empty paragraph at the very bottom
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    editorContent.appendChild(p);
}


// --- SMART ANALYSIS (INLINE) ---
let smartTimeout = null;

function handleSmartAnalysis(e) {
    clearTimeout(smartTimeout);
    smartTimeout = setTimeout(() => {
        // Wyszukajmy bloki typu "Cel (SMART)"
        const goalHeadings = editorContent.querySelectorAll('h2[data-type="goal"]');
        
        goalHeadings.forEach(heading => {
            // Treść znajduje się w elementach za nagłówkiem
            let contentNode = heading.nextElementSibling;
            if (contentNode && contentNode.classList && contentNode.classList.contains('smart-inline-warning')) {
                // Jeśli zaraz za nagłówkiem jest stary warning, idziemy dalej
                contentNode = contentNode.nextElementSibling;
            }
            
            let goalText = "";
            let blocksToCheck = [];
            
            // Zbieramy tekst do następnego nagłówka
            let curr = heading.nextElementSibling;
            while(curr && curr.tagName !== 'H2') {
                if (!curr.classList || (!curr.classList.contains('smart-inline-warning') && !curr.classList.contains('smart-inline-success'))) {
                    goalText += curr.textContent + " ";
                    blocksToCheck.push(curr);
                }
                curr = curr.nextElementSibling;
            }
            
            goalText = goalText.trim();
            
            // Usuwamy stare warningi
            const oldWarnings = editorContent.querySelectorAll('.smart-inline-warning, .smart-inline-success');
            oldWarnings.forEach(w => w.remove());

            // Prosta symulacja analizy jeśli wpisano więcej niż 15 znaków
            if (goalText.length > 15) {
                let htmlMsg = "";
                let className = "";
                
                if (!goalText.toLowerCase().includes('do') && !goalText.toLowerCase().includes('kiedy') && !goalText.includes('202')) {
                    htmlMsg = "<strong>SMART:</strong> Brakuje ram czasowych (Time-bound). Dodaj np. 'do końca Q3'.";
                    className = "smart-inline-warning";
                } else if (!goalText.match(/\d+/)) {
                    htmlMsg = "<strong>SMART:</strong> Cel wydaje się niemierzalny. Dodaj konkretną liczbę (np. oszczędność 5 godzin, zysk 10%).";
                    className = "smart-inline-warning";
                } else {
                    htmlMsg = "<strong>SMART:</strong> Cel wygląda solidnie! Jest konkretny, mierzalny i ma ramy czasowe.";
                    className = "smart-inline-success";
                }
                
                // Wstawienie komunikatu za nagłówkiem, ale przed tekstem (lub po tekście)
                // Dla czytelności wstawiamy bezpośrednio pod nagłówkiem
                const warningDiv = document.createElement('div');
                warningDiv.className = className;
                warningDiv.innerHTML = htmlMsg;
                // Make it uneditable so user doesn't accidentally type inside it
                warningDiv.contentEditable = "false"; 
                
                heading.parentNode.insertBefore(warningDiv, heading.nextSibling);
            }
        });
        
    }, 1000); // 1 sekunda po zakończeniu pisania
}


// --- INIT / SAVE LOGIC ---
async function collectProjectData() {
    projectData.title = titleInput.value;
    projectData.version = versionInput.value;
    projectData.content = editorContent.innerHTML;
    
    // Zwiększ aktywność usera na dzisiaj
    const today = new Date().toISOString().split('T')[0];
    if (!projectData.activity) projectData.activity = {};
    if (!projectData.activity[today]) projectData.activity[today] = { ideas: 0, completions: 0 };
    
    const currentCharCount = editorContent.innerText.length;
    const currentCheckedCount = editorContent.querySelectorAll('input[type="checkbox"]:checked').length;
    
    const charDiff = currentCharCount - lastCharCount;
    const checkedDiff = currentCheckedCount - lastCheckedCount;
    
    if (charDiff > 15) {
        projectData.activity[today].ideas = (projectData.activity[today].ideas || projectData.activity[today].user || 0) + 1;
        lastCharCount = currentCharCount;
    } else if (charDiff < 0) {
        lastCharCount = currentCharCount;
    }
    
    if (checkedDiff > 0) {
        projectData.activity[today].completions = (projectData.activity[today].completions || projectData.activity[today].ai || 0) + (checkedDiff * 5); // 5 points per checkbox
        lastCheckedCount = currentCheckedCount;
    } else if (checkedDiff < 0) {
        lastCheckedCount = currentCheckedCount;
    }
    
    renderHeatmap(projectData.activity);
}    

async function initProject() {
    await collectProjectData();
    
    if (!projectData.title) {
        alert("Podaj przynajmniej nazwę projektu.");
        titleInput.focus();
        return;
    }

    try {
        if (currentProjectId) {
            // Update
            lastLocalSaveTime = Date.now();
            const docRef = doc(db, "projects", currentProjectId);
            await updateDoc(docRef, {
                title: projectData.title,
                subtitle: (projectData.version || '').startsWith('v') ? projectData.version : `v${projectData.version || '0.1'}`,
                date: dateInput.value,
                content: projectData.content,
                activity: projectData.activity,
                glassOpacity: parseInt(glassSlider.value, 10),
                updatedAt: new Date().toISOString()
            });
        } else {
            // Create
            lastLocalSaveTime = Date.now();
            await addDoc(collection(db, "projects"), {
                title: projectData.title,
                subtitle: (projectData.version || '').startsWith('v') ? projectData.version : `v${projectData.version || '0.1'}`,
                isPublished: true,
                themeColor: "magenta",
                date: dateInput.value,
                content: projectData.content,
                activity: projectData.activity,
                glassOpacity: parseInt(glassSlider.value, 10),
                createdAt: new Date().toISOString()
            });
        }

        if (!currentProjectId) {
            window.location.href = "/"; // Powrót na stronę główną tylko przy nowym projekcie
        }
        
    } catch (e) {
        console.error("Błąd zapisu do Firestore:", e);
        alert("Wystąpił błąd podczas inicjalizowania projektu. Sprawdź konsolę.");
    }
}

document.getElementById('btn-init-project').addEventListener('click', initProject);

async function loadProject(id) {
    try {
        const docRef = doc(db, "projects", id);
        
        let isFirstLoad = true;
        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // Real-time AI Collaboration: If change comes from the server
                if (!isFirstLoad && docSnap.metadata.hasPendingWrites === false) {
                    if (Date.now() - lastLocalSaveTime > 2000) {
                        // Flash Antigravity purple to indicate AI updated the document
                        const flash = document.createElement('div');
                        flash.style.position = 'fixed';
                        flash.style.inset = '0';
                        flash.style.background = 'rgba(138, 43, 226, 0.3)'; // Antigravity Purple
                        flash.style.zIndex = '9999';
                        flash.style.pointerEvents = 'none';
                        flash.style.transition = 'opacity 0.8s ease-out';
                        document.body.appendChild(flash);
                        
                        setTimeout(() => { flash.style.opacity = '0'; }, 100);
                        setTimeout(() => { flash.remove(); }, 900);
                    }
                }

                // Update UI only on first load or remote change
                if (isFirstLoad || docSnap.metadata.hasPendingWrites === false) {
                    titleInput.value = data.title || "";
                    if (data.subtitle && data.subtitle.startsWith('v')) {
                        versionInput.value = data.subtitle.substring(1);
                    } else {
                        versionInput.value = data.subtitle || "0.1";
                    }
                    if (data.date) {
                        dateInput.value = data.date;
                    }
                    if (data.glassOpacity !== undefined) {
                        glassSlider.value = data.glassOpacity;
                        const event = new Event('input', { bubbles: true });
                        glassSlider.dispatchEvent(event);
                    }
                    
                    projectData.activity = data.activity || {};
                    if (Object.keys(projectData.activity).length === 0) {
                        const today = new Date().toISOString().split('T')[0];
                        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                        const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];
                        projectData.activity = {
                            [twoDaysAgo]: { user: 2, ai: 0 },
                            [yesterday]: { user: 5, ai: 2 },
                            [today]: { user: 12, ai: 4 }
                        };
                    }
                    renderHeatmap(projectData.activity);

                    editorContent.innerHTML = data.content || "";
                    
                    // --- AUTO-FIX: Usuwamy '#' ze starych nagłówków ---
                    const headings = editorContent.querySelectorAll('.module-heading');
                    let removedHash = false;
                    headings.forEach(h => {
                        let text = h.textContent.trim();
                        if (text.startsWith('#')) {
                            h.textContent = text.replace(/^#\s*/, '');
                            removedHash = true;
                        }
                    });
                    if (removedHash) {
                        setTimeout(initProject, 1000);
                    }

                    // --- DATA MIGRATION: Convert legacy inline styles to new CSS classes ---
                    const oldKpis = editorContent.querySelectorAll('div[style*="display: flex"]');
                    oldKpis.forEach(kpi => {
                        if (kpi.querySelector('input[type="checkbox"]')) {
                            kpi.removeAttribute('style');
                            kpi.className = 'block-kpi';
                            const spans = kpi.querySelectorAll('span');
                            let text = "";
                            spans.forEach(s => text += s.textContent.replace(/\\n/g, ' '));
                            kpi.innerHTML = `<input type="checkbox"><span>${text.trim() || 'Zadanie / KPI...'}</span>`;
                        }
                    });

                    // MIGRATION: Clean up nested or empty KPIs
                    const allKpis = editorContent.querySelectorAll('.block-kpi');
                    allKpis.forEach(kpi => {
                        const kpiText = kpi.textContent.trim();
                        if (kpiText === '') {
                            kpi.remove(); // Remove empty checkboxes generated by bug
                            return;
                        }
                        if (kpi.querySelector('.block-kpi')) {
                            // Flatten checkbox inside checkbox
                            kpi.innerHTML = `<input type="checkbox"><span>${kpiText}</span>`;
                        }
                    });
                    
                    // Podpięcie zdarzeń rozciągania do wczytanych obrazów
                    rehydrateImages();
                    
                    lastCharCount = editorContent.innerText.length;
                    lastCheckedCount = editorContent.querySelectorAll('input[type="checkbox"]:checked').length;
                }
            } else {
                const oldNotes = editorContent.querySelectorAll('div[style*="rgba(245, 166, 35, 0.1)"]');
                oldNotes.forEach(note => {
                    note.removeAttribute('style');
                    note.className = 'block-note';
                });
                // -----------------------------------------------------------------------

                updateProgress();
            }
            isFirstLoad = false;
        });
    } catch (e) {
        console.error("Błąd podczas ładowania projektu:", e);
    }
}

// Init
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

if (projectId) {
    currentProjectId = projectId;
    document.getElementById('btn-init-project').textContent = '[ UPDATE PROJECT ]';
    loadProject(projectId);
} else {
    updateProgress();
}

function renderHeatmap(activityData) {
    const dumpDisplay = document.getElementById('project-activity-dump');
    const hmContainer = document.getElementById('activity-heatmap');
    if (!dumpDisplay || !hmContainer) return;

    // 1. Render JSON dump
    const todayStr = new Date().toISOString().split('T')[0];
    const todayData = activityData[todayStr] || { ideas: 0, completions: 0 };
    const ideas = todayData.ideas || todayData.user || 0;
    const comps = todayData.completions || todayData.ai || 0;
    dumpDisplay.value = `{ '${todayStr}': { ideas: ${ideas}, completions: ${comps} } }`;

    // 2. Render Heatmap Squares (90 days timeline)
    hmContainer.innerHTML = '';
    
    // We create 3 rows
    for (let r = 0; r < 3; r++) {
        const row = document.createElement('div');
        row.className = 'hm-row';
        
        for (let c = 0; c < 30; c++) {
            const daysAgo = 89 - (c * 3 + r);
            const d = new Date();
            d.setDate(d.getDate() - daysAgo);
            const dateStr = d.toISOString().split('T')[0];
            const dayData = activityData[dateStr] || { ideas: 0, completions: 0 };
            
            const cell = document.createElement('div');
            cell.className = 'hm-cell';
            cell.title = dateStr;
            
            const i = dayData.ideas || dayData.user || 0;
            const comp = dayData.completions || dayData.ai || 0;
            const total = i + comp;
            
            if (total === 0) {
                cell.style.background = 'rgba(255,255,255,0.05)';
            } else {
                let val = 1;
                if (total > 3) val = 2;
                if (total > 8) val = 3;
                if (total > 15) val = 4;
                
                const opacities = [0, 0.2, 0.5, 0.8, 1.0];
                // Jeśli realizacje stanowią przynajmniej 30% ideacji (i są > 0), to wybijamy na Magentę
                const isHot = comp > 0 && (comp >= (i * 0.3));
                const rgb = isHot ? '232,25,122' : '0,201,200'; // Magenta : Teal
                
                cell.style.background = `rgba(${rgb}, ${opacities[val]})`;
                if (val === 4) cell.style.boxShadow = `0 0 6px rgba(${rgb}, 0.9)`;
            }
            row.appendChild(cell);
        }
        hmContainer.appendChild(row);
    }
}

// --- MARKDOWN EXPORT / IMPORT ---
document.getElementById('btn-export-md').addEventListener('click', () => {
    const mdString = serializeToMarkdown(editorContent);
    const title = titleInput.value || 'Kreator_Project';
    const version = versionInput.value || 'v0.1';
    const filename = `${title.replace(/\s+/g, '_')}_${version}.md`;
    
    const blob = new Blob([mdString], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

const importModal = document.getElementById('import-md-modal');
const importTextArea = document.getElementById('import-md-textarea');

document.getElementById('btn-import-md').addEventListener('click', () => {
    importModal.style.display = 'flex';
});

document.getElementById('btn-close-import-modal').addEventListener('click', () => {
    importModal.style.display = 'none';
    importTextArea.value = '';
});

document.getElementById('btn-import-md-file').addEventListener('click', () => {
    importModal.style.display = 'none';
    document.getElementById('file-import-md').click();
});

document.getElementById('btn-import-md-text').addEventListener('click', () => {
    const mdString = importTextArea.value;
    if (!mdString.trim()) {
        alert("Wklej najpierw kod Markdown.");
        return;
    }
    const newHtml = parseFromMarkdown(mdString);
    editorContent.innerHTML = newHtml;
    updateProgress();
    
    importModal.style.display = 'none';
    importTextArea.value = '';
    
    if (currentProjectId || titleInput.value) {
        initProject(); 
    }
});

document.getElementById('file-import-md').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const mdString = e.target.result;
        const newHtml = parseFromMarkdown(mdString);
        editorContent.innerHTML = newHtml;
        updateProgress();
        
        // Zapisz od razu do Firebase jeśli to istniejący projekt
        if (currentProjectId) {
            initProject(); 
        } else if (titleInput.value) {
            initProject();
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset, żeby można było wgrać ten sam plik ponownie
});

