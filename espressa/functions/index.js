const {onDocumentCreated,onDocumentUpdated}=require("firebase-functions/v2/firestore");
const admin=require("firebase-admin");
admin.initializeApp();
const db=admin.firestore();
async function send(uid,role,title,body,url){
 const subs=await db.collection("pushSubscriptions").doc(uid).collection("devices").get();
 const targets=subs.docs.filter(x=>x.data().enabled===true && x.data().role===role && typeof x.data().token==="string");
 if(!targets.length)return;
 for(let offset=0;offset<targets.length;offset+=500){
  const chunk=targets.slice(offset,offset+500), tokens=chunk.map(x=>x.data().token);
  const result=await admin.messaging().sendEachForMulticast({tokens,notification:{title,body},webpush:{fcmOptions:{link:url}}});
  await Promise.all(result.responses.map(async (x,i)=>{
   if(!x.success && ["messaging/registration-token-not-registered","messaging/invalid-registration-token"].includes(x.error?.code))await chunk[i].ref.delete();
  }));
 }
}
exports.pushNewOrder=onDocumentCreated({document:"orders/{orderId}",region:"us-central1"},async event=>{
 if(!event.data)return;
 const id=event.params.orderId,order=event.data.data(),workers=await db.collection("workers").where("active","==",true).get();
 const url="https://timtop-101.github.io/T1mk6.github.io/espressa/worker.html";
 await Promise.all(workers.docs.map(w=>send(w.id,"worker","EspressA — новый заказ","Заказ №"+id.slice(0,8).toUpperCase(),url)));
});
exports.pushOrderStatus=onDocumentUpdated({document:"orders/{orderId}",region:"us-central1"},async event=>{
 if(!event.data)return;
 const before=event.data.before.data(),after=event.data.after.data();
 if(before.status===after.status||typeof after.ownerUid!=="string"||!after.ownerUid)return;
 const labels={accepted:"Заказ принят",preparing:"Заказ готовится",ready:"Заказ готов!",completed:"Заказ выдан",cancelled:"Заказ отменён"};
 const title=labels[after.status];if(!title)return;
 await send(after.ownerUid,"customer","EspressA — "+title,"Заказ №"+event.params.orderId.slice(0,8).toUpperCase(),"https://timtop-101.github.io/T1mk6.github.io/espressa/");
});
