/**
 * Meldknop voor ingelogde gebruikers (Verymooi Monitor). Rechtsonder een ronde knop die je kunt verslepen (de plek
 * wordt onthouden). Een klik opent een venster: soort (fout, wens, vraag), bericht, een element op de pagina kiezen
 * (oranje kader, ook zichtbaar op de schermafbeelding) en een schermafbeelding van het tabblad (via de browser, die
 * om toestemming vraagt). Alles staat in een shadow root, zodat het thema de knop niet verandert en andersom.
 */
(function () {
	'use strict';

	const cfg = window.vmFeedback;
	if (!cfg || !document.body) return;

	const KEY = 'vmFeedbackPos';
	const canShoot = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
	const ICON_CHAT = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M12 8v4.5M12 15.5v.01"/></svg>';

	const host = document.createElement('div');
	host.id = 'verymooi-feedback';
	const root = host.attachShadow({ mode: 'open' });
	root.innerHTML = '<style>'
		+ ':host { all: initial; }'
		+ '* { box-sizing: border-box; }'
		+ '.ui { --ink: #1a1614; --paper: #f3f2ed; --card: #fbfaf7; --muted: #67625c; --line: rgba(26,22,20,.12); --orange: #ff8547; --danger: #c4531c;'
		+ ' position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font: 400 14px/1.45 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); }'
		+ '@media (prefers-color-scheme: dark) { .ui { --ink: #f5f4ef; --paper: #1f1c1a; --card: #262320; --muted: #aaa49c; --line: rgba(245,244,239,.14); } }'
		+ '.fab { position: fixed; width: 48px; height: 48px; border: 0; border-radius: 50%; background: #1a1614; color: #f5f4ef; display: grid; place-items: center; cursor: grab; pointer-events: auto; touch-action: none;'
		+ ' box-shadow: 0 0 0 2px rgba(255,255,255,.75), 0 2px 6px rgba(26,22,20,.18), 0 12px 28px -10px rgba(26,22,20,.45); transition: transform .15s ease; }'
		+ '.fab:hover { transform: scale(1.06); } .fab:focus-visible { outline: 2px solid var(--orange); outline-offset: 3px; } .fab.is-dragging { cursor: grabbing; transform: scale(1.08); transition: none; }'
		+ '.panel { position: fixed; width: min(340px, calc(100vw - 24px)); padding: 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); pointer-events: auto;'
		+ ' box-shadow: 0 2px 6px rgba(26,22,20,.08), 0 28px 60px -18px rgba(26,22,20,.4); }'
		+ '.panel[hidden], .fab[hidden], [hidden] { display: none !important; }'
		+ 'h2 { margin: 0 0 10px; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }'
		+ '.types { display: flex; gap: 4px; margin: 0 0 10px; padding: 3px; border-radius: 999px; background: var(--line); }'
		+ '.types button { flex: 1; min-height: 30px; border: 0; border-radius: 999px; background: none; color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; }'
		+ '.types button[aria-pressed="true"] { background: var(--card); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(26,22,20,.12); }'
		+ 'textarea { display: block; width: 100%; min-height: 96px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); color: var(--ink); font: inherit; resize: vertical; }'
		+ 'textarea:focus { outline: none; border-color: var(--ink); }'
		+ '.tools { display: flex; gap: 6px; margin: 10px 0 0; }'
		+ '.tool { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 0 10px; border: 1px dashed var(--line); border-radius: 10px; background: none; color: var(--ink); font: inherit; font-size: 13px; cursor: pointer; }'
		+ '.tool:hover:not(:disabled) { border-style: solid; } .tool:disabled { opacity: .45; cursor: not-allowed; }'
		+ '.chips { display: grid; gap: 6px; margin: 10px 0 0; }'
		+ '.chip { display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 10px; border-radius: 10px; background: var(--paper); font-size: 12.5px; }'
		+ '.chip span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'
		+ '.chip img { width: 56px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid var(--line); }'
		+ '.chip button { width: 24px; height: 24px; border: 0; border-radius: 6px; background: none; color: var(--muted); font-size: 16px; line-height: 1; cursor: pointer; }'
		+ '.foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 12px 0 0; }'
		+ '.status { font-size: 12.5px; color: var(--muted); } .status.is-error { color: var(--danger); }'
		+ '.send { min-height: 36px; padding: 0 18px; border: 0; border-radius: 999px; background: var(--ink); color: var(--card); font: inherit; font-weight: 600; cursor: pointer; } .send:disabled { opacity: .5; cursor: wait; }'
		+ '.close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border: 0; border-radius: 8px; background: none; color: var(--muted); font-size: 18px; cursor: pointer; }'
		+ '.mark { position: fixed; border: 2px solid var(--orange); border-radius: 4px; background: rgba(255,133,71,.12); box-shadow: 0 0 0 4px rgba(255,133,71,.25); pointer-events: none; transition: all .06s linear; }'
		+ '.hint { position: fixed; left: 50%; top: 48px; transform: translateX(-50%); padding: 8px 14px; border-radius: 999px; background: #1a1614; color: #f5f4ef; font-size: 13px; pointer-events: none; box-shadow: 0 8px 24px -8px rgba(0,0,0,.4); }'
		+ '</style>'
		+ '<div class="ui">'
		+ '<div class="mark" hidden></div>'
		+ '<div class="hint" hidden>Klik op het onderdeel waar het om gaat · Esc om te stoppen</div>'
		+ '<section class="panel" role="dialog" aria-label="Iets melden" hidden>'
		+ '<button type="button" class="close" aria-label="Sluiten">×</button>'
		+ '<h2>Iets melden</h2>'
		+ '<div class="types" role="group" aria-label="Soort"></div>'
		+ '<textarea placeholder="Wat zie je, en wat had je verwacht?" aria-label="Bericht"></textarea>'
		+ '<div class="tools">'
		+ '<button type="button" class="tool" data-pick>Element kiezen</button>'
		+ '<button type="button" class="tool" data-shot>Schermafbeelding</button>'
		+ '</div>'
		+ '<div class="chips"><div class="chip" data-element hidden><span></span><button type="button" aria-label="Element weghalen">×</button></div>'
		+ '<div class="chip" data-image hidden><img alt="Schermafbeelding"><span>Schermafbeelding</span><button type="button" aria-label="Schermafbeelding weghalen">×</button></div></div>'
		+ '<div class="foot"><span class="status" role="status"></span><button type="button" class="send">Versturen</button></div>'
		+ '</section>'
		+ '<button type="button" class="fab" aria-label="Iets melden" title="Iets melden (sleep om te verplaatsen)">' + ICON_CHAT + '</button>'
		+ '</div>';
	document.body.append(host);

	const $ = (sel) => root.querySelector(sel);
	const fab = $('.fab');
	const panel = $('.panel');
	const text = $('textarea');
	const mark = $('.mark');
	const hint = $('.hint');
	const status = $('.status');
	const send = $('.send');
	const types = $('.types');
	const elChip = $('[data-element]');
	const imgChip = $('[data-image]');
	const shotBtn = $('[data-shot]');

	let type = 'bug';
	let element = null; // { node, selector, text }
	let shot = '';

	Object.entries(cfg.types).forEach(([value, label]) => {
		const b = document.createElement('button');
		b.type = 'button';
		b.textContent = label;
		b.dataset.type = value;
		types.append(b);
	});
	const setType = (value) => {
		type = value;
		types.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === value)));
	};
	setType('bug');
	types.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setType(b.dataset.type); });

	if (!canShoot) {
		shotBtn.disabled = true;
		shotBtn.title = 'Deze browser kan geen schermafbeelding maken';
	}

	/* ------------------------------------------------------------ Plek van de knop */

	const SIZE = 48;
	const MARGIN = 16;
	let pos = { right: 20, bottom: 20 };
	try { pos = JSON.parse(localStorage.getItem(KEY)) || pos; } catch (e) { /* geen opslag */ }

	function place() {
		pos.right = Math.min(Math.max(pos.right, 4), window.innerWidth - SIZE - 4);
		pos.bottom = Math.min(Math.max(pos.bottom, 4), window.innerHeight - SIZE - 4);
		fab.style.right = pos.right + 'px';
		fab.style.bottom = pos.bottom + 'px';
		if (!panel.hidden) placePanel();
	}

	// Het venster naast de knop, aan de kant waar ruimte is.
	function placePanel() {
		const r = fab.getBoundingClientRect();
		const w = panel.offsetWidth;
		const h = panel.offsetHeight;
		const left = r.left + SIZE / 2 > window.innerWidth / 2 ? r.right - w : r.left;
		const top = r.top > window.innerHeight / 2 ? r.top - h - 12 : r.bottom + 12;
		panel.style.left = Math.min(Math.max(left, 12), window.innerWidth - w - 12) + 'px';
		panel.style.top = Math.min(Math.max(top, 12), window.innerHeight - h - 12) + 'px';
	}

	let drag = null;
	fab.addEventListener('pointerdown', (e) => {
		if (e.button !== 0) return;
		drag = { id: e.pointerId, x: e.clientX, y: e.clientY, right: pos.right, bottom: pos.bottom, moved: false };
		fab.setPointerCapture(e.pointerId);
	});
	fab.addEventListener('pointermove', (e) => {
		if (!drag || e.pointerId !== drag.id) return;
		const dx = e.clientX - drag.x;
		const dy = e.clientY - drag.y;
		if (!drag.moved && Math.hypot(dx, dy) < 5) return;
		drag.moved = true;
		fab.classList.add('is-dragging');
		pos.right = drag.right - dx;
		pos.bottom = drag.bottom - dy;
		place();
	});
	fab.addEventListener('pointerup', (e) => {
		if (!drag || e.pointerId !== drag.id) return;
		const moved = drag.moved;
		drag = null;
		fab.classList.remove('is-dragging');
		if (moved) {
			try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch (err) { /* geen opslag */ }
			return;
		}
		toggle(panel.hidden);
	});
	fab.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(panel.hidden); }
	});
	window.addEventListener('resize', place);
	place();

	function toggle(open) {
		panel.hidden = !open;
		if (open) {
			placePanel();
			text.focus();
			showMark();
		} else {
			mark.hidden = true;
		}
	}
	$('.close').addEventListener('click', () => toggle(false));

	/* ------------------------------------------------------------ Element kiezen */

	function cssPath(node) {
		if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) return '#' + CSS.escape(node.id);
		const parts = [];
		for (let el = node; el && el.nodeType === 1 && el !== document.body && parts.length < 5; el = el.parentElement) {
			if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) { parts.unshift('#' + CSS.escape(el.id)); break; }
			let part = el.tagName.toLowerCase();
			const cls = [...el.classList].filter((c) => !/^(is-|has-|wp-elements-|wp-container-)/.test(c)).slice(0, 2);
			if (cls.length) part += '.' + cls.map((c) => CSS.escape(c)).join('.');
			const same = el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName) : [];
			if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
			parts.unshift(part);
		}
		return parts.join(' > ');
	}

	function frame(node) {
		const r = node.getBoundingClientRect();
		mark.style.left = (r.left - 4) + 'px';
		mark.style.top = (r.top - 4) + 'px';
		mark.style.width = (r.width + 8) + 'px';
		mark.style.height = (r.height + 8) + 'px';
		mark.hidden = false;
	}
	function showMark() {
		if (element && element.node.isConnected) frame(element.node); else mark.hidden = true;
	}
	window.addEventListener('scroll', () => { if (!panel.hidden && !picking) showMark(); }, { passive: true });

	let picking = false;
	const target = (e) => {
		host.style.display = 'none';
		const node = document.elementFromPoint(e.clientX, e.clientY);
		host.style.display = '';
		return node && node !== document.documentElement && node !== document.body ? node : null;
	};
	function onMove(e) {
		const node = target(e);
		if (node) frame(node); else mark.hidden = true;
	}
	function onClick(e) {
		e.preventDefault();
		e.stopPropagation();
		const node = target(e);
		stopPicking();
		if (node) {
			const label = (node.innerText || node.getAttribute('alt') || node.getAttribute('aria-label') || node.value || '').trim().replace(/\s+/g, ' ').slice(0, 160);
			element = { node, selector: cssPath(node), text: label };
			elChip.querySelector('span').textContent = node.tagName.toLowerCase() + (label ? ': “' + label.slice(0, 60) + '”' : '');
			elChip.hidden = false;
		}
		showMark();
	}
	function onKey(e) {
		if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stopPicking(); showMark(); } // alleen het kiezen stoppen, niet het venster sluiten
	}
	function startPicking() {
		picking = true;
		panel.hidden = true;
		hint.hidden = false;
		document.addEventListener('mousemove', onMove, true);
		document.addEventListener('click', onClick, true);
		document.addEventListener('keydown', onKey, true);
		document.documentElement.style.cursor = 'crosshair';
	}
	function stopPicking() {
		picking = false;
		hint.hidden = true;
		panel.hidden = false;
		document.removeEventListener('mousemove', onMove, true);
		document.removeEventListener('click', onClick, true);
		document.removeEventListener('keydown', onKey, true);
		document.documentElement.style.cursor = '';
		placePanel();
	}
	$('[data-pick]').addEventListener('click', startPicking);
	elChip.querySelector('button').addEventListener('click', () => { element = null; elChip.hidden = true; mark.hidden = true; });

	/* ------------------------------------------------------------ Schermafbeelding */

	const wait = (ms) => new Promise((r) => setTimeout(r, ms));

	// Eén beeld van dit tabblad. De knop en het venster gaan even weg; het kader om het gekozen element blijft staan.
	shotBtn.addEventListener('click', async () => {
		if (element && element.node.isConnected) element.node.scrollIntoView({ block: 'center' });
		panel.hidden = true;
		fab.hidden = true;
		let stream = null;
		try {
			stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 5 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude' });
			showMark();
			const video = document.createElement('video');
			video.muted = true;
			video.srcObject = stream;
			await video.play();
			await wait(500); // de balk "dit tabblad wordt gedeeld" laat de pagina even verspringen
			const scale = Math.min(1, 1600 / video.videoWidth);
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(video.videoWidth * scale);
			canvas.height = Math.round(video.videoHeight * scale);
			canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
			shot = canvas.toDataURL('image/jpeg', 0.75);
			imgChip.querySelector('img').src = shot;
			imgChip.hidden = false;
			setStatus('');
		} catch (err) {
			setStatus(err && err.name === 'NotAllowedError' ? 'Geen schermafbeelding: geen toestemming gegeven.' : 'Schermafbeelding maken lukte niet.', true);
		} finally {
			if (stream) stream.getTracks().forEach((t) => t.stop());
			fab.hidden = false;
			panel.hidden = false;
			placePanel();
		}
	});
	imgChip.querySelector('button').addEventListener('click', () => { shot = ''; imgChip.hidden = true; });

	/* ------------------------------------------------------------ Versturen */

	function setStatus(msg, error) {
		status.textContent = msg;
		status.classList.toggle('is-error', !!error);
	}

	send.addEventListener('click', async () => {
		if (!text.value.trim()) { setStatus('Schrijf kort wat er aan de hand is.', true); text.focus(); return; }
		send.disabled = true;
		setStatus('Versturen…');
		try {
			const res = await fetch(cfg.url, {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.nonce },
				body: JSON.stringify({
					type,
					message: text.value,
					url: location.href,
					title: document.title,
					viewport: window.innerWidth + '×' + window.innerHeight + (window.devicePixelRatio > 1 ? ' @' + window.devicePixelRatio + 'x' : ''),
					element: element ? { selector: element.selector, text: element.text } : null,
					errors: window.vmErrors || [],
					shot,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data.message || 'Versturen lukte niet (' + res.status + ').');
			text.value = '';
			element = null;
			shot = '';
			elChip.hidden = true;
			imgChip.hidden = true;
			mark.hidden = true;
			setStatus('Verstuurd, dank je!');
		} catch (err) {
			setStatus(err.message || 'Geen verbinding.', true);
		} finally {
			send.disabled = false;
		}
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && !panel.hidden && !picking) toggle(false);
	});
})();
