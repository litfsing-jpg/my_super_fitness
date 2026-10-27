import {route,AppError} from '../errors.mjs';
import {validateCatalog,CATALOGS} from '../content.mjs';
import {writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
export function requireAdmin(req,res,next){if(req.principal?.admin!==true)return res.status(403).json({error:'admin_required'});next();}
export function installAdminRoutes({app,authenticate,repository,contentDirectory}){
 app.use('/api/admin',authenticate,requireAdmin);
 app.get('/api/admin/overview',route(async(req,res)=>{
  const users=await repository.adminRows('pb_subscriptions','user_id,status,current_period_end');
  const plans=await repository.adminRows('wl_billing_plans');
  const audit=await repository.adminRows('wl_admin_audit','actor,action,target,created_at');
  res.json({users,plans,audit});
 }));
 app.put('/api/admin/plans/:id',route(async(req,res)=>{
  const b=req.body;if(!/^[a-z0-9_-]{1,40}$/.test(req.params.id)||typeof b.label!=='string'||b.label.length<1||b.label.length>100||!Number.isInteger(b.days)||b.days<1||b.days>366||!Number.isInteger(b.amount_minor)||b.amount_minor<1||b.amount_minor>100000000||!Number.isInteger(b.stars_amount)||b.stars_amount<1||b.stars_amount>100000||typeof b.enabled!=='boolean')throw new AppError(400,'invalid_plan');
  await repository.audit({actor:req.principal.userId,action:'plan_update_requested',meta:{plan:req.params.id}});
  await repository.adminWrite('wl_billing_plans',{id:req.params.id,label:b.label,days:b.days,amount_minor:b.amount_minor,stars_amount:b.stars_amount,enabled:b.enabled});res.json({ok:true});
 }));
 app.put('/api/admin/catalog/:kind',route(async(req,res)=>{
  if(!CATALOGS.has(req.params.kind))throw new AppError(404,'not_found');const value=validateCatalog(req.params.kind,req.body);
  await repository.audit({actor:req.principal.userId,action:'catalog_update_requested',meta:{catalog:req.params.kind}});
  await mkdir(contentDirectory,{recursive:true});const path=resolve(contentDirectory,req.params.kind+'.json'),tmp=path+'.'+crypto.randomUUID()+'.tmp';
  await writeFile(tmp,JSON.stringify(value,null,2),{flag:'wx',mode:0o600});await rename(tmp,path);res.json({ok:true});
 }));
}
