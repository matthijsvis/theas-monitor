<?php
/**
 * Overzichtelijk beheermenu (overgenomen van starfulness.nl): bovenaan het Dashboard, de standaard berichttypes
 * (Berichten, Media, Pagina's), de eigen berichttypes, Formulieren (Gravity Forms) en snelkoppelingen naar de
 * site-editor (zoals "Header & footer"); alles daaronder in- en uitklapbaar onder "Overig". Met het filter
 * `theas_monitor_overig_top` kan een thema meer menu-items (slugs) zichtbaar houden.
 *
 * De items blijven echte WordPress-menu-items (met hun submenu's en markering van de huidige pagina); ze worden
 * alleen verborgen tot je "Overig" openklapt. Een thema dat dit zelf al doet (Starfulness) gaat voor.
 */

defined( 'ABSPATH' ) || exit;

const THEAS_MONITOR_OVERIG = 'theas-overig';

function theas_monitor_overig_enabled(): bool {
	return ! function_exists( 'starfulness_overig_items' );
}

add_action( 'admin_menu', function () {
	if ( theas_monitor_overig_enabled() ) {
		add_menu_page( 'Overig', 'Overig', 'read', THEAS_MONITOR_OVERIG, 'theas_monitor_overig_page', 'dashicons-ellipsis', '99.9' );
	}
}, 999 );

// Volgorde: Dashboard en berichttypes, dan "Overig", dan de rest in de oorspronkelijke volgorde.
add_filter( 'custom_menu_order', fn( $custom ) => $custom || theas_monitor_overig_enabled() );
add_filter( 'menu_order', function ( $order ) {
	if ( ! theas_monitor_overig_enabled() || ! is_array( $order ) ) {
		return $order;
	}
	$top = array();
	foreach ( $order as $slug ) {
		if ( theas_monitor_overig_on_top( $slug ) ) {
			$top[] = $slug;
		}
	}
	$top[] = THEAS_MONITOR_OVERIG;
	return array_merge( $top, array_values( array_diff( $order, $top ) ) );
}, 999 );

/** Blijft dit menu-item (slug) boven "Overig" staan? */
function theas_monitor_overig_on_top( string $slug ): bool {
	$top = apply_filters( 'theas_monitor_overig_top', array( 'index.php', 'separator1', 'edit.php', 'upload.php', 'gf_edit_forms' ) );
	return in_array( $slug, $top, true ) || 0 === strpos( $slug, 'edit.php?post_type=' ) || 0 === strpos( $slug, 'site-editor.php' );
}

/**
 * Menu-items die onder "Overig" vallen (alles dat na "Overig" in het menu staat).
 *
 * @return array[] Lijst met [label, url, slug].
 */
function theas_monitor_overig_items(): array {
	global $menu;
	$items = array();
	$after = false;
	foreach ( (array) $menu as $item ) {
		if ( THEAS_MONITOR_OVERIG === $item[2] ) {
			$after = true;
			continue;
		}
		if ( $after && ! empty( $item[0] ) && current_user_can( $item[1] ) ) {
			$url     = false !== strpos( $item[2], '.php' ) ? admin_url( $item[2] ) : admin_url( 'admin.php?page=' . $item[2] );
			$items[] = array( wp_strip_all_tags( preg_replace( '/<span.*$/s', '', $item[0] ) ), $url, $item[2] );
		}
	}
	return $items;
}

/** Terugvalpagina (zonder JavaScript of bij direct openen): lijst met links. */
function theas_monitor_overig_page(): void {
	echo '<div class="wrap"><h1>Overig</h1><ul class="ul-disc">';
	foreach ( theas_monitor_overig_items() as $item ) {
		printf( '<li><a href="%s">%s</a></li>', esc_url( $item[1] ), esc_html( $item[0] ) );
	}
	echo '</ul></div>';
}

// Stijl en gedrag. Staat de huidige pagina onder "Overig", dan is de groep direct open.
add_action( 'admin_head', function () {
	global $parent_file;
	if ( ! theas_monitor_overig_enabled() ) {
		return;
	}
	$open = in_array( $parent_file, array_column( theas_monitor_overig_items(), 2 ), true );
	$sel  = '#adminmenu #toplevel_page_' . THEAS_MONITOR_OVERIG;
	?>
	<style>
		html:not(.theas-overig-open) <?php echo $sel; ?> ~ li:not(#collapse-menu) { display: none; }
		/* Zelfde maat als de andere menu-items; de scheidingslijn staat erboven, buiten het hover-vlak. */
		<?php echo $sel; ?> { margin-top: 9px; }
		<?php echo $sel; ?>::before { content: ""; position: absolute; left: 0; right: 0; top: -5px; border-top: 1px solid rgba(240, 246, 252, 0.14); pointer-events: none; }
		<?php echo $sel; ?> > a { position: relative; }
		<?php echo $sel; ?> > a .wp-menu-name { padding-right: 28px; }
		<?php echo $sel; ?> > a::after { content: "\f140"; font: 400 20px/1 dashicons; position: absolute; right: 8px; top: 50%; margin-top: -10px; opacity: 0.75; transition: transform 0.2s ease, opacity 0.2s ease; }
		<?php echo $sel; ?> > a:hover::after, <?php echo $sel; ?> > a:focus::after { opacity: 1; }
		html.theas-overig-open <?php echo $sel; ?> > a::after { transform: rotate(180deg); }
		.folded <?php echo $sel; ?> > a::after { display: none; }
		.folded <?php echo $sel; ?> > a .wp-menu-name { padding-right: 0; }
	</style>
	<script>
		( function () {
			var open = <?php echo $open ? 'true' : 'false'; ?>;
			try { open = open || localStorage.getItem( 'theasOverig' ) === '1'; } catch ( e ) {}
			if ( open ) { document.documentElement.classList.add( 'theas-overig-open' ); }
			document.addEventListener( 'click', function ( event ) {
				var link = event.target.closest( '<?php echo $sel; ?> > a' );
				if ( ! link ) { return; }
				event.preventDefault();
				var isOpen = document.documentElement.classList.toggle( 'theas-overig-open' );
				link.setAttribute( 'aria-expanded', String( isOpen ) );
				if ( event.detail > 0 ) { link.blur(); } // Muisklik: geen blijvende focus-markering (toetsenbord behoudt die wel).
				try { localStorage.setItem( 'theasOverig', isOpen ? '1' : '0' ); } catch ( e ) {}
			} );
			document.addEventListener( 'DOMContentLoaded', function () {
				var link = document.querySelector( '<?php echo $sel; ?> > a' );
				if ( link ) {
					link.setAttribute( 'role', 'button' );
					link.setAttribute( 'aria-expanded', String( document.documentElement.classList.contains( 'theas-overig-open' ) ) );
				}
			} );
		} )();
	</script>
	<?php
} );
