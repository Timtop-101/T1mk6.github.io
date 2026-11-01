importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");
firebase.initializeApp({apiKey:"AIzaSyCgyZ5GHRiT2N4-gS4v-U1wyltA3ryT4Oc",authDomain:"espressa-80660.firebaseapp.com",projectId:"espressa-80660",messagingSenderId:"727698291341",appId:"1:727698291341:web:997ecc4dc3cadc985b00c4"});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{
 if(payload.notification)return;
 const title=payload.data?.title||"EspressA", body=payload.data?.body||"Обновление заказа";
 self.registration.showNotification(title,{body,icon:"./favicon.ico",data:{url:new URL("./",self.registration.scope).href}});
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();const url=new URL("./",self.registration.scope).href;
 event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{const match=list.find(c=>c.url.startsWith(url));return match?match.focus():clients.openWindow(url)}));
});
