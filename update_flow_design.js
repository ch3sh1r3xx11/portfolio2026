const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function updateProject() {
    const docRef = db.collection('projects').doc('jLpBepj7Mbleh9TPdJGz');
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
        console.log("Nie ma takiego dokumentu!");
        return;
    }

    const data = docSnap.data();
    const newHtml = `
<h1 class="font-editorial font-bold mb-2 mt-8 text-2xl" id="aktualizacja-ai-sync">Aktualizacja po burzy mózgów (AI Sync)</h1>
<p class="my-2"><strong>Złote Zasady Flow Design:</strong></p>
<ul class="marker:text-quiet list-none pl-0">
  <li class="flex items-start mb-2"><span class="mr-2 mt-1 text-teal" style="color: var(--teal);">☑</span><div><strong>Pragmatyzm technologiczny:</strong> Zostajemy przy HTML/Vanilla JS dla maksymalnej szybkości prototypowania. Bez ciężkich animacji, priorytetem jest "lekkie i szybkie" działanie.</div></li>
  <li class="flex items-start mb-2"><span class="mr-2 mt-1 text-teal" style="color: var(--teal);">☑</span><div><strong>Kradzież od najlepszych:</strong> Kopiujemy parametry wizualne (promienie zaokrągleń, blur) 1:1 z Apple Freeform, iOS Notes i iNode. Dowiezienie jest ważniejsze od wymyślania koła na nowo.</div></li>
  <li class="flex items-start mb-2"><span class="mr-2 mt-1 text-magenta" style="color: var(--magenta);">☑</span><div><strong>System Dynamicznych Kolorów (Genialny UX):</strong> Zamiast ręcznie wybierać kolory, cały interfejs (Design Tokens) adaptuje się do wybranej przez użytkownika Tapety. System wyciąga z obrazka 2 dominujące kolory i wstrzykuje jako zmienne globalne.</div></li>
</ul>
<blockquote class="border-l-4 pl-4 italic my-4 text-white-dim" style="border-color: var(--magenta); background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">Flow to brak oporu. Flow Design to system, który uwalnia mózg od decyzji projektowych, aby w 100% skupić się na łapaniu myśli i kreatywności.</blockquote>
`;

    // Append to content
    const updatedContent = (data.content || '') + newHtml;
    
    // Auto-update subtitle (version) if user wants to keep track of updates
    // Let's set it to v0.2 since we added major principles
    await docRef.update({
        content: updatedContent,
        subtitle: 'v0.2',
        updatedAt: new Date().toISOString()
    });

    console.log("Zaktualizowano projekt Flow Design! (zmieniono na v0.2)");
}

updateProject();
