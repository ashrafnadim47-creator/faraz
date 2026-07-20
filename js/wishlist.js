import { auth, db } from "./firebase-config.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
    doc,
    setDoc,
    collection,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



const box = document.getElementById("wishlist-box");

let currentUser = null;





// AUTH CHECK

onAuthStateChanged(auth,(user)=>{


currentUser = user;


if(box && user){

loadWishlist();

}


});








// ADD WISHLIST


window.addWishlist = async function(name,price,image){


if(!currentUser){

location.href="login.html";

return;

}



await setDoc(

doc(
db,
"users",
currentUser.uid,
"wishlist",
name

),


{


name:name,

price:Number(price),

image:image


}

);



alert("❤️ Added to Wishlist");


};









// LOAD WISHLIST


async function loadWishlist(){



const snap = await getDocs(

collection(
db,
"users",
currentUser.uid,
"wishlist"

)

);



box.innerHTML="";



if(snap.empty){


box.innerHTML =
"<h2>No Wishlist Items ❤️</h2>";

return;


}





snap.forEach((item)=>{


const product = item.data();



box.innerHTML +=



`

<div class="wishlist-card">



<div class="product-image">


<img src="${product.image || 'images/no-image.png'}">


</div>



<h3>

${product.name}

</h3>



<p>

₹${product.price}

</p>




<button onclick="addWishlistCart('${product.name}',${product.price},'${product.image}')">

🛒 Add Cart

</button>




<button onclick="removeWishlist('${item.id}')">

❌ Remove

</button>



</div>


`;



});



}









// WISHLIST TO CART (Firebase)


window.addWishlistCart = async function(name,price,image){



if(!currentUser){

location.href="login.html";

return;

}



await setDoc(

doc(
db,
"users",
currentUser.uid,
"cart",
name

),


{


name:name,

price:Number(price),

image:image,

quantity:1


}

);



alert("🛒 Added To Cart");


};









// REMOVE WISHLIST


window.removeWishlist = async function(id){



await deleteDoc(

doc(
db,
"users",
currentUser.uid,
"wishlist",
id

)

);



loadWishlist();


};