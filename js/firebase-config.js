const firebaseConfig = {
  apiKey: "AIzaSyBmkBpbd6qmUjvqeDHQNr3UnzqkF3rEuU4",
  authDomain: "dars-37cfc.firebaseapp.com",
  databaseURL: "https://dars-37cfc-default-rtdb.firebaseio.com",
  projectId: "dars-37cfc",
  storageBucket: "dars-37cfc.firebasestorage.app",
  messagingSenderId: "326668153390",
  appId: "1:326668153390:web:75d79be690847b828365bf",
  measurementId: "G-86TR5PY2SH"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
