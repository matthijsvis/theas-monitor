<?php
/**
 * Plugin Name: Theas Monitor
 * Description: Geeft het Theas-dashboard (verymooi.nl) de status van deze website (versies, updates, Site Health, fouten, SEO) en een eenmalige inloglink voor wp-admin. Alleen bereikbaar met een ondertekend verzoek. Kan de hele website afschermen met een wachtwoord.
 * Version: 1.4.1
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Theas
 * License: GPL-2.0-or-later
 * Text Domain: theas-monitor
 * Update URI: https://github.com/matthijsvis/theas-monitor
 *
 * Koppelen: Instellingen → Theas Monitor → koppelcode kopiëren en in het dashboard plakken.
 * Updates: nieuwe versies komen van GitHub en verschijnen gewoon bij Plugins (zie updater.php).
 *
 * Beveiliging: elk verzoek draagt de headers X-Theas-Time, X-Theas-Nonce en X-Theas-Signature,
 * waarbij Signature = HMAC-SHA256( "METHODE\nROUTE\nTIJD\nNONCE\nsha256(body)", geheim ).
 * Verzoeken ouder dan 5 minuten of met een eerder gebruikte nonce worden geweigerd.
 */

defined( 'ABSPATH' ) || exit;

const THEAS_MONITOR_VERSION = '1.4.1';
const THEAS_MONITOR_WINDOW  = 300;
const THEAS_MONITOR_FILE    = __FILE__;

require __DIR__ . '/updater.php';
require __DIR__ . '/gate.php';
require __DIR__ . '/admin-menu.php';

register_activation_hook( __FILE__, 'theas_monitor_secret' );

/** Het gedeelde geheim (wordt bij de eerste keer aangemaakt). */
function theas_monitor_secret( bool $renew = false ): string {
	$secret = (string) get_option( 'theas_monitor_secret' );
	if ( $renew || strlen( $secret ) < 32 ) {
		$secret = wp_generate_password( 48, false, false );
		update_option( 'theas_monitor_secret', $secret, false );
	}
	return $secret;
}

/** Koppelcode voor het dashboard: base64url( {"u": adres, "s": geheim} ). */
function theas_monitor_pair_code(): string {
	$json = wp_json_encode( array( 'u' => untrailingslashit( home_url() ), 's' => theas_monitor_secret() ) );
	return rtrim( strtr( base64_encode( $json ), '+/', '-_' ), '=' );
}

/** Controleert de handtekening van een REST-verzoek. */
function theas_monitor_verify( WP_REST_Request $request ) {
	$time  = (string) $request->get_header( 'x_theas_time' );
	$nonce = (string) $request->get_header( 'x_theas_nonce' );
	$sign  = (string) $request->get_header( 'x_theas_signature' );
	$fail  = new WP_Error( 'theas_monitor_denied', 'Geen geldige handtekening.', array( 'status' => 401 ) );

	if ( ! ctype_digit( $time ) || abs( time() - (int) $time ) > THEAS_MONITOR_WINDOW || strlen( $nonce ) < 16 || ! $sign ) {
		return $fail;
	}
	$message  = implode( "\n", array( $request->get_method(), $request->get_route(), $time, $nonce, hash( 'sha256', (string) $request->get_body() ) ) );
	$expected = hash_hmac( 'sha256', $message, theas_monitor_secret() );
	if ( ! hash_equals( $expected, $sign ) ) {
		return $fail;
	}
	// Elke nonce maar één keer (tegen het opnieuw afspelen van een onderschept verzoek).
	$key = 'theas_monitor_n_' . md5( $nonce );
	if ( get_transient( $key ) ) {
		return $fail;
	}
	set_transient( $key, 1, 2 * THEAS_MONITOR_WINDOW );
	return true;
}

/* ---------- Status ---------- */

