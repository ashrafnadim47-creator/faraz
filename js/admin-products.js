import { db } from "./firebase-config.js";


import {

collection,
getDocs,
deleteDoc,
doc

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";



const box =
document.getElementById("product-list");





async function loadProducts(){



if(!box) return;



box.innerHTML =
`
<h3>
Loading Products...
</h3>
`;



try{


const snap =
await getDocs(

collection(
db,
"products"

)

);





box.innerHTML="";





if(snap.empty){


box.innerHTML =
`
<h2>
No Products Found 📦
</h2>
`;

return;


}






snap.forEach((item)=>{



const product =
item.data();





box.innerHTML +=



`

<div class="product-card">



<img

src="${product.image || 'https://via.placeholder.com/300'}"

>




<h2>
${product.name}
</h2>



<p class="price">

₹${product.price}

</p>



<p class="category">

${product.category || "No Category"}

</p>



<button

onclick="editProduct('${item.id}')"

>

✏️ Edit

</button>




<button

class="delete-btn"

onclick="deleteProduct('${item.id}')"

>

🗑 Delete

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
❌ Products Load Failed
</h2>
`;



}



}





// DELETE


window.deleteProduct =
async function(id){



let check =
confirm(
"Delete this product?"
);




if(!check) return;



await deleteDoc(

doc(
db,
"products",
id

)

);



alert(
"✅ Product Deleted"
);



loadProducts();



};







// EDIT PLACEHOLDER


window.editProduct =
function(id){


location.href =
"admin-edit-product.html?id="+id;


};






loadProducts();