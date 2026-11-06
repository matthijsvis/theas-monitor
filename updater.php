<?php
/**
 * Updates via GitHub (github.com/matthijsvis/theas-monitor).
 *
 * De plugin-header "Update URI" (WordPress 5.8+) zorgt dat WordPress.org voor deze plugin niet gevraagd wordt;
 * in plaats daarvan levert het filter update_plugins_github.com de nieuwste release. Is die nieuwer, dan staat de
 * update gewoon bij Plugins en Dashboard → Updates, en werken "Nu bijwerken" en automatisch bijwerken zoals bij
 * elke plugin. De zip is de asset theas-monitor.zip van de release (gemaakt door .github/workflows/release.yml).
 */

defined( 'ABSPATH' ) || exit;

const THEAS_MONITOR_REPO = 'matthijsvis/theas-monitor';

/** Nieuwste release: versie, zip, pagina en notities. 6 uur bewaard (bij een fout 1 uur), null als er geen is. */
function theas_monitor_latest_release( bool $fresh = false ): ?array {
	$cached = get_site_transient( 'theas_monitor_release' );
	if ( ! $fresh && is_array( $cached ) ) {
		return $cached ?: null;
	}
	$res     = wp_remote_get( 'https://api.github.com/repos/' . THEAS_MONITOR_REPO . '/releases/latest', array(
		'timeout' => 10,
		'headers' => array( 'Accept' => 'application/vnd.github+json', 'User-Agent' => 'theas-monitor/' . THEAS_MONITOR_VERSION ),
	) );
	$data    = is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ? null : json_decode( wp_remote_retrieve_body( $res ), true );
	$release = null;
	foreach ( (array) ( $data['assets'] ?? array() ) as $asset ) {
		if ( 'theas-monitor.zip' === ( $asset['name'] ?? '' ) && ! empty( $data['tag_name'] ) ) {
			$release = array(
				'version' => ltrim( (string) $data['tag_name'], 'v' ),
				'package' => (string) $asset['browser_download_url'],
				'url'     => (string) $data['html_url'],
				'notes'   => (string) ( $data['body'] ?? '' ),
				'date'    => (string) ( $data['published_at'] ?? '' ),
			);
		}
	}
	set_site_transient( 'theas_monitor_release', $release ?: array(), $release ? 6 * HOUR_IN_SECONDS : HOUR_IN_SECONDS );
	return $release;
}

// WordPress vraagt naar updates (elke 12 uur, en direct bij "Opnieuw controleren" op Dashboard → Updates).
add_filter( 'update_plugins_github.com', function ( $update, $plugin_data, $plugin_file ) {
	if ( plugin_basename( THEAS_MONITOR_FILE ) !== $plugin_file ) {
		return $update;
	}
	$release = theas_monitor_latest_release( ! empty( $_GET['force-check'] ) ); // phpcs:ignore -- alleen lezen
	if ( ! $release ) {
		return $update;
	}
	return array(
		'id'           => $plugin_data['UpdateURI'],
		'slug'         => 'theas-monitor',
		'version'      => $release['version'],
		'url'          => $release['url'],
		'package'      => $release['package'],
		'requires'     => '6.0',
		'requires_php' => '7.4',
	);
}, 10, 3 );

// "Details bekijken" bij de update: naam, versie en de releasenotities.
add_filter( 'plugins_api', function ( $result, $action, $args ) {
	if ( 'plugin_information' !== $action || 'theas-monitor' !== ( $args->slug ?? '' ) ) {
		return $result;
	}
	$release = theas_monitor_latest_release();
	return (object) array(
		'name'          => 'Theas Monitor',
		'slug'          => 'theas-monitor',
		'version'       => $release['version'] ?? THEAS_MONITOR_VERSION,
		'author'        => 'Theas',
		'homepage'      => 'https://github.com/' . THEAS_MONITOR_REPO,
		'requires'      => '6.0',
		'requires_php'  => '7.4',
		'download_link' => $release['package'] ?? '',
		'last_updated'  => $release['date'] ?? '',
		'sections'      => array(
			'description' => '<p>Geeft het Theas-dashboard de status van deze website (versies, updates, Site Health, fouten, SEO) en een eenmalige inloglink voor wp-admin.</p>',
			'changelog'   => $release && $release['notes'] ? wpautop( esc_html( $release['notes'] ) ) : '<p>Zie <a href="https://github.com/' . THEAS_MONITOR_REPO . '/releases">GitHub</a>.</p>',
		),
	);
}, 10, 3 );

// Na het bijwerken de bewaarde release vergeten, zodat de volgende controle vers is.
add_action( 'upgrader_process_complete', function () {
	delete_site_transient( 'theas_monitor_release' );
} );

/* ---------- Knop "Check voor updates" (alleen bij Plugins) ---------- */

add_filter( 'plugin_action_links_' . plugin_basename( THEAS_MONITOR_FILE ), function ( array $links ) {
	if ( current_user_can( 'update_plugins' ) ) {
		$links[] = '<a href="' . esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=theas_monitor_check' ), 'theas_monitor_check' ) ) . '">Check voor updates</a>';
	}
	return $links;
} );

// Vraagt GitHub meteen om de nieuwste release, werkt de updatelijst van WordPress bij en gaat terug naar Plugins.
add_action( 'admin_post_theas_monitor_check', function () {
	check_admin_referer( 'theas_monitor_check' );
	if ( ! current_user_can( 'update_plugins' ) ) {
		wp_die( 'Je mag geen plugins bijwerken.', '', array( 'response' => 403 ) );
	}
	$release = theas_monitor_latest_release( true );
	wp_clean_plugins_cache();
	wp_update_plugins();
	$result = ! $release ? 'error' : ( version_compare( $release['version'], THEAS_MONITOR_VERSION, '>' ) ? 'update' : 'current' );
	wp_safe_redirect( add_query_arg( 'theas_monitor_check', $result, admin_url( 'plugins.php' ) ) );
	exit;
} );

add_filter( 'removable_query_args', function ( array $args ) {
	$args[] = 'theas_monitor_check';
	return $args;
} );

add_action( 'admin_notices', function () {
	$result = sanitize_key( $_GET['theas_monitor_check'] ?? '' ); // phpcs:ignore -- alleen lezen
	if ( ! $result || 'plugins' !== get_current_screen()->id ) {
		return;
	}
	$release = theas_monitor_latest_release();
	$notices = array(
		'current' => array( 'success', 'Theas Monitor is up-to-date (versie ' . THEAS_MONITOR_VERSION . ').' ),
		'update'  => array( 'warning', 'Theas Monitor ' . ( $release['version'] ?? '' ) . ' is beschikbaar. Je kunt hem hieronder bijwerken.' ),
		'error'   => array( 'error', 'Controleren op updates is niet gelukt: GitHub gaf geen antwoord. Probeer het later opnieuw.' ),
	);
	if ( isset( $notices[ $result ] ) ) {
		printf( '<div class="notice notice-%s is-dismissible"><p>%s</p></div>', esc_attr( $notices[ $result ][0] ), esc_html( $notices[ $result ][1] ) );
	}
} );
