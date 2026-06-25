// State
let currentStep = 1;
const totalSteps = 4;
let projectData = {
    chaos: "",
    smartAnalysis: null,
    title: "",
    content: ""
};

// Elements
const progressBar = document.getElementById('progressBar');
const stepIndicator = document.getElementById('step-indicator');

// Steps navigation
function updateProgress() {
    const percent = (currentStep / totalSteps) * 100;
    document.getElementById('progress-bar').style.width = percent + '%';
    
    const stepNames = ["Incepcja", "Skan SMART", "Charter", "Podsumowanie"];
    stepIndicator.textContent = `Krok ${currentStep}: ${stepNames[currentStep-1]}`;
}

function nextStep(step) {
    // Save data before leaving step
    if (currentStep === 1) {
        projectData.chaos = document.getElementById('chaos-input').value;
        if (step === 2) runSmartAnalysis();
    } else if (currentStep === 3) {
        projectData.title = document.getElementById('project-title').value;
        projectData.content = document.getElementById('editor-content').innerHTML;
        if (step === 4) generateSummary();
    }

    // UI transition
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById('step-' + step).classList.add('active');
    
    currentStep = step;
    updateProgress();
}

// SMART Analysis Mock
function runSmartAnalysis() {
    const container = document.getElementById('smart-analysis-container');
    const input = projectData.chaos;
    
    if (!input || input.trim().length < 10) {
        container.innerHTML = `
            <div class="smart-criterion">
                <div class="smart-letter">!</div>
                <div>
                    <h3 style="color: var(--white); margin-bottom: 0.5rem">Brak wystarczających danych</h3>
                    <p class="smart-warning">Wprowadź więcej szczegółów w kroku 1, aby system mógł przeprowadzić analizę.</p>
                </div>
            </div>`;
        return;
    }

    // Mock analysis (in real app, this goes to an LLM endpoint)
    container.innerHTML = `
        <div class="smart-criterion">
            <div class="smart-letter">S</div>
            <div>
                <h3 style="color: var(--white); margin-bottom: 0.2rem">Specific (Skonkretyzowany)</h3>
                <p style="color: var(--white-dim)">Cel wydaje się w miarę jasny, ale brakuje ścisłego zakresu.</p>
                <div class="smart-status smart-warning">WARNING: Zbyt ogólne pojęcia.</div>
            </div>
        </div>
        <div class="smart-criterion">
            <div class="smart-letter">M</div>
            <div>
                <h3 style="color: var(--white); margin-bottom: 0.2rem">Measurable (Mierzalny)</h3>
                <p style="color: var(--white-dim)">Nie zdefiniowano metryk sukcesu.</p>
                <div class="smart-status smart-warning">WARNING: Jak poznasz, że projekt się udał?</div>
            </div>
        </div>
        <div class="smart-criterion">
            <div class="smart-letter">A</div>
            <div>
                <h3 style="color: var(--white); margin-bottom: 0.2rem">Achievable (Osiągalny)</h3>
                <p style="color: var(--white-dim)">Wymaga weryfikacji dostępnych zasobów.</p>
                <div class="smart-status" style="color: #4CAF50">OK: Wygląda na realny.</div>
            </div>
        </div>
        <div class="smart-criterion">
            <div class="smart-letter">R</div>
            <div>
                <h3 style="color: var(--white); margin-bottom: 0.2rem">Relevant (Istotny)</h3>
                <p style="color: var(--white-dim)">Rozwiązuje realny problem raportowania.</p>
                <div class="smart-status" style="color: #4CAF50">OK: Duża wartość biznesowa.</div>
            </div>
        </div>
        <div class="smart-criterion">
            <div class="smart-letter">T</div>
            <div>
                <h3 style="color: var(--white); margin-bottom: 0.2rem">Time-bound (Określony w czasie)</h3>
                <p style="color: var(--white-dim)">Brak jakichkolwiek ram czasowych.</p>
                <div class="smart-status smart-warning">WARNING: Dodaj kamienie milowe i ostateczny deadline.</div>
            </div>
        </div>
    `;
}

