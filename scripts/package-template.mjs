import {readdir,lstat,readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve,relative,extname,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
import {pathToFileURL,fileURLToPath} from 'node:url';
export const policy=JSON.parse(await readFile(new URL('../package-policy.json',import.meta.url),'utf8'));
export function allowed(path){
 if(policy.rootFiles.includes(path))return true;const [top,...rest]=path.split('/');
 if(policy.textRoots[top]&&rest.length&&policy.textRoots[top].includes(extname(path))&&!rest.some(p=>p.startsWith('.')))return true;
 if(/^deployment\/(Dockerfile|compose\.yaml|Caddyfile\.example|\.dockerignore)$/.test(path))return true;
 if(top==='assets'&&rest[0]==='neutral'&&rest.length===2&&policy.neutralAssets.includes(rest[1]))return true;
 if(top==='content'&&rest.length===2&&rest[0]==='demo'&&policy.demoCatalogs.includes(rest[1].replace(/\.json$/,''))&&path.endsWith('.json'))return true;
 if(/^content\/examples\/(exercise|dish|program|visuals)\.json$/.test(path))return true;
 return /^media-source\/workout-demo\/(index\.html|hyperframes\.json|meta\.json|package\.json|AGENTS\.md|assets\/illustration\.svg)$/.test(path);
}
export function safeSource(path,bytes){
 if(!/\.(m?js|html|css|json|sql|md|yaml|svg)$/.test(path)&&path!=='.env.example')return;
 let text=bytes.toString('utf8');
 const patterns=[/sk_(?:live|test)_[A-Za-z0-9_-]{16,}/,/sb_secret_[A-Za-z0-9_-]{16,}/,/-----BEGIN [A-Z ]*PRIVATE KEY-----/,/\b\d{8,16}:[A-Za-z0-9_-]{30,}\b/,/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/,/https:\/\/[a-z0-9]{20}\.supabase\.co/,/https:\/\/t\.me\/PrimeBodyPaymentBot|https:\/\/sistema-complex/];
 // Tests contain deliberately invalid, labelled sentinels; they may never contain real credentials.
 if(path.startsWith('tests/'))text=text.replace(new RegExp(['sk','live','SENTINEL','PRIVATE','[A-Z0-9]{20,}'].join('_'),'g'),'[synthetic fixture]');
 if(patterns.some(pattern=>pattern.test(text)))throw Error('unsafe source value in '+path);
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function buildTemplatePackage({sourceRoot,outputPath}){
 const root=resolve(sourceRoot),out=resolve(outputPath);try{await access(out);throw Error('Archive already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
 const files=[];let total=0;
 async function walk(folder){for(const name of (await readdir(folder)).sort()){
  if(policy.ignored.includes(name)||name.startsWith('.env.')&&name!=='.env.example'||name==='CLAUDE.md')continue;
  const file=resolve(folder,name),path=relative(root,file).split('\\').join('/'),stat=await lstat(file);
  if(stat.isSymbolicLink())throw Error('symlink rejected: '+path);
  if(stat.isDirectory()){if(path==='content/live'||path==='content/media')continue;await walk(file);continue;}
  if(!stat.isFile()||!allowed(path))throw Error('unapproved package path: '+path);
  if(files.length>=policy.maxFiles||(total+=stat.size)>policy.maxTotalBytes)throw Error('Package limit exceeded');
  const bytes=await readFile(file);safeSource(path,bytes);files.push({path,bytes});
 }}await walk(root);
 const manifest={version:1,files:files.map(({path,bytes})=>({path,size:bytes.length,sha256:hash(bytes)}))};
 const payload=Object.fromEntries(files.map(({path,bytes})=>[path,[new Uint8Array(bytes),{mtime:new Date('1985-01-01T00:00:00Z')}]]));
 payload['MANIFEST.json']=[new TextEncoder().encode(JSON.stringify(manifest,null,2)),{mtime:new Date('1985-01-01T00:00:00Z')}];
 const archive=zipSync(payload,{level:6});await mkdir(dirname(out),{recursive:true});
 await writeFile(out,archive,{flag:'wx',mode:0o600});const manifestPath=out+'.manifest.json';await writeFile(manifestPath,JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
 return {archivePath:out,manifestPath,sha256:hash(archive),files:files.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const root=fileURLToPath(new URL('../',import.meta.url));console.log(JSON.stringify(await buildTemplatePackage({sourceRoot:root,outputPath:process.argv[2]||resolve(root,'dist/fitness-whitelabel-template.zip')}),null,2));}
