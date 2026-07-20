import { auth, db } from "./firebase-config.js";

import { 
onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
doc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


onAuthStateChanged(auth, async(user)=>{


if(!user){

location.href="admin-login.html";
return;

}


let adminDoc = await getDoc(
doc(db,"admins",user.uid)
);


if(!adminDoc.exists()){

alert("Access Denied");

location.href="index.html";

}


});