// Notion-style Editor Logic
const editorContent = document.getElementById('editor-content');
const trigger = document.getElementById('block-menu-trigger');
const menu = document.getElementById('block-menu');

editorContent.addEventListener('keyup', (e) => {
    updateTriggerPosition();
});

editorContent.addEventListener('mouseup', () => {
    updateTriggerPosition();
});

function updateTriggerPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    // Tylko pokazujemy plusik, gdy edytor jest pusty lub jesteśmy w nowej, pustej linii
    const node = selection.focusNode;
    const text = node.textContent || "";
    
    if (text.trim() === "") {
        trigger.classList.remove('hidden');
        // Tu można by dokładnie pozycjonować przycisk do aktywnej linii, 
        // dla prostoty w tym prototypie po prostu się pokazuje.
    } else {
        trigger.classList.add('hidden');
        menu.classList.add('hidden');
    }
}

trigger.addEventListener('click', () => {
    menu.classList.toggle('hidden');
});

document.querySelectorAll('.block-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.closest('button').dataset.type;
        insertModule(type);
        menu.classList.add('hidden');
        trigger.classList.add('hidden');
    });
});

function insertModule(type) {
    const titles = {
        'resources': 'Zasoby i Zespół',
        'dependencies': 'Zależności i Blokery',
        'timeline': 'Harmonogram (Milestones)',
        'risks': 'Rejestr Ryzyk'
    };
    
    const colorClass = (type === 'resources' || type === 'timeline') ? 'teal' : 'magenta';
    
    const html = `
        <h2 class="module-heading ${colorClass}"># ${titles[type]}</h2>
        <div><br></div>
    `;
    
    document.execCommand('insertHTML', false, html);
    editorContent.focus();
}

// Summary Logic
function generateSummary() {
    const summaryPanel = document.getElementById('final-summary');
    
    // Parse the editor content to build a structured JSON representation
    let sectionsCount = 0;
    if (projectData.content.includes('<h2')) {
        sectionsCount = (projectData.content.match(/<h2/g) || []).length;
    }

    summaryPanel.innerHTML = `
        <h3 style="color: var(--teal); margin-bottom: 1rem">Weryfikacja Systemu:</h3>
        <p style="color: var(--white-dim); margin-bottom: 0.5rem"><strong>Nazwa:</strong> ${projectData.title || 'Untitled Project'}</p>
        <p style="color: var(--white-dim); margin-bottom: 0.5rem"><strong>Moduły:</strong> Znaleziono ${sectionsCount} ustrukturyzowanych modułów.</p>
        <p style="color: var(--white-dim); margin-bottom: 2rem"><strong>Status:</strong> Walidacja w locie poprawna. Gotowy do kompilacji.</p>
        <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 4px; color: var(--magenta); font-size: 0.8rem; overflow-x: auto;">
{
  "title": "${projectData.title || 'Untitled'}",
  "modulesCount": ${sectionsCount},
  "status": "INITIALIZED",
  "timestamp": "${new Date().toISOString()}"
}
        </pre>
    `;
}

function initProject() {
    // Save to LocalStorage for Portfolio Heatmap to pick up
    let activityLog = JSON.parse(localStorage.getItem('pm_activity_log')) || [];
    activityLog.push({
        type: 'project_created',
        title: projectData.title || 'Nowy Projekt',
        date: new Date().toISOString()
    });
    localStorage.setItem('pm_activity_log', JSON.stringify(activityLog));

    alert("Projekt został zainicjalizowany i zapisany w systemie! (Tu nastąpiłoby przekierowanie do Projektownika)");
    window.location.href = "../portfolio/index.html"; // Przekierowanie do dashboardu/heatmapy
}

// Initialize progress
updateProgress();
