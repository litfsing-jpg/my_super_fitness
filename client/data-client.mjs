const catalogs=new Set(['exercises','band-exercises','dishes','foods','ready-programs','videos','stretching']);
export function createDataClient({auth,config,fetchImpl=fetch}){
 async function authorized(input,options={}){
  const url=new URL(input,config.origin);
  const name=url.pathname.split('/').at(-1)?.replace(/\.json$/,'');
  if(catalogs.has(name))url.pathname='/api/catalog/'+name;
  const {data}=await auth.auth.getSession();
  if(!data.session?.access_token)throw Error('unauthorized');
  if(url.origin!==config.origin)throw Error('foreign_request_denied');
  return fetchImpl(url,{...options,headers:{...options.headers,Authorization:'Bearer '+data.session.access_token}});
 }
 return {fetch:authorized,async loadCatalog(kind){if(!catalogs.has(kind))throw Error('invalid_catalog');const r=await authorized('/api/catalog/'+kind);if(!r.ok)throw Error('catalog_unavailable');return r.json();}};
}
