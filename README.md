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
| Entity | `myaddon:sonic_boom`   | Unsichtbares Projektil (kein Pfeilmodell), nur der echte Sonic-Boom-Partikel des Wardens ist sichtbar |
| Item   | `myaddon:warden_ingot` | Craftingmaterial aus einem Echosplitter, Zutat fuer den Schallbogen |
| Item   | `myaddon:warden_hammer`| "Hammer": Schmiede-Werkzeug (Schmiedetisch) und zugleich Werkzeug fuer das eigene Amboss-Menue (siehe unten) |

### Beschaffung

- **Echo-Ladung** (Munition): 4x `minecraft:arrow` + 1x `minecraft:echo_shard`
  am Crafting-Tisch ergibt 4x `myaddon:echo_charge`.
- **Warden-Barren**: am Crafting-Tisch, 3x3-Muster — 1x `minecraft:echo_shard`
  in der Mitte, ringsherum 8x `minecraft:netherite_scrap`:
  ```
  S S S
  S E S
  S S S
  ```
  (`S` = antiker Schrott, `E` = Echosplitter) ergibt 1x `myaddon:warden_ingot`.
  Siehe `packs/behavior_pack/recipes/warden_ingot.json`.
- **Hammer** (`myaddon:warden_hammer`): am Crafting-Tisch, 3x3-Muster:
  ```
  I G I
  I D I
  . S .
  ```
  (`G` = Goldbarren, `I` = Eisenbarren, `D` = Diamant, `S` = Stock). Siehe
  `packs/behavior_pack/recipes/warden_hammer.json`.
- **Schallbogen**: Am **Schmiedetisch** (nicht Amboss — der Amboss in Bedrock
  hat eine feste UI fuer Umbenennen/Reparieren/Verzaubern und laesst sich
  nicht mit eigenen Rezepten erweitern; der Schmiedetisch ist der Vanilla-Block,
  der genau dieses "Werkzeug + Grundgegenstand + Zusatz -> neuer Gegenstand"
  macht, z. B. beim Netherit-Upgrade) legt man `myaddon:warden_hammer` als
  Template, einen ganz normalen `minecraft:bow` als Basis und
  `myaddon:warden_ingot` als Zusatz ein und erhaelt `myaddon:sonic_bow`. Der
  Hammer wird dabei wie ein normales Schmiedetisch-Template verbraucht. Siehe
  `packs/behavior_pack/recipes/sonic_bow_upgrade.json`.
- **Hammer-Menue am Amboss**: wieder entfernt (siehe "Bekannte Probleme"
  unten) — der Hammer funktioniert aktuell nur noch als Schmiedetisch-Template
  wie oben beschrieben.

### Schallbogen im Detail

- Verhaelt sich wie ein echter Bogen (halten = ziehen, loslassen = schiessen,
  Kraft skaliert mit Ziehdauer), nicht wie eine Armbrust.
- Werte (Haltbarkeit 384, Verzauberbarkeit 1, Bewegungsverlangsamung 0.35,
  unbegrenzte Haltedauer) sind bewusst an den echten Vanilla-Bogen angeglichen
  — nur Munition (`myaddon:echo_charge` statt `minecraft:arrow`) und Textur
  (blauer Griff) unterscheiden sich.
- Zug-Animation: Bogen-Icon und -Modell wechseln beim Ziehen durch 4 Stufen
  (Ruhe + 3 Zugstufen), nach dem Schema von Vanillas eigenem `bow.json` /
  `bow.render_controllers.json` (Attachable + Render Controller). Blau
  eingefaerbter Griff in allen 4 Texturen, genockter Pfeil (`sonic_bow_arrow_nock`)
  als Overlay auf den 3 Zugstufen. Der Ladefortschritt (`variable.charge_amount`)
  ist jetzt **monoton** (`math.max` mit dem letzten Wert): er kann waehrend des
  Haltens nur steigen oder gleich bleiben, nie zurueckspringen — das behebt den
  Bug, bei dem die Animation am Ende der Ziehzeit einfach auf Anfang zurueckgesetzt
  wurde (die Zieh-„Ladung" laeuft intern offenbar in einem neuen Zyklus weiter,
  sobald `max_draw_duration` erreicht ist; ohne die Klemme wurde das als Reset
  sichtbar). Nur `!query.is_using_item` setzt auf 0 zurueck, wenn man loslaesst.
  Siehe `packs/resource_pack/attachables/sonic_bow.json`.
