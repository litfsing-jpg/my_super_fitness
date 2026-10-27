/* Only the isolated loopback demo server serves this fictional SDK. */
(function(){
 let session;const ready=fetch('/api/demo/session?owner='+(new URLSearchParams(location.search).get('demo_owner')||'one')).then(r=>r.json()).then(s=>session=s);
 const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+session.access_token});
 function query(table,rpc,args){
  const state={table,rpc,args,operation:'select',filters:[],single:false};
  const chain={};for(const method of ['select','order','limit','range','in','gte','lte','is','neq','not','match'])chain[method]=()=>chain;
  chain.eq=(key,value)=>(state.filters.push([key,value]),chain);
  for(const method of ['insert','upsert','update','delete'])chain[method]=value=>(state.operation=method,state.values=value,chain);
  for(const method of ['single','maybeSingle'])chain[method]=()=>(state.single=true,chain);
  chain.then=(yes,no)=>ready.then(()=>fetch('/api/demo/query',{method:'POST',headers:headers(),body:JSON.stringify(state)})).then(r=>r.json()).then(yes,no);
  return chain;
 }
 const sdk={auth:{getSession:async()=>{await ready;return {data:{session},error:null};},getUser:async()=>{await ready;return {data:{user:session.user},error:null};},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),setSession:async()=>({data:{session}}),signOut:async()=>{location.assign('/login?demo=1');return {error:null};}},from:table=>query(table),rpc:(name,args)=>query(null,name,args),storage:{from:()=>({createSignedUrl:async()=>({error:{message:'Demo media upload disabled'}})})}};
 window.supabase={createClient:()=>sdk};
})();