function theas_monitor_status(): array {
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
	require_once ABSPATH . 'wp-admin/includes/update.php';

	// Core.
	$core_update = null;
	$core        = get_site_transient( 'update_core' );
	foreach ( ( $core->updates ?? array() ) as $offer ) {
		if ( 'upgrade' === ( $offer->response ?? '' ) ) {
			$core_update = $offer->current;
			break;
		}
	}

	// Plugins.
	$plugin_updates = get_site_transient( 'update_plugins' );
	$plugins        = array();
	foreach ( get_plugins() as $file => $plugin ) {
		$plugins[] = array(
			'file'    => $file,
			'name'    => $plugin['Name'],
			'version' => $plugin['Version'],
			'active'  => is_plugin_active( $file ),
			'update'  => $plugin_updates->response[ $file ]->new_version ?? null,
			'auto'    => in_array( $file, (array) get_site_option( 'auto_update_plugins', array() ), true ),
		);
	}

	// Thema's.
	$theme_updates = get_site_transient( 'update_themes' );
	$themes        = array();
	foreach ( wp_get_themes() as $slug => $theme ) {
		$themes[] = array(
			'slug'    => $slug,
			'name'    => $theme->get( 'Name' ),
			'version' => $theme->get( 'Version' ),
			'active'  => get_stylesheet() === $slug,
			'update'  => $theme_updates->response[ $slug ]['new_version'] ?? null,
		);
	}

	$updates = array(
		'core'    => $core_update ? 1 : 0,
		'plugins' => count( array_filter( $plugins, fn( $p ) => $p['update'] ) ),
		'themes'  => count( array_filter( $themes, fn( $t ) => $t['update'] ) ),
	);
	$updates['total'] = array_sum( $updates );

	// Site Health: het resultaat dat WordPress zelf wekelijks bewaart.
	$health = json_decode( (string) get_transient( 'health-check-site-status-result' ), true );

	// Geplande taken die al meer dan een uur te laat zijn (cron werkt niet goed).
	$late = 0;
	foreach ( (array) _get_cron_array() as $timestamp => $hooks ) {
		if ( $timestamp < time() - HOUR_IN_SECONDS ) {
			$late += count( $hooks );
		}
	}

	return array(
		'plugin'      => THEAS_MONITOR_VERSION,
		'name'        => get_bloginfo( 'name' ),
		'url'         => home_url(),
		'wp'          => array( 'version' => get_bloginfo( 'version' ), 'update' => $core_update ),
		'php'         => PHP_VERSION,
		'db'          => $wpdb->db_server_info(),
		'server'      => isset( $_SERVER['SERVER_SOFTWARE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) : '',
		'environment' => wp_get_environment_type(),
		'multisite'   => is_multisite(),
		'https'       => 'https' === wp_parse_url( home_url(), PHP_URL_SCHEME ),
		'indexing'    => (bool) get_option( 'blog_public' ),
		'debug'       => array( 'enabled' => defined( 'WP_DEBUG' ) && WP_DEBUG, 'display' => defined( 'WP_DEBUG_DISPLAY' ) && WP_DEBUG_DISPLAY && defined( 'WP_DEBUG' ) && WP_DEBUG ),
		'admins'      => count( get_users( array( 'role' => 'administrator', 'fields' => 'ID' ) ) ),
		'updates'     => $updates,
		'plugins'     => $plugins,
		'themes'      => $themes,
		'health'      => is_array( $health ) ? array( 'good' => (int) ( $health['good'] ?? 0 ), 'recommended' => (int) ( $health['recommended'] ?? 0 ), 'critical' => (int) ( $health['critical'] ?? 0 ) ) : null,
		'cron'        => array( 'disabled' => defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON, 'late' => $late ),
		'errors'      => theas_monitor_errors(),
		'auto_core'   => (string) get_site_option( 'auto_update_core_major', '' ),
		'seo'         => theas_monitor_seo(),
	);
}

/**
 * SEO van binnenuit: welke SEO-plugin, permalinks, sitemap en hoe compleet de inhoud is
 * (omschrijvingen, focuswoorden, scores van de SEO-plugin, noindex en alt-teksten van afbeeldingen).
 * Velden die de gebruikte SEO-plugin niet kent, zijn null.
 */
function theas_monitor_seo(): array {
	global $wpdb;

	$plugin = '';
	$keys   = array( 'desc' => null, 'focus' => null, 'score' => null );
	$noidx  = null; // SQL-voorwaarde op postmeta m voor "noindex"
	if ( defined( 'RANK_MATH_VERSION' ) ) {
		$plugin = 'Rank Math';
		$keys   = array( 'desc' => 'rank_math_description', 'focus' => 'rank_math_focus_keyword', 'score' => 'rank_math_seo_score' );
		$noidx  = "m.meta_key = 'rank_math_robots' AND m.meta_value LIKE '%noindex%'";
	} elseif ( defined( 'WPSEO_VERSION' ) ) {
		$plugin = 'Yoast SEO';
		$keys   = array( 'desc' => '_yoast_wpseo_metadesc', 'focus' => '_yoast_wpseo_focuskw', 'score' => '_yoast_wpseo_linkdex' );
		$noidx  = "m.meta_key = '_yoast_wpseo_meta-robots-noindex' AND m.meta_value = '1'";
	} elseif ( defined( 'SEOPRESS_VERSION' ) ) {
		$plugin = 'SEOPress';
		$keys   = array( 'desc' => '_seopress_titles_desc', 'focus' => '_seopress_analysis_target_kw', 'score' => null );
		$noidx  = "m.meta_key = '_seopress_robots_index' AND m.meta_value = 'yes'";
	} elseif ( defined( 'AIOSEO_VERSION' ) ) {
		$plugin = 'All in One SEO';
	} elseif ( defined( 'THE_SEO_FRAMEWORK_VERSION' ) ) {
		$plugin = 'The SEO Framework';
		$keys['desc'] = '_genesis_description';
	}

	// Gepubliceerde, openbare inhoud (berichten, pagina's en eigen berichttypes, zonder bijlagen).
	$types = array_values( array_diff( get_post_types( array( 'public' => true ) ), array( 'attachment' ) ) );
	$in    = implode( ',', array_fill( 0, count( $types ), '%s' ) );
	$where = $wpdb->prepare( "p.post_status = 'publish' AND p.post_type IN ($in)", ...$types ); // phpcs:ignore
	$total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} p WHERE $where" ); // phpcs:ignore

	$missing = function ( ?string $key ) use ( $wpdb, $where ) {
		if ( ! $key ) {
			return null;
		}
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} p WHERE $where AND NOT EXISTS ( SELECT 1 FROM {$wpdb->postmeta} m WHERE m.post_id = p.ID AND m.meta_key = %s AND m.meta_value <> '' )", $key ) ); // phpcs:ignore
	};

	$score = null;
	if ( $keys['score'] ) {
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT AVG( CAST( m.meta_value AS UNSIGNED ) ) AS avg, SUM( CAST( m.meta_value AS UNSIGNED ) < 50 ) AS low, COUNT(*) AS n FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id = p.ID AND m.meta_key = %s AND m.meta_value <> '' WHERE $where", $keys['score'] ) ); // phpcs:ignore
		$score = $row && $row->n ? array( 'average' => (int) round( $row->avg ), 'low' => (int) $row->low, 'scored' => (int) $row->n ) : null;
	}

	$noindex = $noidx ? (int) $wpdb->get_var( "SELECT COUNT( DISTINCT p.ID ) FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id = p.ID AND $noidx WHERE $where" ) : null; // phpcs:ignore

	$images  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'attachment' AND post_mime_type LIKE 'image/%'" );
	$no_alt  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->posts} p WHERE p.post_type = 'attachment' AND p.post_mime_type LIKE 'image/%' AND NOT EXISTS ( SELECT 1 FROM {$wpdb->postmeta} m WHERE m.post_id = p.ID AND m.meta_key = '_wp_attachment_image_alt' AND m.meta_value <> '' )" );

	// Sitemap: die van de SEO-plugin, anders die van WordPress zelf.
	$sitemap = null;
	if ( in_array( $plugin, array( 'Rank Math', 'Yoast SEO', 'All in One SEO' ), true ) ) {
		$sitemap = home_url( '/sitemap_index.xml' );
	} elseif ( 'SEOPress' === $plugin ) {
		$sitemap = home_url( '/sitemaps.xml' );
	} elseif ( function_exists( 'wp_sitemaps_get_server' ) && wp_sitemaps_get_server()->sitemaps_enabled() ) {
		$sitemap = home_url( '/wp-sitemap.xml' );
	}

	return array(
		'plugin'      => $plugin,
		'permalinks'  => '' !== (string) get_option( 'permalink_structure' ),
		'sitemap'     => $sitemap,
		'tagline'     => (string) get_option( 'blogdescription' ),
		'content'     => $total,
		'no_desc'     => $missing( $keys['desc'] ),
		'no_focus'    => $missing( $keys['focus'] ),
		'score'       => $score,
		'noindex'     => $noindex,
		'images'      => $images,
		'images_alt'  => $no_alt,
	);
}