- Fadenkreuz: Es gab hier zwischenzeitlich einen eigenen 2x2-Pixel-Punkt per
  `hud_screen.json`-Modifikation als Ersatz fuer das fehlende native
  Bogen-Reticle. Diese Datei war die einzige Resource-Pack-Komponente, die
  wirklich *staendig, fuer jeden Spieler, jeden Frame* aktiv war (die HUD wird
  immer gerendert, unabhaengig davon ob man etwas haelt) — und wurde als
  wahrscheinliche Ursache eines dauerhaften, nicht mit dem Schallbogen
  zusammenhaengenden Lags identifiziert und deshalb wieder entfernt. Kein
  Fadenkreuz-Ersatz mehr; das ist der Preis dafuer, dass Bedrocks natives
  Bogen-Reticle hart an die Vanilla-Item-ID gekoppelt ist und sich fuer ein
  eigenes Item nicht aktivieren laesst.
- Das Geschoss ist ein sichtbarer Pfeil (Holzschaft, Befiederung, blaue
  Spitze), fliegt schwerelos und **erzwungen komplett gerade**: die Ausrichtung
  wird jeden Tick per Skript direkt aus der tatsaechlichen Geschwindigkeit
  berechnet (`SonicBoomManager.faceVelocity`, Standard-Yaw/Pitch-Formel), nicht
  der Engine ueberlassen — die hat das Modell abhaengig von der
  Schuss-Himmelsrichtung teils falsch/rueckwaerts ausgerichtet. Zusaetzlich
  nicht schiebbar durch Entities/Kolben und umhuellt von Wardens echtem
  `minecraft:sonic_explosion`-Partikel — als kleiner Querschnitt
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
- Schuss-Erkennung: neue `myaddon:sonic_boom`-Projektile werden per
  getyptem `getEntities({ type })`-Scan einmal pro Tick gefunden, nicht ueber
  `world.afterEvents.entitySpawn`. Dieses Event hat keinen Typ-Filter und
  feuert fuer *jede* Entity, die irgendwo in der Welt spawnt (Mobfarmen,
  gedroppte Items, XP-Orbs, ...) — dauerhafte, spuerbare Lag, unabhaengig
  davon, ob ueberhaupt geschossen wird. Siehe
  `SonicBoomManager.discoverNewShots`.

## Bekannte Probleme

- **Massives, dauerhaftes Lag (Geraet wird sehr heiss)**, gemeldet nachdem das
  Hammer-Menue am Amboss (`@minecraft/server-ui`, `ActionFormData`,
  `world.beforeEvents.playerInteractWithBlock`) hinzugekommen war. Zwei
  andere, unabhaengig identifizierte und tatsaechlich staendig aktive
  Ursachen wurden behoben (die `entitySpawn`-Subscription ohne Typ-Filter,
  siehe oben; das `hud_screen.json`-Fadenkreuz) — keine davon hat das
  gemeldete Ausmass des Lags erklaert oder behoben. Da die Hammer-Menue-
  Funktion zeitlich exakt mit dem ersten Auftreten zusammenfaellt und die
  mit Abstand groesste Aenderung seither war (neue Skript-Abhaengigkeit,
  neue globale Event-Subscription, neues UI-System), wurde sie komplett
  wieder entfernt, ohne dass die genaue Ursache im Detail bestaetigt ist.
  Der Hammer funktioniert seitdem wieder nur als Schmiedetisch-Template.
  Falls das Lag danach immer noch besteht, liegt es nicht an diesem
  Addon-Code.

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
   /give @s myaddon:echo_charge 16
   ```
   Den Schallbogen selbst gibt's nur noch ueber die Beschaffungskette (siehe
   oben) — zum schnellen Testen per Kreativmodus/Befehl geht auch:
   ```
   /give @s myaddon:sonic_bow
   ```

## Erweitern

- Neues Item: JSON unter `packs/behavior_pack/items/` anlegen, Textur in
  `packs/resource_pack/textures/item_texture.json` registrieren, Namen in
  `texts/*.lang` ergaenzen.
- Neue Skriptlogik: Klasse in `src/` anlegen und in `src/main.ts` in `Addon.start()`
  registrieren.
- Werte wie Radius, Cooldown oder Enrage-Schwelle stehen gesammelt in `src/config.ts`.
