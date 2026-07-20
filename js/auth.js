import { auth } from "./firebase-config.js";


import {
signInWithEmailAndPassword
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";



const btn =
document.getElementById("login-btn");




if(btn){


btn.onclick = async()=>{


const email =
document.getElementById("email").value.trim();


const password =
document.getElementById("password").value.trim();





if(!email || !password){


alert("❌ Email and Password required");

return;


}



try{


await signInWithEmailAndPassword(

auth,

email,

password

);



alert("✅ Login Successful");


location.href="index.html";



}

catch(error){


console.log(error);


alert(
"❌ Wrong Email or Password"
);


}



};


}