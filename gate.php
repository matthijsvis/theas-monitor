<?php
/**
 * Website afschermen met één wachtwoord (Instellingen → Theas Monitor), zoals de plugin Password Protected.
 *
 * Bezoekers zien in plaats van de site een eigen pagina met een wachtwoordveld (gate-page.php). Een goed wachtwoord
 * geeft een ondertekend cookie; een nieuw wachtwoord maakt bestaande cookies ongeldig. wp-admin, wp-login.php,
 * robots.txt en de routes van deze plugin blijven bereikbaar. Aan- en uitzetten zet ook "Zoekmachines ontmoedigen"
 * (blog_public) aan en uit. Zo lang de afscherming aan staat, wordt geen enkele pagina gecachet.
 */

defined( 'ABSPATH' ) || exit;

/** Instellingen, aangevuld met de standaardwaarden (die van Password Protected). */
function theas_monitor_gate_settings(): array {
	return (array) get_option( 'theas_monitor_gate', array() ) + array(
		'enabled'  => false,
		'password' => '', // alleen de hash
		'admins'   => true,
		'users'    => true,
		'feeds'    => false,
		'rest'     => false,
		'ips'      => '',
		'remember' => true,
		'days'     => 14,
	);
}

/**
 * Slaat wijzigingen op; een leeg $password laat het huidige staan. Geeft false als de afscherming
 * aan moet zonder dat er een wachtwoord is.
 */
function theas_monitor_gate_save( array $changes, string $password = '' ): bool {
	$old = theas_monitor_gate_settings();
	$new = array_merge( $old, $changes );
	if ( '' !== $password ) {
		$new['password'] = wp_hash_password( $password );
	}
	if ( $new['enabled'] && ! $new['password'] ) {
		return false;
	}
	update_option( 'theas_monitor_gate', $new );
	if ( $new['enabled'] !== $old['enabled'] ) {
		update_option( 'blog_public', $new['enabled'] ? '0' : '1' );
	}
	return true;
}

function theas_monitor_gate_enabled(): bool {
	return (bool) theas_monitor_gate_settings()['enabled'];
}

function theas_monitor_gate_cookie_name(): string {
	return 'theas_gate_' . COOKIEHASH;
}

/** Handtekening van het cookie; hangt af van het wachtwoord, dus een nieuw wachtwoord maakt oude cookies ongeldig. */
function theas_monitor_gate_sign( int $expires ): string {
	return hash_hmac( 'sha256', (string) $expires, wp_salt( 'auth' ) . theas_monitor_gate_settings()['password'] );
}

function theas_monitor_gate_set_cookie( bool $remember ): void {
	$settings = theas_monitor_gate_settings();
	$remember = $remember && $settings['remember'];
	$expires  = time() + ( $remember ? (int) $settings['days'] : 20 ) * DAY_IN_SECONDS;
	setcookie( theas_monitor_gate_cookie_name(), $expires . '|' . theas_monitor_gate_sign( $expires ), array(
		'expires'  => $remember ? $expires : 0,
		'path'     => COOKIEPATH,
		'domain'   => COOKIE_DOMAIN,
		'secure'   => is_ssl(),
		'httponly' => true,
		'samesite' => 'Lax',
	) );
}

function theas_monitor_gate_has_cookie(): bool {
	$parts = explode( '|', (string) ( $_COOKIE[ theas_monitor_gate_cookie_name() ] ?? '' ) ); // phpcs:ignore -- wordt hieronder gecontroleerd
	return 2 === count( $parts ) && (int) $parts[0] > time() && hash_equals( theas_monitor_gate_sign( (int) $parts[0] ), $parts[1] );
}

/** Mag dit verzoek zonder wachtwoord door? */
function theas_monitor_gate_is_open(): bool {
	$settings = theas_monitor_gate_settings();
	$ips      = preg_split( '/\s+/', $settings['ips'], -1, PREG_SPLIT_NO_EMPTY );
	return ! $settings['enabled']
		|| ( $settings['admins'] && current_user_can( 'manage_options' ) )
		|| ( $settings['users'] && is_user_logged_in() )
		|| in_array( $_SERVER['REMOTE_ADDR'] ?? '', $ips, true ) // phpcs:ignore -- alleen vergelijken
		|| theas_monitor_gate_has_cookie();
}

// Cacheplugins (SiteGround, WP Rocket): niets bewaren, anders krijgen bezoekers zonder wachtwoord de site te zien.
add_action( 'init', function () {
	if ( theas_monitor_gate_enabled() && ! defined( 'DONOTCACHEPAGE' ) ) {
		define( 'DONOTCACHEPAGE', true );
	}
}, 1 );

add_action( 'template_redirect', function () {
	if ( ! theas_monitor_gate_enabled() || is_robots() || is_favicon() ) {
		return;
	}
	nocache_headers();
	if ( theas_monitor_gate_is_open() || ( is_feed() && theas_monitor_gate_settings()['feeds'] ) ) {
		return;
	}

	$failed = false;
	if ( isset( $_POST['theas_gate_password'] ) ) { // phpcs:ignore -- geen nonce: het wachtwoord is de controle
		$failed = ! wp_check_password( wp_unslash( $_POST['theas_gate_password'] ), theas_monitor_gate_settings()['password'] ); // phpcs:ignore -- wachtwoorden niet opschonen
		if ( ! $failed ) {
			theas_monitor_gate_set_cookie( ! empty( $_POST['theas_gate_remember'] ) ); // phpcs:ignore
			wp_redirect( wp_validate_redirect( wp_unslash( $_SERVER['REQUEST_URI'] ?? '/' ), home_url( '/' ) ), 303 ); // phpcs:ignore
			exit;
		}
	}

	status_header( 200 );
	header( 'X-Robots-Tag: noindex, nofollow' );
	require __DIR__ . '/gate-page.php';
	exit;
}, -10 );

// De REST-API alleen voor wie door mag (zie ook het filter op prioriteit 99 voor de routes van deze plugin).
add_filter( 'rest_authentication_errors', function ( $result ) {
	if ( is_wp_error( $result ) || theas_monitor_gate_settings()['rest'] || theas_monitor_gate_is_open() ) {
		return $result;
	}
	return new WP_Error( 'rest_cannot_access', 'Deze website is afgeschermd.', array( 'status' => rest_authorization_required_code() ) );
} );
