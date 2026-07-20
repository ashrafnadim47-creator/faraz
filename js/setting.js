window.darkMode=function(){

document.body.classList.add("dark");

localStorage.setItem(
"theme",
"dark"
);

}



window.lightMode=function(){

document.body.classList.remove("dark");


localStorage.setItem(
"theme",
"light"
);


}




if(localStorage.getItem("theme")=="dark"){

document.body.classList.add("dark");

}
function lightMode(){
    document.body.classList.remove("dark-mode");
    localStorage.setItem("theme","light");
}

function darkMode(){
    document.body.classList.add("dark-mode");
    localStorage.setItem("theme","dark");
}

// Page load par saved theme apply
if(localStorage.getItem("theme") === "dark"){
    document.body.classList.add("dark-mode");
}