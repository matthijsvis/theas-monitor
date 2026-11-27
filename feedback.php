<?php
/**
 * Meldingen en vragen van ingelogde gebruikers, voor het Verymooi-dashboard.
 *
 * - Op de website: een verplaatsbare balk rechtsonder (assets/feedback.js) die laat zien dat je op de voorkant van de
 *   live website zit, met de knoppen "Pagina bewerken" en "Iets melden". Met die laatste zet je fouten, wensen en vragen
 *   op een lijst (ook over meerdere pagina's) en verstuur je ze samen, elk met een schermafbeelding en een gekozen element.
 * - In wp-admin: de widget "Vraag aan Verymooi" op het dashboard.
 * Beide bewaren de melding hier (theas_feedback, alleen in de database). Het dashboard haalt ze elk kwartier op met
 * een ondertekend verzoek (GET /feedback) en bevestigt ze daarna (POST /feedback/ack), waarna ze hier verdwijnen.
 * De route om te melden (POST /feedback/new) is voor ingelogde gebruikers van deze website zelf: REST-nonce, geen
 * handtekening.
 */

defined( 'ABSPATH' ) || exit;

const THEAS_MONITOR_FEEDBACK_TYPES = array( 'bug' => 'Fout', 'wish' => 'Wens', 'question' => 'Vraag' );

function theas_monitor_feedback_settings(): array {
	return (array) get_option( 'theas_monitor_feedback', array() ) + array( 'button' => true, 'widget' => true );
}

add_action( 'init', function () {
	register_post_type( 'theas_feedback', array(
		'public'   => false,
		'show_ui'  => false,
		'rewrite'  => false,
		'supports' => array( 'author' ),
	) );
} );

