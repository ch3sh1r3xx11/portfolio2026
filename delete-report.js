const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAtRYw7mPEIJkfaRyoPJZYQJDza0rA5FWM",
  authDomain: "projektownik2026.firebaseapp.com",
  projectId: "projektownik2026"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Szukam raportu...");
    const snap = await getDocs(collection(db, "reports"));
    let found = false;
    for (const d of snap.docs) {
        const data = d.data();
        if (data.title === "raport 26.06 uzupełniony") {
            console.log("Znaleziono ID:", d.id);
            await deleteDoc(doc(db, "reports", d.id));
            console.log("Usunieto!");
            found = true;
        }
    }
    if(!found) console.log("Nie znaleziono.");
    process.exit(0);
}

run();
