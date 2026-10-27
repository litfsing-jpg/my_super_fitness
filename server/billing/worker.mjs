export function startBillingWorker(service,{interval=60000}={}){
 let busy=false;const run=async()=>{if(busy)return;busy=true;try{await service.tick();}catch{}finally{busy=false;}};
 const timer=setInterval(run,interval);timer.unref();return ()=>clearInterval(timer);
}
