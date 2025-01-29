// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNGYG4heawizIpriTNNL2jQVxVxaUzIcw",
  authDomain: "ethereal-gains.firebaseapp.com",
  projectId: "ethereal-gains",
  storageBucket: "ethereal-gains.appspot.com",
  messagingSenderId: "17220333763",
  appId: "1:17220333763:web:5e604030191e6cb3657276",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { firestore, storage };
