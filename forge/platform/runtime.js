/* FORGE — platform/runtime detection shared by all UI shells. */

function detect() {
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const desktop = Boolean(window.forgeDesktop?.isDesktop);
  const mobile = !desktop && (mobileUA || (touch && window.innerWidth <= 900));

  if (desktop) return { name: 'desktop', desktop: true, mobile: false, touch };
  if (mobile) return { name: 'mobile', desktop: false, mobile: true, touch };
  return { name: 'web', desktop: false, mobile: false, touch };
}

export const platform = detect();

export function applyPlatformAttributes() {
  const root = document.documentElement;
  root.dataset.forgePlatform = platform.name;
  root.dataset.forgeTouch = platform.touch ? '1' : '0';
  root.classList.toggle('forge-mobile', platform.mobile);
  root.classList.toggle('forge-desktop', platform.desktop);

  window.dispatchEvent(new CustomEvent('forge:platform', { detail: platform }));
  return platform;
}

window.addEventListener('resize', () => {
  const next = detect();
  if (next.name === platform.name && next.touch === platform.touch) return;
  Object.assign(platform, next);
  applyPlatformAttributes();
});
