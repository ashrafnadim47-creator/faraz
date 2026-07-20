import { auth, db } from "./firebase-config.js";


import {

doc,
getDoc,
updateDoc,
addDoc,
collection,
serverTimestamp

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {

onAuthStateChanged

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";



const xpCount =
document.getElementById("xp-count");


const message =
document.getElementById("message");


let uid=null;

let xp=0;



onAuthStateChanged(auth,async(user)=>{


if(!user){

location.href="login.html";

return;

}



uid=user.uid;



const snap =
await getDoc(

doc(db,"users",uid)

);



xp =
snap.data().xp || 0;



xpCount.innerHTML=xp;



});





window.exchangeReward =
async function(cost,reward){



if(xp < cost){


message.innerHTML =
"❌ Not enough XP";


return;

}




xp -= cost;



let userRef =
doc(db,"users",uid);



await updateDoc(userRef,{

xp:xp

});





await addDoc(

collection(db,"users",uid,"rewards"),

{

reward:reward,

xpUsed:cost,

createdAt:serverTimestamp()

}

);





message.innerHTML =
"✅ Reward Claimed: "+reward;



xpCount.innerHTML=xp;



}