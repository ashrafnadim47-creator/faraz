import {auth,db} from "./firebase-config.js";


import {

onAuthStateChanged

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {

collection,
getDocs

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




const box =
document.getElementById("notification-list");



onAuthStateChanged(auth,async(user)=>{


if(!user){

location.href="login.html";

return;

}



let snap =
await getDocs(

collection(
db,
"users",
user.uid,
"notifications"

)

);



box.innerHTML="";



if(snap.empty){


box.innerHTML=
`
<h3>
No New Notifications 🔔
</h3>
`;

return;


}




snap.forEach((item)=>{


let data=item.data();



box.innerHTML +=

`

<div class="notify-box">


<h3>

${data.title}

</h3>


<p>

${data.message}

</p>


</div>


`;



});


});