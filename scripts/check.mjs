import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const refs=[manifest.background.service_worker,manifest.action.default_popup,...Object.values(manifest.icons),...manifest.content_scripts.flatMap(s=>[...(s.js||[]),...(s.css||[])])];
let failures=0;
for(const file of refs)if(!fs.existsSync(file)){console.error('Missing manifest path:',file);failures++;}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>!['node_modules','.git','build','.gradle'].includes(e.name)).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(root).filter(f=>/\.(?:js|mjs|cjs)$/.test(f))){const args=['--check'];if(!file.endsWith('.cjs'))args.push('--input-type=module');const result=spawnSync(process.execPath,args,{input:fs.readFileSync(file),encoding:'utf8'});if(result.status!==0){console.error(file,result.stderr);failures++;}}
console.log(`Manifest ${manifest.version}: ${refs.length} paths, ${failures} errors`);
process.exitCode=failures?1:0;
