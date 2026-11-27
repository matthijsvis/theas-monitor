<?php
/**
 * Inlogscherm (wp-login.php) in de stijl van verymooi.nl, net als de wachtwoordpagina (gate-page.php): links het
 * icoon en de naam van de website met het formulier, rechts het stippenveld met het icoon in het midden (dots.js).
 * Ook de pagina's voor een vergeten of nieuw wachtwoord. Het icoon is het Site-pictogram (Instellingen → Algemeen);
 * zonder pictogram de eerste letter van de naam.
 *
 * Niet op verymooi.nl zelf: daar doet het thema theas dit al, met het stippenveld van het dashboard. Elders uitzetten
 * kan met add_filter( 'theas_monitor_login_style', '__return_false' ).
 */

defined( 'ABSPATH' ) || exit;

/** Naam van de website als platte tekst (get_bloginfo geeft hem met HTML-entiteiten). */
function theas_monitor_site_name(): string {
	return wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
}

/** Eerste letter van de naam, voor als er geen icoon is. */
function theas_monitor_site_letter(): string {
	$name = trim( theas_monitor_site_name() );
	if ( '' === $name ) {
		return 'W';
	}
	$letter = function_exists( 'mb_substr' ) ? mb_substr( $name, 0, 1 ) : substr( $name, 0, 1 );
	return function_exists( 'mb_strtoupper' ) ? mb_strtoupper( $letter ) : strtoupper( $letter );
}

/** Het icoon of de letter als tegeltje (opmaak in assets/brand.css). */
function theas_monitor_site_mark(): string {
	$icon = get_site_icon_url( 128 );
	if ( $icon ) {
		return '<span class="theas-mark theas-mark--icon"><img src="' . esc_url( $icon ) . '" alt="" width="40" height="40"></span>';
	}
	return '<span class="theas-mark" aria-hidden="true">' . esc_html( theas_monitor_site_letter() ) . '</span>';
}

/** Het stippenveld met het icoon of de letter in het midden (assets/dots.js); $class voor de plaats op de pagina. */
function theas_monitor_site_art( string $class ): string {
	return sprintf(
		'<div class="%s" aria-hidden="true" data-theas-dots data-icon="%s" data-letter="%s"><canvas></canvas></div>',
		esc_attr( $class ),
		esc_url( get_site_icon_url( 128 ) ),
		esc_attr( theas_monitor_site_letter() )
	);
}

function theas_monitor_login_styled(): bool {
	return (bool) apply_filters( 'theas_monitor_login_style', ! function_exists( 'theas_login_interim' ) );
}

/** Het kleine inlogvenster in wp-admin als je sessie verlopen is: geen stippenveld. */
function theas_monitor_login_interim(): bool {
	return ! empty( $_REQUEST['interim-login'] ); // phpcs:ignore -- alleen lezen
}

add_action( 'login_enqueue_scripts', function () {
	if ( ! theas_monitor_login_styled() ) {
		return;
	}
	$url = plugin_dir_url( THEAS_MONITOR_FILE ) . 'assets/';
	wp_enqueue_style( 'theas-monitor-brand', $url . 'brand.css', array(), THEAS_MONITOR_VERSION );
	wp_enqueue_style( 'theas-monitor-login', $url . 'login.css', array( 'login', 'theas-monitor-brand' ), THEAS_MONITOR_VERSION );
	if ( ! theas_monitor_login_interim() ) {
		wp_enqueue_script( 'theas-monitor-dots', $url . 'dots.js', array(), THEAS_MONITOR_VERSION, true );
	}
} );

add_action( 'login_header', function () {
	if ( theas_monitor_login_styled() && ! theas_monitor_login_interim() ) {
		echo theas_monitor_site_art( 'theas-login-art' ); // phpcs:ignore -- ge-escaped in de functie
	}
} );

add_filter( 'login_headerurl', function ( $url ) {
	return theas_monitor_login_styled() ? home_url( '/' ) : $url;
} );

// Icoon, naam en daaronder het adres en wat je hier doet. WordPress zet deze tekst zonder escapen in de link.
add_filter( 'login_headertext', function ( $text ) {
	if ( ! theas_monitor_login_styled() ) {
		return $text;
	}
	$labels = array(
		'lostpassword'        => 'wachtwoord vergeten',
		'retrievepassword'    => 'wachtwoord vergeten',
		'rp'                  => 'nieuw wachtwoord',
		'resetpass'           => 'nieuw wachtwoord',
		'register'            => 'account aanmaken',
		'confirm_admin_email' => 'e-mailadres bevestigen',
	);
	$action = isset( $GLOBALS['action'] ) && is_string( $GLOBALS['action'] ) ? $GLOBALS['action'] : 'login';
	$host   = (string) wp_parse_url( home_url(), PHP_URL_HOST );
	return theas_monitor_site_mark()
		. '<span class="theas-login__name">' . esc_html( theas_monitor_site_name() ) . '</span>'
		. '<span class="theas-login__note">' . esc_html( ( $host ? $host . ' · ' : '' ) . ( $labels[ $action ] ?? 'inloggen' ) ) . '</span>';
} );

add_filter( 'login_body_class', function ( $classes ) {
	if ( theas_monitor_login_styled() ) {
		$classes[] = 'theas-login';
	}
	return $classes;
} );

add_filter( 'login_display_language_dropdown', function ( $show ) {
	return theas_monitor_login_styled() ? false : $show;
} );
