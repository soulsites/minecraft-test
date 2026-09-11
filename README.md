# Frost Addon (Minecraft Bedrock)

Minecraft-Bedrock-Addon mit Behavior Pack, Resource Pack und TypeScript-Skripten
(`@minecraft/server` 2.0), gebaut mit esbuild.

## Inhalt

| Typ    | Identifier             | Beschreibung |
| ------ | ---------------------- | ------------ |
| Item   | `myaddon:frost_wand`   | Froststab: friert bei Benutzung alle Mobs im Umkreis ein (Slowness + Frostschaden), Cooldown und Haltbarkeitsverbrauch per Skript |
| Item   | `myaddon:frost_shard`  | Craftingmaterial, Drop von Erz und Golem |
| Block  | `myaddon:frost_ore`    | Erz mit eigener Loot Table, leichtem Leuchten und Skript-Effekt beim Abbau |
| Entity | `myaddon:frost_golem`  | Feindlicher Mob mit eigenem Modell, Spawn-Regeln in kalten Biomen und Enrage-Phase unter 50 % Leben |
| Item   | `myaddon:sonic_bow`    | Schallbogen: verschiesst statt Pfeilen den Sonic Boom des Wardens |
| Item   | `myaddon:echo_charge`  | Munition des Schallbogens |
| Entity | `myaddon:sonic_boom`   | Sichtbarer Pfeil, umhuellt vom echten Sonic-Boom-Partikel des Wardens |

### Schallbogen im Detail

- Munition ist `myaddon:echo_charge` (Amethystsplitter + Frostsplitter ergibt 4 Stueck).
- Verhaelt sich wie ein echter Bogen (halten = ziehen, loslassen = schiessen,
  Kraft skaliert mit Ziehdauer), nicht wie eine Armbrust.
- Zug-Animation: Bogen-Icon und -Modell wechseln beim Ziehen durch 4 Stufen
  (Ruhe + 3 Zugstufen), nach dem Schema von Vanillas eigenem `bow.json` /
  `bow.render_controllers.json` (Attachable + Render Controller). Blau
  eingefaerbter Griff in allen 4 Texturen, genockter Pfeil (`sonic_bow_arrow_nock`)
  als Overlay auf den 3 Zugstufen. Der Ladefortschritt
  (`variable.charge_amount`) wird aus `query.main_hand_item_max_duration` und
  `query.main_hand_item_use_duration` berechnet: Letztere zaehlt laut
  Script-API-Doku (`ItemStartUseAfterEvent.useDuration`) die **verbleibende**
  Zeit runter, nicht die verstrichene hoch — `max_duration - use_duration`
  liefert die tatsaechlich verstrichene Ziehzeit. Eine fruehere Version hatte
  das genau andersherum, wodurch die Animation rueckwaerts lief und die
  Ruhephase nie zu sehen war. Siehe
  `packs/resource_pack/attachables/sonic_bow.json`.
- Fadenkreuz: Das native Touch-Ziel-Reticle, das beim Ziehen eines *echten*
  Vanilla-Bogens automatisch erscheint, ist in keiner Resource-Pack-Datei
  data-getrieben (`hud_screen.json` hat dafuer keinerlei Bindung) — es
  scheint hart an die Vanilla-Item-ID gekoppelt und ueber ein Custom-Item
  nicht erzwingbar. Als Ersatz zeigt `AimReticle` (`src/AimReticle.ts`)
  waehrend des Ziehens ein `+` in der Bildschirmmitte an (ueber
  `onScreenDisplay.setTitle`, mit `fadeInDuration`/`fadeOutDuration: 0` fuer
  sofortiges Ein-/Ausblenden bei `itemStartUse`/`itemReleaseUse`/`itemStopUse`)
  — das ist die einzige Screen-Center-Overlay-Moeglichkeit, die die Script
  API tatsaechlich bietet; die Position folgt der von Minecraft fuer Titles
  vorgesehenen Stelle, nicht zwingend dem exakten Pixel-Zentrum. Setzt
  zusaetzlich weiterhin das Crosshair-HUD-Element zurueck auf sichtbar,
  falls es je unterdrueckt sein sollte.
- Das Geschoss ist ein sichtbarer Pfeil (Holzschaft, Befiederung, blaue
  Spitze), fliegt schwerelos und komplett gerade (`gravity: 0`, nicht
  schiebbar durch Entities/Kolben) und wird von Wardens echtem
  `minecraft:sonic_explosion`-Partikel umhuellt — als kleiner Querschnitt
  (Mitte + 2 Punkte senkrecht zur Flugrichtung), gespawnt alle
  `trailSpawnIntervalTicks` (4) Ticks statt jeden Tick. Eine fruehere Version
  hat 5 Partikel *jeden* Tick gespawnt, was bei einem langsamen, bis zu
  50 Bloecke weit fliegenden Geschoss zu spuerbarem Lag fuehrte.