/** Fatale fouten in debug.log van de afgelopen 24 uur (alleen als dat logbestand bestaat). */
function theas_monitor_errors(): array {
	$file = WP_CONTENT_DIR . '/debug.log';
	if ( defined( 'WP_DEBUG_LOG' ) && is_string( WP_DEBUG_LOG ) ) {
		$file = WP_DEBUG_LOG;
	}
	if ( ! is_readable( $file ) ) {
		return array( 'log' => false, 'fatal_24h' => 0, 'last' => '' );
	}
	$size = filesize( $file );
	$fp   = fopen( $file, 'rb' ); // phpcs:ignore
	fseek( $fp, max( 0, $size - 262144 ) );
	$tail = (string) fread( $fp, 262144 ); // phpcs:ignore
	fclose( $fp ); // phpcs:ignore

	$count = 0;
	$last  = '';
	$since = time() - DAY_IN_SECONDS;
	foreach ( explode( "\n", $tail ) as $line ) {
		if ( false === strpos( $line, 'PHP Fatal error' ) || ! preg_match( '/^\[([^\]]+)\]/', $line, $m ) ) {
			continue;
		}
		$when = strtotime( $m[1] );
		if ( $when && $when >= $since ) {
			$count++;
			$last = mb_substr( trim( substr( $line, strlen( $m[0] ) ) ), 0, 300 );
		}
	}
	return array( 'log' => true, 'fatal_24h' => $count, 'last' => $last );
}

