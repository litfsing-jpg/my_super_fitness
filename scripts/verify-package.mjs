import {readFile,mkdir,writeFile,lstat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import {pathToFileURL} from 'node:url';
import {allowed,safeSource,policy} from './package-template.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function centralCheck(bytes){
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0||bytes.readUInt16LE(end+4)!==0||bytes.readUInt16LE(end+6)!==0)throw Error('Invalid or multipart archive');
 let cursor=bytes.readUInt32LE(end+16),total=0;const names=new Set(),count=bytes.readUInt16LE(end+10);if(count>policy.maxFiles+1)throw Error('Too many archive files');
 for(let i=0;i<count;i++){
  if(cursor+46>end||bytes.readUInt32LE(cursor)!==0x02014b50)throw Error('Invalid archive directory');
  const flags=bytes.readUInt16LE(cursor+8),size=bytes.readUInt32LE(cursor+24),length=bytes.readUInt16LE(cursor+28),extra=bytes.readUInt16LE(cursor+30),comment=bytes.readUInt16LE(cursor+32),mode=bytes.readUInt32LE(cursor+38)>>>16;
  const name=bytes.subarray(cursor+46,cursor+46+length).toString('utf8');
  if(flags&1||(mode&0xf000)===0xa000||name.includes('\\')||name.startsWith('/')||name.split('/').includes('..')||names.has(name)||(name!=='MANIFEST.json'&&!allowed(name)))throw Error('Unsafe archive entry');
  names.add(name);total+=size;if(total>policy.maxTotalBytes+1000000)throw Error('Archive exceeds size limit');cursor+=46+length+extra+comment;
 }return names;
}
export async function verifyTemplatePackage({archivePath,manifestPath,target}){
 const archive=await readFile(archivePath);centralCheck(archive);const payload=unzipSync(archive),manifest=JSON.parse(new TextDecoder().decode(payload['MANIFEST.json']));
 if(manifestPath&&JSON.stringify(JSON.parse(await readFile(manifestPath,'utf8')))!==JSON.stringify(manifest))throw Error('Manifest mismatch');
 if(manifest.version!==1||!Array.isArray(manifest.files)||manifest.files.length!==Object.keys(payload).length-1)throw Error('Invalid manifest');
 const names=new Set();for(const row of manifest.files){const bytes=payload[row.path];if(names.has(row.path)||!allowed(row.path)||!bytes||bytes.length!==row.size||hash(bytes)!==row.sha256)throw Error('Payload digest mismatch');names.add(row.path);safeSource(row.path,Buffer.from(bytes));}
 if(target){try{await lstat(target);throw Error('Extraction target already exists');}catch(e){if(e.code!=='ENOENT')throw e;}await mkdir(target,{recursive:true,mode:0o700});for(const row of manifest.files){const path=resolve(target,row.path);await mkdir(dirname(path),{recursive:true});await writeFile(path,payload[row.path],{flag:'wx',mode:0o600});}}
 return {ok:true,files:manifest.files.length,sha256:hash(archive)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(!process.argv[2])throw Error('Specify an archive');console.log(JSON.stringify(await verifyTemplatePackage({archivePath:process.argv[2],manifestPath:process.argv[2]+'.manifest.json',target:process.argv[3]}),null,2));}
