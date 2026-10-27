export const launchKey=id=>'wl:'+id+':telegram-launch';
export function captureLaunch({storage,id,hash='',raw='',now=Date.now()}){
 let saved;try{saved=JSON.parse(storage.getItem(launchKey(id))||'null');}catch{storage.removeItem(launchKey(id));}
 const params=new URLSearchParams(hash.replace(/^#/,''));const incoming=raw||params.get('tgWebAppData');
 if(incoming&&incoming.length<=8192){const stamp=new URLSearchParams(incoming).get('auth_date')||'invalid';const sdk={...saved?.sdk};for(const key of ['tgWebAppVersion','tgWebAppPlatform','tgWebAppThemeParams'])if(params.has(key))sdk[key]=params.get(key).slice(0,4096);saved=saved?.stamp===stamp?{...saved,sdk}:{raw:incoming,until:now+300000,sdk,stamp};storage.setItem(launchKey(id),JSON.stringify(saved));}
 if(!saved)return null;if(saved.until<=now&&saved.raw){saved.raw='';storage.setItem(launchKey(id),JSON.stringify(saved));}return saved;
}
