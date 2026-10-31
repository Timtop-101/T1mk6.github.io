import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,updateProfile} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
const c=window.ESPRESSA_FIREBASE_CONFIG;
const $=id=>document.getElementById(id);
const msg=t=>{$("customerAuthStatus").textContent=t;};
if(!c?.apiKey||!c?.projectId||!c?.appId){msg("Firebase не подключён.");}
else {
 const app=getApps().find(x=>x.options.projectId===c.projectId)||initializeApp(c), auth=getAuth(app);
 const errorText=e=>({
  "auth/email-already-in-use":"Этот email уже зарегистрирован.",
  "auth/invalid-email":"Проверьте адрес электронной почты.",
  "auth/invalid-credential":"Неверный email или пароль.",
  "auth/weak-password":"Придумайте пароль не короче 6 символов.",
  "auth/too-many-requests":"Слишком много попыток. Попробуйте позже.",
  "auth/network-request-failed":"Нет соединения с Firebase.",
  "auth/operation-not-allowed":"В Firebase нужно включить Email/Password."
 })[e.code]||("Не удалось выполнить действие: "+(e.code||"ошибка"));
 onAuthStateChanged(auth,user=>{
  window.ESPRESSA_CUSTOMER_UID=user?.uid||null;
  $("customerAccountButton").textContent=user?"Мой аккаунт":"Войти";
  $("customerAccountStatus").textContent=user?"Вы вошли как "+(user.displayName||user.email):"Войдите или зарегистрируйтесь";
  $("customerSignOut").hidden=!user;
  $("customerLoginForm").hidden=!!user;
  if(user?.displayName && !$("customerName").value)$("customerName").value=user.displayName;
 });
 $("customerLoginForm").onsubmit=async e=>{
  e.preventDefault();const button=$("customerAuthSubmit");button.disabled=true;msg("Подключаем...");
  const email=$("customerEmail").value.trim().toLowerCase(),pass=$("customerPassword").value;
  try {
   if($("customerAuthMode").value==="register"){
    const name=$("customerRegisterName").value.trim();
    if(name.length<2)throw Error("Укажите имя (минимум 2 символа).");
    const result=await createUserWithEmailAndPassword(auth,email,pass);
    await updateProfile(result.user,{displayName:name});
    if(!$("customerName").value)$("customerName").value=name;
    msg("Аккаунт создан. Вы вошли.");
   }else {await signInWithEmailAndPassword(auth,email,pass);msg("Вход выполнен.");}
   $("customerPassword").value="";
  }catch(err){msg(err.code?errorText(err):err.message)}
  finally{button.disabled=false;}
 };
 $("customerAuthMode").onchange=()=>{
  const isRegister=$("customerAuthMode").value==="register";
  $("customerRegisterWrap").hidden=!isRegister;
  $("customerAuthSubmit").textContent=isRegister?"Создать аккаунт":"Войти";
  msg("");
 };
 $("customerResetPassword").onclick=async()=>{
  const email=$("customerEmail").value.trim();if(!email)return msg("Сначала укажите email.");
  try{await sendPasswordResetEmail(auth,email);msg("Если email зарегистрирован, на него придёт письмо для сброса пароля.");}
  catch(e){msg(errorText(e))}
 };
 $("customerSignOut").onclick=async()=>{await signOut(auth);msg("Вы вышли из аккаунта.");};
}