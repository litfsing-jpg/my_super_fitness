export class AppError extends Error{
  constructor(status,code){super(code);this.status=status;this.code=code;}
}
export function unwrap(result,code='backend_unavailable'){
  if(result?.error)throw new AppError(503,code);
  return result?.data;
}
export const route=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(error=>{
  if(res.headersSent)return next(error);
  res.status(error instanceof AppError?error.status:503).json({error:error instanceof AppError?error.code:'service_unavailable'});
});
