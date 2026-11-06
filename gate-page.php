<?php
/**
 * De pagina die bezoekers van een afgeschermde website zien. Staat los van het thema; $failed komt uit gate.php.
 */

defined( 'ABSPATH' ) || exit;

$theas_gate_url = plugin_dir_url( THEAS_MONITOR_FILE ) . 'assets/';
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex, nofollow">
	<title><?php echo esc_html( get_bloginfo( 'name' ) ); ?></title>
	<?php wp_site_icon(); ?>
	<link rel="stylesheet" href="<?php echo esc_url( $theas_gate_url . 'gate.css?ver=' . THEAS_MONITOR_VERSION ); ?>">
</head>
<body>
	<main class="gate">
		<h1><?php echo esc_html( get_bloginfo( 'name' ) ); ?></h1>
		<p class="gate__note">Besloten website · wachtwoord</p>
		<?php if ( $failed ) : ?>
			<p class="gate__error" role="alert">Dit wachtwoord klopt niet.</p>
		<?php endif; ?>
		<form method="post">
			<label for="theas-gate-password">Wachtwoord</label>
			<div class="gate__field">
				<input type="password" name="theas_gate_password" id="theas-gate-password" autocomplete="current-password" required autofocus>
				<button type="button" class="gate__eye" aria-label="Wachtwoord tonen" aria-pressed="false" hidden>
					<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
				</button>
			</div>
			<div class="gate__actions">
				<?php if ( theas_monitor_gate_settings()['remember'] ) : ?>
					<label class="gate__remember"><input type="checkbox" name="theas_gate_remember" value="1"> Onthoud mij</label>
				<?php endif; ?>
				<button type="submit" class="gate__submit">Naar de website</button>
			</div>
		</form>
	</main>
	<div class="gate__art" aria-hidden="true"><canvas></canvas></div>
	<script src="<?php echo esc_url( $theas_gate_url . 'gate.js?ver=' . THEAS_MONITOR_VERSION ); ?>" defer></script>
</body>
</html>
