# Theas Monitor

WordPress-plugin die het Theas-dashboard (verymooi.nl) de status van een website geeft: versies, updates,
Site Health, fouten, SEO van binnenuit, en een eenmalige inloglink voor wp-admin.

## Installeren

1. Download [`theas-monitor.zip`](https://github.com/matthijsvis/theas-monitor/releases/latest/download/theas-monitor.zip)
   en upload hem in wp-admin → Plugins → Nieuwe plugin.
2. Activeer de plugin en kopieer bij *Instellingen → Theas Monitor* de koppelcode.
3. Plak de koppelcode in het dashboard bij de website (*Monitor koppelen*).

## Updates

Nieuwe versies verschijnen vanzelf bij Plugins en Dashboard → Updates (via de header `Update URI` en
`updater.php`); bijwerken is één klik, of zet automatisch bijwerken aan.

## Beveiliging

- Alleen bereikbaar met een ondertekend verzoek: HMAC-SHA256 over methode, route, tijd, nonce en body, met een
  venster van 5 minuten en elke nonce maar één keer.
- Het geheim staat alleen in de database van de website en van het dashboard; de code bevat geen geheimen.
- De inloglink is 60 seconden geldig, werkt één keer en staat alleen gehasht opgeslagen.

## Een nieuwe versie uitbrengen

Vanuit het verymooi-project: `bin/monitor-release.sh 1.2.0 "Wat er veranderd is"`. Dat zet de versie in
`theas-monitor.php`, maakt een commit en een tag en pusht; de workflow `.github/workflows/release.yml` maakt de
zip en publiceert de release.

Vereist WordPress 6.0+ en PHP 7.4+. Licentie: GPL-2.0-or-later.
