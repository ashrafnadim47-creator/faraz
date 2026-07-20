const form = document.getElementById("add-product-form");

if(form){

form.addEventListener("submit", async(e)=>{

// pura existing code

});

}
import { db } from "./firebase-config.js";


import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const name = document.getElementById("name");
const price = document.getElementById("price");
const image = document.getElementById("image");
const category = document.getElementById("category");
const stock = document.getElementById("stock");
const description = document.getElementById("description");

const addBtn = document.getElementById("add-product");
const message = document.getElementById("message");

addBtn.addEventListener("click", async () => {

    const productName = name.value.trim();
    const productPrice = Number(price.value);
    const productImage = image.value.trim();
    const productCategory = category.value.trim();
    const productStock = Number(stock.value);
    const productDescription = description.value.trim();

    if (
        productName === "" ||
        productPrice <= 0 ||
        productImage === "" ||
        productCategory === ""
    ) {
        message.innerHTML = "❌ Please fill all required fields.";
        message.style.color = "red";
        return;
    }

    if (productStock < 0 || isNaN(productStock)) {
        message.innerHTML = "❌ Invalid Stock Quantity.";
        message.style.color = "red";
        return;
    }

    try {

        await addDoc(collection(db, "products"), {

            name: productName,
            price: productPrice,
            image: productImage,
            category: productCategory,
            description: productDescription,

            // Stock Management
            stock: productStock,
            sold: 0,

            createdAt: serverTimestamp()

        });

        message.innerHTML = "✅ Product Added Successfully!";
        message.style.color = "limegreen";

        name.value = "";
        price.value = "";
        image.value = "";
        category.value = "";
        stock.value = "0";
        description.value = "";

    } catch (error) {

        console.error(error);

        message.innerHTML = "❌ Failed to Add Product.";
        message.style.color = "red";

    }

});