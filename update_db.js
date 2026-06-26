const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateProject() {
  const ref = db.collection('projects').doc('jLpBepj7Mbleh9TPdJGz');
  const docSnap = await ref.get();
  let content = docSnap.data().content || '';

  const newHtml = `
    <h2>Faza 1 MVP (Agile) - Zmiana zakresu (26.06.2026)</h2>
    <p>Postanowiliśmy obciąć (scope down) skomplikowaną funkcję "zagnieżdżania notatek wewnątrz pływających bloków" (tzw. foldery na sterydach) na rzecz szybszego dostarczenia podstawowej wartości biznesowej w podejściu Agile.</p>
    <ul>
      <li><strong>Obecny problem:</strong> Zdarzenia kliknięć znikają w interfejsie. Flowbar napotkał błędy wywoływane konfliktem Web Componentów i globalnych zdarzeń (np. Infinite Canvas).</li>
      <li><strong>Rozwiązanie 1:</strong> Rezygnujemy z chowania nasłuchiwania w Shadow DOM/Web Components. Przepisujemy podpinanie zdarzeń menu klocków (wprost do document), co uodporni je na wszelkie konflikty warstw interfejsu (takie jak <code>mousedown</code> z płótna).</li>
      <li><strong>Rozwiązanie 2:</strong> Blok (np. Wizja) staje się edytorem tekstowym sam w sobie. Zamiast wrzucać do niego notatki, użytkownik w Projektowniku pisze z palca wnioski (patrząc na rozrzucone wokół zdjęcia), a system dwukierunkowo synchronizuje sam ten tekst z Kreatorem.</li>
    </ul>
    <p>To pozwoli nam wreszcie sprawdzić ideę "Cross-Platform Blocks" w praniu i uniknąć "development hell".</p>
  `;

  await ref.update({
    content: content + newHtml,
    subtitle: 'Wersja Agile - Edytor Tekstu Bloków'
  });
  console.log('Project updated successfully!');
}

updateProject().catch(console.error);
