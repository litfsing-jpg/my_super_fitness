export function startPrivateMedia({auth}){
 const bind=video=>{
  if(video.dataset.mediaBound)return;video.dataset.mediaBound='1';let busy=false;
  const renew=async()=>{if(busy||!video.isConnected)return;busy=true;try{
   const {data}=await auth.auth.getSession();const r=await fetch('/api/media-ticket',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({path:video.dataset.privateVideo})});if(!r.ok)throw Error();const {url}=await r.json();if(!video.isConnected)return;video.src=url;
  }catch{const button=document.createElement('button');button.type='button';button.textContent='Повторить загрузку видео';button.addEventListener('click',()=>{button.remove();renew();});video.after(button);}finally{busy=false;}};
  video.addEventListener('error',()=>{if(video.nextElementSibling?.dataset.mediaRetry)return;const button=document.createElement('button');button.type='button';button.dataset.mediaRetry='1';button.textContent='Повторить загрузку видео';button.addEventListener('click',()=>{button.remove();renew();});video.after(button);});renew();
 };
 const scan=()=>document.querySelectorAll('video[data-private-video]').forEach(bind);
 const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});scan();return ()=>observer.disconnect();
}