/* ---------- Eenmalig inloggen ---------- */

function theas_monitor_login_user(): ?WP_User {
	$user = get_user_by( 'id', (int) get_option( 'theas_monitor_user' ) );
	if ( ! $user || ! user_can( $user, 'manage_options' ) ) {
		$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'orderby' => 'ID' ) );
		$user   = $admins ? $admins[0] : null;
	}
	return $user ?: null;
}

function theas_monitor_create_login(): array {
	if ( ! get_option( 'theas_monitor_sso', 1 ) ) {
		return array( 'url' => null, 'message' => 'Direct inloggen staat uit in Instellingen → Theas Monitor.' );
	}
	$user = theas_monitor_login_user();
	if ( ! $user ) {
		return array( 'url' => null, 'message' => 'Geen beheerder gevonden.' );
	}
	$token = wp_generate_password( 40, false, false );
	set_transient( 'theas_monitor_login_' . hash( 'sha256', $token ), $user->ID, MINUTE_IN_SECONDS );
	return array( 'url' => add_query_arg( array( 'action' => 'theas_monitor', 'token' => $token ), wp_login_url() ) );
}

// wp-login.php?action=theas_monitor&token=… → inloggen en door naar wp-admin. Een token werkt één keer.
add_action( 'login_form_theas_monitor', function () {
	$token = isset( $_GET['token'] ) ? sanitize_text_field( wp_unslash( $_GET['token'] ) ) : '';
	$key   = 'theas_monitor_login_' . hash( 'sha256', $token );
	$user  = $token ? (int) get_transient( $key ) : 0;
	delete_transient( $key );
	if ( ! $user || ! user_can( $user, 'manage_options' ) ) {
		wp_die( 'Deze inloglink is verlopen of al gebruikt. Vraag in het dashboard een nieuwe aan.', 'Inloglink verlopen', array( 'response' => 403 ) );
	}
	wp_set_current_user( $user );
	wp_set_auth_cookie( $user, false, is_ssl() );
	do_action( 'wp_login', get_userdata( $user )->user_login, get_userdata( $user ) );
	wp_safe_redirect( admin_url() );
	exit;
} );

