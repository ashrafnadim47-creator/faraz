import { db } from "./firebase-config.js";


import {

collection,
query,
orderBy,
limit,
getDocs

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



const box =
document.getElementById("leaderboard-box");



async function loadLeaderboard(){


try{


const q =
query(

collection(db,"users"),

orderBy(
"xp",
"desc"
),

limit(10)

);



const snap =
await getDocs(q);



box.innerHTML="";



let rank=1;



snap.forEach((user)=>{


const data =
user.data();



let xp =
data.xp || 0;



let level =
Math.floor(xp / 1000) + 1;



let badge="";


if(rank===1){

badge="🥇";

}

else if(rank===2){

badge="🥈";

}

else if(rank===3){

badge="🥉";

}

else{

badge="🏅";

}




box.innerHTML += `

<div class="leader-card">


<h2>

${badge} #${rank}

</h2>


<h3>

${data.email || "Faraz User"}

</h3>


<p>

⭐ XP : ${xp}

</p>


<p>

🎮 Level : ${level}

</p>



</div>

`;



rank++;



});



}

catch(error){


console.log(error);


box.innerHTML=
"❌ Leaderboard Error";


}



}



loadLeaderboard();