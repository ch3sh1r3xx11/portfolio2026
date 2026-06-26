const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function find() {
    const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').limit(3).get();
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log("ID:", doc.id, "Tytuł:", data.title);
    });
}

find();
