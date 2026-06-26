const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = require('C:\\Users\\polom\\.gemini\\config\\firebase-service-account.json');

const app = initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function updateProject() {
    try {
        const dataPath = 'C:\\Users\\polom\\.gemini\\config\\skills\\firebase-project-updater\\temp_project_data.json';
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        const docId = data.name.split('/').pop();
        
        await db.collection('projects').doc(docId).update({
            content: data.content,
            subtitle: data.version
        });
        
        console.log(`Successfully updated project document ${docId} to version ${data.version}`);
    } catch (e) {
        console.error('Error:', e);
    }
}

updateProject().then(() => process.exit(0));
