import {route,AppError} from '../errors.mjs';
export function installBillingRoutes({app,authenticate,billing,config}){
 app.get('/api/billing/plans',authenticate,route(async(req,res)=>res.json({plans:await billing.plans(req.principal,req.query.channel==='telegram'?'telegram':'web')})));
 app.post('/api/billing/orders',authenticate,route(async(req,res)=>{
  if(req.body.channel==='web'&&config.mode==='telegram')throw new AppError(403,'channel_not_available');
  res.json(await billing.create({principal:req.principal,planId:req.body.planId,channel:req.body.channel,requestId:req.body.requestId}));
 }));
 app.get('/api/billing/orders/:id',authenticate,route(async(req,res)=>res.json(await billing.check({principal:req.principal,orderId:req.params.id}))));
 app.post('/api/billing/webhook/yookassa',route(async(req,res)=>{if(!config.billingEnabled)throw new AppError(503,'billing_not_configured');await billing.notification(req.body);res.json({ok:true});}));
}
