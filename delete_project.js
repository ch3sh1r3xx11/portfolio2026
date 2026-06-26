const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function deleteProject() {
    try {
        const snapshot = await db.collection('projects').get();
        if (snapshot.empty) {
            console.log('No documents found.');
            return;
        }

        let deleted = false;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.title && data.title.includes('System Operacyjny 2026')) {
                console.log(`Deleting document ${doc.id} with title: ${data.title}`);
                await db.collection('projects').doc(doc.id).delete();
                deleted = true;
            }
        }
        
        if (!deleted) {
            console.log('Could not find project "System Operacyjny 2026".');
        } else {
            console.log('Project successfully deleted.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

deleteProject().then(() => setTimeout(() => process.exit(0), 2000));
