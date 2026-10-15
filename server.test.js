import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

process.env.NODE_ENV = 'test';
const {default: app} = await import('./server.js');

function mockSmtp() {
  const messages = [];
  const server = net.createServer(socket => {
    socket.setEncoding('utf8'); socket.write('220 localhost ESMTP\r\n');
    let buffer = '', data = false, content = [];
    socket.on('data',chunk => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0,index); buffer = buffer.slice(index+2);
        if (data) { if (line === '.') { messages.push(content.join('\n')); content=[]; data=false; socket.write('250 accepted\r\n'); } else content.push(line); continue; }
        if (/^EHLO|^HELO/i.test(line)) socket.write('250-localhost\r\n250 OK\r\n');
        else if (/^MAIL FROM|^RCPT TO/i.test(line)) socket.write('250 OK\r\n');
        else if (/^DATA/i.test(line)) { data=true; socket.write('354 Continue\r\n'); }
        else if (/^QUIT/i.test(line)) socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  return {server,messages};
}
const pdf = new Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'],{type:'application/pdf'});
function studentData(file=pdf) { const body=new FormData(); for (const [key,value] of Object.entries({name:'Camille Martin',email:'camille@example.com',message:'Missions de développement web',consent:'yes'})) body.set(key,value); body.set('cv',file,'CV.pdf'); return body; }
function businessData() { const body=new FormData(); for (const [key,value] of Object.entries({company:'Entreprise Exemple',name:'Alex Martin',email:'alex@example.com',service:'Inventaire',timing:'Novembre',details:'Inventaire de notre magasin à Rennes.',consent:'yes'})) body.set(key,value); return body; }

test('les deux formulaires livrent un message SMTP, et les erreurs ne créent pas de succès', async () => {
  const smtp=mockSmtp(); await new Promise(resolve => smtp.server.listen(0,'127.0.0.1',resolve));
  const http=app.listen(0,'127.0.0.1'); await new Promise(resolve => http.once('listening',resolve));
  const base=`http://127.0.0.1:${http.address().port}`;
  try {
    Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.server.address().port),SMTP_SECURE:'false',SMTP_FROM:'RJS <rjs@example.com>',RECEIVING_EMAIL:'contact@example.com'});
    delete process.env.SMTP_USER; delete process.env.SMTP_PASSWORD;
    let response=await fetch(`${base}/api/student`,{method:'POST',body:studentData()}); assert.equal(response.status,200); assert.equal((await response.json()).ok,true);
    response=await fetch(`${base}/api/business`,{method:'POST',body:businessData()}); assert.equal(response.status,200); assert.equal((await response.json()).ok,true);
    assert.equal(smtp.messages.length,2); assert.match(smtp.messages[0],/candidature/i); assert.match(smtp.messages[1],/devis/i);
    response=await fetch(`${base}/api/student`,{method:'POST',body:studentData(new Blob(['not a pdf'],{type:'application/pdf'}))}); assert.equal(response.status,400); assert.equal((await response.json()).ok,false);
    delete process.env.SMTP_HOST;
    response=await fetch(`${base}/api/business`,{method:'POST',body:businessData()}); assert.equal(response.status,503); assert.equal((await response.json()).ok,false);
  } finally { await new Promise(resolve=>http.close(resolve)); await new Promise(resolve=>smtp.server.close(resolve)); }
});
