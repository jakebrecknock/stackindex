
const firebaseConfig = {
  apiKey: "AIzaSyCHSnjqnMym6yIEsj5csHxRGD5Z4dPMU78",
  authDomain: "stackindex-da836.firebaseapp.com",
  projectId: "stackindex-da836",
  storageBucket: "stackindex-da836.firebasestorage.app",
  messagingSenderId: "1064883963561",
  appId: "1:1064883963561:web:05daa4e2753c57d4c98bb8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence enabled in first tab only');
        } else if (err.code == 'unimplemented') {
            console.log('Browser doesn\'t support persistence');
        }
    });

// Available tags for projects
const AVAILABLE_TAGS = [
    'Game', 'Tool', 'Website', 'Mobile App', 
    'AI/ML', 'Utility', 'Creative', 'Other'
];