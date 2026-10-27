import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const project=new URL('../media-source/workout-demo/',import.meta.url),root=new URL('../',import.meta.url);
const original=await readFile(new URL('index.html',project),'utf8');
const run=args=>{const r=spawnSync('npx',['--yes','hyperframes@0.8.205',...args],{cwd:fileURLToPath(project),stdio:'inherit'});if(r.status!==0)throw Error('Demo media command failed');};
await mkdir(new URL('assets/',project),{recursive:true});await copyFile(new URL('assets/neutral/avatar.svg',root),new URL('assets/illustration.svg',project));
try{
 for(const [name,label] of [['squat','Приседание'],['pushup','Отжимание от опоры'],['row','Тяга гантели']]){
  await writeFile(new URL('index.html',project),original.replace('<h1>Пример упражнения</h1>','<h1>'+label+'</h1>'));
  run(['check']);
  run(['render','--quality','draft','--output',fileURLToPath(new URL('assets/neutral/'+name+'.mp4',root))]);
 }
}finally{await writeFile(new URL('index.html',project),original);}
