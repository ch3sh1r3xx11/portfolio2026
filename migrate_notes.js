const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateNotes() {
  const notesRef = db.collection('notes');
  const snapshot = await notesRef.get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.projectId) {
      await notesRef.doc(doc.id).update({
        projectId: 'jLpBepj7Mbleh9TPdJGz'
      });
      count++;
    }
  }
  console.log(`Migrated ${count} orphaned notes to Flow Design project.`);
}

migrateNotes().catch(console.error);