/* ---------- REST ---------- */

add_action( 'rest_api_init', function () {
	register_rest_route( 'theas-monitor/v1', '/status', array(
		'methods'             => 'GET',
		'callback'            => fn() => theas_monitor_status(),
		'permission_callback' => 'theas_monitor_verify',
	) );
	register_rest_route( 'theas-monitor/v1', '/login', array(
		'methods'             => 'POST',
		'callback'            => fn() => theas_monitor_create_login(),
		'permission_callback' => 'theas_monitor_verify',
	) );
} );

// Sites die de REST-API voor gasten afschermen (zoals verymooi.nl zelf, of de plugin Password Protected):
// deze routes regelen hun eigen toegang.
add_filter( 'rest_authentication_errors', function ( $result ) {
	$route = (string) ( $GLOBALS['wp']->query_vars['rest_route'] ?? '' );
	return 0 === strpos( $route, '/theas-monitor/' ) && is_wp_error( $result ) && in_array( $result->get_error_code(), array( 'rest_not_logged_in', 'rest_cannot_access' ), true ) ? null : $result;
}, 99 );

/* ---------- Instellingen ---------- */

add_action( 'admin_menu', function () {
	add_options_page( 'Theas Monitor', 'Theas Monitor', 'manage_options', 'theas-monitor', 'theas_monitor_settings_page' );
} );

add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( array $links ) {
	array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=theas-monitor' ) ) . '">Koppelen</a>' );
	return $links;
} );

