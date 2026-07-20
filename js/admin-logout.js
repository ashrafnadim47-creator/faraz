import { auth } from "./firebase-config.js";

import {
signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


let logoutBtn = document.getElementById("logout-btn");


if(logoutBtn){

logoutBtn.onclick = async()=>{

await signOut(auth);

alert("Logout Successful");

location.href="admin-login.html";

};

}