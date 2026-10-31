import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {getFirestore,collection,query,where,onSnapshot} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
const config=window.ESPRESSA_FIREBASE_CONFIG;
const $=id=>document.getElementById(id);
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusLabels={new:"Новый",accepted:"Принят",preparing:"Готовится",ready:"Готов к выдаче",completed:"Выдан",cancelled:"Отменён"};
if(config?.apiKey&&config?.projectId&&config?.appId){
 const app=getApps().find(a=>a.options.projectId===config.projectId)||initializeApp(config);
 const auth=getAuth(app),db=getFirestore(app);
 let unsubscribe=()=>{};
 onAuthStateChanged(auth,user=>{
  unsubscribe();unsubscribe=()=>{};
  const list=$("customerOrdersList"),status=$("customerOrdersStatus");
  if(!user){status.textContent="Войдите в аккаунт, чтобы просмотреть свои заказы.";list.innerHTML="";return;}
  status.textContent="Загружаем заказы...";
  unsubscribe=onSnapshot(query(collection(db,"orders"),where("ownerUid","==",user.uid)),snap=>{
   const orders=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
   status.textContent=orders.length?"Статусы обновляются автоматически.":"У вас пока нет заказов.";
   list.innerHTML=orders.map(o=>'<article style="padding:15px;border:1px solid #dde3da;background:#fff;border-radius:16px;color:#193421"><b>Заказ №'+escape(o.id.slice(0,8).toUpperCase())+'</b><p><strong>Статус: '+escape(statusLabels[o.status]||"Обрабатывается")+'</strong></p><p>'+ (Array.isArray(o.items)?o.items.map(x=>escape(x.name)+" × "+Number(x.qty)).join(", "):"") +'</p><b>'+Number(o.total||0).toLocaleString("ru-RU")+' ₸</b></article>').join("");
  },e=>{status.textContent="Ошибка загрузки: "+(e.code||"неизвестная ошибка");});
 });
}else{$("customerOrdersStatus").textContent="Подключение Firebase не настроено."}
