import {auth, db} from "./firebase-config.js";


import {

createUserWithEmailAndPassword

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";



import {

doc,
setDoc,
serverTimestamp

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





const btn =
document.getElementById("signup-btn");





if(btn){


btn.onclick = async()=>{


const name =
document.getElementById("name").value.trim();



const email =
document.getElementById("email").value.trim();



const password =
document.getElementById("password").value.trim();





if(!name || !email || !password){


alert("❌ All fields required");

return;


}





try{



const userCredential =
await createUserWithEmailAndPassword(

auth,

email,

password

);



const user =
userCredential.user;





await setDoc(

doc(
db,
"users",
user.uid

),

{


name:name,


email:email,


points:0,


role:"user",


createdAt:
serverTimestamp()



}

);






alert("✅ Account Created Successfully");



location.href="index.html";



}



catch(error){



console.log(error);



alert(
"❌ "+error.message
);



}



};


}