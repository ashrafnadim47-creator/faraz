/* ===================================================
   CAREER GUIDE ACADEMY
   CBSE REGISTRATION PORTAL
   SCRIPT.JS
===================================================*/


/* ==========================================
        LIVE DATE & TIME
========================================== */

function updateDateTime(){

const now = new Date();

const dateOptions = {

weekday:"long",

day:"2-digit",

month:"long",

year:"numeric"

};

const currentDate = now.toLocaleDateString("en-IN",dateOptions);

const currentTime = now.toLocaleTimeString("en-IN");

document.getElementById("currentDate").innerHTML=currentDate;

document.getElementById("todayDate").innerHTML=currentDate;

document.getElementById("currentTime").innerHTML=currentTime;

document.getElementById("liveClock").innerHTML=currentTime;

}

updateDateTime();

setInterval(updateDateTime,1000);



/* ==========================================
        AUTO CAPITAL LETTER
========================================== */

const capitalFields=[

"studentName",

"fatherName",

"motherName",

"city",

"state"

];

capitalFields.forEach(function(id){

document.getElementById(id)

.addEventListener("input",function(){

this.value=this.value.toUpperCase();

});

});



/* ==========================================
        MOBILE VALIDATION
========================================== */

const mobile=document.getElementById("mobile");

mobile.addEventListener("input",function(){

this.value=this.value.replace(/[^0-9]/g,"");

if(this.value.length>10){

this.value=this.value.substring(0,10);

}

});



/* ==========================================
        PINCODE VALIDATION
========================================== */

const pin=document.getElementById("pincode");

pin.addEventListener("input",function(){

this.value=this.value.replace(/[^0-9]/g,"");

if(this.value.length>6){

this.value=this.value.substring(0,6);

}

});



/* ==========================================
        APAAR VALIDATION
========================================== */

const apaar=document.getElementById("apaar");

apaar.addEventListener("input",function(){

this.value=this.value.replace(/[^0-9]/g,"");

if(this.value.length>12){

this.value=this.value.substring(0,12);

}

});



/* ==========================================
        PHOTO PREVIEW
========================================== */

function preview(fileId,imgId){

const file=document.getElementById(fileId);

const image=document.getElementById(imgId);

file.addEventListener("change",function(){

const reader=new FileReader();

reader.onload=function(e){

image.src=e.target.result;

}

if(file.files.length>0){

reader.readAsDataURL(file.files[0]);

}

});

}

preview("photo","photoPreview");

preview("studentSign","studentPreview");

preview("motherSign","motherPreview");

preview("fatherSign","fatherPreview");



/* ==========================================
        PROGRESS BAR
========================================== */

const form=document.getElementById("registrationForm");

const fields=form.querySelectorAll(

"input,select,textarea"

);

fields.forEach(function(field){

field.addEventListener("input",progress);

field.addEventListener("change",progress);

});

function progress(){

let total=0;

let filled=0;

fields.forEach(function(item){

total++;

if(item.type=="radio"){

const checked=document.querySelector(

'input[name="'+item.name+'"]:checked'

);

if(checked){

filled++;

}

}

else if(item.type=="checkbox"){

if(item.checked){

filled++;

}

}

else{

if(item.value.trim()!=""){

filled++;

}

}

});

const percent=Math.round(

(filled/total)*100

);

document.getElementById("progressBar")

.style.width=percent+"%";

document.getElementById("progressBar")

.innerHTML=percent+"%";

document.getElementById("completePercent")

.innerHTML=percent+"%";

}

progress();



/* ==========================================
        SMOOTH INPUT EFFECT
========================================== */

const allInputs=document.querySelectorAll(

"input,select,textarea"

);

allInputs.forEach(function(box){

box.addEventListener("focus",function(){

this.style.transform="scale(1.02)";

});

box.addEventListener("blur",function(){

this.style.transform="scale(1)";

});

});
/* ===================================================
   SCRIPT.JS - PART 2
===================================================*/


/* ==========================================
        LOCAL STORAGE SAVE
========================================== */