/** Wat de browser meestuurt, gecontroleerd en ingekort. */
function theas_monitor_feedback_clean( WP_REST_Request $r ) {
	$type    = (string) $r['type'];
	$message = trim( sanitize_textarea_field( (string) $r['message'] ) );
	if ( ! isset( THEAS_MONITOR_FEEDBACK_TYPES[ $type ] ) ) {
		$type = 'bug';
	}
	if ( '' === $message ) {
		return new WP_Error( 'theas_monitor_feedback', 'Schrijf kort wat er aan de hand is.', array( 'status' => 400 ) );
	}
	$text    = fn( $value, int $max ) => mb_substr( sanitize_text_field( (string) $value ), 0, $max );
	$element = is_array( $r['element'] ) ? $r['element'] : array();
	$data    = array(
		'type'     => $type,
		'url'      => esc_url_raw( (string) $r['url'] ),
		'title'    => $text( $r['title'], 200 ),
		'viewport' => $text( $r['viewport'], 40 ),
		'browser'  => $text( $r->get_header( 'user_agent' ), 300 ),
		'errors'   => array_slice( array_map( fn( $e ) => $text( $e, 300 ), array_filter( (array) $r['errors'], 'is_string' ) ), 0, 10 ),
		'element'  => $element ? array(
			'selector' => $text( $element['selector'] ?? '', 300 ),
			'text'     => $text( $element['text'] ?? '', 200 ),
		) : null,
		'admin'    => (bool) $r['admin'],
	);

	// Schermafbeelding als data-URL (JPEG of PNG, hooguit 3 MB); bewaard als base64, zonder het voorvoegsel.
	$shot = '';
	if ( preg_match( '#^data:image/(jpeg|png);base64,([A-Za-z0-9+/=]+)$#', (string) $r['shot'], $m ) ) {
		$bytes = base64_decode( $m[2], true );
		if ( $bytes && strlen( $bytes ) <= 3 * MB_IN_BYTES && @getimagesizefromstring( $bytes ) ) { // phpcs:ignore -- ongeldige afbeelding = geen afbeelding
			$shot = $m[1] . ':' . $m[2];
		}
	}
	return array( $message, $data, $shot );
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'theas-monitor/v1', '/feedback/new', array(
		'methods'             => 'POST',
		'permission_callback' => 'is_user_logged_in',
		'callback'            => function ( WP_REST_Request $r ) {
			// Hooguit 30 per uur per gebruiker, tegen per ongeluk herhaald versturen.
			$key   = 'theas_monitor_fb_' . get_current_user_id();
			$count = (int) get_transient( $key );
			if ( $count >= 30 ) {
				return new WP_Error( 'theas_monitor_feedback', 'Je hebt het afgelopen uur al veel verstuurd. Probeer het straks opnieuw.', array( 'status' => 429 ) );
			}
			$clean = theas_monitor_feedback_clean( $r );
			if ( is_wp_error( $clean ) ) {
				return $clean;
			}
			[ $message, $data, $shot ] = $clean;
			$id = wp_insert_post( array(
				'post_type'    => 'theas_feedback',
				'post_status'  => 'private',
				'post_author'  => get_current_user_id(),
				'post_title'   => THEAS_MONITOR_FEEDBACK_TYPES[ $data['type'] ],
				'post_content' => $message,
			), true );
			if ( is_wp_error( $id ) ) {
				return $id;
			}
			update_post_meta( $id, '_theas_feedback', $data );
			if ( $shot ) {
				update_post_meta( $id, '_theas_feedback_shot', $shot );
			}
			set_transient( $key, $count + 1, HOUR_IN_SECONDS );
			return array( 'sent' => true );
		},
	) );

	// Voor het dashboard: de oudste meldingen die nog niet zijn opgehaald (vijf per keer, vanwege de afbeeldingen).
	register_rest_route( 'theas-monitor/v1', '/feedback', array(
		'methods'             => 'GET',
		'permission_callback' => 'theas_monitor_verify',
		'callback'            => function () {
			$posts = get_posts( array( 'post_type' => 'theas_feedback', 'post_status' => 'private', 'posts_per_page' => 5, 'orderby' => 'ID', 'order' => 'ASC' ) );
			$items = array();
			foreach ( $posts as $post ) {
				$user    = get_userdata( (int) $post->post_author );
				$items[] = array(
					'id'      => $post->ID,
					'created' => strtotime( $post->post_date_gmt . ' UTC' ),
					'message' => $post->post_content,
					'data'    => (array) get_post_meta( $post->ID, '_theas_feedback', true ),
					'shot'    => (string) get_post_meta( $post->ID, '_theas_feedback_shot', true ),
					'user'    => $user ? array( 'name' => $user->display_name, 'email' => $user->user_email, 'role' => implode( ', ', $user->roles ) ) : null,
				);
			}
			$total = (int) ( wp_count_posts( 'theas_feedback' )->private ?? 0 );
			return array( 'items' => $items, 'more' => max( 0, $total - count( $items ) ) );
		},
	) );

	register_rest_route( 'theas-monitor/v1', '/feedback/ack', array(
		'methods'             => 'POST',
		'permission_callback' => 'theas_monitor_verify',
		'callback'            => function ( WP_REST_Request $r ) {
			$done = 0;
			foreach ( array_map( 'absint', (array) $r['ids'] ) as $id ) {
				if ( 'theas_feedback' === get_post_type( $id ) && wp_delete_post( $id, true ) ) {
					$done++;
				}
			}
			return array( 'deleted' => $done );
		},
	) );
} );

/* ---------- Balk op de website: Live, Pagina bewerken en Iets melden ---------- */

/** Waar deze website draait: 'local' (localhost, .test, …), 'staging' of 'live'. */
function theas_monitor_environment(): string {
	$type = wp_get_environment_type();
	$host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
	if ( in_array( $type, array( 'local', 'development' ), true ) || in_array( $host, array( 'localhost', '127.0.0.1', '[::1]' ), true )
		|| preg_match( '/\.(local|test|localhost)$/', $host ) ) {
		return 'local';
	}
	return 'staging' === $type ? 'staging' : 'live';
}

/** Bewerklink voor wat je nu bekijkt (pagina, bericht, eigen berichttype of categorie), als de gebruiker dat mag. */
function theas_monitor_edit_link(): string {
	$object = get_queried_object();
	if ( $object instanceof WP_Post ) {
		return (string) get_edit_post_link( $object->ID, 'raw' );
	}
	if ( $object instanceof WP_Term ) {
		return (string) get_edit_term_link( $object, $object->taxonomy );
	}
	return '';
}

function theas_monitor_feedback_button(): bool {
	return is_user_logged_in() && ! is_admin() && ! is_customize_preview() && theas_monitor_feedback_settings()['button']
		&& apply_filters( 'theas_monitor_feedback_button', true );
}

