/* =========================================
   CAREER GUIDE ACADEMY
   CBSE REGISTRATION PORTAL
   PREMIUM JAVASCRIPT P3
========================================= */


/* ===============================
   LOADER
================================ */

window.addEventListener("load",()=>{

const loader=document.getElementById("pageLoader");

if(loader){

setTimeout(()=>{

loader.style.display="none";

},800);

}

});






/* ===============================
   DATE & TIME
================================ */


function updateDateTime(){


let now=new Date();


let date=now.toLocaleDateString(
"en-IN",
{
day:"2-digit",
month:"long",
year:"numeric"
}
);


let time=now.toLocaleTimeString(
"en-IN"
);



let dateBox=document.getElementById("currentDate");

let timeBox=document.getElementById("currentTime");



if(dateBox){

dateBox.innerHTML=date;

}



if(timeBox){

timeBox.innerHTML=time;

}


}



updateDateTime();

setInterval(updateDateTime,1000);







/* ===============================
   START REGISTRATION
================================ */


function startRegistration(){


let student=document.getElementById("student");


if(student){


student.scrollIntoView({

behavior:"smooth",

block:"start"

});


}


}







/* ===============================
   FORM PROGRESS
================================ */


const form=document.getElementById(
"registrationForm"
);



function updateProgress(){


if(!form)return;



let fields=[

...form.querySelectorAll(
"input,select,textarea"
)

];



fields=fields.filter(
field=>field.type!="file"
);



let total=fields.length;


let filled=fields.filter(
field=>field.value.trim()!=""
).length;



let percent=0;



if(total){

percent=Math.round(
(filled/total)*100
);

}




let bar=document.getElementById(
"progressBar"
);


let text=document.getElementById(
"completePercent"
);



if(bar){

bar.style.width=percent+"%";

}



if(text){

text.innerHTML=percent+"%";

}



}




if(form){


form.addEventListener(
"input",
updateProgress
);



form.addEventListener(
"change",
updateProgress
);


}



updateProgress();









/* ===============================
   AUTO CAPITAL LETTER
================================ */


[

"studentName",

"fatherName",

"motherName",

"city",

"state"

].forEach(id=>{


let input=document.getElementById(id);



if(input){


input.addEventListener(
"input",
function(){


this.value=this.value.toUpperCase();


}

);


}


});









/* ===============================
   MOBILE VALIDATION
================================ */


document.querySelectorAll(
'input[type="tel"]'
)
.forEach(input=>{


input.addEventListener(
"input",
function(){


this.value=this.value.replace(
/[^0-9]/g,
""
);



this.value=this.value.substring(
0,
10
);


}

);


});









/* ===============================
   APAAR VALIDATION
================================ */


let apaar=document.getElementById(
"apaar"
);



if(apaar){


apaar.addEventListener(
"input",
function(){


this.value=this.value.replace(
/[^0-9]/g,
""
);



this.value=this.value.substring(
0,
12
);



}

);


}









/* ===============================
   IMAGE PREVIEW
================================ */


function imagePreview(
inputId,
imageId
){


let input=document.getElementById(
inputId
);


let image=document.getElementById(
imageId
);



if(input && image){


input.addEventListener(
"change",
function(){


let file=this.files[0];



if(file){


let reader=new FileReader();



reader.onload=function(e){


image.src=e.target.result;


}



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









/* ===============================
   SUBJECT SUMMARY
================================ */


function updateSubjects(){


let ids=[

"language",

"math",

"science",

"socialScience",

"additional"

];



let subjects=[];



ids.forEach(id=>{


let element=document.getElementById(id);



if(
element &&
element.value &&
element.value!="None"
){


subjects.push(
element.value
);


}


});




let list=document.getElementById(
"subjectList"
);



if(list){


if(subjects.length){


list.innerHTML=
subjects
.map(
item=>"✅ "+item
)
.join("<br>");



}

else{


list.innerHTML=
"No Subject Selected";


}


}



}




[

"language",

"math",

"science",

"socialScience",

"additional"

]
.forEach(id=>{


let select=document.getElementById(id);



if(select){


select.addEventListener(
"change",
updateSubjects
);


}


});



updateSubjects();









/* ===============================
   PREVIEW MODAL
================================ */


let previewBtn=document.getElementById(
"previewBtn"
);


let preview=document.getElementById(
"preview"
);


let closePreview=document.getElementById(
"closePreview"
);



if(previewBtn){


previewBtn.onclick=function(){



preview.style.display="flex";



let name=document.getElementById(
"studentName"
).value;



document.getElementById(
"previewData"
).innerHTML=


`

<h3>Student Name</h3>

<p>${name || "Not Entered"}</p>


`;



}



}



if(closePreview){


closePreview.onclick=function(){


preview.style.display="none";


}


}










/* ===============================
   SUBMIT SUCCESS
================================ */


let success=document.getElementById(
"successPopup"
);


if(form){



form.addEventListener(
"submit",
function(e){


e.preventDefault();



let agree=document.getElementById(
"agree"
);



if(!agree.checked){


alert(
"Please accept declaration"
);


return;


}




if(success){


success.style.display="flex";


}



}


);



}






let closeSuccess=document.getElementById(
"closeSuccess"
);



if(closeSuccess){


closeSuccess.onclick=function(){


success.style.display="none";


}



}








/* ===============================
   RESET
================================ */


if(form){


form.addEventListener(
"reset",
()=>{


setTimeout(()=>{


updateProgress();

updateSubjects();


},300);



}

);


}









/* ===============================
   DARK MODE
================================ */


let darkBtn=document.getElementById(
"darkModeBtn"
);



if(darkBtn){


darkBtn.onclick=function(){


document.body.classList.toggle(
"darkMode"
);


}


}








/* ===============================
   TOP BUTTON
================================ */


let topBtn=document.getElementById(
"topBtn"
);



if(topBtn){


topBtn.onclick=function(){


window.scrollTo({

top:0,

behavior:"smooth"

});


}



}





console.log(
"CBSE Portal JavaScript Loaded Successfully"
);
window.addEventListener("load", function(){

let loader = document.getElementById("pageLoader");

if(loader){

loader.remove();

}

});