- Treffer verursachen Schaden mit der Ursache `sonicBoom` — der ignoriert
  Ruestung und Schild, genau wie beim Warden.
- Reichweite: Der Boom fliegt bis zu 50 Bloecke weit (script-seitig per
  zurueckgelegter Distanz getrackt, unabhaengig von der tatsaechlichen
  Projektilgeschwindigkeit) und loest sich dann von selbst auf, sofern er
  vorher nichts trifft.
- Ein Schuss durchschlaegt bis zu 4 Gegner und detoniert danach bzw. beim
  Blocktreffer oder am Ende der Reichweite zu einer Druckwelle mit
  Flaechenschaden und Knockback.
- Sounds sind Wardens echte Events: `mob.warden.sonic_charge` beim Abschuss,
  `mob.warden.sonic_boom` bei der Detonation.
- Alle Werte (Schaden, Radius, Knockback, Durchschlag, Reichweite) stehen in
  `SonicBowConfig` in `src/config.ts`.

## Projektstruktur

```
packs/behavior_pack/   Items, Bloecke, Entity, Loot Tables, Rezepte, Spawn Rules, Manifest
packs/resource_pack/   Texturen, Geometrie, Animationen, Render Controller, Sprachdateien
src/                   TypeScript-Quellcode (OOP, eine Klasse pro Datei)
tools/build.mjs        Build-, Watch-, Package- und Deploy-Pipeline
tools/gen-textures.mjs Erzeugt die Platzhalter-PNGs (abhaengigkeitsfrei)
dist/                  Build-Ergebnis (nicht eingecheckt)
```

## Befehle

```bash
npm install
npm run build       # Skripte buendeln + Packs nach dist/ kopieren
npm run watch       # Rebuild bei jeder Aenderung
npm run typecheck   # tsc --noEmit
npm run textures    # Platzhalter-Texturen neu erzeugen
npm run package     # Version hochzaehlen + frost-addon-x.y.z.mcaddon bauen
npm run deploy      # dist/ in die lokalen com.mojang Development-Ordner kopieren
```

`npm run deploy` sucht den `com.mojang`-Ordner automatisch (Windows UWP bzw.
mcpelauncher). Alternativ den Pfad per Umgebungsvariable `COM_MOJANG` setzen.

## Versionierung

Die Version steht einzig in `package.json` ("version"). `npm run package`:

1. zaehlt die Patch-Version automatisch hoch (z. B. 1.0.0 -> 1.0.1),
2. schreibt sie in beide `manifest.json` (Header, Module, gegenseitige
   Abhaengigkeit) sowie in `pack.name` jeder `texts/*.lang`-Datei,
3. benennt die Ausgabedatei danach: `frost-addon-1.0.1.mcaddon`.

Dadurch hat jede exportierte Datei eine eigene, hoehere Versionsnummer als die
vorherige. Minecraft erkennt Behavior- und Resource-Pack dann automatisch als
**Upgrade** desselben Packs (gleiche UUID, hoehere Version) — das alte Pack
muss vor dem Import **nicht** geloescht werden. Der Name im Minecraft-
Pack-Menue (z. B. "Frost Addon [BP] v1.0.1") zeigt zusaetzlich sofort, welche
Version gerade aktiv ist.

`npm run build` / `npm run watch` stempeln nur die aktuelle, noch nicht
gebumpte Version (kein Zaehlerinkrement) — der Bump passiert ausschliesslich
beim Packaging, also genau dann, wenn eine neue Datei zum Testen entsteht.

## Im Spiel testen

1. `npm run package` ausfuehren und die neu erzeugte `frost-addon-x.y.z.mcaddon`
   doppelklicken (oder `npm run deploy` fuer den Development-Ordner).
2. Welt anlegen, Behavior Pack **und** Resource Pack aktivieren.
3. In den Welteinstellungen **Beta APIs** aktivieren — ohne das laedt das
   Skriptmodul nicht.
4. Test im Spiel:
   ```
   /give @s myaddon:frost_wand
   /setblock ~ ~ ~1 myaddon:frost_ore
   /summon myaddon:frost_golem
   /give @s myaddon:sonic_bow
   /give @s myaddon:echo_charge 16
   ```

## Erweitern

- Neues Item: JSON unter `packs/behavior_pack/items/` anlegen, Textur in
  `packs/resource_pack/textures/item_texture.json` registrieren, Namen in
  `texts/*.lang` ergaenzen.
- Neue Skriptlogik: Klasse in `src/` anlegen und in `src/main.ts` in `Addon.start()`
  registrieren.
- Werte wie Radius, Cooldown oder Enrage-Schwelle stehen gesammelt in `src/config.ts`.
