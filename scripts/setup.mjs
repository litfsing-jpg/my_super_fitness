import {readFile,writeFile,lstat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readConfig} from '../server/config.mjs';
export async function setup({target,answers}){
 const folder=await lstat(target);if(!folder.isDirectory()||folder.isSymbolicLink())throw Error('A real installation directory is required');
 readConfig({WL_MODE:answers.mode,WL_APP_ORIGIN:answers.origin});
 const template=await readFile(new URL('../.env.example',import.meta.url),'utf8');
 const values={WL_MODE:answers.mode,WL_APP_ORIGIN:answers.origin};
 const content=template.split('\n').map(line=>{const [key]=line.split('=');return key in values?key+'='+values[key]:line;}).join('\n');
 await writeFile(resolve(target,'.env.local'),content,{flag:'wx',mode:0o600});return {ok:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),get=name=>args[args.indexOf(name)+1];
 await setup({target:process.cwd(),answers:{mode:args.includes('--mode')?get('--mode'):'hybrid',origin:args.includes('--origin')?get('--origin'):'http://127.0.0.1:4210'}});
 console.log('Created .env.local with placeholders. Fill your own settings; see docs/SETUP.md.');
}