function theas_monitor_settings_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	if ( isset( $_POST['theas_monitor_save'] ) && check_admin_referer( 'theas_monitor' ) ) {
		update_option( 'theas_monitor_sso', empty( $_POST['sso'] ) ? 0 : 1, false );
		update_option( 'theas_monitor_user', absint( $_POST['user'] ?? 0 ), false );
		$gate_saved = theas_monitor_gate_save( array(
			'enabled'  => ! empty( $_POST['gate'] ),
			'admins'   => ! empty( $_POST['gate_admins'] ),
			'users'    => ! empty( $_POST['gate_users'] ),
			'feeds'    => ! empty( $_POST['gate_feeds'] ),
			'rest'     => ! empty( $_POST['gate_rest'] ),
			'ips'      => sanitize_textarea_field( wp_unslash( $_POST['gate_ips'] ?? '' ) ),
			'remember' => ! empty( $_POST['gate_remember'] ),
			'days'     => max( 1, absint( $_POST['gate_days'] ?? 14 ) ),
		), wp_unslash( $_POST['gate_password'] ?? '' ) ); // phpcs:ignore -- wachtwoorden niet opschonen
		if ( ! $gate_saved ) {
			echo '<div class="notice notice-error"><p>Kies een wachtwoord om de website af te schermen. De afscherming is niet ingeschakeld.</p></div>';
		}
		if ( ! empty( $_POST['renew'] ) ) {
			theas_monitor_secret( true );
			echo '<div class="notice notice-warning"><p>Nieuw geheim aangemaakt. Koppel de website opnieuw in het dashboard.</p></div>';
		} else {
			echo '<div class="notice notice-success"><p>Opgeslagen.</p></div>';
		}
	}
	$admins = get_users( array( 'role' => 'administrator', 'orderby' => 'display_name' ) );
	$chosen = theas_monitor_login_user();
	$gate   = theas_monitor_gate_settings();
	?>
	<div class="wrap">
		<h1>Theas Monitor</h1>
		<p>Plak deze koppelcode in het dashboard bij de website (<em>Monitor koppelen</em>). Behandel hem als een wachtwoord.</p>
		<p><textarea readonly rows="3" class="large-text code" onclick="this.select()"><?php echo esc_textarea( theas_monitor_pair_code() ); ?></textarea></p>
		<form method="post">
			<?php wp_nonce_field( 'theas_monitor' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">Direct inloggen</th>
					<td><label><input type="checkbox" name="sso" value="1" <?php checked( get_option( 'theas_monitor_sso', 1 ) ); ?>> Het dashboard mag een eenmalige inloglink (60 seconden geldig) aanvragen</label></td>
				</tr>
				<tr>
					<th scope="row"><label for="theas-monitor-user">Inloggen als</label></th>
					<td>
						<select name="user" id="theas-monitor-user">
							<?php foreach ( $admins as $admin ) : ?>
								<option value="<?php echo (int) $admin->ID; ?>" <?php selected( $chosen && $chosen->ID === $admin->ID ); ?>><?php echo esc_html( $admin->display_name . ' (' . $admin->user_login . ')' ); ?></option>
							<?php endforeach; ?>
						</select>
					</td>
				</tr>
				<tr>
					<th scope="row">Geheim vernieuwen</th>
					<td><label><input type="checkbox" name="renew" value="1"> Nieuw geheim maken (de huidige koppeling werkt dan niet meer)</label></td>
				</tr>
			</table>
			<h2>Website afschermen</h2>
			<p>Bezoekers zien dan alleen een pagina met een wachtwoordveld. Zoekmachines ontmoedigen (Instellingen → Lezen) gaat automatisch mee aan en uit.</p>
			<?php if ( $gate['enabled'] && is_plugin_active( 'password-protected/password-protected.php' ) ) : ?>
				<div class="notice notice-warning inline"><p>De plugin Password Protected staat ook aan. Zet die uit, anders krijgen bezoekers twee keer een wachtwoord.</p></div>
			<?php endif; ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">Afscherming</th>
					<td><label><input type="checkbox" name="gate" value="1" <?php checked( $gate['enabled'] ); ?>> Website afschermen met een wachtwoord</label></td>
				</tr>
				<tr>
					<th scope="row"><label for="theas-monitor-gate-password">Wachtwoord</label></th>
					<td>
						<input type="text" name="gate_password" id="theas-monitor-gate-password" class="regular-text" autocomplete="off">
						<p class="description"><?php echo $gate['password'] ? 'Er is een wachtwoord ingesteld. Laat dit veld leeg om het te houden; een nieuw wachtwoord vraagt iedereen opnieuw om in te loggen.' : 'Nog geen wachtwoord ingesteld.'; ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row">Altijd toegang</th>
					<td>
						<label><input type="checkbox" name="gate_admins" value="1" <?php checked( $gate['admins'] ); ?>> Ingelogde beheerders</label><br>
						<label><input type="checkbox" name="gate_users" value="1" <?php checked( $gate['users'] ); ?>> Alle ingelogde gebruikers</label><br>
						<label><input type="checkbox" name="gate_feeds" value="1" <?php checked( $gate['feeds'] ); ?>> RSS-feeds</label><br>
						<label><input type="checkbox" name="gate_rest" value="1" <?php checked( $gate['rest'] ); ?>> REST-API</label>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="theas-monitor-gate-ips">IP-adressen met toegang</label></th>
					<td>
						<textarea name="gate_ips" id="theas-monitor-gate-ips" rows="3" class="regular-text code"><?php echo esc_textarea( $gate['ips'] ); ?></textarea>
						<p class="description">Eén adres per regel.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Onthouden</th>
					<td><label><input type="checkbox" name="gate_remember" value="1" <?php checked( $gate['remember'] ); ?>> "Onthoud mij" aanbieden, voor</label> <input type="number" name="gate_days" value="<?php echo (int) $gate['days']; ?>" min="1" class="small-text"> dagen</td>
				</tr>
			</table>
			<?php submit_button( 'Opslaan', 'primary', 'theas_monitor_save' ); ?>
		</form>
	</div>
	<?php
}
