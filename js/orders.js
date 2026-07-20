import {auth,db} from "./firebase-config.js";


import {
onAuthStateChanged
} from 
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
collection,
getDocs,
addDoc,
serverTimestamp,
query,
orderBy
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



const box =
document.getElementById("orders-container");



window.ordersData = {};

let currentUser = null;






onAuthStateChanged(auth,async(user)=>{


if(!user){

location.href="login.html";

return;

}



currentUser = user;


loadOrders();



});







async function loadOrders(){


if(!box) return;



box.innerHTML =
"Loading Orders...";



try{


const q = query(

collection(
db,
"users",
currentUser.uid,
"orders"
),

orderBy(
"orderedAt",
"desc"
)

);



const snap =
await getDocs(q);



box.innerHTML="";



if(snap.empty){


box.innerHTML =
`
<h2>
No Orders Found 📦
</h2>
`;

return;


}





snap.forEach((item)=>{


let order=item.data();



window.ordersData[item.id]=order;




box.innerHTML +=


`

<div class="order-card">


<h2>

📦 Order #${item.id}

</h2>



<p>

💰 Amount :
₹${order.total}

</p>



<p>

Status :
<b>${order.status || "Pending"}</b>

</p>



<div class="order-buttons">


<button onclick="location.href='tracking.html?id=${item.id}'">

📍 Track

</button>




<button onclick="openReview('${item.id}')">

⭐ Review

</button>




<button onclick="openInvoice('${item.id}')">

🧾 Invoice

</button>



</div>


</div>


`;



});



}

catch(error){

console.log(error);

box.innerHTML=
"❌ Orders Load Failed";

}



}









// REVIEW POPUP


window.openReview=function(id){


window.currentReviewOrder=id;


document.getElementById(
"review-popup"
).style.display="flex";


};





window.closeReview=function(){


document.getElementById(
"review-popup"
).style.display="none";


};








// SAVE REVIEW


window.submitReview=async function(){


let text =
document.getElementById("review-text")?.value;


if(!text){

alert("Write review first");

return;

}



await addDoc(

collection(
db,
"users",
currentUser.uid,
"reviews"
),

{


orderId:
window.currentReviewOrder,


text:text,


createdAt:
serverTimestamp()


}

);



alert("⭐ Review Submitted");


closeReview();


};








// INVOICE


window.openInvoice=function(orderId){


const order =
window.ordersData[orderId];



if(!order) return;



let itemsHTML="";



(order.items || []).forEach((item,index)=>{


itemsHTML +=

`

<tr>

<td>${index+1}</td>

<td>${item.name}</td>

<td>₹${item.price}</td>

</tr>

`;


});





document.getElementById(
"invoice-content"
).innerHTML =


`

<h1>🛍 FARAZ STORE</h1>

<p>Gaming & Shopping Store</p>

<hr>


<p>
<b>Invoice:</b>
FS-${orderId.slice(0,8).toUpperCase()}
</p>


<p>
<b>Status:</b>
${order.status}
</p>


<table class="invoice-table">


<tr>

<th>#</th>

<th>Product</th>

<th>Price</th>

</tr>


${itemsHTML}


</table>



<hr>


<h2>

Total : ₹${order.total}

</h2>



<p>
Thank you for shopping ❤️
</p>

`;



document.getElementById(
"invoice-popup"
).style.display="flex";


};





window.closeInvoice=function(){


document.getElementById(
"invoice-popup"
).style.display="none";


};