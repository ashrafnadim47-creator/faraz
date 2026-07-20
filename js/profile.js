import {auth,db} from "./firebase-config.js";


import {
onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
doc,
getDoc,
collection,
getDocs
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





onAuthStateChanged(auth,async(user)=>{


if(!user){

location.href="login.html";

return;

}



try{


const userRef =
doc(
db,
"users",
user.uid
);



const snap =
await getDoc(userRef);



let data = {};



if(snap.exists()){

data = snap.data();

}






// BASIC INFO


const name =
document.getElementById("user-name");


const email =
document.getElementById("user-email");


const points =
document.getElementById("user-points");





if(name)

name.innerHTML =
data.name || user.displayName || "Faraz User";




if(email)

email.innerHTML =
data.email || user.email;




if(points)

points.innerHTML =
data.points || 0;







// PROFILE IMAGE


const image =
document.getElementById("profile-image");



if(image){


image.src =
data.photo ||
user.photoURL ||
"images/user.png";


}







// ORDER COUNT


const orderBox =
document.getElementById("order-count");



if(orderBox){


const orders =
await getDocs(

collection(
db,
"users",
user.uid,
"orders"

)

);



orderBox.innerHTML =
orders.size;


}







// WISHLIST COUNT


const wishBox =
document.getElementById("wishlist-count");



if(wishBox){


const wishlist =
await getDocs(

collection(
db,
"users",
user.uid,
"wishlist"

)

);



wishBox.innerHTML =
wishlist.size;


}





}

catch(error){


console.log(error);


}



});
import {
signOut
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


document.getElementById("logout-btn").onclick=async()=>{

await signOut(auth);

alert("Logout Successful");

location.href="login.html";

}

// --- DYNAMIC DIAMOND SYNC LOGIC FOR PROFILE ---
window.addEventListener('DOMContentLoaded', () => {
    // Faded Wheel ke local engine se balance nikalte hain
    const savedWallet = localStorage.getItem('fw_persist_wallet');
    const profileWalletText = document.getElementById('profile-diamonds'); 
    
    if (profileWalletText) {
        if (savedWallet !== null) {
            profileWalletText.innerText = savedWallet;
        } else {
            profileWalletText.innerText = "0"; // Agar pehle kabhi spin nahi khela toh 0 dikhega
        }
    }
});