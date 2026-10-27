export function createStorage({installationId,userId,backing=globalThis.localStorage}){
  if(!installationId||!userId)throw Error('Storage requires installation and owner');
  const prefix=`wl:${encodeURIComponent(installationId)}:${encodeURIComponent(userId)}:`;
  const keys=()=>Array.from({length:backing.length},(_,i)=>backing.key(i)).filter(k=>k?.startsWith(prefix));
  return {get length(){return keys().length;},key:i=>keys()[i]?.slice(prefix.length)??null,
    keyFromEvent:key=>typeof key==='string'&&key.startsWith(prefix)?key.slice(prefix.length):null,
    getItem:key=>backing.getItem(prefix+key),setItem:(key,value)=>backing.setItem(prefix+key,String(value)),
    removeItem:key=>backing.removeItem(prefix+key),clear:()=>keys().forEach(key=>backing.removeItem(key))};
}
