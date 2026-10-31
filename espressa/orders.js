import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getFirestore,collection,addDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {getAuth,authStateReady} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
const config=window.ESPRESSA_FIREBASE_CONFIG;
let db=null;
if(config?.apiKey && config?.projectId && config?.appId){db=getFirestore(getApps().find(a=>a.options.projectId===config.projectId)||initializeApp(config));}
const qs=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function show(msg){qs("checkoutMessage").textContent=msg;}
window.submitEspressaOrder=async function(){
 const name=qs("customerName").value.trim(), phone=qs("customerPhone").value.trim(), address=qs("customerAddress").value.trim(), note=qs("customerNote").value.trim();
 const delivery=qs("orderType").value;
 const rows=Object.entries(window.getEspressaCart?.()||{}).filter(([i,n])=>Number(n)>0 && window.getEspressaData?.()?.[i]);
 if(!rows.length)return show("Добавьте блюда в корзину.");
 if(name.length<2 || phone.length<7)return show("Укажите имя и телефон.");
 if(delivery==="Доставка" && address.length<5)return show("Укажите адрес доставки.");
 if(!db)return show("Приём онлайн-заказов пока не подключён. Можно скопировать заказ.");
 const items=rows.map(([i,n])=>({name:window.getEspressaData()[i][1],qty:Number(n),price:Number(window.getEspressaData()[i][2])}));
 const total=items.reduce((s,x)=>s+x.qty*x.price,0);
 const btn=qs("submitOrder");btn.disabled=true;btn.textContent="Отправляем...";
 try{
 const auth=getAuth(getApps().find(a=>a.options.projectId===config.projectId));await auth.authStateReady();
 const payload={name,phone,address:delivery==="Доставка"?address:"",note,delivery,items,total,status:"new",createdAt:serverTimestamp()};
 if(auth.currentUser)payload.ownerUid=auth.currentUser.uid;
 const ref=await addDoc(collection(db,"orders"),payload);
 show("Заказ №"+ref.id.slice(0,8).toUpperCase()+" отправлен сотрудникам!"+(auth.currentUser?" Смотрите статус в разделе «Мои заказы».":" Для отслеживания следующих заказов войдите в аккаунт перед оформлением."));
 window.resetEspressaCart();qs("checkoutForm").reset();
 }catch(e){console.error(e);show("Не удалось отправить заказ. Попробуйте ещё раз или скопируйте его.");}
 finally{btn.disabled=false;btn.textContent="Отправить работникам";}
};