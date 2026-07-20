import { auth, db } from "./firebase-config.js";


import {
signInWithEmailAndPassword
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";



import {
doc,
getDoc
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





window.login = async function(){


let email =
document.getElementById("email").value.trim();


let password =
document.getElementById("password").value.trim();




if(!email || !password){


alert("❌ Email and Password required");

return;


}




try{


const result =
await signInWithEmailAndPassword(

auth,

email,

password

);



const user =
result.user;




// CHECK ADMIN


if(
email === "admin@gmail.com"
){


alert("👑 Admin Login Successful");


location.href =
"admin-dashboard.html";


return;


}





// CHECK USER PROFILE


const userRef =
doc(
db,
"users",
user.uid
);



const snap =
await getDoc(userRef);




if(!snap.exists()){


alert(
"Profile not found. Please Signup first"
);


return;


}





alert("✅ Login Successful");


location.href =
"index.html";



}

catch(error){


console.log(error);


alert(
"❌ Wrong Email or Password"
);


}



};