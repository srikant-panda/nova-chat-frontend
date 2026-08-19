const API=(import.meta.env.VITE_API_URL||"http://localhost:3000/api").replace(/\/$/,"");
let accessToken=sessionStorage.getItem("novachat.accessToken")||"";
export const setAccessToken=t=>{accessToken=t||"";if(accessToken)sessionStorage.setItem("novachat.accessToken",accessToken);else sessionStorage.removeItem("novachat.accessToken")};
export const getAccessToken=()=>accessToken;
const token=v=>String(v||"").replace(/^Bearer\s+/i,"").trim();
const uncached=p=>`${API}${p}${p.includes("?")?"&":"?"}_=${Date.now()}-${Math.random().toString(36).slice(2)}`;
async function body(r){const t=await r.text();if(!t)return {};try{return JSON.parse(t)}catch{return {message:t}}}
async function raw(path,opts={}){const h=new Headers(opts.headers||{});if(opts.body!==undefined&&!(opts.body instanceof FormData))h.set("Content-Type","application/json");h.set("Cache-Control","no-cache, no-store, max-age=0, must-revalidate");h.set("Pragma","no-cache");if(accessToken)h.set("Authorization",`Bearer ${accessToken}`);const method=(opts.method||"GET").toUpperCase();const r=await fetch((method==="GET"||method==="HEAD")?uncached(path):`${API}${path}`,{...opts,method,headers:h,credentials:"include",cache:"no-store"});return{response:r,data:await body(r)}}
let refreshPromise=null;
export async function refreshAccessToken(){try{const{response,data}=await raw("/auth/refresh",{method:"POST"});if(!response.ok){setAccessToken("");return false}const t=token(response.headers.get("Authorization")||data?.token||data?.accessToken);if(!t){setAccessToken("");return false}setAccessToken(t);return true}catch{setAccessToken("");return false}}
async function request(path,opts={},retry=true){const r=await raw(path,opts);if(r.response.status===401&&retry&&!path.startsWith("/auth/refresh")){refreshPromise ||= refreshAccessToken();const ok=await refreshPromise;refreshPromise=null;if(ok)return request(path,opts,false)}if(!r.response.ok){const e=new Error(r.data?.message||r.data?.errors?.map?.(x=>x.message).join(" ")||`Request failed (${r.response.status})`);e.status=r.response.status;e.payload=r.data;throw e}return r.data}
export async function login(email,password){const{response,data}=await raw("/auth/login",{method:"POST",body:JSON.stringify({email,password})});if(!response.ok){const e=new Error(data?.message||`Login failed (${response.status})`);e.payload=data;throw e}const t=token(response.headers.get("Authorization"));if(!t)throw new Error("Login succeeded but no Authorization token was returned.");setAccessToken(t);return data}
export async function signup(name,email,password,age){const{response,data}=await raw("/auth/signup",{method:"POST",body:JSON.stringify({name,email,password,age:Number(age)})});if(!response.ok){const e=new Error(data?.message||`Signup failed (${response.status})`);e.payload=data;throw e}const t=token(response.headers.get("Authorization"));if(!t)throw new Error("Signup succeeded but no Authorization token was returned.");setAccessToken(t);return data}
export async function logout(){try{if(accessToken)await request("/auth/logout",{method:"POST"},false)}finally{setAccessToken("")}}
export async function getMe(){return request("/user/get-me")}
export async function getRecentChats(){const d=await request("/chat/getRecentChat");return Array.isArray(d?.chats)?d.chats:[]}
export async function getMessages(id){const d=await request(`/message/${id}`);return Array.isArray(d?.data)?d.data:[]}
export async function deleteChat(id){return request(`/chat/${id}`,{method:"DELETE"})}

export async function streamMessage({content,chatId,model,onEvent,signal}){
  async function attempt(retry=true){
    const h=new Headers({"Content-Type":"application/json","Accept":"text/event-stream","Cache-Control":"no-cache, no-store, max-age=0, must-revalidate","Pragma":"no-cache"});
    if(accessToken)h.set("Authorization",`Bearer ${accessToken}`);
    const path=chatId?`/message/${chatId}/stream`:`/message/stream`;
    const r=await fetch(`${API}${path}?_=${Date.now()}-${Math.random().toString(36).slice(2)}`,{method:"POST",headers:h,credentials:"include",cache:"no-store",body:JSON.stringify({content,...(chatId?{}:{model})}),signal});
    if(r.status===401&&retry){refreshPromise ||= refreshAccessToken();const ok=await refreshPromise;refreshPromise=null;if(ok)return attempt(false)}
    if(!r.ok){const d=await body(r);const e=new Error(d?.message||`Stream failed (${r.status})`);e.status=r.status;e.payload=d;throw e}
    if(!r.body)throw new Error("Streaming is not supported by this browser.");
    const reader=r.body.getReader();const decoder=new TextDecoder();let buffer="";
    const emit=rawEvent=>{const lines=rawEvent.split("\n");let event="message",data="";for(const line of lines){if(line.startsWith("event:"))event=line.slice(6).trim();else if(line.startsWith("data:"))data+=line.slice(5).trimStart()}if(!data)return;try{onEvent(event,JSON.parse(data))}catch{onEvent(event,{text:data})}};
    while(true){const{value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let parts=buffer.split(/\n\n/);buffer=parts.pop()||"";for(const p of parts)emit(p)}
    buffer+=decoder.decode();if(buffer.trim())emit(buffer);
  }
  return attempt(true);
}
export {API};
