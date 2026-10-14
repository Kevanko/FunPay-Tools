import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {zipSync} from 'fflate';
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const destination=process.env.FPT_BUILD_DIR||path.join(os.homedir(),'FunPayTools_build');
fs.mkdirSync(destination,{recursive:true});
const entries={};
function add(file){const stat=fs.lstatSync(file);if(stat.isSymbolicLink())throw Error('Symlinks are not packaged');if(stat.isDirectory()){for(const child of fs.readdirSync(file))add(path.join(file,child));}else entries[file.replaceAll('\\','/')]=[new Uint8Array(fs.readFileSync(file)),{mtime:new Date('2026-01-01T00:00:00Z')}];}
for(const file of ['background','content','css','popup','icons','fonts','offscreen','sounds','manifest.json','LICENSE'])add(file);
const archive=path.join(destination,`FunPay-Tools-${manifest.version}.zip`);
fs.writeFileSync(archive,zipSync(entries,{level:6}));
console.log(archive);
