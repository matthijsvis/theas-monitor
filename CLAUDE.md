# Theas Monitor (WordPress-plugin)

Deze map is de werkkopie van de plugin `theas-monitor`: een git-clone van de openbare repo
github.com/matthijsvis/theas-monitor (branch `main`). Alle wijzigingen aan de plugin gebeuren hier.

- `theas-monitor.php`: status-endpoint, SEO, fouten, eenmalig inloggen, instellingenpagina.
- `gate.php`, `gate-page.php`, `assets/`: de website afschermen met een wachtwoord (vervangt Password Protected).
- `admin-menu.php`: beheermenu met "Overig" (Dashboard, berichttypes, dan de rest ingeklapt).
- `updater.php`: updates via GitHub-releases (`Update URI` + filter `update_plugins_github.com`).
- `.github/workflows/release.yml`: bij een tag `v*` de zip `theas-monitor.zip` bouwen en een release publiceren.
- `bin/release.sh` en `CLAUDE.md` zitten niet in de zip (`export-ignore` in `.gitattributes`).

## Werkwijze

- Begin altijd met `git pull --ff-only`; werk op `main`.
- Commit wijzigingen met een korte Nederlandse boodschap. Pushen naar `main` zonder tag publiceert niets.
- Uitbrengen: `bin/release.sh 1.2.0 "Wat er veranderd is"` (semver; hoger dan de huidige versie). Dat zet de versie
  op beide plekken in `theas-monitor.php`, commit, tagt, pusht en werkt de kopie in het verymooi-project bij.
  **Een release komt binnen 12 uur op alle gekoppelde websites terecht**: vraag de gebruiker altijd eerst om
  bevestiging en controleer vooraf met `php -l`.
- Teruggaan naar een oude versie: nooit tags verwijderen of herschrijven; breng een nieuwe, hogere versie uit met
  de oude code (`git checkout v1.1.0 -- theas-monitor.php updater.php`, dan `bin/release.sh`).

## Afspraken

- Geen geheimen in de code: het gedeelde geheim staat alleen in de database van de site en van het dashboard.
- Elke nieuwe REST-route blijft achter `permission_callback => 'theas_monitor_verify'` (HMAC-handtekening).
- De velden van `theas_monitor_status()` worden gelezen door het dashboard in het verymooi-project
  (`~/Desktop/websites/Verymooi/verymooi.nl/wp-content/themes/theas/inc/monitor.php`); hernoem of verwijder ze niet
  zonder dat ook daar aan te passen. Alleen toevoegen is veilig.
- Minimaal WordPress 6.0 en PHP 7.4 (geen syntax van nieuwere PHP-versies).
- Stijl: tabs, WordPress-codeerstijl, Nederlandse commentaren en teksten, net als de bestaande code.
