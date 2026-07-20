let discount=0;



window.applyCoupon=function(){


let code=
document.getElementById("coupon-code").value
.trim();


let msg=
document.getElementById("coupon-message");



let coupons={

"FARAZ10":10,

"WELCOME20":20,

"SALE50":50,

"TKRUSH20":20,

"INSTA30":30,

"FARAZ50":50

};



let saved=
JSON.parse(
localStorage.getItem("coupons")
)||[];



if(coupons[code] && saved.includes(code)){


discount=coupons[code];


msg.innerHTML=
"🎉 "+discount+"% Discount Applied";


updateDiscount();


}

else{


msg.innerHTML=
"❌ Coupon not available";

}


}



function updateDiscount(){


let totalElement=
document.getElementById("checkout-total");


let amount=
Number(
totalElement.innerText.replace(/\D/g,"")
);



let newPrice=
amount-(amount*discount/100);



totalElement.innerHTML=
"Total : ₹"+Math.floor(newPrice);


}