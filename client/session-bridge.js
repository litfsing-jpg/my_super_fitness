(function(){
  const config=window.WL_CONFIG;
  if(!config?.configured||!window.supabase)return;
  const prefix='wl:'+config.installationId+':auth';
  const storage={
    getItem(key){if(key.endsWith('-code-verifier')){try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.until>Date.now())return saved.value;localStorage.removeItem(key);}catch{}return null;}return sessionStorage.getItem(key);},
    setItem(key,value){if(key.endsWith('-code-verifier'))localStorage.setItem(key,JSON.stringify({value,until:Date.now()+900000}));else sessionStorage.setItem(key,value);},
    removeItem(key){sessionStorage.removeItem(key);if(key.endsWith('-code-verifier'))localStorage.removeItem(key);}
  };
  const client=window.supabase.createClient(config.supabaseUrl,config.anonKey,{auth:{storageKey:prefix,storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
  window.WLAuthClient=client;
  let started=false;
  window.WLCleanupPending=async owner=>{
    const {cleanupPending}=await import('./logout.mjs');
    await import('./device-privacy.js');
    return cleanupPending({installationId:config.installationId,owner,factory:options=>window.WLDevicePrivacy.create(options)});
  };
  window.WLAccess={
    async sync(session){if(!session?.access_token)return {ok:false,status:401};const r=await fetch('/api/session',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}'});const value=await r.json();return {...value,ok:r.ok&&value.active===true,status:r.status};},
    async clear(){const {data}=await client.auth.getSession();if(data.session)await fetch('/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:'{}'});},
    async logout(){const {data}=await client.auth.getSession();try{await this.clear();}catch{}try{await window.WLCleanupPending(data.session?.user?.id);}finally{await client.auth.signOut({scope:'local'});sessionStorage.removeItem('wl:'+config.installationId+':telegram-launch');sessionStorage.removeItem('wl:'+config.installationId+':telegram-attempt');}location.replace('/login');},
    start(){if(started)return;started=true;const check=async()=>{try{const {data}=await client.auth.getSession();const r=await window.WLAccess.sync(data.session);if(!r.ok)location.replace('/login');}catch{location.replace('/login');}};window.addEventListener('focus',check);}
  };
})();
