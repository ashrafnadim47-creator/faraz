import {auth, db} from "./firebase-config.js";


import {
signInWithEmailAndPassword,
signOut
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
doc,
getDoc
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





const btn =
document.getElementById("admin-login-btn");





if(btn){



btn.onclick = async()=>{


const email =
document.getElementById("admin-email").value.trim();


const password =
document.getElementById("admin-password").value.trim();





if(!email || !password){


alert("❌ Email and Password Required");

return;


}




btn.innerHTML =
"Checking...";

btn.disabled = true;





try{



const login =
await signInWithEmailAndPassword(

auth,

email,

password

);




const uid =
login.user.uid;





const adminData =
await getDoc(

doc(
db,
"admins",
uid

)

);






if(adminData.exists()){



alert("👑 Admin Login Successful");



location.href =
"admin-dashboard.html";



}

else{



await signOut(auth);



alert("❌ Admin Access Denied");


btn.innerHTML =
"Login";

btn.disabled=false;


}



}



catch(error){



console.log(error);



alert(
"❌ Login Failed"
);



btn.innerHTML =
"Login";

btn.disabled=false;



}



};



}