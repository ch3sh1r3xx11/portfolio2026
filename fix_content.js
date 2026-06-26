const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function fixProject() {
    try {
        const docRef = db.collection('projects').doc('aFQNeSuWZHsfXYx3mBla');
        const doc = await docRef.get();
        if (!doc.exists) {
            console.log("Document not found");
            return;
        }
        
        let content = doc.data().content;

        // Remove the Zakres block note from Project Charter completely (or replace with original)
        // Original: "Zakres: Modułowe szklane karty..."
        const zakresRegex = /<div class="block-note"><strong>Zakres:<\/strong><br>- <strong>Web First[\s\S]*?Projektownika\.<\/div>/;
        content = content.replace(zakresRegex, '<div class="block-note"><strong>Zakres:</strong><br>- Modułowe "szklane karty" (glass-cards) kompatybilne w przód z mechaniką Projektownika<br>- Niestandardowa obsługa klawiatury (Enter/Backspace)<br>- Baza Firebase z synchronizacją na żywo (onSnapshot)<br>- Półprzezroczysty styl (dark/glassmorphism/magenta)<br>- Zewnętrzne SDK dla AI<br>- Eksport i import plików Markdown</div>');

        // Create the new Zakres glass card
        const newZakresCard = `<div class="glass-card" data-observed="true" style="transform: translate(0px, 0px); transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s, border-color 0.3s;">
  <h2 class="module-heading magenta" data-type="goal"># ZAKRES</h2>
  <div class="block-note"><strong>Web First (z myślą o Mobile):</strong><br>Robimy najpierw web z zachowaniem responsywności, testy mobile zostawiamy na później.</div>
  <div class="block-note"><strong>Kreator & Flow Motion First:</strong><br>Skupiamy się na nich jako poligonie testowym dla UI i mechanik.</div>
  <div class="block-note"><strong>Projektownik:</strong><br>Dopiero po testach UI/mechanik w Kreatorze, zaimplementujemy nowy silnik do Projektownika.</div>
<button class="card-delete-btn">x</button></div>`;

        // Insert newZakresCard before PROJECT CHARTER or after ROAD MAPA
        // Find the PROJECT CHARTER card and insert before it
        const projectCharterIndex = content.indexOf('<h2 class="module-heading magenta" data-type="goal"># PROJECT CHARTER</h2>');
        if (projectCharterIndex !== -1) {
            // Find the start of its glass-card
            const cardStartIndex = content.lastIndexOf('<div class="glass-card"', projectCharterIndex);
            content = content.slice(0, cardStartIndex) + newZakresCard + content.slice(cardStartIndex);
        } else {
            content += newZakresCard;
        }

        // Update AI comment
        const aiRegex = /<div class="block-ai"><strong>\[Antigravity AI\]:<\/strong>[\s\S]*?<\/div>/;
        const newAiComment = `<div class="block-ai"><strong>[Antigravity AI]:</strong> Utworzyłem dla Ciebie osobny szklany blok <strong># ZAKRES</strong>! Usprawniłem też integrację backendową, dzięki czemu nie musisz już nic wklejać. Baza Firebase została zaktualizowana automatycznie w tle. <br><br>Zarządzanie zakresem ogarnięte - co robimy teraz? Dopieszczamy <strong>feeling i UI Kreatora</strong>, czy bierzemy się za <strong>Import/Export do Markdown/PDF</strong>?</div>`;
        content = content.replace(aiRegex, newAiComment);

        await docRef.update({ content });
        console.log("Project fixed successfully!");
    } catch (e) {
        console.error('Error:', e);
    }
}

fixProject().then(() => process.exit(0));
