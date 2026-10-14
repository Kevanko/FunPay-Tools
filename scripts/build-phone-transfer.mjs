import {build} from 'esbuild';
await build({entryPoints:['popup/phone_transfer.entry.js'],outfile:'popup/phone_transfer.bundle.js',bundle:true,minify:true,format:'iife',platform:'browser',legalComments:'eof'});
