/* FORGE — mobile presentation shell.
 * Uses the exact same editor modules/state as desktop.
 * This file owns only mobile navigation/sheet behavior.
 */
import { $$, el, svgIcon } from '../js/utils.js';

const tabs = [
  ['media', 'Media', 'film'],
  ['text', 'Text', 'type'],
  ['audio', 'Audio', 'music'],
  ['effects', 'Effects', 'wand'],
  ['transitions', 'Transitions', 'shuffle'],
  ['stickers', 'Stickers', 'star'],
  ['filters', 'Filters', 'sliders'],
  ['inspector', 'Adjust', 'sliders'],
];

function setActive(id) {
  $$('.forge-mobile-nav-item').forEach(b => b.classList.toggle('active', b.dataset.mobileTab === id));
}

function closeSheets() {
  document.querySelector('#left-panel')?.classList.remove('mobile-open');
  document.querySelector('#right-panel')?.classList.remove('mobile-open');
  setActive('');
}

function openSheet(id) {
  const left = document.querySelector('#left-panel');
  const right = document.querySelector('#right-panel');
  if (id === 'inspector') {
    left?.classList.remove('mobile-open');
    right?.classList.add('mobile-open');
  } else {
    right?.classList.remove('mobile-open');
    left?.classList.add('mobile-open');
    document.querySelector(`#left-tabs .ltab[data-tab="${id}"]`)?.click();
  }
  setActive(id);
}

export function initMobileUI() {
  if (document.querySelector('#forge-mobile-nav')) return;

  const nav = el('nav', {
    id: 'forge-mobile-nav',
    class: 'forge-mobile-nav',
    'aria-label': 'FORGE mobile tools'
  });

  for (const [id, label, icon] of tabs) {
    nav.appendChild(el('button', {
      class: 'forge-mobile-nav-item',
      'data-mobile-tab': id,
      type: 'button',
      'aria-label': label,
      html: `${svgIcon(icon, 20)}<span>${label}</span>`,
      onclick: () => openSheet(id)
    }));
  }

  document.body.appendChild(nav);

  const backdrop = el('div', {
    id: 'forge-mobile-backdrop',
    class: 'forge-mobile-backdrop',
    'aria-hidden': 'true'
  });
  backdrop.addEventListener('click', closeSheets);
  document.body.appendChild(backdrop);

  const syncBackdrop = () => {
    const open = document.querySelector('#left-panel.mobile-open, #right-panel.mobile-open');
    backdrop.classList.toggle('visible', Boolean(open));
  };

  const observer = new MutationObserver(syncBackdrop);
  document.querySelector('#left-panel') && observer.observe(document.querySelector('#left-panel'), { attributes: true, attributeFilter: ['class'] });
  document.querySelector('#right-panel') && observer.observe(document.querySelector('#right-panel'), { attributes: true, attributeFilter: ['class'] });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheets();
  });

  document.querySelector('#center')?.addEventListener('pointerdown', e => {
    if (!e.target.closest('#left-panel, #right-panel, #forge-mobile-nav')) closeSheets();
  }, { passive: true });

  window.addEventListener('forge:platform', e => {
    if (!e.detail?.mobile) closeSheets();
  });

  syncBackdrop();
}
