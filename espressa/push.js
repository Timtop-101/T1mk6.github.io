import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,doc,setDoc,deleteDoc} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {getMessaging,isSupported,getToken,onMessage,deleteToken} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js";
const c=window.ESPRESSA_FIREBASE_CONFIG;
const button=document.getElementById("enableEspressaPush"),status=document.getElementById("espressaPushStatus");
const say=t=>{if(status)status.textContent=t;};
if(button&&c?.apiKey&&c?.projectId&&c?.appId){
 const app=getApps().find(a=>a.options.projectId===c.projectId)||initializeApp(c);
 const auth=getAuth(app),db=getFirestore(app);
 let uid=null,role=document.body.dataset.pushRole||"customer";
 onAuthStateChanged(auth,u=>{uid=u?.uid||null;button.disabled=!uid;say(uid?"Нажмите, чтобы включить уведомления.":"Войдите в аккаунт, чтобы включить уведомления.");});
 button.onclick=async()=>{
  if(!uid)return say("Сначала войдите в аккаунт.");
  if(!window.ESPRESSA_FCM_VAPID_KEY)return say("Нужен публичный VAPID-ключ из Firebase → Project settings → Cloud Messaging.");
  if(!("serviceWorker" in navigator)||!("Notification" in window)||!(await isSupported()))return say("Этот браузер не поддерживает Web Push. На iPhone установите сайт на экран «Домой».");
  const permission=await Notification.requestPermission();
  if(permission!=="granted")return say("Уведомления не разрешены в настройках устройства.");
  button.disabled=true;
  try{
   const registration=await navigator.serviceWorker.register("./firebase-messaging-sw.js",{scope:"./"});
   const messaging=getMessaging(app);
   const token=await getToken(messaging,{vapidKey:window.ESPRESSA_FCM_VAPID_KEY,serviceWorkerRegistration:registration});
   if(!token)throw Error("Не удалось получить токен");
   const bytes=new TextEncoder().encode(token),hash=await crypto.subtle.digest("SHA-256",bytes);
   const id=Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,"0")).join("");
   await setDoc(doc(db,"pushSubscriptions",uid,"devices",id),{token,role,updatedAt:new Date(),enabled:true});
   say("Уведомления включены на этом устройстве.");
   onMessage(messaging,p=>{if(p.notification||p.data){say((p.notification?.title||p.data?.title||"EspressA")+": "+(p.notification?.body||p.data?.body||"Новое уведомление"));}});
  }catch(e){say("Не удалось включить: "+(e.code||e.message||"ошибка"))}
  finally{button.disabled=false;}
 };
}
