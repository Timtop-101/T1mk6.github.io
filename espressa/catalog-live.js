import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getFirestore,collection,onSnapshot} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const c=window.ESPRESSA_FIREBASE_CONFIG;
if(c?.apiKey&&c?.projectId&&c?.appId){
 const app=getApps().find(a=>a.options.projectId===c.projectId)||initializeApp(c);
 onSnapshot(collection(getFirestore(app),"products"),s=>{
  const changes={};s.docs.forEach(d=>changes[d.id]=d.data());
  window.applyEspressaCatalog(changes);
 },e=>console.warn("Меню: не удалось загрузить обновления",e.code));
}