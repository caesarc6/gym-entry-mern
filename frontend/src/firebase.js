import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCNGYG4heawizIpriTNNL2jQVxVxaUzIcw",
  authDomain: "ethereal-gains.firebaseapp.com",
  projectId: "ethereal-gains",
  storageBucket: "ethereal-gains.appspot.com",
  messagingSenderId: "17220333763",
  appId: "1:17220333763:web:5e604030191e6cb3657276",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
