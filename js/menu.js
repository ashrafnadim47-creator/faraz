/* =====================================
   FARAZ STORE v2.0
   MENU JS
===================================== */


document.addEventListener("DOMContentLoaded", () => {


const menuBtn = document.getElementById("menu-btn");
const sidebar = document.getElementById("sidebar");
const closeBtn = document.getElementById("close-sidebar");



// OPEN SIDEBAR

if(menuBtn && sidebar){

    menuBtn.addEventListener("click", () => {

        sidebar.classList.add("active");

    });

}



// CLOSE SIDEBAR

if(closeBtn && sidebar){

    closeBtn.addEventListener("click", () => {

        sidebar.classList.remove("active");

    });

}



// SIDEBAR LINK CLICK CLOSE

document.querySelectorAll("#sidebar a").forEach(link => {

    link.addEventListener("click", () => {

        sidebar.classList.remove("active");

    });

});




// OUTSIDE CLICK CLOSE

document.addEventListener("click", (e) => {


    if(
        sidebar &&
        sidebar.classList.contains("active") &&
        !sidebar.contains(e.target) &&
        !menuBtn.contains(e.target)
    ){

        sidebar.classList.remove("active");

    }


});




// SEARCH BUTTON

window.openSearch = function(){

    const searchBox = document.getElementById("searchBox");

    if(searchBox){

        searchBox.focus();

    }

};




// SEARCH ENTER

const searchBox = document.getElementById("searchBox");


if(searchBox){

    searchBox.addEventListener("keypress",(e)=>{


        if(e.key === "Enter"){


            let value = searchBox.value.trim();


            if(value){

                localStorage.setItem(
                    "search",
                    value
                );


                window.location.href =
                "products.html";


            }


        }


    });


}




// ACTIVE SIDEBAR LINK

let currentPage =
window.location.pathname.split("/").pop();



document.querySelectorAll("#sidebar a").forEach(link=>{


    let href = link.getAttribute("href");


    if(href === currentPage){

        link.classList.add("active");

    }


});



});