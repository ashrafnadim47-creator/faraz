/* ==================================================
   CAREER GUIDE ACADEMY
   CBSE REGISTRATION PORTAL
   JAVASCRIPT P1
================================================== */



// ===============================
// PAGE LOADER
// ===============================


window.addEventListener("load",function(){


const loader=document.getElementById("pageLoader");


if(loader){

setTimeout(()=>{

loader.style.display="none";

},1000);


}


});







// ===============================
// LIVE DATE & TIME
// ===============================


function updateDateTime(){


const now=new Date();



const date=now.toLocaleDateString(
"en-IN",
{

day:"2-digit",

month:"long",

year:"numeric",

weekday:"long"

}

);



const time=now.toLocaleTimeString(
"en-IN"
);



const currentDate=document.getElementById("currentDate");

const currentTime=document.getElementById("currentTime");



if(currentDate){

currentDate.innerHTML=date;

}



if(currentTime){

currentTime.innerHTML=time;

}



const today=document.getElementById("todayDate");

const clock=document.getElementById("liveClock");



if(today){

today.innerHTML=date;

}



if(clock){

clock.innerHTML=time;

}



}




updateDateTime();


setInterval(updateDateTime,1000);









// ===============================
// AUTO CAPITAL LETTER
// ===============================


const capitalFields=[

"studentName",

"fatherName",

"motherName",

"city",

"state"

];



capitalFields.forEach(function(id){


const field=document.getElementById(id);



if(field){


field.addEventListener("input",function(){


this.value=this.value.toUpperCase();



});


}


});









// ===============================
// MOBILE VALIDATION
// ===============================


const mobile=document.getElementById("mobile");


if(mobile){


mobile.addEventListener("input",function(){


this.value=this.value.replace(
/[^0-9]/g,
""
);



if(this.value.length>10){


this.value=this.value.substring(0,10);


}



});


}










// ===============================
// APAAR VALIDATION
// ===============================


const apaar=document.getElementById("apaar");



if(apaar){


apaar.addEventListener("input",function(){


this.value=this.value.replace(
/[^0-9]/g,
""
);



if(this.value.length>12){


this.value=this.value.substring(0,12);


}



});


}









// ===============================
// PINCODE VALIDATION
// ===============================


const pincode=document.getElementById("pincode");



if(pincode){


pincode.addEventListener("input",function(){


this.value=this.value.replace(
/[^0-9]/g,
""
);



if(this.value.length>6){


this.value=this.value.substring(0,6);


}



});


}









// ===============================
// IMAGE PREVIEW FUNCTION
// ===============================



function imagePreview(inputId,imageId){



const input=document.getElementById(inputId);

const image=document.getElementById(imageId);



if(input && image){



input.addEventListener(
"change",
function(){



const file=this.files[0];



if(file){


const reader=new FileReader();



reader.onload=function(e){


image.src=e.target.result;


};



reader.readAsDataURL(file);



}



}

);



}



}







imagePreview(
"photo",
"photoPreview"
);



imagePreview(
"studentSign",
"studentPreview"
);



imagePreview(
"fatherSign",
"fatherPreview"
);



imagePreview(
"motherSign",
"motherPreview"
);
/* ==================================================
   JAVASCRIPT P2
   PROGRESS + AUTOSAVE + DARK MODE
================================================== */





// ===============================
// FORM PROGRESS BAR
// ===============================


const form=document.getElementById("registrationForm");



if(form){



const allFields=form.querySelectorAll(
"input,select,textarea"
);



function updateProgress(){


let total=0;

let filled=0;



allFields.forEach(function(field){



// Ignore file input

if(field.type==="file"){

return;

}




total++;



if(field.type==="checkbox"){


if(field.checked){

filled++;

}


}

else if(field.type==="radio"){


const checked=document.querySelector(
'input[name="'+field.name+'"]:checked'
);



if(checked){

filled++;

}



}

else{


if(field.value.trim()!==""){


filled++;


}



}



});





let percent=Math.round(
(filled/total)*100
);



const progress=document.getElementById(
"completePercent"
);



if(progress){


progress.innerHTML=percent+"%";


}





}



allFields.forEach(function(field){


field.addEventListener(
"input",
updateProgress
);


field.addEventListener(
"change",
updateProgress
);



});



updateProgress();



}









// ===============================
// SUBJECT COUNTER
// ===============================



function updateSubjects(){



const subjects=[


"language",

"math",

"science",

"socialScience",

"additional"


];



let selected=[];



subjects.forEach(function(id){



const element=document.getElementById(id);



if(element && element.value){

if(element.value!=="None"){


selected.push(element.value);



}


}



});






const count=document.getElementById(
"subjectCount"
);



const list=document.getElementById(
"subjectList"
);




if(count){


count.value=
selected.length+" Subjects Selected";


}



if(list){


if(selected.length===0){


list.innerHTML=
"No Subjects Selected";


}

else{


list.innerHTML=
selected.map(
item=>"✅ "+item
).join("<br>");



}


}





}





[
"language",
"math",
"science",
"socialScience",
"additional"

].forEach(function(id){



const element=document.getElementById(id);



if(element){


element.addEventListener(
"change",
updateSubjects
);


}


});







// ===============================
// AUTO SAVE FORM
// ===============================



function saveData(){



let data={};



const fields=document.querySelectorAll(
"input,select,textarea"
);



fields.forEach(function(field){



if(field.type!=="file"){


data[field.id]=field.value;



}



});





localStorage.setItem(
"CBSE_FORM_DATA",
JSON.stringify(data)
);



}




