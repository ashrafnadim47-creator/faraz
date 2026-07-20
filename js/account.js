import { auth, db } from "./firebase-config.js";


import {

onAuthStateChanged,
signOut

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {

doc,
setDoc

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





const userBox =
document.getElementById("user-info");




onAuthStateChanged(auth, async(user)=>{


if(user){


userBox.innerHTML = `

<h2>
Welcome 👋
</h2>

<p>
${user.email}
</p>

`;


// Save user profile in Firestore

await setDoc(

doc(db,"users",user.uid),

{

email:user.email,

createdAt:new Date()

}

);



}

else{


location.href="login.html";


}



});





window.logout = async function(){


await signOut(auth);


alert("Logout Successfully");


location.href="login.html";


}
document
.getElementById("logout-btn")
?.addEventListener("click", logout);
async function logout(){

await signOut(auth);

alert("Logout Successfully");

location.href="login.html";

}