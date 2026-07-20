let popup=document.getElementById("reward-popup");

let popupReward=document.getElementById("popup-reward");

let popupCode=document.getElementById("popup-code");

let closePopup=document.getElementById("close-popup");   

let wheel=document.getElementById("wheel");

let btn=document.getElementById("spin");

let result=document.getElementById("result");

let coupon=document.getElementById("coupon-result");

let timer=document.getElementById("timer");



let rewards=[

{
name:"₹50 OFF",
code:"FARAZ50"
},

{
name:"20 Points",
code:"POINT20"
},

{
name:"FREE DELIVERY",
code:"FREEDEL"
},

{
name:"₹30 OFF",
code:"SPIN30"
},

{
name:"TRY AGAIN",
code:null
},

{
name:"₹10 OFF",
code:"FARAZ10"
}

];



function checkSpin(){


let last=localStorage.getItem("spinTime");


if(!last){

btn.disabled=false;

timer.innerHTML="🎡 Spin Available";

return;

}


let diff=
Number(last)-Date.now();



if(diff<=0){

localStorage.removeItem("spinTime");

btn.disabled=false;

timer.innerHTML="🎡 Spin Available";

return;

}



btn.disabled=true;



let h=Math.floor(diff/(1000*60*60));

let m=Math.floor((diff%(1000*60*60))/(1000*60));

let s=Math.floor((diff%(1000*60))/1000);



timer.innerHTML=
`⏳ Next Spin Tomorrow: ${h}h ${m}m ${s}s`;

}


setInterval(checkSpin,1000);

checkSpin();



btn.onclick=()=>{
sound.currentTime = 0;
sound.play();

wheel.classList.add("rotate");

btn.disabled=true;



let win=
rewards[
Math.floor(Math.random()*rewards.length)
];



setTimeout(()=>{


result.innerHTML=
"🎉 You Won: "+win.name;

popupReward.innerHTML=win.name;


if(win.code){

popupCode.innerHTML=
"🎟️ Coupon: <b>"+win.code+"</b>";

}
else{

popupCode.innerHTML="Try Again Tomorrow 😅";

}


popup.style.display="flex";


if(win.code){


coupon.innerHTML=
"🎟️ Coupon Code: <b>"+win.code+"</b>";



let old=
JSON.parse(
localStorage.getItem("coupons")
)||[];



old.push(win.code);


localStorage.setItem(
"coupons",
JSON.stringify(old)
);


}

else{


coupon.innerHTML="😅 Try Again Tomorrow";

}


},4000);



let tomorrow=new Date();


tomorrow.setDate(
tomorrow.getDate()+1
);



localStorage.setItem(
"spinTime",
tomorrow.getTime()
);



};
let sound = document.getElementById("spin-sound");
closePopup.onclick=()=>{

popup.style.display="none";

};