'use strict';
document.querySelectorAll('details').forEach(detail => {
  detail.addEventListener('toggle', () => {
    if (detail.open) document.querySelectorAll('details').forEach(other => { if (other !== detail) other.open = false; });
  });
});
const dialog = document.getElementById('art-dialog');
const artImage = document.getElementById('art-image');
const artTitle = document.getElementById('art-title');
document.querySelectorAll('[data-image]').forEach(button => {
  button.addEventListener('click', () => {
    artImage.src = button.dataset.image;
    artImage.alt = button.dataset.title;
    artTitle.textContent = button.dataset.title;
    dialog.showModal();
  });
});
document.getElementById('close-art').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if(event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });

// Device-local appearance preferences, with system settings as the default.
const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');
const motionToggle = document.getElementById('motion-toggle');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let chosenTheme = null;
try { chosenTheme = localStorage.getItem('nandagopal-theme'); } catch (_) {}
function updateTheme(theme) {
  root.dataset.theme = theme;
  const dark = theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeLabel.textContent = dark ? 'Light mode' : 'Dark mode';
  themeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#101115' : '#f5f5f2';
}
themeToggle.addEventListener('click', () => {
  chosenTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  updateTheme(chosenTheme);
  try { localStorage.setItem('nandagopal-theme', chosenTheme); } catch (_) {}
});
systemTheme.addEventListener('change', event => {
  if (chosenTheme !== 'dark' && chosenTheme !== 'light') updateTheme(event.matches ? 'dark' : 'light');
});
function updateMotionControl() {
  const reduced = reducedMotion.matches;
  const paused = root.dataset.motion === 'paused';
  motionToggle.disabled = reduced;
  motionToggle.textContent = reduced ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
  motionToggle.setAttribute('aria-pressed', String(reduced || paused));
  motionToggle.setAttribute('aria-label', reduced ? 'Motion disabled by your device preference' : 'Pause background motion');
}
motionToggle.addEventListener('click', () => {
  root.dataset.motion = root.dataset.motion === 'paused' ? 'running' : 'paused';
  try { localStorage.setItem('nandagopal-motion', root.dataset.motion); } catch (_) {}
  updateMotionControl();
});
reducedMotion.addEventListener('change', updateMotionControl);
document.addEventListener('visibilitychange', () => root.classList.toggle('page-hidden', document.hidden));
updateTheme(root.dataset.theme);
updateMotionControl();