// Fouten in de browser vanaf het begin van de pagina bijhouden; ze gaan mee met een melding.
add_action( 'wp_head', function () {
	if ( theas_monitor_feedback_button() ) {
		echo "<script>window.vmErrors=[];addEventListener('error',function(e){vmErrors.push((e.message||'Fout')+(e.filename?' ('+e.filename+':'+e.lineno+')':''));vmErrors.splice(0,vmErrors.length-10)});addEventListener('unhandledrejection',function(e){vmErrors.push('Promise: '+(e.reason&&e.reason.message||e.reason));vmErrors.splice(0,vmErrors.length-10)});</script>\n";
	}
}, 1 );

add_action( 'wp_enqueue_scripts', function () {
	if ( ! theas_monitor_feedback_button() ) {
		return;
	}
	wp_enqueue_script( 'theas-monitor-feedback', plugin_dir_url( THEAS_MONITOR_FILE ) . 'assets/feedback.js', array(), THEAS_MONITOR_VERSION, true );
	wp_add_inline_script( 'theas-monitor-feedback', 'window.vmFeedback = ' . wp_json_encode( array(
		'url'   => rest_url( 'theas-monitor/v1/feedback/new' ),
		'nonce' => wp_create_nonce( 'wp_rest' ),
		'user'  => get_current_user_id(),
		'types' => THEAS_MONITOR_FEEDBACK_TYPES,
		'env'   => theas_monitor_environment(),
		'host'  => (string) wp_parse_url( home_url(), PHP_URL_HOST ),
		'edit'  => theas_monitor_edit_link(),
	) ) . ';', 'before' );
} );

/* ---------- Vraag aan Verymooi (wp-admin) ---------- */

add_action( 'wp_dashboard_setup', function () {
	if ( ! theas_monitor_feedback_settings()['widget'] ) {
		return;
	}
	wp_add_dashboard_widget( 'theas_monitor_question', 'Vraag aan Verymooi', 'theas_monitor_question_widget', null, null, 'normal', 'high' );
} );

function theas_monitor_question_widget(): void {
	$user = wp_get_current_user();
	?>
	<form id="theas-monitor-question">
		<p><label for="theas-monitor-question-text">Waar kan ik je mee helpen? Een vraag, een wens of iets dat niet goed werkt.</label></p>
		<p><textarea id="theas-monitor-question-text" rows="4" class="widefat" required></textarea></p>
		<p>
			<select id="theas-monitor-question-type">
				<?php foreach ( THEAS_MONITOR_FEEDBACK_TYPES as $type => $label ) : ?>
					<option value="<?php echo esc_attr( $type ); ?>" <?php selected( 'question', $type ); ?>><?php echo esc_html( $label ); ?></option>
				<?php endforeach; ?>
			</select>
			<button type="submit" class="button button-primary">Versturen</button>
		</p>
		<p class="description" role="status">Je krijgt antwoord per mail op <?php echo esc_html( $user->user_email ); ?>.</p>
	</form>
	<script>
		( function () {
			var form = document.getElementById( 'theas-monitor-question' );
			var text = document.getElementById( 'theas-monitor-question-text' );
			var status = form.querySelector( '[role=status]' );
			var button = form.querySelector( 'button' );
			var intro = status.textContent;
			form.addEventListener( 'submit', function ( event ) {
				event.preventDefault();
				button.disabled = true;
				status.textContent = 'Versturen…';
				fetch( <?php echo wp_json_encode( rest_url( 'theas-monitor/v1/feedback/new' ) ); ?>, {
					method: 'POST',
					credentials: 'same-origin',
					headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?> },
					body: JSON.stringify( { type: document.getElementById( 'theas-monitor-question-type' ).value, message: text.value, url: location.href, title: document.title, admin: true, viewport: innerWidth + '×' + innerHeight } )
				} ).then( function ( res ) {
					return res.json().then( function ( data ) { if ( ! res.ok ) { throw new Error( data.message || 'Versturen lukte niet.' ); } } );
				} ).then( function () {
					text.value = '';
					status.textContent = 'Verstuurd, dank je! ' + intro;
				} ).catch( function ( err ) {
					status.textContent = err.message || 'Versturen lukte niet.';
				} ).finally( function () {
					button.disabled = false;
				} );
			} );
		} )();
	</script>
	<?php
}
