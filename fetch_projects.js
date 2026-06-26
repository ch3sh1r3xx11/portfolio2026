const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function getProjects() {
  const snapshot = await db.collection('projects').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().title);
  });
}

getProjects().catch(console.error);
