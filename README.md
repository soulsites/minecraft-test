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
- **Hammer-Menue am Amboss**: haelt man den Hammer in der Hand und
  rechtsklickt einen Amboss, oeffnet sich statt der normalen
  Umbenennen/Reparieren/Verzaubern-UI ein eigenes Menue namens "Hammer" mit
  genau zwei Knoepfen:
  - Schallbogen: 1x `minecraft:bow` + 1x `myaddon:warden_ingot` →
    1x `myaddon:sonic_bow`
  - Echoladung: 1x `minecraft:arrow` + 1x `minecraft:echo_shard` →
    1x `myaddon:echo_charge`

  Fehlen die Zutaten im Inventar, passiert nichts (Hinweis im Chat); sonst
  werden sie sofort getauscht. Der Hammer selbst wird dabei **nicht**
  verbraucht — er bleibt als wiederverwendbares Werkzeug in der Hand.
  Technischer Hintergrund: Bedrocks Amboss hat eine fest codierte UI, die
  sich nicht durch ein echtes Item-Slot-Gitter ersetzen laesst (auch nicht
  per Script API) — dieses Knopf-Menue ist die naechstmoegliche Annaeherung
  und bietet bewusst nur diese zwei Rezepte an, nichts sonst. Ohne Hammer in
  der Hand verhaelt sich der Amboss weiterhin ganz normal. Siehe
  `src/HammerMenu.ts` und `src/config.ts` (`HammerRecipes`).

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
- Fadenkreuz: Das native Touch-Ziel-Reticle, das beim Ziehen eines *echten*
  Vanilla-Bogens automatisch erscheint, ist in keiner Resource-Pack-Datei
  data-getrieben (`hud_screen.json` hat dafuer keinerlei Bindung) und scheint
  hart an die Vanilla-Item-ID gekoppelt zu sein. Als echter Grafik-Ersatz gibt
  es jetzt `packs/resource_pack/ui/hud_screen.json`: eine minimale, additive
  Erweiterung von Vanillas eigenem `hud_screen.json` (`"modifications"` haengt
  ein zusaetzliches Element an `root_panel/controls` an, ohne etwas
  Bestehendes zu ersetzen), die einen 2x2 Pixel grossen, blauen Punkt
  (`textures/ui/sonic_bow_crosshair.png`) exakt in die Bildschirmmitte setzt
  (`anchor_from`/`anchor_to: "center"`) — kein Text, also auch keine
  Schriftkontur mehr. **Einschraenkung:** Die JSON-UI-Bindings sind auf eine
  feste Namensliste (`#hud_...`) beschraenkt, es gibt keine Bindung fuer
  "Spieler zieht gerade einen Bogen" — der Punkt ist deshalb technisch bedingt
  immer sichtbar, nicht nur waehrend des Ziehens.
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