function saveForm(){

const data={

studentName:document.getElementById("studentName").value,

fatherName:document.getElementById("fatherName").value,

motherName:document.getElementById("motherName").value,

apaar:document.getElementById("apaar").value,

dob:document.getElementById("dob").value,

category:document.getElementById("category").value,

mobile:document.getElementById("mobile").value,

math:document.getElementById("math").value,

language:document.getElementById("language").value,

additional:document.getElementById("additional").value,

city:document.getElementById("city").value,

state:document.getElementById("state").value,

pincode:document.getElementById("pincode").value,

email:document.getElementById("email").value,

address:document.getElementById("address").value

};

localStorage.setItem(

"studentRegistration",

JSON.stringify(data)

);

}



/* ==========================================
        AUTO SAVE
========================================== */

fields.forEach(function(item){

item.addEventListener("input",saveForm);

item.addEventListener("change",saveForm);

});



/* ==========================================
        LOAD SAVED DATA
========================================== */

window.addEventListener("load",function(){

const saved=JSON.parse(

localStorage.getItem("studentRegistration")

);

if(saved){

for(let key in saved){

const element=document.getElementById(key);

if(element){

element.value=saved[key];

}

}

}

progress();

updateDateTime();

});



/* ==========================================
        DARK MODE
========================================== */

const darkModeBtn=document.getElementById(

"darkModeBtn"

);

darkModeBtn.addEventListener("click",function(){

document.body.classList.toggle("darkMode");

if(document.body.classList.contains("darkMode")){

darkModeBtn.innerHTML="☀";

}else{

darkModeBtn.innerHTML="🌙";

}

});



/* ==========================================
        BACK TO TOP
========================================== */

document.getElementById("topBtn")

.addEventListener("click",function(){

window.scrollTo({

top:0,

behavior:"smooth"

});

});



/* ==========================================
        PRINT FORM
========================================== */

document.getElementById("printBtn")

.addEventListener("click",function(){

window.print();

});



/* ==========================================
        PDF DOWNLOAD
========================================== */

document.getElementById("pdfBtn")

.addEventListener("click",function(){

window.print();

});



/* ==========================================
        SUCCESS POPUP
========================================== */

const popup=document.getElementById(

"successPopup"

);

const closePopup=document.getElementById(

"closePopup"

);

closePopup.addEventListener("click",function(){

popup.style.display="none";

});



/* ==========================================
        FORM SUBMIT
========================================== */

form.addEventListener("submit",function(e){

e.preventDefault();

if(apaar.value.length!=12){

alert("APAAR ID must be 12 digits.");

apaar.focus();

return;

}

if(mobile.value.length!=10){

alert("Enter a valid Mobile Number.");

mobile.focus();

return;

}

if(pin.value.length!=6){

alert("Enter a valid Pincode.");

pin.focus();

return;

}

if(!document.getElementById("agree").checked){

alert("Please accept the declaration.");

return;

}

popup.style.display="flex";

document.getElementById("status").innerHTML=

"Registration Submitted Successfully";

localStorage.removeItem(

"studentRegistration"

);

});



/* ==========================================
        RESET FORM
========================================== */

form.addEventListener("reset",function(){

setTimeout(function(){

document.getElementById("progressBar")

.style.width="0%";

document.getElementById("progressBar")

.innerHTML="0%";

document.getElementById("completePercent")

.innerHTML="0%";

document.getElementById("status")

.innerHTML="Waiting For Submission";

document.getElementById("photoPreview").src="";

document.getElementById("studentPreview").src="";

document.getElementById("motherPreview").src="";

document.getElementById("fatherPreview").src="";

localStorage.removeItem(

"studentRegistration"

);

},100);

});



/* ==========================================
        LOADING EFFECT
========================================== */

window.addEventListener("load",function(){

document.body.style.opacity="0";

setTimeout(function(){

document.body.style.transition="opacity .6s";

document.body.style.opacity="1";

},100);

});



/* ==========================================
        CONSOLE MESSAGE
========================================== */

console.log(

"CBSE Registration Portal Loaded Successfully"

);