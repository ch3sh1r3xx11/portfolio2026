const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../config/firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function readProject(projectId) {
    try {
        const doc = await db.collection('projects').doc(projectId).get();
        if (!doc.exists) {
            console.log('No such document!');
            return;
        }
        const data = doc.data();
        fs.writeFileSync('payload_read.html', data.content);
        console.log('Project content saved to payload_read.html');
    } catch (e) {
        console.error('Error:', e);
    }
}

readProject('aFQNeSuWZHsfXYx3mBla').then(() => process.exit(0));
