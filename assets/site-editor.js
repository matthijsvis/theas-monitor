/**
 * Waarschuwing bij "Site bewerken" (Verymooi Monitor, zie site-editor.php). Een klik op een link naar de site-editor
 * toont eerst een venster: bewerk daar alleen de header en de footer. Knoppen: Annuleren, Toch doorgaan en (op de
 * website, als dat kan) Pagina bewerken. Met cmd/ctrl/shift (nieuw tabblad) gaat de link gewoon; de site-editor toont
 * de waarschuwing dan zelf. Links rechtstreeks naar de header, de footer of de patronen krijgen geen venster. Het venster staat in een shadow root, zodat het thema het niet verandert.
 */
(function () {
	'use strict';

	const cfg = window.vmSiteEditor || {};
	let host = null;
	let back = null;
	let opener = null;

	function build() {
		host = document.createElement('div');
		host.id = 'verymooi-site-editor';
		const root = host.attachShadow({ mode: 'open' });
		root.innerHTML = '<style>'
			+ ':host { all: initial; }'
			+ '* { box-sizing: border-box; }'
			+ '.back { --ink: #1a1614; --card: #fbfaf7; --muted: #67625c; --line: rgba(26,22,20,.14); --orange: #ff8547;'
			+ ' position: fixed; inset: 0; z-index: 2147483001; display: grid; place-items: center; padding: 16px; background: rgba(26,22,20,.45); font: 400 14px/1.5 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); }'
			+ '@media (prefers-color-scheme: dark) { .back { --ink: #f5f4ef; --card: #262320; --muted: #aaa49c; --line: rgba(245,244,239,.16); background: rgba(0,0,0,.6); } }'
			+ '.back[hidden] { display: none; }'
			+ '.box { width: min(480px, 100%); padding: 22px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); box-shadow: 0 28px 60px -18px rgba(0,0,0,.45); }'
			+ '.eyebrow { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }'
			+ '.eyebrow::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--orange); box-shadow: 0 0 0 3px rgba(255,133,71,.25); }'
			+ 'h2 { margin: 0 0 10px; font-size: 18px; line-height: 1.3; font-weight: 600; letter-spacing: -.01em; }'
			+ 'p { margin: 0 0 10px; }'
			+ '.acts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 18px; }'
			+ '.b { display: inline-flex; align-items: center; min-height: 38px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: none; color: var(--ink); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }'
			+ '.b:hover { border-color: var(--ink); } .b:focus-visible { outline: 2px solid var(--orange); outline-offset: 2px; }'
			+ '.b--main { border-color: var(--ink); background: var(--ink); color: var(--card); }'
			+ '.b--go { margin-right: auto; border-style: dashed; }'
			+ '</style>'
			+ '<div class="back" hidden><div class="box" role="alertdialog" aria-modal="true" aria-labelledby="t" aria-describedby="d">'
			+ '<p class="eyebrow">Site bewerken</p>'
			+ '<h2 id="t">Bewerk hier alleen de header en de footer</h2>'
			+ '<div id="d"><p>In de site-editor pas je onderdelen aan die op elke pagina van de website terugkomen. Wat je hier wijzigt, geldt dus overal.</p>'
			+ '<p>We raden af om hier verder veel te veranderen. Wil je de tekst of de afbeeldingen van een pagina aanpassen, gebruik dan <strong>Pagina bewerken</strong>.</p></div>'
			+ '<div class="acts"><a class="b b--go" data-go>Toch doorgaan</a><button type="button" class="b" data-cancel>Annuleren</button>'
			+ (cfg.edit ? '<a class="b b--main" data-edit>Pagina bewerken</a>' : '')
			+ '</div></div></div>';
		document.documentElement.append(host);
		back = root.querySelector('.back');
		if (cfg.edit) root.querySelector('[data-edit]').href = cfg.edit;
		root.querySelector('[data-cancel]').addEventListener('click', close);
		back.addEventListener('click', (e) => { if (e.target === back) close(); });
		back.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') { e.preventDefault(); close(); return; }
			if (e.key !== 'Tab') return; // de focus blijft in het venster
			const items = [...root.querySelectorAll('.b')];
			const i = items.indexOf(root.activeElement);
			if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
			else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
		});
	}

	function open(link) {
		if (!host) build();
		opener = link;
		const root = host.shadowRoot;
		root.querySelector('[data-go]').href = link.href;
		back.hidden = false;
		root.querySelector(cfg.edit ? '[data-edit]' : '[data-cancel]').focus();
	}

	function close() {
		back.hidden = true;
		if (opener) opener.focus();
		opener = null;
	}

	document.addEventListener('click', (e) => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const link = e.target.closest ? e.target.closest('a[href*="site-editor.php"]') : null;
		if (!link) return;
		// Links rechtstreeks naar de header, de footer of de patronen (zoals "Header & footer" bij Alta) zijn juist bedoeld.
		let href = link.href;
		try { href = decodeURIComponent(href); } catch (err) { /* ongeldige codering: zo laten */ }
		if (/[?&](p|path)=\/(patterns?|wp_template_part)\b|postType=wp_template_part/.test(href)) return;
		e.preventDefault();
		e.stopPropagation();
		open(link);
	}, true);
})();
