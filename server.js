import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
app.disable('x-powered-by');
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const maxCvBytes = 5 * 1024 * 1024;
const pages = new Map([['/','index.html'],['/index.html','index.html'],['/a-propos.html','a-propos.html'],['/espace-etudiant.html','espace-etudiant.html'],['/espace-entreprise.html','espace-entreprise.html'],['/confidentialite.html','confidentialite.html']]);
app.use((req,res,next) => { res.set('X-Content-Type-Options','nosniff'); res.set('Referrer-Policy','strict-origin-when-cross-origin'); next(); });
for (const [route,file] of pages) app.get(route,(_req,res) => res.sendFile(path.join(root,file)));
app.get('/styles.css',(_req,res) => res.sendFile(path.join(root,'styles.css')));
app.get('/main.js',(_req,res) => res.sendFile(path.join(root,'main.js')));
app.get('/content-config.json',(_req,res) => res.sendFile(path.join(root,'content-config.json')));
app.use('/assets',express.static(path.join(root,'assets'),{dotfiles:'deny',index:false}));

const limiter = rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-8',legacyHeaders:false,message:{ok:false,message:'Trop de tentatives. Veuillez réessayer dans quelques minutes.'}});
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:maxCvBytes,files:1,fields:12,parts:14,fieldSize:5000}});
const clean = (value,max) => typeof value === 'string' ? value.trim().slice(0,max+1) : '';
const emailOkay = value => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && value.length <= 254;
const phoneOkay = value => !value || /^[+\d\s().-]{6,30}$/.test(value);
const textOkay = (value,min,max) => value.length >= min && value.length <= max;
const serviceOptions = new Set(['Inventaire','Prospection commerciale','Animation commerciale','Street marketing','Développement web','Client mystère','Autre mission']);
const configured = () => Boolean(process.env.RECEIVING_EMAIL && process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM && (Boolean(process.env.SMTP_USER) === Boolean(process.env.SMTP_PASSWORD)));
const transporter = () => nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:process.env.SMTP_SECURE === 'true',auth:process.env.SMTP_USER ? {user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD} : undefined});
const reject = (res,message,status=400) => res.status(status).json({ok:false,message});
const line = value => value.replace(/[\r\n]+/g,' ').trim();
function validPdf(file) {
  if (!file || file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname) || file.size > maxCvBytes) return false;
  const start = file.buffer.subarray(0,8).toString('latin1');
  const end = file.buffer.subarray(Math.max(0,file.size-2048)).toString('latin1');
  return /^%PDF-1\.[0-9]/.test(start) && /%%EOF\s*$/.test(end);
}

app.post('/api/student',limiter,upload.single('cv'),async(req,res) => {
  const name=clean(req.body.name,120), email=clean(req.body.email,254), phone=clean(req.body.phone,30), message=clean(req.body.message,3000);
  if (req.body.website) return reject(res,'La demande n’a pas pu être traitée.');
  if (req.body.consent !== 'yes') return reject(res,'Veuillez accepter la notice de confidentialité.');
  if (!textOkay(name,2,120) || !emailOkay(email) || !phoneOkay(phone) || !textOkay(message,5,3000)) return reject(res,'Vérifiez le nom, l’e-mail, le téléphone et le message.');
  if (!validPdf(req.file)) return reject(res,'Joignez un CV PDF valide de 5 Mo maximum.');
  if (!configured()) return reject(res,'Le service d’envoi n’est pas encore configuré. Contactez Rennes Job Service par e-mail.',503);
  try {
    await transporter().sendMail({from:process.env.SMTP_FROM,to:process.env.RECEIVING_EMAIL,replyTo:email,subject:'[RJS] Nouvelle candidature étudiante',text:`Candidature étudiante\n\nNom : ${line(name)}\nE-mail : ${line(email)}\nTéléphone : ${line(phone)||'Non renseigné'}\n\nMessage :\n${message}\n\nConsentement : oui`,attachments:[{filename:'CV.pdf',content:req.file.buffer,contentType:'application/pdf'}]});
    res.json({ok:true,message:'Votre candidature a bien été transmise. Merci, nous reviendrons vers vous si une mission correspond à votre profil.'});
  } catch(error) { console.error('Échec SMTP candidature :',error.message); reject(res,'L’envoi a échoué. Veuillez réessayer ou nous contacter par e-mail.',502); }
});

app.post('/api/business',limiter,upload.none(),async(req,res) => {
  const company=clean(req.body.company,120),name=clean(req.body.name,120),email=clean(req.body.email,254),phone=clean(req.body.phone,30),service=clean(req.body.service,80),timing=clean(req.body.timing,120),details=clean(req.body.details,4000);
  if (req.body.website) return reject(res,'La demande n’a pas pu être traitée.');
  if (req.body.consent !== 'yes') return reject(res,'Veuillez accepter la notice de confidentialité.');
  if (!textOkay(company,2,120)||!textOkay(name,2,120)||!emailOkay(email)||!phoneOkay(phone)||!serviceOptions.has(service)||!textOkay(timing,2,120)||!textOkay(details,10,4000)) return reject(res,'Vérifiez les informations de l’entreprise et les détails du projet.');
  if (!configured()) return reject(res,'Le service d’envoi n’est pas encore configuré. Contactez Rennes Job Service par e-mail.',503);
  try {
    await transporter().sendMail({from:process.env.SMTP_FROM,to:process.env.RECEIVING_EMAIL,replyTo:email,subject:'[RJS] Nouvelle demande de devis entreprise',text:`Demande entreprise\n\nEntreprise : ${line(company)}\nContact : ${line(name)}\nE-mail : ${line(email)}\nTéléphone : ${line(phone)||'Non renseigné'}\nService : ${line(service)}\nPériode envisagée : ${line(timing)}\n\nDétails :\n${details}\n\nConsentement : oui`});
    res.json({ok:true,message:'Votre demande a bien été transmise. Merci, Rennes Job Service pourra revenir vers vous pour échanger sur votre projet.'});
  } catch(error) { console.error('Échec SMTP devis :',error.message); reject(res,'L’envoi a échoué. Veuillez réessayer ou nous contacter par e-mail.',502); }
});
app.use('/api',(error,_req,res,next) => { if (!error) return next(); if (error instanceof multer.MulterError) return reject(res,error.code === 'LIMIT_FILE_SIZE' ? 'Le PDF ne doit pas dépasser 5 Mo.' : 'Le formulaire contient trop de données.',413); console.error(error); reject(res,'Le serveur n’a pas pu traiter la demande.',500); });
app.use((_req,res) => res.status(404).send('Page introuvable'));
if (process.env.NODE_ENV !== 'test') app.listen(port,() => console.log(`Rennes Job Service : http://localhost:${port}`));
export default app;