document.querySelectorAll(
"input,select,textarea"
)
.forEach(function(field){



field.addEventListener(
"input",
saveData
);



field.addEventListener(
"change",
saveData
);



});









// ===============================
// LOAD SAVED DATA
// ===============================


window.addEventListener(
"load",
function(){



const saved=
localStorage.getItem(
"CBSE_FORM_DATA"
);



if(saved){



const data=
JSON.parse(saved);



for(let key in data){



const element=
document.getElementById(key);



if(element){


element.value=data[key];


}



}



}



});









// ===============================
// DARK MODE
// ===============================



const darkBtn=
document.getElementById(
"darkModeBtn"
);




if(darkBtn){



darkBtn.addEventListener(
"click",
function(){



document.body.classList.toggle(
"darkMode"
);



if(
document.body.classList.contains(
"darkMode"
)

){


darkBtn.innerHTML=
'<i class="fa-solid fa-sun"></i>';


}

else{


darkBtn.innerHTML=
'<i class="fa-solid fa-moon"></i>';



}




});


}









// ===============================
// BACK TO TOP
// ===============================


const topBtn=
document.getElementById(
"topBtn"
);



if(topBtn){



topBtn.addEventListener(
"click",
function(){


window.scrollTo({

top:0,

behavior:"smooth"


});



});


}
/* ==================================================
   JAVASCRIPT P3
   FINAL SUBMISSION SYSTEM
================================================== */





// ===============================
// GENERATE REGISTRATION ID
// ===============================


function generateRegistrationID(){


const year=new Date().getFullYear();


const random=Math.floor(
1000 + Math.random()*9000
);



return "CGA-"+year+"-"+random;


}








// ===============================
// PREVIEW SYSTEM
// ===============================


const previewBtn=
document.getElementById(
"previewBtn"
);



const previewModal=
document.getElementById(
"previewModal"
);



const closePreview=
document.getElementById(
"closePreview"
);



const previewData=
document.getElementById(
"previewData"
);





if(previewBtn){



previewBtn.addEventListener(
"click",
function(){



let name=
document.getElementById(
"studentName"
)?.value || "Not Filled";



let father=
document.getElementById(
"fatherName"
)?.value || "Not Filled";



let mother=
document.getElementById(
"motherName"
)?.value || "Not Filled";



let dob=
document.getElementById(
"dob"
)?.value || "Not Filled";



let subjects=
document.getElementById(
"subjectList"
)?.innerHTML || "No Subject";






if(previewData){



previewData.innerHTML=`

<div class="previewRow">

<h3>Student Name</h3>

<p>${name}</p>

</div>


<div class="previewRow">

<h3>Father Name</h3>

<p>${father}</p>

</div>



<div class="previewRow">

<h3>Mother Name</h3>

<p>${mother}</p>

</div>



<div class="previewRow">

<h3>Date Of Birth</h3>

<p>${dob}</p>

</div>



<div class="previewRow">

<h3>Subjects</h3>

<p>${subjects}</p>

</div>

`;



}



if(previewModal){

previewModal.style.display="flex";

}



});


}






if(closePreview){


closePreview.addEventListener(
"click",
function(){


previewModal.style.display="none";


});


}









// ===============================
// FINAL FORM SUBMIT
// ===============================



if(form){



form.addEventListener(
"submit",
function(e){



e.preventDefault();





const mobile=
document.getElementById(
"mobile"
);



const apaar=
document.getElementById(
"apaar"
);





if(apaar && apaar.value.length!==12){


alert(
"APAAR ID must be 12 digits"
);


apaar.focus();

return;


}






if(mobile && mobile.value.length!==10){


alert(
"Enter valid mobile number"
);


mobile.focus();


return;


}







const agree=
document.getElementById(
"agree"
);




if(agree && !agree.checked){


alert(
"Please accept declaration"
);


return;


}







const id=
generateRegistrationID();





const regBox=
document.getElementById(
"registrationID"
);



if(regBox){


regBox.innerHTML=id;


}







const success=
document.getElementById(
"successPopup"
);



if(success){


success.style.display="flex";


}







localStorage.removeItem(
"CBSE_FORM_DATA"
);



});


}










// ===============================
// CLOSE SUCCESS POPUP
// ===============================


const closeSuccess=
document.getElementById(
"closeSuccess"
);



if(closeSuccess){



closeSuccess.addEventListener(
"click",
function(){


document.getElementById(
"successPopup"
).style.display="none";



});


}










// ===============================
// CONFIRM SUBMIT BUTTON
// ===============================


const confirmSubmit=
document.getElementById(
"confirmSubmit"
);



if(confirmSubmit){


confirmSubmit.addEventListener(
"click",
function(){



if(previewModal){

previewModal.style.display="none";

}



if(form){


form.requestSubmit();


}



});


}









// ===============================
// PRINT SYSTEM
// ===============================


const printBtn=
document.getElementById(
"printBtn"
);



if(printBtn){



printBtn.addEventListener(
"click",
function(){


window.print();


});


}









// ===============================
// RESET SYSTEM
// ===============================


if(form){



form.addEventListener(
"reset",
function(){



setTimeout(function(){



localStorage.removeItem(
"CBSE_FORM_DATA"
);



const percent=
document.getElementById(
"completePercent"
);



if(percent){

percent.innerHTML="0%";


}



const list=
document.getElementById(
"subjectList"
);



if(list){

list.innerHTML=
"No Subjects Selected";


}



},200);



});


}






console.log(
"CBSE Premium Portal Loaded Successfully"
);