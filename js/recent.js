const box =
document.getElementById("recent-products");


if(box){


let products =
JSON.parse(
localStorage.getItem("recentProducts")
) || [];



if(products.length===0){

box.innerHTML =
"<h3>No Recently Viewed Products</h3>";

}

else{


products.forEach(product=>{


box.innerHTML += `

<div class="product-card">


<img 
src="${product.image || 'images/no-image.png'}">


<h2>
${product.name}
</h2>


<p>
₹${product.price}
</p>


<button onclick="location.href='product-details.html?id=${product.id}'">

View Product

</button>


</div>

`;


});


}


}