#!/usr/bin/env bash
# Nieuwe versie van de plugin theas-monitor uitbrengen via GitHub (github.com/matthijsvis/theas-monitor).
#   bin/release.sh 1.2.0 "Wat er veranderd is"
# Zet de versie in theas-monitor.php, maakt een commit en een tag (met de tekst als releasenotities) en pusht.
# De workflow op GitHub maakt daarna de zip en de release; alle websites zien de update dan bij Plugins.
# Daarna wordt de kopie in het verymooi-project bijgewerkt (alleen als die schoon is), zodat een sync daar
# geen oude versie terugzet.
set -euo pipefail

VERSION="${1:-}"; NOTES="${2:-}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ && -n "$NOTES" ]] || { echo 'Gebruik: bin/release.sh 1.2.0 "Wat er veranderd is"'; exit 1; }

cd "$(dirname "$0")/.."
[[ "$(git branch --show-current)" == main ]] || { echo "Niet op main."; exit 1; }
git fetch -q origin
[[ "$(git rev-list --count HEAD..origin/main)" == 0 ]] || { echo "origin/main heeft nieuwere commits; eerst git pull."; exit 1; }
CURRENT="$(sed -n 's/^ \* Version: //p' theas-monitor.php)"
[[ "$(printf '%s\n%s\n' "$CURRENT" "$VERSION" | sort -V | tail -1)" == "$VERSION" && "$CURRENT" != "$VERSION" ]] \
	|| { echo "Versie $VERSION moet hoger zijn dan de huidige $CURRENT."; exit 1; }
git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null && { echo "Tag v$VERSION bestaat al."; exit 1; }
for f in theas-monitor.php updater.php; do php -l "$f" >/dev/null || { echo "Syntaxfout in $f."; exit 1; }; done

sed -i '' -e "s/^ \* Version: .*/ * Version: $VERSION/" -e "s/^const THEAS_MONITOR_VERSION = '.*';/const THEAS_MONITOR_VERSION = '$VERSION';/" theas-monitor.php
git add -A
git commit -q -m "Versie $VERSION" -m "$NOTES"
git tag -a "v$VERSION" -m "$NOTES"
git push -q origin HEAD "v$VERSION"

echo "v$VERSION gepusht. De release verschijnt over een minuut op https://github.com/matthijsvis/theas-monitor/releases"
echo "Websites zien de update binnen 12 uur bij Plugins (of direct via Dashboard → Updates → Opnieuw controleren)."

VERYMOOI="$HOME/Desktop/websites/Verymooi/verymooi.nl/wp-content/plugins/theas-monitor"
if [[ -d "$VERYMOOI/.git" ]]; then
	if [[ -z "$(git -C "$VERYMOOI" status --porcelain)" ]] && git -C "$VERYMOOI" pull -q --ff-only origin main; then
		echo "Kopie in het verymooi-project bijgewerkt naar v$VERSION."
	else
		echo "Let op: de kopie in het verymooi-project ($VERYMOOI) kon niet automatisch worden bijgewerkt."
	fi
fi
