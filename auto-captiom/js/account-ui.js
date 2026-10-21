/* FORGE — account screen, local account management and legal links. */
import { $, el, escapeHtml } from './utils.js';
import { auth } from './auth.js';
import * as project from './project.js';
import { ui } from './ui.js';

const TERMS = `FORGE Terms of Service\n\nFORGE is an editing application provided for lawful creative work. You are responsible for the media you import, edit, export and publish. Do not use FORGE to violate copyright, privacy, safety or other applicable laws.\n\nThe application is provided on an “as available” basis. Projects may be stored locally on your device. Keep independent backups of important work. Features that depend on optional services may change or become unavailable.\n\nYou must be old enough to use the service under the laws that apply to you, or use it with the required parent/guardian permission.\n\nBy creating an account you agree to these terms.`;
const PRIVACY = `FORGE Privacy Policy\n\nFORGE is designed local-first. Your account profile, password verifier and local projects are stored on your device when using the built-in local account system. FORGE does not store your plaintext password. Passwords are protected with a salted PBKDF2-SHA-256 verifier.\n\nImported media remains on your device unless you explicitly use a future cloud or external service. Optional AI caption services may process media through the service you choose; check that service’s privacy terms before use.\n\nYou can delete your local account and its locally owned projects from Account settings. Exported files are stored where you choose.\n\nThis policy may be updated when features or data flows change.`;

function legalModal(title, body) {
  const content = el('div', { style: 'white-space:pre-wrap;line-height:1.7;font-size:13px;color:var(--text-muted);max-height:55vh;overflow:auto', text: body });
  const m = ui.showModal(title, content, { width: 680 });
  m.footer.appendChild(el('button', { class: 'btn primary', text: 'Close', onclick: () => m.close() }));
}

export const accountUI = {
  async init() {
    this.renderHome();
    window.addEventListener('forge:terms', () => legalModal('Terms of Service', TERMS));
    window.addEventListener('forge:privacy', () => legalModal('Privacy Policy', PRIVACY));
    window.addEventListener('forge:account', () => this.openAccount());
  },
  renderHome() {
    const footer = document.querySelector('.home-footer');
    if (!footer || footer.dataset.accountBound) return;
    footer.dataset.accountBound = '1';
    footer.innerHTML = `<button class="home-link" id="home-account-link">Account</button><span>•</span><button class="home-link" id="home-terms-link">Terms</button><span>•</span><button class="home-link" id="home-privacy-link">Privacy</button>`;
    $('#home-terms-link').onclick = () => legalModal('Terms of Service', TERMS);
    $('#home-privacy-link').onclick = () => legalModal('Privacy Policy', PRIVACY);
    $('#home-account-link').onclick = () => this.openAccount();
  },
  showAuth() {
    const home = $('#forge-home');
    home?.removeAttribute('hidden');
    let panel = $('#forge-auth-panel');
    if (!panel) {
      panel = el('div', { id: 'forge-auth-panel', class: 'auth-panel' });
      panel.innerHTML = `<div class="auth-card"><div class="logo big"><span class="logo-mark big"></span><span>FORGE</span></div><h2 id="auth-title">Sign in to FORGE</h2><p id="auth-subtitle">Sign in to sync your FORGE account and keep projects organized.</p><div id="auth-form"></div><div id="auth-error" class="auth-error" hidden></div><div class="auth-switch" id="auth-switch"></div><div class="auth-legal">By continuing you agree to the <button id="auth-terms">Terms of Service</button> and <button id="auth-privacy">Privacy Policy</button>.</div></div>`;
      home.appendChild(panel);
      $('#auth-terms').onclick = () => legalModal('Terms of Service', TERMS);
      $('#auth-privacy').onclick = () => legalModal('Privacy Policy', PRIVACY);
    }
    this.renderAuthForm('login');
  },
  renderAuthForm(mode='login') {
    const form = $('#auth-form'); if (!form) return;
    const signup = mode === 'signup';
    $('#auth-title').textContent = signup ? 'Create your FORGE account' : 'Sign in to FORGE';
    $('#auth-subtitle').textContent = signup ? 'Projects are saved to this device under your account.' : 'Continue editing your saved projects.';
    form.innerHTML = `${signup ? '<label>Name<input id="auth-name" autocomplete="name" placeholder="Your name"></label>' : ''}<label>Email<input id="auth-email" type="email" autocomplete="email" placeholder="you@example.com"></label><label>Password<input id="auth-password" type="password" autocomplete="current-password" placeholder="At least 8 characters"></label>${signup ? '<label class="auth-check"><input id="auth-terms-check" type="checkbox"> <span>I agree to the Terms and Privacy Policy</span></label>' : ''}<button id="auth-submit" class="btn primary auth-submit">${signup ? 'Create account' : 'Sign in'}</button>`;
    $('#auth-submit').onclick = async () => {
      const err = $('#auth-error'); err.hidden = true;
      try {
        if (signup) await auth.signup({ name: $('#auth-name').value, email: $('#auth-email').value, password: $('#auth-password').value, acceptedTerms: $('#auth-terms-check').checked });
        else await auth.login({ email: $('#auth-email').value, password: $('#auth-password').value });
        $('#forge-auth-panel')?.remove(); await project.listProjects(); window.dispatchEvent(new CustomEvent('forge:auth-ready')); ui.toast(signup ? 'FORGE account created' : 'Welcome back', 'success');
      } catch (e) { err.textContent = e.message || 'Unable to continue.'; err.hidden = false; }
    };
    $('#auth-switch').innerHTML = signup ? 'Already have an account? <button id="auth-switch-btn">Sign in</button>' : 'New to FORGE? <button id="auth-switch-btn">Create an account</button>';
    $('#auth-switch-btn').onclick = () => this.renderAuthForm(signup ? 'login' : 'signup');
  },
  openAccount() {
    if (!auth.user()) return this.showAuth();
    const u = auth.user();
    const body = el('div', { class:'account-modal-body' },
      el('div', { class:'account-avatar', text:(u.name||'F').slice(0,1).toUpperCase() }),
      el('h3', { text:u.name }), el('div',{class:'account-email',text:u.email}),
      el('p',{class:'account-note',text:'Local account • Projects are stored on this device.'})
    );
    const m = ui.showModal('FORGE Account', body, { width: 460 });
    m.footer.appendChild(el('button',{class:'btn',text:'Terms',onclick:()=>legalModal('Terms of Service',TERMS)}));
    m.footer.appendChild(el('button',{class:'btn',text:'Privacy',onclick:()=>legalModal('Privacy Policy',PRIVACY)}));
    m.footer.appendChild(el('button',{class:'btn',text:'Sign out',onclick:async()=>{m.close();await auth.logout();this.showAuth();}}));
    m.footer.appendChild(el('button',{class:'btn danger',text:'Delete account',onclick:async()=>{if(await ui.confirm({title:'Delete account',message:'This removes the local account and all projects owned by it from this device. This cannot be undone.',confirmLabel:'Delete account',danger:true})){m.close();await auth.deleteAccount();this.showAuth();}}}));
  },
  terms: TERMS, privacy: PRIVACY
};
