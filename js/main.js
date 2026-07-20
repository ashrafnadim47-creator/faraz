console.log("🔥 Faraz Store Started");


document.addEventListener("DOMContentLoaded",()=>{


console.log("✅ Website Loaded Successfully");



const buttons=document.querySelectorAll("button");


buttons.forEach(button=>{


button.addEventListener("click",()=>{


console.log("Button Clicked:",button.innerText);


});


});


});
function openSearch(){

let search = prompt("Search Product:");

if(search){

alert("Searching for: " + search);

}

}