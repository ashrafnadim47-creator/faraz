import {db} from "./firebase-config.js";


import {

collection,
getDocs

}

from

"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";






async function loadStats(){



try{



const products =
await getDocs(
collection(db,"products")
);



const users =
await getDocs(
collection(db,"users")
);





let ordersCount = 0;

let points = 0;





users.forEach(user=>{


let data =
user.data();



points +=
data.points || 0;



});





users.forEach(async(user)=>{


const orders =
await getDocs(

collection(
db,
"users",
user.id,
"orders"

)

);


ordersCount += orders.size;



});







document.getElementById(
"product-count"
).innerHTML =
products.size;




document.getElementById(
"user-count"
).innerHTML =
users.size;




document.getElementById(
"points-count"
).innerHTML =
points;




setTimeout(()=>{


document.getElementById(
"order-count"
).innerHTML =
ordersCount;



},1000);





}

catch(error){


console.log(error);


}



}




loadStats();
// --- FARAZ ADMIN: FIREBASE COMPATIBLE VOUCHER GENERATOR ---

window.addEventListener('DOMContentLoaded', () => {
    const genButton = document.getElementById('admin-gen-btn');
    
    if (genButton) {
        genButton.addEventListener('click', () => {
            const diamondInput = document.getElementById('admin-diamond-input');
            const outputBox = document.getElementById('admin-code-output');
            
            if (!diamondInput) return;
            const amount = parseInt(diamondInput.value);

            if (isNaN(amount) || amount <= 0) {
                alert("❌ Please enter a valid diamond amount greater than 0!");
                return;
            }

            // 1. Unique Code String generate karein
            const randomStamp = Math.random().toString(36).substring(2, 6).toUpperCase();
            const newGeneratedCode = `FZ-${amount}-${randomStamp}`;

            // 2. Firebase Firestore me "vouchers" collection ke andar save karein
            firebase.firestore().collection("vouchers").doc(newGeneratedCode).set({
                amount: amount,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                // UI safe display updates
                if (outputBox) {
                    outputBox.innerText = newGeneratedCode;
                    outputBox.style.display = "block";
                }

                // Clipboard copy tool
                navigator.clipboard.writeText(newGeneratedCode).then(() => {
                    alert(`⚡ Live Firebase Code Generated!\n\nCode: ${newGeneratedCode}\nWorth: 💎 ${amount}\n\nCopied & Saved online!`);
                });
                
                diamondInput.value = "";
            })
            .catch((error) => {
                console.error("Firebase write error: ", error);
                alert("⛔ Admin Error: Firebase database se connection nahi ho paya.");
            });
        });
    }
});