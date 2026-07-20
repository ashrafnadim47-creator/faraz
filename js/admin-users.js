import {db} from "./firebase-config.js";


import {

collection,
getDocs,
updateDoc,
doc

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





const box =
document.getElementById("user-list");





async function loadUsers(){



box.innerHTML =
`
<h3>
Loading Users...
</h3>
`;




try{


const snap =
await getDocs(

collection(
db,
"users"

)

);




box.innerHTML="";





if(snap.empty){


box.innerHTML =
`
<h2>
No Users Found
</h2>
`;

return;


}






snap.forEach((item)=>{



const user =
item.data();



box.innerHTML +=



`

<div class="user-admin-card">



<h2>

👤 ${user.name || "User"}

</h2>



<p>

📧 ${user.email}

</p>



<p>

⭐ Points:

<b id="points-${item.id}">

${user.points || 0}

</b>

</p>





<input

id="add-${item.id}"

type="number"

placeholder="Add Points"

>





<button

onclick="addPoints('${item.id}')"

>

➕ Add Points

</button>



</div>


`;



});



}

catch(error){


console.log(error);



box.innerHTML =
`
<h2>
❌ Failed To Load Users
</h2>
`;



}



}







window.addPoints =
async function(uid){



let input =
document.getElementById(
"add-"+uid
);



let value =
Number(input.value);



if(!value){


alert(
"Enter Points"
);


return;


}





const ref =
doc(
db,
"users",
uid
);





const snap =
await getDocs(
collection(db,"users")
);





let oldPoints = 0;



snap.forEach(user=>{


if(user.id===uid){

oldPoints =
user.data().points || 0;

}


});







await updateDoc(

ref,

{


points:
oldPoints + value


}

);





alert(
"⭐ Points Added"
);



loadUsers();



};






loadUsers();