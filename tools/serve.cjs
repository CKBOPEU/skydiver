// Local preview: node tools/serve.cjs. Serves only release files, never backups or other workspaces.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');const port=Number(process.env.PORT)||8765;
http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch(e){res.writeHead(400);return res.end();}
  if(pathname==='/')pathname='/index.html';
  if(!['/index.html','/style.css'].includes(pathname)&&!pathname.startsWith('/js/')&&!pathname.startsWith('/assets/audio/')){res.writeHead(404);return res.end();}
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.md':'text/markdown; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log(`SkyDiver: http://127.0.0.1:${port}`));
