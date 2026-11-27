/**
 * Stippenveld op de wachtwoordpagina en het inlogscherm: een zwevende wolk stippen met dunne lijntjes naar het
 * midden. Daar staat het icoon van de website (data-icon), of de eerste letter van de naam (data-letter) als er geen
 * icoon is. In rust in de inktkleur, met de muis erover (of na een tik) in kleur. Werkt op het element met
 * data-theas-dots en de canvas daarin.
 */
(function () {
	'use strict';

	const art = document.querySelector('[data-theas-dots]');
	const canvas = art && art.querySelector('canvas');
	if (!canvas) return;

	const ctx = canvas.getContext('2d');
	const still = window.matchMedia('(prefers-reduced-motion: reduce)');
	const dark = window.matchMedia('(prefers-color-scheme: dark)');
	const COLORS = [[255, 133, 71], [227, 173, 14], [168, 162, 44]];
	const rand = (a, b) => a + Math.random() * (b - a);
	const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

	const letter = art.dataset.letter || '';
	const HUB = art.dataset.icon || letter ? 24 : 0; // straal van het icoon in het midden
	let icon = null;
	if (art.dataset.icon) {
		const img = new Image();
		img.onload = () => { icon = img; draw(); };
		img.src = art.dataset.icon;
	}

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

	const ink = () => token('--lo').split(/\s+/).map(Number);

	function circle(x, y, r) {
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
	}

	// Het midden: het icoon (of de letter) in een rondje met een zacht kloppende ring, anders een stip.
	function drawHub(cx, cy, base) {
		const pulse = Math.sin(t * 1.6) * 1.5;
		ctx.strokeStyle = 'rgba(' + base.join(',') + ',0.12)';
		ctx.lineWidth = 3;
		circle(cx, cy, (HUB ? HUB + 8 : 11) + pulse);
		ctx.stroke();

		if (!HUB) {
			ctx.fillStyle = 'rgb(' + base.join(',') + ')';
			circle(cx, cy, 3.5);
			ctx.fill();
			return;
		}

		ctx.save();
		circle(cx, cy, HUB);
		ctx.fillStyle = icon ? token('--disc') : 'rgb(' + base.join(',') + ')';
		ctx.fill();
		ctx.clip();
		if (icon) {
			ctx.drawImage(icon, cx - HUB, cy - HUB, HUB * 2, HUB * 2);
		} else if (!art.dataset.icon && letter) {
			ctx.fillStyle = token('--cream');
			ctx.font = '500 ' + Math.round(HUB * 0.85) + 'px Geist, ui-sans-serif, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(letter, cx, cy + 1);
		}
		ctx.restore();
		ctx.strokeStyle = 'rgba(' + base.join(',') + ',0.1)';
		ctx.lineWidth = 1;
		circle(cx, cy, HUB);
		ctx.stroke();
	}

	function draw() {
		const base = ink();
		const cx = W * 0.5;
		const cy = H * 0.47;
		const R = Math.min(W * 0.46, H * 0.42);
		const inner = HUB ? HUB + 14 : 0; // stippen blijven buiten het icoon
		const breathe = 1 + Math.sin(t * 0.4) * 0.012;
		ctx.clearRect(0, 0, W, H);

		const spots = dots.map((d) => {
			const a = d.angle + t * 0.012;
			const r = inner + d.dist * (R - inner);
			return {
				x: cx + Math.cos(a) * r * 1.08 * breathe + Math.sin(t * 0.6 + d.phase) * 3,
				y: cy + Math.sin(a) * r * breathe + Math.cos(t * 0.5 + d.phase * 1.3) * 3,
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

		dots.forEach((d, i) => {
			const color = d.color || base;
			ctx.fillStyle = 'rgb(' + base.map((v, c) => Math.round(v + (color[c] - v) * tint)).join(',') + ')';
			circle(spots[i].x, spots[i].y, d.r);
			ctx.fill();
		});

		drawHub(cx, cy, base);
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
	if (document.fonts) document.fonts.ready.then(draw); // de letter pas in Geist als dat geladen is
	new ResizeObserver(resize).observe(art);
	resize();
	kick();
})();
