const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
async function worker(){return (await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(require.resolve('../cloud/worker.js'),'utf8')).toString('base64'))).default;}
function database(){const rows=new Map();return {rows,prepare(sql){return {bind(...args){return {async first(){const row=rows.get(args[0]);if(!row)return null;if(sql.includes('token_hash = ?') && row.token_hash!==args[1])return null;return {...row};},async run(){if(sql.startsWith('INSERT INTO private_profiles')){if(rows.has(args[0]))return {meta:{changes:0}};rows.set(args[0],{token_hash:args[1],bundle:args[2],updated_at:args[3],version:1});return {meta:{changes:1}};}if(sql.startsWith('UPDATE private_profiles')){const [bundle,updated_at,,id,version,token]=args,row=rows.get(id);if(row&&row.version===version&&row.token_hash===token){Object.assign(row,{bundle,updated_at,version:version+1});return {meta:{changes:1}};}return {meta:{changes:0}};}throw Error('Unexpected SQL '+sql);}};}};}};}
const id='p_'+'a'.repeat(64),token='b'.repeat(64);
function request(method,path,secret,body){return new Request('https://test.invalid'+path,{method,headers:{...(secret?{Authorization:'Bearer '+secret}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
test('legacy public profiles and unverified nickname writes are blocked without touching DB',async()=>{const w=await worker(),DB={prepare(){throw Error('Must not touch legacy DB');}};assert.equal((await w.fetch(request('GET','/s/u_123'),{DB})).status,410);assert.equal((await w.fetch(request('PUT','/nick/u_123',null,{nick:'name',style:'bad'}),{DB})).status,403);});
test('capability auth protects read, write and conflict response; stale write does not overwrite',async()=>{
const w=await worker(),DB=database(),path='/v2/s/'+id,env={DB};
assert.equal((await w.fetch(request('GET',path),env)).status,401);
assert.equal((await w.fetch(request('PUT',path,token,{bundle:'first',updated_at:1,baseVersion:0}),env)).status,200);
for(const method of ['GET','PUT'])assert.equal((await w.fetch(request(method,path,'c'.repeat(64),method==='PUT'?{bundle:'hack',updated_at:2,baseVersion:0}:null),env)).status,401);
assert.equal((await w.fetch(request('GET',path,token),env)).status,200);
assert.equal((await w.fetch(request('PUT',path,token,{bundle:'stale',updated_at:2,baseVersion:0}),env)).status,409);
assert.equal(DB.rows.get(id).bundle,'first');
assert.equal((await w.fetch(request('PUT',path,token,{bundle:'second',updated_at:3,baseVersion:1}),env)).status,200);
assert.equal(DB.rows.get(id).bundle,'second');
});
