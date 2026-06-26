const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function fix() {
    const docRef = db.collection('projects').doc('jLpBepj7Mbleh9TPdJGz');
    const docSnap = await docRef.get();
    
    let content = docSnap.data().content || '';
    
    // We will strip out the bad HTML we added before.
    // The bad HTML started with: <h1 class="font-editorial font-bold mb-2 mt-8 text-2xl" id="aktualizacja-ai-sync">
    const badHtmlStart = content.indexOf('<h1 class="font-editorial font-bold mb-2 mt-8 text-2xl" id="aktualizacja-ai-sync">');
    
    if (badHtmlStart !== -1) {
        content = content.substring(0, badHtmlStart);
    }

    // Now we create a SINGLE block <div> that contains everything, with round alternating checkboxes
    const newBlock = `
<div style="background: rgba(29, 44, 55, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin-top: 20px; color: var(--white);">
  <h2 class="font-editorial font-bold mb-4 text-2xl" style="color: var(--white); margin-top: 0;">Aktualizacja po burzy mózgów (AI Sync)</h2>
  <p class="mb-4" style="color: var(--white-dim);"><strong>Złote Zasady Flow Design:</strong></p>
  
  <ul style="list-style: none; padding-left: 0; margin-bottom: 20px;">
    <li style="display: flex; align-items: flex-start; margin-bottom: 12px;">
      <span style="color: var(--teal); margin-right: 12px; font-size: 1.2em;">〇</span>
      <div><strong>Pragmatyzm technologiczny:</strong> Zostajemy przy HTML/Vanilla JS. Zero ciężkich animacji, priorytetem jest lekkie i szybkie działanie.</div>
    </li>
    <li style="display: flex; align-items: flex-start; margin-bottom: 12px;">
      <span style="color: var(--magenta); margin-right: 12px; font-size: 1.2em;">〇</span>
      <div><strong>Kradzież od najlepszych:</strong> Kopiujemy UI (promienie, blur) 1:1 z Apple Freeform i iOS Notes.</div>
    </li>
    <li style="display: flex; align-items: flex-start; margin-bottom: 12px;">
      <span style="color: var(--teal); margin-right: 12px; font-size: 1.2em;">〇</span>
      <div><strong>System Dynamicznych Kolorów:</strong> Interfejs adaptuje się do Tapety. System wyciąga 2 dominujące kolory i ustawia zmienne globalne.</div>
    </li>
    <li style="display: flex; align-items: flex-start; margin-bottom: 12px;">
      <span style="color: var(--magenta); margin-right: 12px; font-size: 1.2em;">〇</span>
      <div><strong>Okrągłe Checkboxy i Alteracja:</strong> Koła są lżejsze niż kwadraty. Sąsiadujące elementy (np. tagi, checkboxy) zawsze naprzemiennie zmieniają kolor, by nadać rytm interfejsowi.</div>
    </li>
  </ul>
  
  <div style="border-left: 4px solid var(--magenta); background: rgba(0,0,0,0.2); padding: 15px; border-radius: 4px; font-style: italic; color: var(--white-dim);">
    Flow to brak oporu. Flow Design to system, który uwalnia mózg od decyzji projektowych, aby w 100% skupić się na łapaniu myśli i kreatywności.
  </div>
</div>
`;

    content += newBlock;

    await docRef.update({
        content: content,
        subtitle: 'v0.3',
        updatedAt: new Date().toISOString()
    });

    console.log("Projekt naprawiony i zaktualizowany do v0.3!");
}

fix();
