import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync,strFromU8} from 'fflate';
import {frames} from '../popup/phone_transfer.entry.js';
import QRCode from 'qrcode';
import {PNG} from 'pngjs';
import zxing from '@zxing/library';
test('integer-sized QR image decodes with the scanner family used on Android',async()=>{
 const value=frames(JSON.stringify({_magic:'FPTCONFIG',_version:2,settings:{autoBumpCooldown:30,fpToolsTheme:{font:'Manrope'}}}),'test-transfer')[0];
 const png=PNG.sync.read(await QRCode.toBuffer(value,{scale:5,margin:4,errorCorrectionLevel:'M'}));
 const pixels=new Int32Array(png.width*png.height);for(let i=0;i<pixels.length;i++)pixels[i]=(png.data[i*4]<<16)|(png.data[i*4+1]<<8)|png.data[i*4+2];
 const bitmap=new zxing.BinaryBitmap(new zxing.HybridBinarizer(new zxing.RGBLuminanceSource(pixels,png.width,png.height)));
 assert.equal(new zxing.MultiFormatReader().decode(bitmap,new Map([[zxing.DecodeHintType.PURE_BARCODE,true]])).getText(),value);
});
test('QR frames reconstruct portable settings and exclude session credentials',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('content/settings_schema.js','utf8'),context);
 const config=vm.runInContext(`FPTSettingsSchema.encode({golden_key:'SECRET',fpToolsAccounts:[{key:'SECRET'}],autoBumpCooldown:30,fpToolsTheme:{sitePreset:'forest',font:'Manrope'}},'3.15.0')`,context);
 const parts=frames(config,'test-transfer');assert.ok(parts.every(p=>p.length<=1200));const raw=strFromU8(gunzipSync(Buffer.from(parts.map(p=>p.split(':')[4]).join(''),'base64')));assert.equal(raw,config);assert.ok(!raw.includes('SECRET'));assert.equal(JSON.parse(raw).settings.fpToolsTheme.font,'Manrope');
});
test('large settings split into multiple codes; oversize transfer requires file',()=>{
 const config=JSON.stringify({text:Array.from({length:4000},()=>Math.random().toString(36)).join('')});const codes=frames(config,'test-transfer');assert.ok(codes.length>1);assert.equal(strFromU8(gunzipSync(Buffer.from(codes.map(p=>p.split(':')[4]).join(''),'base64'))),config);assert.throws(()=>frames(config.repeat(30),'test-transfer'),/fpconfig/);
});
