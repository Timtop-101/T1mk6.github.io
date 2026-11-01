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
 let unsubscribe=()=>{},previousStatuses=null;function notice(t){const n=$("espressaNotice");if(!n)return;n.textContent=t;n.style.display="block";n.onclick=()=>n.style.display="none";}
 onAuthStateChanged(auth,user=>{
  unsubscribe();unsubscribe=()=>{};previousStatuses=null;
  const list=$("customerOrdersList"),status=$("customerOrdersStatus");
  if(!user){status.textContent="Войдите в аккаунт, чтобы просмотреть свои заказы.";list.innerHTML="";return;}
  status.textContent="Загружаем заказы...";
  unsubscribe=onSnapshot(query(collection(db,"orders"),where("ownerUid","==",user.uid)),snap=>{
   const orders=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
   const current=Object.fromEntries(orders.map(o=>[o.id,o.status]));if(previousStatuses){const changed=orders.filter(o=>previousStatuses[o.id]&&previousStatuses[o.id]!==o.status);if(changed.length){const message="🔔 Статус заказа №"+changed[0].id.slice(0,8).toUpperCase()+" изменён: "+(statusLabels[changed[0].status]||changed[0].status);status.textContent=message;notice(message);}else status.textContent=orders.length?"Статусы обновляются автоматически.":"У вас пока нет заказов.";}else status.textContent=orders.length?"Статусы обновляются автоматически.":"У вас пока нет заказов.";previousStatuses=current;
   list.innerHTML=orders.map(o=>'<article style="padding:15px;border:1px solid #dde3da;background:#fff;border-radius:16px;color:#193421"><b>Заказ №'+escape(o.id.slice(0,8).toUpperCase())+'</b><p><strong>Статус: '+escape(statusLabels[o.status]||"Обрабатывается")+'</strong></p><p>'+ (Array.isArray(o.items)?o.items.map(x=>escape(x.name)+" × "+Number(x.qty)).join(", "):"") +'</p><b>'+Number(o.total||0).toLocaleString("ru-RU")+' ₸</b></article>').join("");
  },e=>{status.textContent="Ошибка загрузки: "+(e.code||"неизвестная ошибка")+" — проверьте публикацию Firestore Rules и вход в аккаунт.";notice(status.textContent);});
 });
}else{$("customerOrdersStatus").textContent="Подключение Firebase не настроено."}
