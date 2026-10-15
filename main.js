const page = document.body.dataset.page;
const navItems = [['home','Accueil','index.html'],['about','À propos','a-propos.html'],['student','Espace étudiant','espace-etudiant.html'],['business','Espace entreprise','espace-entreprise.html']];
document.querySelector('[data-header]').innerHTML = `<header class="site-header"><div class="container header-inner"><a class="brand" href="index.html" aria-label="Rennes Job Service, accueil"><span class="brand-mark">R<span>.</span></span><span class="brand-name">RENNES<br>JOB SERVICE</span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Ouvrir le menu"><span></span><span></span><span></span></button><nav class="site-nav" id="site-nav" aria-label="Navigation principale">${navItems.map(([key,label,url]) => `<a href="${url}" ${page === key ? 'class="active" aria-current="page"' : ''}>${label}</a>`).join('')}<a class="nav-cta" href="espace-entreprise.html#devis">Demander un devis <span aria-hidden="true">↗</span></a></nav></div></header>`;
document.querySelector('[data-footer]').innerHTML = `<footer class="site-footer"><div class="container footer-main"><div><a class="brand footer-brand" href="index.html"><span class="brand-mark">R<span>.</span></span><span class="brand-name">RENNES<br>JOB SERVICE</span></a><p>Des étudiants, des entreprises, des missions qui créent du lien à Rennes.</p></div><div><h3>Explorer</h3><a href="index.html">Accueil</a><a href="a-propos.html">À propos</a><a href="espace-etudiant.html">Espace étudiant</a><a href="espace-entreprise.html">Espace entreprise</a></div><div><h3>Contact</h3><a href="mailto:rennesjobservice@gmail.com">rennesjobservice@gmail.com</a><p>Rennes School of Business<br>2 rue Robert d’Arbrissel<br>35065 Rennes Cedex, France</p></div></div><div class="container footer-bottom"><span>© ${new Date().getFullYear()} Rennes Job Service</span><a href="confidentialite.html">Confidentialité</a><span>Conçu pour créer du lien.</span></div></footer>`;

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const closeMenu = () => { menuButton.setAttribute('aria-expanded','false'); menuButton.setAttribute('aria-label','Ouvrir le menu'); nav.classList.remove('open'); };
menuButton.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') !== 'true'; menuButton.setAttribute('aria-expanded',String(open)); menuButton.setAttribute('aria-label',open ? 'Fermer le menu' : 'Ouvrir le menu'); nav.classList.toggle('open',open); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click',closeMenu));

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), {rootMargin:'0px 0px -35px 0px',threshold:.07});
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  requestAnimationFrame(() => document.body.classList.add('motion-ready'));
}

for (const form of document.querySelectorAll('[data-form]')) {
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type=submit]');
  const originalButton = button.textContent;
  function setFieldError(input,message) { const wrapper = input.closest('.field'); if (!wrapper) return; wrapper.classList.toggle('invalid',!!message); wrapper.querySelector('.field-error').textContent = message || ''; input.setAttribute('aria-invalid',message ? 'true' : 'false'); }
  function validate() {
    let firstInvalid = null;
    for (const input of form.querySelectorAll('input:not([name=website]),textarea,select')) {
      let message = '';
      if (input.required && (input.type === 'checkbox' ? !input.checked : input.type === 'file' ? !input.files.length : !input.value.trim())) message = input.type === 'checkbox' ? 'Votre accord est nécessaire.' : 'Ce champ est obligatoire.';
      else if (input.type === 'email' && input.value && !input.validity.valid) message = 'Saisissez une adresse e-mail valide.';
      else if (input.type === 'file' && input.files.length) { const file = input.files[0]; if (file.size > 5 * 1024 * 1024) message = 'Le PDF ne doit pas dépasser 5 Mo.'; else if (file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name)) message = 'Choisissez un fichier PDF.'; }
      else if (input.name === 'phone' && input.value && !/^[+\d\s().-]{6,30}$/.test(input.value)) message = 'Saisissez un numéro de téléphone valide.';
      setFieldError(input,message);
      if (message && !firstInvalid) firstInvalid = input;
    }
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }
  form.addEventListener('input', event => { if (event.target.matches('input,textarea,select')) setFieldError(event.target,''); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); status.textContent = ''; status.className = 'form-status';
    if (!validate()) { status.textContent = 'Veuillez corriger les champs indiqués.'; status.classList.add('error'); return; }
    button.disabled = true; button.textContent = 'Envoi en cours…';
    try {
      const response = await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'L’envoi a échoué. Veuillez réessayer.');
      form.reset(); status.textContent = result.message; status.classList.add('success');
    } catch(error) { status.textContent = error.message || 'Impossible de contacter le serveur. Veuillez réessayer.'; status.classList.add('error'); }
    finally { button.disabled = false; button.textContent = originalButton; status.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'}); }
  });
}
