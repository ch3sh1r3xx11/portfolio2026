const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function dump() {
    const snapshot = await db.collection('notes').get();
    let md = "";
    snapshot.forEach(doc => {
        const data = doc.data();
        // If it's a KPI or Text block that looks like part of "Projektownik"
        md += `\n# ${data.title || data.type || 'Brak Tytułu'}\n`;
        if (data.content) {
            md += data.content.replace(/<div>/g, '\n').replace(/<\/div>/g, '').replace(/<br>/g, '\n') + '\n';
        }
        if (data.type === 'kpi' && Array.isArray(data.tasks)) {
            data.tasks.forEach(t => {
                md += `- [${t.done ? 'x' : ' '}] ${t.text}\n`;
            });
        }
    });
    fs.writeFileSync('projektownik_export.md', md);
    console.log("Zapisano do projektownik_export.md");
}

dump();
