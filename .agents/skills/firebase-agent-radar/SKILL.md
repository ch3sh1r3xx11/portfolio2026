---
name: firebase-agent-radar
description: Sets up a Node.js listener script to monitor a Firebase Firestore database for specific hashtags (e.g., #agy) and triggers the agent automatically.
---

# Firebase Agent Radar

This skill provides a robust template for creating a background Node.js process that listens to a Firestore database and wakes up the Antigravity agent when a user mentions a specific hashtag.

## Core Logic

1. **Initialization:** Use `firebase/app` and `firebase/firestore`.
2. **Listener:** Use `onSnapshot` to listen to a collection (e.g., `notes`).
3. **Deduplication:** Use a `Set` (e.g., `processedIds`) to store hashes of processed documents (e.g., `doc.id + "-" + fullText`) so the agent doesn't trigger repeatedly for old notes when the script restarts.
4. **Trigger Mechanism:** When a hashtag is detected in `change.type === "added"` or `"modified"`, print a specially formatted string to `stdout`.

## Code Template

```javascript
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

const firebaseConfig = { /* ... */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let initialLoad = true;
const processedIds = new Set();

onSnapshot(collection(db, "notes"), (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added" || change.type === "modified") {
      const data = change.doc.data();
      const content = data.content || "";
      const title = data.title || "";
      const fullText = (title + " " + content).toLowerCase();
      
      if ((fullText.includes("#agy") || fullText.includes("#agent")) && !data.deleted) {
          const versionHash = change.doc.id + "-" + fullText;
          if (!processedIds.has(versionHash)) {
              processedIds.add(versionHash);
              
              if (!initialLoad) {
                  // This specific format wakes up the agent!
                  console.log("\n=======================================================");
                  console.log("ANTIGRAVITY_WAKEUP_PROMPT: Użytkownik wezwał Cię z tablicy!");
                  console.log("Tytuł: " + title);
                  console.log("Zadanie: " + content);
                  console.log("=======================================================\n");
              }
          }
      }
    }
  });
  initialLoad = false;
});
```

## Best Practices
- Run this as a background task using the agent's task management tools.
- Never write to the database from this unauthenticated script if security rules block it; use it strictly as a read-only listener.
