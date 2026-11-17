/**
 * Meldknop voor ingelogde gebruikers (Verymooi Monitor). Rechtsonder een ronde knop die je kunt verslepen (de plek
 * wordt onthouden). Een klik opent een venster: soort (fout, wens, vraag), bericht, een element op de pagina kiezen
 * (oranje kader) en een schermafbeelding toevoegen: kiezen, plakken of erin slepen. De knop Schermafbeelding legt uit
 * hoe je er een maakt, voor het systeem en de browser van de gebruiker (Mac, Windows, iPhone, Android, …).
 *
 * Verzoekpunten verzamelen: "Toevoegen" zet het punt op een lijst, die blijft staan als je naar een andere pagina gaat
 * (localStorage, per gebruiker); elk punt onthoudt zijn eigen pagina. "Versturen" stuurt de hele lijst. Het aantal staat
 * als bolletje op de knop.
 *
 * Het kader volgt het gekozen element zolang het venster open is (ook bij scrollen in een onderdeel, inklappende menu's of
 * animaties), en het venster gaat opzij als het over het element zou vallen. Alles staat in een shadow root, zodat het
 * thema de knop niet verandert en andersom.
 */
(function () {
	'use strict';

	const cfg = window.vmFeedback;
	if (!cfg || !document.body) return;

	const POS = 'vmFeedbackPos';
	const LIST = 'vmFeedbackList-' + cfg.user;
	const MAX = 20;
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
		+ '.badge { position: absolute; top: -4px; right: -4px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px; background: var(--orange); color: #1a1614; font: 700 11px/20px ui-sans-serif, -apple-system, sans-serif; text-align: center; box-shadow: 0 0 0 2px #fff; }'
		+ '.panel { position: fixed; display: flex; flex-direction: column; width: min(360px, calc(100vw - 24px)); max-height: calc(100vh - 24px); padding: 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); pointer-events: auto;'
		+ ' box-shadow: 0 2px 6px rgba(26,22,20,.08), 0 28px 60px -18px rgba(26,22,20,.4); }'
		+ '.panel[hidden], .fab[hidden], [hidden] { display: none !important; }'
		+ '.scroll { min-height: 0; overflow: auto; margin: 0 -4px; padding: 0 4px; }'
		+ 'h2 { margin: 0 0 10px; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }'
		+ 'h3 { margin: 0 0 6px; font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--muted); }'
		+ '.list { margin: 0 0 14px; padding: 0 0 12px; border-bottom: 1px dashed var(--line); }'
		+ '.list ol { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }'
		+ '.item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 6px 8px 10px; border-radius: 10px; background: var(--paper); font-size: 13px; }'
		+ '.item__body { flex: 1; min-width: 0; }'
		+ '.item__text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }'
		+ '.item__meta { display: block; margin-top: 2px; font-size: 11.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'
		+ '.item__type { font-weight: 600; }'
		+ '.types { display: flex; gap: 4px; margin: 0 0 10px; padding: 3px; border-radius: 999px; background: var(--line); }'
		+ '.types button { flex: 1; min-height: 30px; border: 0; border-radius: 999px; background: none; color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; }'
		+ '.types button[aria-pressed="true"] { background: var(--card); color: var(--ink); font-weight: 600; box-shadow: 0 1px 2px rgba(26,22,20,.12); }'
		+ 'textarea { display: block; width: 100%; min-height: 84px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); color: var(--ink); font: inherit; resize: vertical; }'
		+ 'textarea:focus { outline: none; border-color: var(--ink); }'
		+ '.tools { display: flex; gap: 6px; margin: 10px 0 0; }'
		+ '.tool { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 0 10px; border: 1px dashed var(--line); border-radius: 10px; background: none; color: var(--ink); font: inherit; font-size: 13px; cursor: pointer; }'
		+ '.tool:hover:not(:disabled) { border-style: solid; } .tool:disabled { opacity: .45; cursor: not-allowed; }'
		+ '.help { margin: 10px 0 0; padding: 12px; border-radius: 10px; background: var(--paper); font-size: 13px; }'
		+ '.help p { margin: 0 0 8px; } .help ol { margin: 0 0 10px; padding-left: 18px; } .help li { margin: 2px 0; }'
		+ '.help kbd { display: inline-block; min-width: 20px; padding: 0 5px; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px; background: var(--card); font: 600 11.5px/18px ui-monospace, Menlo, monospace; text-align: center; }'
		+ '.help__tip { color: var(--muted); font-size: 12.5px; }'
		+ '.help .tool { width: 100%; border-style: solid; }'
		+ '.panel.is-drop { outline: 2px dashed var(--orange); outline-offset: -6px; }'
		+ '.chips { display: grid; gap: 6px; margin: 10px 0 0; } .chips:empty { display: none; }'
		+ '.chip { display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 10px; border-radius: 10px; background: var(--paper); font-size: 12.5px; }'
		+ '.chip span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'
		+ '.chip img { width: 56px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid var(--line); }'
		+ '.x { flex: none; width: 24px; height: 24px; border: 0; border-radius: 6px; background: none; color: var(--muted); font-size: 16px; line-height: 1; cursor: pointer; } .x:hover { color: var(--ink); background: var(--line); }'
		+ '.foot { flex: none; display: flex; align-items: center; gap: 8px; margin: 12px 0 0; }'
		+ '.status { flex: 1; min-width: 0; font-size: 12.5px; color: var(--muted); } .status.is-error { color: var(--danger); }'
		+ '.add { min-height: 36px; padding: 0 14px; border: 1px dashed var(--muted); border-radius: 999px; background: none; color: var(--ink); font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; } .add:hover { border-style: solid; }'
		+ '.send { min-height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--ink); color: var(--card); font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; } .send:disabled, .add:disabled { opacity: .5; cursor: wait; }'
		+ '.close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border: 0; border-radius: 8px; background: none; color: var(--muted); font-size: 18px; cursor: pointer; }'
		+ '.mark { position: fixed; border: 2px solid var(--orange); border-radius: 4px; background: rgba(255,133,71,.12); box-shadow: 0 0 0 4px rgba(255,133,71,.25); pointer-events: none; }'
		+ '.hint { position: fixed; left: 50%; top: 48px; transform: translateX(-50%); padding: 8px 14px; border-radius: 999px; background: #1a1614; color: #f5f4ef; font-size: 13px; pointer-events: none; box-shadow: 0 8px 24px -8px rgba(0,0,0,.4); white-space: nowrap; }'
		+ '</style>'
		+ '<div class="ui">'
		+ '<div class="mark" hidden></div>'
		+ '<div class="hint" hidden>Klik op het onderdeel waar het om gaat · Esc om te stoppen</div>'
		+ '<section class="panel" role="dialog" aria-label="Iets melden" hidden>'
		+ '<button type="button" class="close" aria-label="Sluiten">×</button>'
		+ '<h2>Iets melden</h2>'
		+ '<div class="scroll">'
		+ '<div class="list" hidden><h3>Verzoekpunten</h3><ol></ol></div>'
		+ '<div class="types" role="group" aria-label="Soort"></div>'
		+ '<textarea placeholder="Wat zie je, en wat had je verwacht?" aria-label="Bericht"></textarea>'
		+ '<div class="tools">'
		+ '<button type="button" class="tool" data-pick>Element kiezen</button>'
		+ '<button type="button" class="tool" data-shot>Schermafbeelding</button>'
		+ '</div>'
		+ '<div class="help" hidden><div class="help__how"></div><button type="button" class="tool" data-upload>Afbeelding kiezen</button><input type="file" accept="image/*" hidden></div>'
		+ '<div class="chips"><div class="chip" data-element hidden><span></span><button type="button" class="x" aria-label="Element weghalen">×</button></div>'
		+ '<div class="chip" data-image hidden><img alt="Schermafbeelding"><span>Schermafbeelding</span><button type="button" class="x" aria-label="Schermafbeelding weghalen">×</button></div></div>'
		+ '</div>'
		+ '<div class="foot"><span class="status" role="status"></span><button type="button" class="add" title="Op de lijst zetten en het volgende punt toevoegen">Toevoegen</button><button type="button" class="send">Versturen</button></div>'
		+ '</section>'
		+ '<button type="button" class="fab" aria-label="Iets melden" title="Iets melden (sleep om te verplaatsen)">' + ICON_CHAT + '<span class="badge" hidden></span></button>'
		+ '</div>';
	// Aan <html> en niet aan <body>: een thema met transform of filter op body zou de vaste plek anders verschuiven.
	document.documentElement.append(host);

	const $ = (sel) => root.querySelector(sel);
	const ui = $('.ui');
	const fab = $('.fab');
	const badge = $('.badge');
	const panel = $('.panel');
	const text = $('textarea');
	const mark = $('.mark');
	const hint = $('.hint');
	const status = $('.status');
	const send = $('.send');
	const add = $('.add');
	const types = $('.types');
	const listBox = $('.list');
	const listEl = $('.list ol');
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

	/* ------------------------------------------------------------ Plek van de knop en het venster */

	const SIZE = 48;
	let pos = { right: 20, bottom: 20 };
	try { pos = JSON.parse(localStorage.getItem(POS)) || pos; } catch (e) { /* geen opslag */ }

	// Verschil tussen de vaste laag en het venster van de browser (hoort 0 te zijn, maar niet elk thema werkt mee).
	const offset = () => { const r = ui.getBoundingClientRect(); return { x: r.left, y: r.top }; };

	function place() {
		if (!window.innerWidth) return; // tabblad nog zonder afmeting (op de achtergrond geladen)
		pos.right = Math.min(Math.max(pos.right, 4), window.innerWidth - SIZE - 4);
		pos.bottom = Math.min(Math.max(pos.bottom, 4), window.innerHeight - SIZE - 4);
		fab.style.right = pos.right + 'px';
		fab.style.bottom = pos.bottom + 'px';
		if (!panel.hidden) placePanel();
	}

	const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

	/**
	 * Het venster naast de knop, aan de kant waar ruimte is. Valt het over het gekozen element, dan naar de andere
	 * kant van het scherm (links/rechts, en anders boven/onder).
	 */
	function placePanel() {
		const o = offset();
		const r = fab.getBoundingClientRect();
		const w = panel.offsetWidth;
		const h = panel.offsetHeight;
		const W = window.innerWidth;
		const H = window.innerHeight;
		const clampX = (x) => Math.min(Math.max(x, 12), W - w - 12);
		const clampY = (y) => Math.min(Math.max(y, 12), H - h - 12);
		let left = clampX(r.left + SIZE / 2 > W / 2 ? r.right - w : r.left);
		let top = clampY(r.top > H / 2 ? r.top - h - 12 : r.bottom + 12);
		const target = element && element.node.isConnected ? element.node.getBoundingClientRect() : null;
		if (target && target.width && overlap({ left, top, right: left + w, bottom: top + h }, target)) {
			const options = [
				{ left: clampX(W - w - 12), top },
				{ left: 12, top },
				{ left, top: 12 },
				{ left, top: clampY(H - h - 12) },
			];
			const free = options.find((p) => !overlap({ left: p.left, top: p.top, right: p.left + w, bottom: p.top + h }, target));
			if (free) ({ left, top } = free);
		}
		panel.style.left = (left - o.x) + 'px';
		panel.style.top = (top - o.y) + 'px';
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
			try { localStorage.setItem(POS, JSON.stringify(pos)); } catch (err) { /* geen opslag */ }
			return;
		}
		toggle(panel.hidden);
	});
	fab.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(panel.hidden); }
	});
	window.addEventListener('resize', place);
	document.addEventListener('visibilitychange', place);
	place();

	function toggle(open) {
		panel.hidden = !open;
		if (open) {
			renderList();
			placePanel();
			text.focus();
			follow();
		} else {
			mark.hidden = true;
		}
	}
	$('.close').addEventListener('click', () => toggle(false));

	/* ------------------------------------------------------------ Kader */

	function frame(node) {
		const r = node.getBoundingClientRect();
		if (!r.width && !r.height) { mark.hidden = true; return; } // verborgen (bv. een dichtgeklapt menu)
		const o = offset();
		mark.style.left = (r.left - o.x - 4) + 'px';
		mark.style.top = (r.top - o.y - 4) + 'px';
		mark.style.width = (r.width + 8) + 'px';
		mark.style.height = (r.height + 8) + 'px';
		mark.hidden = false;
	}

	// Zolang het venster open is, volgt het kader het element: scrollen (ook binnen een onderdeel), animaties, menu's.
	let raf = 0;
	function follow() {
		cancelAnimationFrame(raf);
		const step = () => {
			if (panel.hidden || picking || !element || !element.node.isConnected) {
				if (!picking) mark.hidden = true;
				raf = 0;
				return;
			}
			frame(element.node);
			raf = requestAnimationFrame(step);
		};
		step();
	}

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

	let picking = false;
	const target = (e) => {
		host.style.display = 'none';
		const node = document.elementFromPoint(e.clientX, e.clientY);
		host.style.display = '';
		return node && node !== document.documentElement && node !== document.body ? node : null;
	};
	const label = (node) => (node.innerText || node.getAttribute('alt') || node.getAttribute('aria-label') || node.value || '').trim().replace(/\s+/g, ' ').slice(0, 160);

	function onMove(e) {
		const node = target(e);
		if (node) frame(node); else mark.hidden = true;
	}
	// Tijdens het kiezen reageert de pagina niet op de muis (geen links, menu's of sliders die verspringen).
	function block(e) {
		e.preventDefault();
		e.stopPropagation();
	}
	function onClick(e) {
		block(e);
		const node = target(e);
		stopPicking();
		if (node) setElement(node);
		follow();
	}
	function onKey(e) {
		if (e.key === 'Escape') { block(e); stopPicking(); follow(); } // alleen het kiezen stoppen, niet het venster sluiten
	}
	const BLOCKED = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'touchstart', 'dblclick', 'contextmenu'];
	function startPicking() {
		picking = true;
		panel.hidden = true;
		hint.hidden = false;
		document.addEventListener('mousemove', onMove, true);
		document.addEventListener('click', onClick, true);
		document.addEventListener('keydown', onKey, true);
		BLOCKED.forEach((t) => document.addEventListener(t, block, { capture: true, passive: false }));
		document.documentElement.style.cursor = 'crosshair';
	}
	function stopPicking() {
		picking = false;
		hint.hidden = true;
		panel.hidden = false;
		document.removeEventListener('mousemove', onMove, true);
		document.removeEventListener('click', onClick, true);
		document.removeEventListener('keydown', onKey, true);
		BLOCKED.forEach((t) => document.removeEventListener(t, block, { capture: true }));
		document.documentElement.style.cursor = '';
		placePanel();
	}
	function setElement(node) {
		const t = label(node);
		element = { node, selector: cssPath(node), text: t };
		elChip.querySelector('span').textContent = node.tagName.toLowerCase() + (t ? ': “' + t.slice(0, 60) + '”' : '');
		elChip.hidden = false;
		placePanel();
	}
	$('[data-pick]').addEventListener('click', startPicking);
	elChip.querySelector('button').addEventListener('click', () => { element = null; elChip.hidden = true; mark.hidden = true; placePanel(); });

	/* ------------------------------------------------------------ Schermafbeelding */

	const help = $('.help');
	const file = $('.help input');
	const k = (...keys) => keys.map((key) => '<kbd>' + key + '</kbd>').join(' + ');

	// Systeem en browser van de gebruiker; een iPad meldt zich als Mac, maar met een touchscreen.
	function device() {
		const ua = navigator.userAgent;
		const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
		let os = 'other';
		if (/iPhone|iPod/.test(ua)) os = 'iphone';
		else if (/iPad/.test(ua) || (/Mac/.test(platform + ua) && navigator.maxTouchPoints > 1)) os = 'ipad';
		else if (/Android/.test(ua)) os = 'android';
		else if (/CrOS/.test(ua) || /Chrome OS/.test(platform)) os = 'chromeos';
		else if (/Mac/.test(platform + ua)) os = 'mac';
		else if (/Win/.test(platform + ua)) os = 'windows';
		else if (/Linux/.test(platform + ua)) os = 'linux';
		const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'je browser';
		return { os, browser };
	}

	// Stappen per systeem; plakken werkt waar het systeem naar het klembord kan kopiëren.
	function howTo() {
		const { os, browser } = device();
		const paste = (mod) => 'Plak hem hier met ' + k(mod, 'V') + ', of kies het bestand hieronder.';
		const steps = {
			mac: ['Op je Mac', [k('⌘', '⇧', '4') + ' en sleep over het stuk dat je wilt laten zien (' + k('⌘', '⇧', '3') + ' voor het hele scherm).', 'De afbeelding staat dan op je bureaublad. Met ' + k('ctrl') + ' erbij (' + k('⌘', 'ctrl', '⇧', '4') + ') gaat hij naar het klembord.'], paste('⌘')],
			windows: ['Op Windows', [k('⊞ Win', '⇧ Shift', 'S') + ' en sleep over het stuk dat je wilt laten zien.', 'De afbeelding staat nu op het klembord (en in Knipprogramma).'], paste('Ctrl')],
			chromeos: ['Op je Chromebook', [k('Ctrl', '⇧ Shift', 'Vensters tonen') + ' en sleep over het stuk dat je wilt laten zien.', 'De afbeelding staat nu op het klembord en in Downloads.'], paste('Ctrl')],
			linux: ['Op Linux', [k('⇧ Shift', 'PrtScn') + ' en sleep over het stuk dat je wilt laten zien (alleen ' + k('PrtScn') + ' voor het hele scherm).', 'Meestal staat hij dan in Afbeeldingen of op het klembord.'], paste('Ctrl')],
			iphone: ['Op je iPhone', ['Druk tegelijk op de zijknop en de volume-omhoogknop (iPhone met thuisknop: zijknop en thuisknop).', 'De afbeelding staat dan in Foto’s.'], 'Kies hem hieronder via Fotobibliotheek.'],
			ipad: ['Op je iPad', ['Druk tegelijk op de bovenste knop en een volumeknop (iPad met thuisknop: bovenste knop en thuisknop).', 'De afbeelding staat dan in Foto’s.'], 'Kies hem hieronder via Fotobibliotheek.'],
			android: ['Op je Android-telefoon', ['Druk tegelijk op de aan/uit-knop en volume omlaag.', 'De afbeelding staat dan in je Galerij of Foto’s.'], 'Kies hem hieronder.'],
			other: ['Een schermafbeelding maken', ['Gebruik de schermafbeeldingsfunctie van je apparaat.'], 'Plak hem hier of kies het bestand hieronder.'],
		}[os];
		// Firefox en Edge kunnen zelf de pagina vastleggen, ook het deel onder de vouw.
		const extra = browser === 'Firefox' && !/iphone|ipad|android/.test(os)
			? '<p class="help__tip">In Firefox kan het ook zo: rechtermuisklik op de pagina en dan <em>Schermafbeelding maken</em> (' + k(os === 'mac' ? '⌘' : 'Ctrl', '⇧', 'S') + ').</p>'
			: browser === 'Edge' && !/iphone|ipad|android/.test(os)
				? '<p class="help__tip">In Edge kan het ook zo: ' + k(os === 'mac' ? '⌘' : 'Ctrl', '⇧', 'S') + ' (Webopname) en dan <em>Kopiëren</em>.</p>'
				: '';
		return '<p><strong>' + steps[0] + '</strong> (' + browser + ')</p><ol>' + steps[1].map((s) => '<li>' + s + '</li>').join('') + '</ol><p>' + steps[2] + '</p>' + extra;
	}

	shotBtn.addEventListener('click', () => {
		help.hidden = !help.hidden;
		if (!help.hidden) {
			help.querySelector('.help__how').innerHTML = howTo();
			setStatus('');
		}
		shotBtn.setAttribute('aria-expanded', String(!help.hidden));
		placePanel();
	});
	$('[data-upload]').addEventListener('click', () => file.click());
	file.addEventListener('change', () => { if (file.files[0]) useImage(file.files[0]); file.value = ''; });

	// Plakken (klembord) terwijl het venster open is, en een afbeelding op het venster slepen.
	document.addEventListener('paste', (e) => {
		if (panel.hidden) return;
		const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith('image/'));
		if (!item) return;
		e.preventDefault();
		useImage(item.getAsFile());
	});
	panel.addEventListener('dragover', (e) => { e.preventDefault(); panel.classList.add('is-drop'); });
	panel.addEventListener('dragleave', () => panel.classList.remove('is-drop'));
	panel.addEventListener('drop', (e) => {
		e.preventDefault();
		panel.classList.remove('is-drop');
		const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
		if (f) useImage(f); else setStatus('Dat is geen afbeelding.', true);
	});

	// Verkleinen tot hooguit 1600 pixels breed (JPEG), zodat het past in de lijst en in de mail.
	function useImage(blob) {
		if (!blob || !blob.type.startsWith('image/')) { setStatus('Dat is geen afbeelding.', true); return; }
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			const scale = Math.min(1, 1600 / img.naturalWidth);
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(img.naturalWidth * scale);
			canvas.height = Math.round(img.naturalHeight * scale);
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = '#fff'; // doorzichtige PNG: wit in plaats van zwart
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			shot = canvas.toDataURL('image/jpeg', 0.8);
			imgChip.querySelector('img').src = shot;
			imgChip.hidden = false;
			help.hidden = true;
			shotBtn.setAttribute('aria-expanded', 'false');
			setStatus('Schermafbeelding toegevoegd.');
			placePanel();
		};
		img.onerror = () => { URL.revokeObjectURL(url); setStatus('Deze afbeelding kan ik niet lezen.', true); };
		img.src = url;
	}
	imgChip.querySelector('button').addEventListener('click', () => { shot = ''; imgChip.hidden = true; placePanel(); });

	/* ------------------------------------------------------------ Lijst met verzoekpunten */

	let list = [];
	try { list = JSON.parse(localStorage.getItem(LIST)) || []; } catch (e) { /* geen opslag */ }

	function saveList() {
		try {
			localStorage.setItem(LIST, JSON.stringify(list));
			return true;
		} catch (e) {
			return false; // te groot (schermafbeeldingen): de lijst staat dan alleen op deze pagina
		}
	}

	function renderList() {
		badge.hidden = !list.length;
		badge.textContent = list.length;
		listBox.hidden = !list.length;
		send.textContent = list.length ? 'Versturen (' + list.length + ')' : 'Versturen';
		listEl.innerHTML = '';
		list.forEach((item, i) => {
			const li = document.createElement('li');
			li.className = 'item';
			const body = document.createElement('div');
			body.className = 'item__body';
			const t = document.createElement('span');
			t.className = 'item__text';
			const kind = document.createElement('span');
			kind.className = 'item__type';
			kind.textContent = cfg.types[item.type] + ': ';
			t.append(kind, document.createTextNode(item.message));
			const meta = document.createElement('span');
			meta.className = 'item__meta';
			const page = item.url === location.href ? 'deze pagina' : (item.title || item.url.replace(/^https?:\/\/[^/]+/, '') || '/');
			meta.textContent = page + (item.element ? ' · element' : '') + (item.shot ? ' · schermafbeelding' : '');
			body.append(t, meta);
			const x = document.createElement('button');
			x.type = 'button';
			x.className = 'x';
			x.setAttribute('aria-label', 'Punt weghalen');
			x.textContent = '×';
			x.addEventListener('click', () => { list.splice(i, 1); saveList(); renderList(); placePanel(); });
			li.append(body, x);
			// Over een punt van deze pagina bewegen: het element even aanwijzen.
			li.addEventListener('pointerenter', () => {
				if (item.url !== location.href || !item.element) return;
				const node = (() => { try { return document.querySelector(item.element.selector); } catch (e) { return null; } })();
				if (node) frame(node);
			});
			li.addEventListener('pointerleave', () => { if (element && element.node.isConnected) frame(element.node); else mark.hidden = true; });
			listEl.append(li);
		});
	}

	function current() {
		return {
			type,
			message: text.value.trim(),
			url: location.href,
			title: document.title,
			viewport: window.innerWidth + '×' + window.innerHeight + (window.devicePixelRatio > 1 ? ' @' + window.devicePixelRatio + 'x' : ''),
			element: element ? { selector: element.selector, text: element.text } : null,
			errors: (window.vmErrors || []).slice(),
			shot,
		};
	}

	function resetForm() {
		text.value = '';
		element = null;
		shot = '';
		elChip.hidden = true;
		imgChip.hidden = true;
		help.hidden = true;
		mark.hidden = true;
		setType('bug');
	}

	function addCurrent() {
		if (!text.value.trim()) { setStatus('Schrijf kort wat er aan de hand is.', true); text.focus(); return false; }
		if (list.length >= MAX) { setStatus('De lijst is vol (' + MAX + '). Verstuur eerst.', true); return false; }
		list.push(current());
		const kept = saveList();
		resetForm();
		renderList();
		placePanel();
		setStatus(kept ? 'Toegevoegd. Volgend punt?' : 'Toegevoegd, maar alleen op deze pagina bewaard (te groot). Verstuur voor je verder gaat.', !kept);
		text.focus();
		return true;
	}
	add.addEventListener('click', addCurrent);

	/* ------------------------------------------------------------ Versturen */

	function setStatus(msg, error) {
		status.textContent = msg;
		status.classList.toggle('is-error', !!error);
	}

	async function post(item) {
		const res = await fetch(cfg.url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': cfg.nonce },
			body: JSON.stringify(item),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(data.message || 'Versturen lukte niet (' + res.status + ').');
	}

	// Wat nog in het formulier staat gaat mee; daarna de hele lijst, punt voor punt. Mislukt er een, dan blijft de rest staan.
	send.addEventListener('click', async () => {
		if (text.value.trim() && !addCurrent()) return;
		if (!list.length) { setStatus('Schrijf kort wat er aan de hand is.', true); text.focus(); return; }
		send.disabled = true;
		add.disabled = true;
		const total = list.length;
		try {
			while (list.length) {
				setStatus('Versturen… ' + (total - list.length + 1) + ' van ' + total);
				await post(list[0]);
				list.shift();
				saveList();
				renderList();
			}
			setStatus(total === 1 ? 'Verstuurd, dank je!' : total + ' punten verstuurd, dank je!');
		} catch (err) {
			setStatus((err.message || 'Geen verbinding.') + ' ' + list.length + ' nog niet verstuurd.', true);
		} finally {
			send.disabled = false;
			add.disabled = false;
			placePanel();
		}
	});

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && !panel.hidden && !picking) toggle(false);
	});

	renderList();
})();
