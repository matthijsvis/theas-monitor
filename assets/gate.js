/**
 * Wachtwoordpagina: oogje bij het wachtwoord en het stippenveld, een zwevende wolk stippen met dunne lijntjes naar
 * het midden. In rust in de inktkleur, met de muis erover (of na een tik) in kleur.
 */
(function () {
	'use strict';

	const input = document.getElementById('theas-gate-password');
	const eye = document.querySelector('.gate__eye');
	eye.hidden = false;
	eye.addEventListener('click', () => {
		const show = input.type === 'password';
		input.type = show ? 'text' : 'password';
		eye.setAttribute('aria-pressed', String(show));
		eye.setAttribute('aria-label', show ? 'Wachtwoord verbergen' : 'Wachtwoord tonen');
		input.focus();
	});

	const art = document.querySelector('.gate__art');
	const canvas = art.querySelector('canvas');
	const ctx = canvas.getContext('2d');
	const still = window.matchMedia('(prefers-reduced-motion: reduce)');
	const dark = window.matchMedia('(prefers-color-scheme: dark)');
	const COLORS = [[255, 133, 71], [227, 173, 14], [168, 162, 44]];
	const rand = (a, b) => a + Math.random() * (b - a);

	const dots = Array.from({ length: 54 }, () => {
		const colored = Math.random() < 0.28;
		return {
			color: colored ? COLORS[Math.floor(Math.random() * 3)] : null,
			r: colored ? rand(2, 5.5) : 1.6 + Math.pow(Math.random(), 1.9) * (Math.random() < 0.1 ? 10 : 6.5),
			dist: 0.1 + Math.pow(Math.random(), 0.8) * 0.9,
			angle: Math.random() * Math.PI * 2,
			phase: Math.random() * Math.PI * 2,
			link: Math.random() < 0.62,
		};
	});

	let W = 0;
	let H = 0;
	let t = 0;
	let tint = 0;
	let goal = 0;
	let last = 0;
	let raf = 0;

	const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--lo').trim().split(/\s+/).map(Number);

	function draw() {
		const base = ink();
		const cx = W * 0.5;
		const cy = H * 0.47;
		const R = Math.min(W * 0.46, H * 0.42);
		const breathe = 1 + Math.sin(t * 0.4) * 0.012;
		ctx.clearRect(0, 0, W, H);

		const spots = dots.map((d) => {
			const a = d.angle + t * 0.012;
			return {
				x: cx + Math.cos(a) * d.dist * R * 1.08 * breathe + Math.sin(t * 0.6 + d.phase) * 3,
				y: cy + Math.sin(a) * d.dist * R * breathe + Math.cos(t * 0.5 + d.phase * 1.3) * 3,
			};
		});

		ctx.lineWidth = 1;
		ctx.strokeStyle = 'rgba(' + base.join(',') + ',0.09)';
		dots.forEach((d, i) => {
			if (!d.link) return;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.lineTo(spots[i].x, spots[i].y);
			ctx.stroke();
		});

		ctx.fillStyle = 'rgb(' + base.join(',') + ')';
		ctx.beginPath();
		ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = 'rgba(' + base.join(',') + ',0.12)';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.arc(cx, cy, 11 + Math.sin(t * 1.6) * 1.5, 0, Math.PI * 2);
		ctx.stroke();

		dots.forEach((d, i) => {
			const color = d.color || base;
			ctx.fillStyle = 'rgb(' + base.map((v, c) => Math.round(v + (color[c] - v) * tint)).join(',') + ')';
			ctx.beginPath();
			ctx.arc(spots[i].x, spots[i].y, d.r, 0, Math.PI * 2);
			ctx.fill();
		});
	}

	function frame(now) {
		raf = 0;
		const dt = Math.min(0.25, (now - last) / 1000);
		last = now;
		tint += Math.sign(goal - tint) * Math.min(Math.abs(goal - tint), dt / 0.4);
		if (!still.matches) t += dt;
		draw();
		if (!document.hidden && (!still.matches || tint !== goal)) raf = requestAnimationFrame(frame);
	}

	function kick() {
		if (!raf) {
			last = performance.now();
			raf = requestAnimationFrame(frame);
		}
	}

	function resize() {
		const box = canvas.getBoundingClientRect();
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = box.width;
		H = box.height;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		draw();
	}

	art.addEventListener('pointerenter', () => { goal = 1; kick(); });
	art.addEventListener('pointerleave', () => { goal = 0; kick(); });
	document.addEventListener('visibilitychange', kick);
	still.addEventListener('change', kick);
	dark.addEventListener('change', draw);
	new ResizeObserver(resize).observe(art);
	resize();
	kick();
})();
