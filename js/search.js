import {db} from "./firebase-config.js";


import {

collection,
getDocs

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



const search =
document.getElementById("searchBox");




search.addEventListener("keyup",async()=>{


let value =
search.value.toLowerCase();



let snap =
await getDocs(
collection(db,"products")
);



snap.forEach((doc)=>{


let product=doc.data();



if(product.name.toLowerCase()
.includes(value)){


location.href=
"product-details.html?id="+doc.id;


}



});


});