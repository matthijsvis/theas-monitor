# Verymooi Monitor

WordPress-plugin die het Verymooi-dashboard (verymooi.nl) de status van een website geeft: versies, updates,
Site Health, fouten, SEO van binnenuit, en een eenmalige inloglink voor wp-admin.

## Installeren

1. Download [`theas-monitor.zip`](https://github.com/matthijsvis/theas-monitor/releases/latest/download/theas-monitor.zip)
   en upload hem in wp-admin → Plugins → Nieuwe plugin.
2. Activeer de plugin en kopieer bij *Instellingen → Verymooi Monitor* de koppelcode.
3. Plak de koppelcode in het dashboard bij de website (*Monitor koppelen*).

## Website afschermen

Bij *Instellingen → Verymooi Monitor* kun je de hele website achter één wachtwoord zetten. Bezoekers zien dan een eigen
pagina met een wachtwoordveld; ingelogde gebruikers, wp-admin en robots.txt blijven werken. Aan- en uitzetten zet ook
*Zoekmachines ontmoedigen* aan en uit. De plugin Password Protected is daarmee niet meer nodig.

## Inlogscherm

Het inlogscherm van WordPress (`wp-login.php`, ook *Wachtwoord vergeten* en *Nieuw wachtwoord*) krijgt dezelfde look als
dat van verymooi.nl en als de wachtwoordpagina: links het icoon, de naam en het adres van de website met het formulier,
rechts een stippenveld met het icoon in het midden. Het icoon is het Site-pictogram (*Instellingen → Algemeen*);
zonder pictogram staat er de eerste letter van de naam. Licht of donker volgt het systeem van de bezoeker. Uitzetten
kan met `add_filter( 'theas_monitor_login_style', '__return_false' );`.

## Meldingen en vragen

- **Op de website** zien ingelogde gebruikers rechtsonder een balk (verslepen kan; de plek wordt onthouden). Bovenin
  staat dat je op de voorkant van de live website zit (lokaal: *Lokaal*), daaronder de knoppen *Pagina bewerken* (de
  editor van wat je bekijkt) en *Iets melden*. Met *Iets melden* zet je fouten, wensen en vragen op een lijst (*Toevoegen*, ook over meerdere pagina's) en stuur je ze samen
  (*Versturen*), elk met desgewenst een gekozen element op de pagina en een schermafbeelding (kiezen, plakken of erin
  slepen; de knop legt uit hoe je er een maakt op je eigen systeem en in je browser).
- **In wp-admin** staat op het dashboard de widget *Vraag aan Verymooi*.
- Het Verymooi-dashboard haalt alles elk kwartier op (ondertekend) en toont het bij de website. Vragen gaan direct
  per mail naar de beheerder, fouten en wensen elke nacht om 0:00 in één mail.
- Uitzetten per website bij *Instellingen → Verymooi Monitor*.

## Site bewerken

Bij een blokthema toont een klik op *Site bewerken* (adminbalk) of *Weergave → Editor* eerst een waarschuwing: bewerk
daar alleen de header en de footer, en we raden af er verder veel te wijzigen. Daarna kun je toch doorgaan, of op de
website meteen naar *Pagina bewerken*. In de site-editor zelf staat dezelfde waarschuwing bovenaan. Links die
rechtstreeks naar de header, de footer of de patronen gaan, krijgen geen waarschuwing.

## Beheermenu

Het linkermenu van wp-admin toont alleen het Dashboard, Berichten, Media, Pagina's en de eigen berichttypes; de rest
(instellingen, plugins, formulieren, …) staat ingeklapt onder *Overig*.

## Updates

Nieuwe versies verschijnen vanzelf bij Plugins en Dashboard → Updates (via de header `Update URI` en
`updater.php`); bijwerken is één klik, of zet automatisch bijwerken aan. Met *Check voor updates* bij de plugin op de
pagina Plugins kijk je meteen of er een nieuwe versie is.

## Beveiliging

- Alleen bereikbaar met een ondertekend verzoek: HMAC-SHA256 over methode, route, tijd, nonce en body, met een
  venster van 5 minuten en elke nonce maar één keer.
- Het geheim staat alleen in de database van de website en van het dashboard; de code bevat geen geheimen.
- De inloglink is 60 seconden geldig, werkt één keer en staat alleen gehasht opgeslagen.

## Een nieuwe versie uitbrengen

Vanuit deze repo: `bin/release.sh 1.2.0 "Wat er veranderd is"`. Dat zet de versie in
`theas-monitor.php`, maakt een commit en een tag en pusht; de workflow `.github/workflows/release.yml` maakt de
zip en publiceert de release.

Vereist WordPress 6.0+ en PHP 7.4+. Licentie: GPL-2.0-or-later.
