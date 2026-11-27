<?php
/**
 * Waarschuwing bij "Site bewerken" (alleen bij een blokthema).
 *
 * In de site-editor pas je onderdelen aan die op elke pagina terugkomen. Een klik op een link daarheen (adminbalk op de
 * website, Weergave → Editor in wp-admin) toont eerst een melding (assets/site-editor.js): bewerk hier alleen de header
 * en de footer, en we raden af hier verder veel te wijzigen. Met "Toch doorgaan" ga je alsnog; op de website kun je ook
 * meteen naar "Pagina bewerken". In de site-editor zelf staat dezelfde waarschuwing bovenaan.
 */

defined( 'ABSPATH' ) || exit;

const THEAS_MONITOR_SITE_EDITOR_TEXT = 'Bewerk hier alleen de header en de footer. Wat je hier wijzigt, geldt voor de hele website; we raden af om hier verder veel te veranderen.';

function theas_monitor_site_editor_notice(): bool {
	return is_user_logged_in() && function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() && current_user_can( 'edit_theme_options' )
		&& apply_filters( 'theas_monitor_site_editor_notice', true );
}

function theas_monitor_site_editor_script( string $edit ): void {
	wp_enqueue_script( 'theas-monitor-site-editor', plugin_dir_url( THEAS_MONITOR_FILE ) . 'assets/site-editor.js', array(), THEAS_MONITOR_VERSION, true );
	wp_add_inline_script( 'theas-monitor-site-editor', 'window.vmSiteEditor = ' . wp_json_encode( array( 'edit' => $edit ) ) . ';', 'before' );
}

// Op de website: de link Site bewerken staat in de adminbalk.
add_action( 'wp_enqueue_scripts', function () {
	if ( is_admin_bar_showing() && ! is_customize_preview() && theas_monitor_site_editor_notice() ) {
		theas_monitor_site_editor_script( theas_monitor_edit_link() );
	}
} );

// In wp-admin: Weergave → Editor en de adminbalk; niet in de site-editor zelf.
add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( 'site-editor.php' !== $hook && theas_monitor_site_editor_notice() ) {
		theas_monitor_site_editor_script( '' );
	}
} );

// In de site-editor zelf: dezelfde waarschuwing als melding bovenaan.
add_action( 'enqueue_block_editor_assets', function () {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || 'site-editor' !== $screen->id || ! theas_monitor_site_editor_notice() ) {
		return;
	}
	wp_register_script( 'theas-monitor-site-editor-notice', false, array( 'wp-data', 'wp-notices', 'wp-dom-ready' ), THEAS_MONITOR_VERSION, true );
	wp_enqueue_script( 'theas-monitor-site-editor-notice' );
	wp_add_inline_script( 'theas-monitor-site-editor-notice', 'wp.domReady(function(){wp.data.dispatch("core/notices").createWarningNotice(' . wp_json_encode( THEAS_MONITOR_SITE_EDITOR_TEXT ) . ',{id:"theas-monitor-site-editor",isDismissible:true});});' );
} );
