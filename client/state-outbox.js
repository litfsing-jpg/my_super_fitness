(function(root){
  const groups = ['profile','progress','daily','planning','health','settings'];
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const safeKey = key => !['__proto__','prototype','constructor'].includes(key);
  function snapshot(value){
    return Object.fromEntries(groups.map(key => [key, object(value?.[key]) ? clone(value[key]) : {}]));
  }
  // Apply only local field changes to the latest remote state. Arrays are atomic fields.
  function merge(remote, base, next){
    if(equal(base,next)) return clone(remote);
    if(!object(base) || !object(next)) return clone(next);
    const result = object(remote) ? clone(remote) : {};
    for(const key of new Set([...Object.keys(base),...Object.keys(next)])){
      if(!safeKey(key)) continue;
      if(!Object.hasOwn(next,key)){ delete result[key]; continue; }
      if(!Object.hasOwn(base,key)){ result[key] = clone(next[key]); continue; }
      if(equal(base[key],next[key])) continue;
      result[key] = merge(result[key] === undefined ? null : result[key],base[key],next[key]);
    }
    return result;
  }
  function create({ storage, key, owner, epoch, revision = () => crypto.randomUUID() }){
    function read(){
      let value;
      try{ value = JSON.parse(storage.getItem(key) || 'null'); }catch(e){ return null; }
      if(value?.version !== 1 || value.owner !== owner || value.epoch !== epoch
        || typeof value.revision !== 'string' || !object(value.base) || !object(value.next)) return null;
      return { ...value, base:snapshot(value.base), next:snapshot(value.next) };
    }
    function write(base,next){
      if(equal(base,next)){ storage.removeItem(key); return null; }
      const value = { version:1, owner, epoch, revision:revision(), base:snapshot(base), next:snapshot(next) };
      storage.setItem(key,JSON.stringify(value));
      return value;
    }
    function stage(base,next){
      base = snapshot(base); next = snapshot(next);
      const current = read();
      if(equal(base,next)) return current;
      const combined = current ? merge(current.next,base,next) : next;
      if(current && equal(current.next,combined)) return current;
      return write(current ? current.base : base,combined);
    }
    function rebase(remote){
      const current = read();
      const base = snapshot(remote);
      if(!current) return base;
      const next = merge(base,current.base,current.next);
      write(base,next);
      return next;
    }
    function acknowledge(sent){
      const current = read();
      if(!current) return;
      if(current.revision === sent.revision){ storage.removeItem(key); return; }
      // A newer edit made during this request must remain queued.
      write(sent.next,current.next);
    }
    return { read, stage, rebase, acknowledge, merge:remote => {
      const current = read();
      return current ? merge(snapshot(remote),current.base,current.next) : snapshot(remote);
    } };
  }
  const api = Object.freeze({ create, merge, snapshot });
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.WLStateOutbox = api;
})(typeof window === 'object' ? window : globalThis);
