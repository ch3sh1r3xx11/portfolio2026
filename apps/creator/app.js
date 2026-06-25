import { db } from '/js/firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// State
let projectData = {
    title: "",
    version: "",
    content: ""
};

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


// --- GLASS SLIDER LOGIC ---
glassSlider.addEventListener('input', (e) => {
    const val = e.target.value; // 0 to 100
    const opacity = val / 100; // W górę (100) = max blur (1.0)
    document.documentElement.style.setProperty('--glass-opacity', opacity);
});


// --- NOTION-STYLE EDITOR LOGIC ---
editorContent.addEventListener('keyup', (e) => {
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
    const html = `<div style="background: rgba(245, 166, 35, 0.1); border-left: 2px solid #f5a623; padding: 1rem; margin: 1rem 0; color: #f5a623;">Nowa notatka...</div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    editorContent.focus();
});

document.getElementById('add-text-btn').addEventListener('click', () => {
    const html = `<p>Wpisz tekst tutaj...</p>`;
    document.execCommand('insertHTML', false, html);
    editorContent.focus();
});

document.getElementById('add-image-btn').addEventListener('click', () => {
    const html = `<div style="border: 1px dashed rgba(255,255,255,0.2); padding: 2rem; text-align: center; color: rgba(255,255,255,0.3); margin: 1rem 0; border-radius: 4px;">[ Miejsce na obraz ]</div><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    editorContent.focus();
});

document.getElementById('add-frame').addEventListener('click', () => {
    const html = `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 2rem 0;"><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    editorContent.focus();
});

document.getElementById('add-kpi').addEventListener('click', () => {
    const html = `<div style="display: flex; align-items: center; gap: 10px; margin: 0.5rem 0;"><input type="checkbox" style="accent-color: var(--teal); width: 16px; height: 16px;"><span style="color: var(--white-dim);">Zadanie / KPI...</span></div>`;
    document.execCommand('insertHTML', false, html);
    editorContent.focus();
});

function insertModule(type) {
    const titles = {
        'goal': 'Cel (SMART)',
        'resources': 'Zasoby i Zespół',
        'dependencies': 'Zależności i Blokery',
        'timeline': 'Harmonogram (Milestones)',
        'risks': 'Rejestr Ryzyk'
    };
    
    const colorClass = (type === 'resources' || type === 'timeline') ? 'teal' : 'magenta';
    
    // To cleanly insert, we use document.execCommand
    // Wstawiamy nagłówek i pusty div pod nim na treść
    const html = `
        <h2 class="module-heading ${colorClass}" data-type="${type}"># ${titles[type]}</h2>
        <div class="block-content"><br></div>
    `;
    
    document.execCommand('insertHTML', false, html);
    editorContent.focus();
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
async function initProject() {
    projectData.title = titleInput.value.trim();
    projectData.version = versionInput.value.trim();
    projectData.content = editorContent.innerHTML;
    
    if (!projectData.title) {
        alert("Podaj przynajmniej nazwę projektu przed inicjalizacją.");
        titleInput.focus();
        return;
    }

    try {
        await addDoc(collection(db, "projects"), {
            title: projectData.title,
            subtitle: `v${projectData.version || '0.1'}`,
            isPublished: true,
            themeColor: "magenta",
            date: dateInput.value,
            content: projectData.content,
            createdAt: new Date().toISOString()
        });

        // Animacja flasha całego ekranu
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.inset = '0';
        flash.style.background = 'var(--magenta)';
        flash.style.zIndex = '9999';
        flash.style.transition = 'opacity 0.5s ease';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                window.location.href = "/"; // Powrót na stronę główną
            }, 500);
        }, 100);
    } catch (e) {
        console.error("Błąd zapisu do Firestore:", e);
        alert("Wystąpił błąd podczas inicjalizowania projektu. Sprawdź konsolę.");
    }
}

document.getElementById('btn-init-project').addEventListener('click', initProject);

// Init
updateProgress();
