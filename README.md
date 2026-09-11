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
| Entity | `myaddon:sonic_boom`   | Unsichtbares Projektil, dessen Optik komplett aus eigenen Partikeln besteht |

### Schallbogen im Detail

- Munition ist `myaddon:echo_charge` (Amethystsplitter + Frostsplitter ergibt 4 Stueck).
- Das Projektil fliegt schwerelos und geradeaus, gezogen wird wie bei einem Bogen
  (`minecraft:shooter` mit `scale_power_by_draw_duration`).
- Treffer verursachen Schaden mit der Ursache `sonicBoom` — der ignoriert Ruestung
  und Schild, genau wie beim Warden.
- Ein Schuss durchschlaegt bis zu 4 Gegner und detoniert danach bzw. beim
  Blocktreffer zu einer Druckwelle mit Flaechenschaden und Knockback.
- Optik: eigene Partikel `myaddon:sonic_ring` (Flugbahn) und `myaddon:sonic_impact`
  (Einschlag), Sounds `warden.sonic_charge` / `warden.sonic_boom`.
- Alle Werte (Schaden, Radius, Knockback, Durchschlag) stehen in
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
