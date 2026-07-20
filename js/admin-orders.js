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
document.getElementById("admin-order-list");






async function loadOrders(){



if(!box) return;



box.innerHTML =
`
<h3>
Loading Orders...
</h3>
`;




try{



const users =
await getDocs(

collection(
db,
"users"

)

);





box.innerHTML="";



let totalOrders = 0;





for(let user of users.docs){



const userData =
user.data();




const orders =
await getDocs(


collection(
db,
"users",
user.id,
"orders"

)

);





orders.forEach((order)=>{



totalOrders++;



const data =
order.data();





box.innerHTML +=



`

<div class="order-card">


<h3>

📦 Order #${order.id}

</h3>




<p>

👤 
${userData.email || "User"}

</p>



<p>

💰 Amount:
₹${data.total || 0}

</p>




<p>

Current Status:

<b>
${data.status || "Pending"}
</b>


</p>






<select onchange="changeStatus('USER_ID','ORDER_ID',this.value)">

<option value="Pending">
🟡 Pending
</option>

<option value="Packed">
📦 Packed
</option>

<option value="Shipped">
🚚 Shipped
</option>

<option value="Delivered">
✅ Delivered
</option>

</select>

</div>

`;



});



}







if(totalOrders===0){



box.innerHTML =

`
<h2>
No Orders Found 📦
</h2>
`;



}



}

catch(error){



console.log(error);



box.innerHTML =

`
<h2>
❌ Orders Load Failed
</h2>
`;



}



}





window.changeStatus = async function(uid,id,status){


await updateDoc(

doc(
db,
"users",
uid,
"orders",
id

),

{

status:status

}

);



// 🔔 USER NOTIFICATION

await setDoc(

doc(
db,
"users",
uid,
"notifications",
Date.now().toString()

),

{

title:"Order Status Updated 📦",

message:`Your Order #${id} is now ${status}`,

time:new Date().toLocaleString()

}

);



alert(
"✅ Order Updated + Notification Sent"
);



loadOrders();


};









loadOrders();

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";





const box =
document.getElementById("admin-order-list");






async function loadOrders(){



if(!box) return;



box.innerHTML =
`
<h3>
Loading Orders...
</h3>
`;




try{



const users =
await getDocs(

collection(
db,
"users"

)

);





box.innerHTML="";



let totalOrders = 0;





for(let user of users.docs){



const userData =
user.data();




const orders =
await getDocs(


collection(
db,
"users",
user.id,
"orders"

)

);





orders.forEach((order)=>{



totalOrders++;



const data =
order.data();





box.innerHTML +=



`

<div class="order-card">


<h3>

📦 Order #${order.id}

</h3>




<p>

👤 
${userData.email || "User"}

</p>



<p>

💰 Amount:
₹${data.total || 0}

</p>




<p>

Current Status:

<b>
${data.status || "Pending"}
</b>


</p>






<select onchange="changeStatus('USER_ID','ORDER_ID',this.value)">

<option value="Pending">
🟡 Pending
</option>

<option value="Packed">
📦 Packed
</option>

<option value="Shipped">
🚚 Shipped
</option>

<option value="Delivered">
✅ Delivered
</option>

</select>

</div>

`;



});



}







if(totalOrders===0){



box.innerHTML =

`
<h2>
No Orders Found 📦
</h2>
`;



}



}

catch(error){



console.log(error);



box.innerHTML =

`
<h2>
❌ Orders Load Failed
</h2>
`;



}



}









window.changeStatus = async function(uid,id,status){



await updateDoc(


doc(
db,
"users",
uid,
"orders",
id

),


{


status:status


}


);



alert(
"✅ Order Status Updated"
);



loadOrders();



};







loadOrders();