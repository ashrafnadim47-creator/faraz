import {auth, db} from "./firebase-config.js";


import {

onAuthStateChanged

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {

doc,
getDoc,
updateDoc,
setDoc,
serverTimestamp

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




const timer =
document.getElementById("mission-timer");



let reset =
localStorage.getItem("missionReset");





// TIMER


function timerStart(){


if(!reset){


let date =
new Date();


date.setHours(
date.getHours()+24
);



reset =
date.getTime();



localStorage.setItem(
"missionReset",
reset
);


}




let now =
Date.now();



let diff =
reset-now;



if(diff<=0){


localStorage.removeItem(
"missionReset"
);


location.reload();


return;


}




let h =
Math.floor(
diff/(1000*60*60)
);



let m =
Math.floor(
(diff%(1000*60*60))/(1000*60)
);



let s =
Math.floor(
(diff%(1000*60))/1000
);





if(timer){


timer.innerHTML =
`
⏳ Reset In 
${h}h ${m}m ${s}s
`;

}


}



setInterval(timerStart,1000);


document.querySelectorAll(".claim")
.forEach(btn=>{

btn.onclick=()=>{

let code = btn.dataset.reward;

let lastClaim = localStorage.getItem(
"missionClaimTime"
);


// 24 hour check

if(lastClaim){

let diff = Date.now() - Number(lastClaim);

let day = 24 * 60 * 60 * 1000;


if(diff < day){

alert("⏳ You already claimed today's mission reward!");

return;

}

}



// save claim time

localStorage.setItem(
"missionClaimTime",
Date.now()
);





let coupons =
JSON.parse(
localStorage.getItem("coupons")
)||[];




if(!coupons.includes(code)){


coupons.push(code);


localStorage.setItem(
"coupons",
JSON.stringify(coupons)
);


alert(
"🎉 Coupon Added: "+code
);


}




btn.innerHTML="✅ Claimed";

btn.disabled=true;


};

});


















const code =
btn.dataset.reward;



const points =
Number(
btn.dataset.points || 10
);





const userRef =
doc(
db,
"users",
user.uid
);




const snap =
await getDoc(userRef);





let oldPoints = 0;



if(snap.exists()){


oldPoints =
snap.data().points || 0;


}






await updateDoc(

userRef,

{


points:
oldPoints + points,


lastMission:
serverTimestamp()


}

);





// SAVE COUPON


await setDoc(

doc(
db,
"users",
user.uid,
"coupons",
code

),

{


code:code,


createdAt:
serverTimestamp()


}

);





{

alert(
`🎉 +${points} Points Added`
);



btn.innerHTML =
"✅ Claimed";


btn.disabled=true;



}