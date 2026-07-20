import { db } from "./firebase-config.js";
import {
doc,
getDoc,
setDoc,
updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
auth
} from "./firebase.js";



export async function addPoints(points){


let user=auth.currentUser;


if(!user){

alert("Login required");

return;

}



let userRef=doc(db,"users",user.uid);


let snap=await getDoc(userRef);



if(snap.exists()){


let old=snap.data().points || 0;


await updateDoc(userRef,{

points:old+points

});


}

else{


await setDoc(userRef,{

email:user.email,

points:points

});


}



}