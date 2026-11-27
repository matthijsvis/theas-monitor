/**
 * Wachtwoordpagina: oogje om het wachtwoord te tonen. Het stippenveld staat in dots.js.
 */
(function () {
	'use strict';

	const input = document.getElementById('theas-gate-password');
	const eye = document.querySelector('.gate__eye');
	if (!input || !eye) return;
	eye.hidden = false;
	eye.addEventListener('click', () => {
		const show = input.type === 'password';
		input.type = show ? 'text' : 'password';
		eye.setAttribute('aria-pressed', String(show));
		eye.setAttribute('aria-label', show ? 'Wachtwoord verbergen' : 'Wachtwoord tonen');
		input.focus();
	});
})();
