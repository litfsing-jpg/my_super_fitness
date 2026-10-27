import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {AppError,route} from './errors.mjs';
export const CATALOGS=new Set(['exercises','band-exercises','dishes','foods','ready-programs','videos','stretching','recipe-visuals']);
export function validateCatalog(kind,value){
 if(!CATALOGS.has(kind))throw new AppError(404,'not_found');
 const rows=['recipe-visuals','ready-programs'].includes(kind)?value?.[kind==='recipe-visuals'?'recipes':'programs']:value;
 if(!Array.isArray(rows)||rows.length>5000)throw new AppError(400,'invalid_catalog');
 if(new Set(rows.map(row=>row.id)).size!==rows.length||rows.some(row=>!row.id||!/^[a-zA-Z0-9_-]{1,120}$/.test(row.id)))throw new AppError(400,'invalid_catalog');
 if(kind==='foods'&&rows.some(row=>typeof row.name!=='string'||!row.name.trim()||typeof row.portion!=='string'||!row.portion.trim()||['kcal','p','f','c'].some(key=>!Number.isFinite(row[key])||row[key]<0)))throw new AppError(400,'invalid_food');
 // Catalogs are rendered by legacy templates: reject markup, script and external sources.
 const inspect=(value,key='')=>{
  if(typeof value==='string'&&(/[<>`]|javascript:|data:/i.test(value)||/https?:\/\//i.test(value)))throw new AppError(400,'unsafe_content');
  if(typeof value==='string'&&['src','img','poster','atlas','videoSrc','cover'].includes(key)&&(!/^\/(assets\/neutral|api\/media)\/[a-zA-Z0-9_./-]+$/.test(value)||value.includes('..')))throw new AppError(400,'unsafe_media_path');
  if(key==='color'&&!/^#[a-f0-9]{6}$/i.test(value))throw new AppError(400,'unsafe_color');
  if(value&&typeof value==='object')Object.entries(value).forEach(([key,item])=>inspect(item,key));
 };inspect(value);
 return value;
}
export function createContent({directory}){
 return {async read(kind){if(!CATALOGS.has(kind))throw new AppError(404,'not_found');try{return validateCatalog(kind,JSON.parse(await readFile(resolve(directory,kind+'.json'),'utf8')));}catch(e){if(e instanceof AppError)throw e;throw new AppError(503,'content_not_configured');}}};
}
export function installContentRoutes({app,authenticate,paid,content,media}){
 app.get('/api/catalog/:kind',authenticate,paid,route(async(req,res)=>{const value=await content.read(req.params.kind);res.json(media?media.decorate(value,req.principal):value);}));
}
