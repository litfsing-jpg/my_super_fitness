import {readConfig} from './config.mjs';
import {createRuntime} from './runtime.mjs';
import {startBillingWorker} from './billing/worker.mjs';
import {fileURLToPath} from 'node:url';
const config=readConfig();
const {app,billing}=createRuntime({config,root:fileURLToPath(new URL('../',import.meta.url))});
const stop=config.configured&&config.billingEnabled?startBillingWorker(billing):()=>{};
const server=app.listen(config.port,config.host,()=>console.log(`Fitness template: ${config.origin} (${config.configured?'configured':'setup required'})`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stop();server.close(()=>process.exit(0));});
