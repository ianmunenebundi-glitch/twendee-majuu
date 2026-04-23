import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

/*
  REPLACE ALL VALUES BELOW WITH YOUR REAL FIREBASE WEB APP CONFIG
  You get this from:
  Firebase Console > Project Settings > Your apps > Web app
*/

const firebaseConfig = {
  apiKey: "AIzaSyDuk19ymmXm5B8rVlK0eE4pBjhhguo3f38",
  authDomain: "twendee-majuu.firebaseapp.com",
  projectId: "twendee-majuu",
  storageBucket: "twendee-majuu.firebasestorage.app",
  messagingSenderId: "533029287364",
  appId: "1:533029287364:web:e83bc9409b893f0579a091",
  measurementId: "G-V33D22H06K"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
