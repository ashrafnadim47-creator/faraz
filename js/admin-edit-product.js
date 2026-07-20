import { db } from "./firebase-config.js";


import {

doc,
getDoc,
updateDoc

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



// GET PRODUCT ID

const params = new URLSearchParams(
window.location.search
);


const productId = params.get("id");



const name =
document.getElementById("name");

const price =
document.getElementById("price");

const image =
document.getElementById("image");

const category =
document.getElementById("category");

const stock =
document.getElementById("stock");

const description =
document.getElementById("description");


const btn =
document.getElementById("update-product");


const message =
document.getElementById("message");





// LOAD OLD DATA

async function loadProduct(){


if(!productId){

message.innerHTML =
"❌ Product ID Missing";

return;

}



try{


const snap =
await getDoc(

doc(
db,
"products",
productId
)

);



if(!snap.exists()){


message.innerHTML =
"❌ Product Not Found";


return;

}



const data =
snap.data();



name.value =
data.name || "";


price.value =
data.price || "";


image.value =
data.image || "";


category.value =
data.category || "";


stock.value =
data.stock || 0;


description.value =
data.description || "";



}

catch(error){


console.log(error);


message.innerHTML =
"❌ Failed Loading Product";


}



}





// UPDATE PRODUCT


btn.addEventListener(
"click",
async()=>{


try{


await updateDoc(

doc(
db,
"products",
productId
),

{


name:name.value.trim(),


price:Number(price.value),


image:image.value.trim(),


category:category.value.trim(),


stock:Number(stock.value),


description:description.value.trim()



}

);



message.innerHTML =
"✅ Product Updated Successfully!";


message.style.color =
"limegreen";



setTimeout(()=>{


location.href =
"admin-products.html";


},1500);



}

catch(error){


console.log(error);


message.innerHTML =
"❌ Update Failed";


message.style.color =
"red";


}



});





loadProduct();