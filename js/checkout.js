
import {auth,db} from "./firebase-config.js";


import {

onAuthStateChanged

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {

collection,
getDocs,
addDoc,
deleteDoc,
doc,
serverTimestamp,
updateDoc,
getDoc,
increment
}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";




const itemsBox =
document.getElementById("checkout-items");


const totalBox =
document.getElementById("checkout-total");


const countBox =
document.getElementById("item-count");


const orderBtn =
document.getElementById("place-order-btn");




let uid="";

let cartItems=[];

let total=0;





onAuthStateChanged(auth,async(user)=>{


if(!user){

location.href="login.html";

return;

}


uid=user.uid;


loadCheckout();


});







async function loadCheckout(){



const snap =
await getDocs(

collection(
db,
"users",
uid,
"cart"

)

);



itemsBox.innerHTML="";


cartItems=[];

total=0;




snap.forEach(item=>{


let data=item.data();


cartItems.push(data);



let price =
data.price * data.quantity;



total += price;



itemsBox.innerHTML +=


`

<div class="checkout-item">

<h3>
${data.name}
</h3>

<p>
₹${data.price} x ${data.quantity}
</p>

</div>

`;



});





countBox.innerHTML =
cartItems.length;



totalBox.innerHTML =
"Total : ₹"+total;



}








orderBtn.onclick=async()=>{



if(cartItems.length===0){


alert("Cart Empty");


return;


}




let name =
document.querySelector(
".address-card input:nth-child(2)"
).value;



let mobile =
document.querySelector(
".address-card input:nth-child(3)"
).value;



let address =
document.querySelector(
".address-card textarea"
).value;





if(!name || !mobile || !address){


alert(
"Please fill address"
);


return;


}







let payment =
document.querySelector(
'input[name="payment"]:checked'
).value;







try{



const order = await addDoc(

collection(
db,
"users",
uid,
"orders"

),

{


items:cartItems,


total:total,


address:address,


mobile:mobile,


payment:payment,


status:"Pending",


orderedAt:
serverTimestamp()



}

);

// ==========================
// UPDATE PRODUCT STOCK
// ==========================

for (const item of cartItems) {

    if (!item.productId) continue;

    const productRef = doc(
        db,
        "products",
        item.productId
    );

    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) continue;

    const currentStock =
        productSnap.data().stock || 0;

    const newStock = Math.max(
        currentStock - item.quantity,
        0
    );

    await updateDoc(productRef, {

        stock: newStock,

        sold: increment(item.quantity)

    });

}





// DELETE CART



const cart =
await getDocs(

collection(
db,
"users",
uid,
"cart"

)

);



cart.forEach(async(item)=>{


await deleteDoc(

doc(
db,
"users",
uid,
"cart",
item.id

)

);


});








// NOTIFICATION


await addDoc(

collection(
db,
"users",
uid,
"notifications"

),

{


title:
"Order Placed 🎉",


message:
"Your order has been received successfully",


createdAt:
serverTimestamp()



}

);






document.getElementById(
"success-popup"
).style.display="flex";





setTimeout(()=>{


location.href="orders.html";


},2000);





}



catch(error){


console.log(error);


alert(
"Order Failed"
);



}



};