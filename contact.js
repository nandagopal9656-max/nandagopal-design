'use strict';
const contactForm = document.getElementById('contact-form');
const contactButton = contactForm.querySelector('button[type="submit"]');
const nextDestination = new URL(window.location.href);
nextDestination.search = '?contact=submitted';
nextDestination.hash = 'contact';
contactForm.elements.namedItem('_next').value = nextDestination.href;
contactForm.elements.namedItem('_url').value = window.location.origin + window.location.pathname + '#contact';
contactForm.addEventListener('submit', (event) => {
  if (!contactForm.checkValidity()) { event.preventDefault(); contactForm.reportValidity(); return; }
  contactButton.disabled = true;
  contactButton.textContent = 'Sending…';
});
window.addEventListener('pageshow', () => {
  contactButton.disabled = false;
  contactButton.textContent = 'Send message ↗';
});
if (new URLSearchParams(window.location.search).get('contact') === 'submitted') {
  const status = document.getElementById('contact-status');
  status.hidden = false;
  status.focus({ preventScroll: true });
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('contact');
  history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + '#contact');
}
