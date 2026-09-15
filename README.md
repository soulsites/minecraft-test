# Frost Addon (Minecraft Bedrock)

Minecraft-Bedrock-Addon mit Behavior Pack, Resource Pack und TypeScript-Skripten
(`@minecraft/server` 2.0), gebaut mit esbuild.

## Inhalt

| Typ    | Identifier             | Beschreibung |
| ------ | ---------------------- | ------------ |
| Item   | `myaddon:frost_sword`  | Frostschwert: normales Schwert (Netherit-Werte), das getroffene Ziele (Mobs und Spieler) an Ort und Stelle einfrieren laesst |
| Item   | `myaddon:frost_shard`  | Craftingmaterial, Drop von Erz und Golem |
| Block  | `myaddon:frost_ore` / `myaddon:deepslate_frost_ore` | Erz (Stein-/Tiefenschiefer-Variante) mit eigener Loot Table, leichtem Leuchten und Skript-Effekt beim Abbau |
| Entity | `myaddon:frost_golem`  | Feindlicher Mob, Form + Textur der echten Kupfergolem-Vorlage (blau eingefaerbt), spawnt nur in Schneebiomen, greift mit nach vorn gestreckten Armen an, Enrage-Phase unter 50 % Leben, greift auch andere aggressive Mobs an, bevorzugt aber Spieler |
| Block  | `myaddon:frost_block` | Frostblock: Vanillas Diamantblock, viel heller eingefaerbt. Mit Kuerbis obendrauf entsteht ein Frost-Golem |
| Item   | `myaddon:sonic_bow`    | Schallbogen: verschiesst statt Pfeilen den Sonic Boom des Wardens |
| Item   | `myaddon:echo_charge`  | Munition des Schallbogens |
| Entity | `myaddon:sonic_boom`   | Unsichtbares Projektil (kein Pfeilmodell), nur der echte Sonic-Boom-Partikel des Wardens ist sichtbar |
| Item   | `myaddon:warden_ingot` | Craftingmaterial aus einem Echosplitter, Zutat fuer den Schallbogen |
| Item   | `myaddon:warden_hammer`| "Hammer": Schmiedetisch-Template UND Werkzeug fuer das eigene Amboss-Menue |

### Frost-Golem: Modell & Textur

Modell (`geometry.frost_golem`) ist eine pixelidentische Kopie von Vanillas
`geometry.copper_golem` (Kreuz-Koerper, Kopf mit Hut/Vane, gleiche
UV-Aufteilung, 64x64) — nicht mehr der urspruengliche, selbst gebaute
Humanoid. Die Textur ist Vanillas eigene `copper_golem.png`,
pixelidentisch in Form/Schattierung, nur jeder Pixel per Helligkeit von
Kupfer-Orange auf das Eis-Blau der Addon-Palette (`ICE_DARK` .. `ICE_LIGHT`
in `tools/gen-textures.mjs`) umgefaerbt. Deshalb wird `frost_golem.png`
nicht mehr von `npm run textures` erzeugt — sie ist eine statische Datei
wie `warden_hammer.png`/`warden_ingot.png`.

Spawnei genauso: Vanillas eigene `spawn_egg_copper_golem.png`,
pixelidentisch, per Helligkeit auf dieselbe Eis-Blau-Palette umgefaerbt —
statt der vorher frei gewaehlten Hex-Farben (`base_color`/`overlay_color`).

- **Spawn**: nur noch in Schneebiomen (`has_biome_tag == "frozen"`, wie
  Polarbaer/Stray in Vanilla — nicht das breitere `"cold"`, das z. B. auch
  Taiga einschliesst), nicht in Ozean-Varianten. Siehe
  `packs/behavior_pack/spawn_rules/frost_golem.json`.
- **Angriff**: haelt beim Zuschlagen kurz beide Arme nach vorne, wie ein
  Eisengolem. Eisengolems steuern das intern ueber
  `variable.attack_animation_tick`, eine engine-interne Variable, die nur
  fuer den echten Iron Golem existiert und fuer eigene Entities nicht
  verfuegbar ist. Nachgebaut mit einer eigenen Entity Property
  (`myaddon:attacking`, `description.properties` in `frost_golem.json`,
  siehe auch der echte `copper_golem.json` fuer das Format) — ein Skript
  (`FrostGolemManager.onEntityHitEntity`) setzt sie beim Treffer kurz auf
  `true` und nach `attackPoseTicks` wieder auf `false`; die Resource-Pack-
  Animation `animation.frost_golem.attack` fragt sie per
  `query.property('myaddon:attacking')` ab.
- **Ziel-Auswahl**: `minecraft:behavior.nearest_attackable_target` hat jetzt
  zwei Eintraege in seiner `entity_types`-Liste — Spieler/Schneegolem zuerst,
  andere aggressive Mobs (`is_family: monster`, aber nicht die eigene
  `frost_golem`-Familie, damit sich Frost-Golems nicht gegenseitig
  angreifen) danach. Die Reihenfolge in der Liste ist die Prioritaet (wie
  bei Vanilla-Mobs, z. B. Piglin gegen Hoglin/Spieler): ist ein Spieler in
  Reichweite, wird der immer bevorzugt, unabhaengig davon ob ein naeherer
  aggressiver Mob da waere — erst wenn kein Spieler/Schneegolem in
  Reichweite ist, greift er stattdessen den naechsten aggressiven Mob an.
- **Vertrauen gewinnen** — auf zwei Wegen, beide fuehren zum selben Ergebnis:
  - **Fuettern**: Rechtsklick auf einen bestehenden Frost-Golem mit
    `myaddon:frost_shard` in der Hand. Der Splitter wird dabei verbraucht.
  - **Selbst bauen**: einen `myaddon:frost_block` hinlegen und einen
    Kuerbis (`minecraft:carved_pumpkin`) direkt obendrauf setzen — genau wie
    beim Bauen eines Schneegolems oder Eisengolems in Vanilla, nur mit
    einem einzelnen Block statt einer ganzen Saeule/eines Kreuzes, so wie
    gewuenscht. Beide Bloecke werden dabei verbraucht und ein
    `myaddon:frost_golem` entsteht an der Stelle.

  Beides gibt dem Spieler einen Tag (`myaddon_frost_trusted`) — bewusst ein
  globales "Frost-Golems vertrauen dir"-Flag statt einer Erinnerung pro
  einzelnem Golem, da Bedrocks deklaratives Ziel-Filtersystem nur globalen
  Entity-Zustand abfragen kann (Tags, Familie, Health, ...), keine "dieser
  eine Golem kennt genau diesen einen Spieler"-Beziehung.
  **v1.0.55-Korrektur:** urspruenglich lief das ueber ein Scoreboard-
  Objective und einen `"test": "score"`-Ziel-Filter. Das Skript hat das
  Vertrauen nachweislich korrekt vergeben (Fuettern eines bereits
  vertrauten Spielers meldete "vertraut dir bereits"), trotzdem haben
  Golems weiter angegriffen — der Score-Filter hat also nicht wie erwartet
  gewirkt. Da sich dieser Filter (anders als alles andere in dieser Datei)
  in keiner echten Vanilla-Datei als Vorbild finden liess, um ihn
  gegenzupruefen, wurde die ganze Mechanik auf Spieler-Tags umgestellt:
  `player.addTag`/`player.hasTag` im Skript, und im Ziel-Filter
  `"test": "has_tag", "operator": "!="` — derselbe Operator-Stil, der schon
  beim `is_family`-Filter fuer "kein anderer Frost-Golem" funktioniert.
  Kein Scoreboard-Objective mehr, das erst zur richtigen Zeit beim
  Weltstart angelegt werden muss. Siehe
  `FrostGolemManager.onPlayerInteractWithEntity` und
  `FrostGolemManager.onPlayerPlaceBlock`.
  **Wichtiger Fix:** Fuettern hat vorher gar nicht reagiert — ein rein
  feindlicher Mob ohne `minecraft:interact`-Komponente behandelt Rechtsklick
  clientseitig als Angriffsversuch statt als Interaktion, egal was das
  Skript abonniert. `frost_golem.json` hat jetzt eine
  `minecraft:interact`-Komponente, die Rechtsklick ueberhaupt erst als
  Interaktion "freischaltet". **v1.0.53-Korrektur:** die zuerst verbaute
  Komponente war leider selbst falsch (Felder `items` und
  `particle_on_start` existieren in Bedrock gar nicht — frei erfunden, ohne
  echtes Vorbild gegengeprueft, deshalb hat der erste Versuch nichts
  bewirkt). Jetzt anhand echter Vanilla-Dateien verifiziert
  (`piglin.json`, `cow.json`, `sheep.json` aus bedrock-samples): der
  Item-Check laeuft ueber `on_interact.filters` mit einem
  `has_equipment`-Test (Hand-Slot = `myaddon:frost_shard`), nicht ueber ein
  `items`-Array; `play_sounds` ist ein einzelner String, kein Array. Das
  Verbrauchen des Splitters selbst macht weiterhin das Skript
  (`FrostGolemManager.onPlayerInteractWithEntity`), die JSON-Komponente
  liefert nur den "Geben"-Hinweistext (`action.interact.feed`) und
  Sound/Animation.
  **v1.0.54-Korrektur:** der "Geben"-Hinweis erschien zwar schon (die
  Filter matchten), aber Fuettern hat trotzdem nichts bewirkt — vermutlich
  weil `PlayerInteractWithEntityAfterEvent` laut den Typdefinitionen erst
  nach einer "erfolgreichen" Interaktion feuert, und ein reiner
  Sound/Swing-Effekt ohne echten Zustandswechsel (anders als beim Muh-Kuh-
  Melken mit `transform_to_item` oder Schaf-Scheren mit `spawn_items`)
  offenbar nicht als "erfolgreich" zaehlt. `use_item` steht jetzt auf
  `true`, genau wie bei Vanillas eigenen Fuetter-Interaktionen — die
  Engine verbraucht den Splitter jetzt selbst, das Skript liest nur noch
  `event.beforeItemStack` aus, um zu bestaetigen, was verfuettert wurde,
  und vergibt darauf das Vertrauen.
  **Zum Beschwoeren/Summon:** ein per `/summon` oder Spawnei erzeugter
  Golem ist absichtlich feindlich - niemand hat ihm bis dahin vertraut.
  Nur Fuettern oder der Bau-Weg (Frostblock + Kuerbis) vergeben Vertrauen
  automatisch an den jeweiligen Spieler.
  **Weiterhin nicht umgesetzt:** ein sichtbar in der Hand gehaltener
  Splitter — dafuer gibt es kein belastbares Vorbild (der echte Kupfergolem
  traegt seine Blume nicht in der Hand, sondern ueber eine komplett
  separate, fest gebackene zweite Geometrie auf dem Kopf).

### Frostblock

Textur ist Vanillas eigene `diamond_block.png`, pixelidentisch, komplett
(nicht nur einzelne Pixel wie beim Frost-Erz) 55% Richtung Weiss
aufgehellt — "viel heller" als das Original, wie gewuenscht. Rezept: 9x
`myaddon:frost_shard` im 3x3-Vollmuster, wie bei Vanillas eigenem
Diamantblock. Siehe `packs/behavior_pack/recipes/frost_block.json`.

Lässt sich auch wieder zurueckcraften: 1x `myaddon:frost_block` (formlos)
ergibt 9x `myaddon:frost_shard` — wie bei Vanillas Diamantblock/Diamant.
Siehe `packs/behavior_pack/recipes/frost_shard_from_block.json`.

### Frostschwert im Detail

- Wirkt beim **Treffer im Nahkampf** — sowohl gegen Mobs als auch gegen
  Spieler — für `freezeDurationTicks` (60 Ticks = 3s):
  - **Komplett bewegungsunfaehig**: das Ziel wird jeden Tick exakt auf die
    Position zurueckgesetzt, an der es getroffen wurde (`teleport` +
    `clearVelocity()`), unabhaengig von seiner eigenen KI, Wissbegierde,
    Flugfaehigkeit oder Knockback-Resistenz — funktioniert dadurch bei
    jedem Mob gleich, nicht nur bei bodengebundenen. (Fruehere Versionen
    hatten erst ein reines Slowness-Effekt-Einfrieren, dann ein Eis-
    Rutschen probiert — dieser feste Positions-Anker ist die robusteste
    und einzige Variante, die wirklich bei jeder Entity gleich funktioniert.)
  - **Schaden waehrend des Einfrierens passiert nicht sofort**: jeder
    Schaden, den das Ziel waehrend des Einfrierens erhaelt (von der
    Schwert-Wielderin genauso wie von Dritten, Fallschaden, Feuer, etc.),
    wird per `world.afterEvents.entityHurt` erkannt, sofort per
    `setCurrentValue()` zurueckgeheilt (die Lebensanzeige bewegt sich also
    waehrend des Einfrierens gar nicht) und aufsummiert. Sobald das
    Einfrieren nach den 3 Sekunden endet, wird die gesamte aufgesammelte
    Schadenssumme auf einmal zugefuegt (`EntityDamageCause.override`, um
    doppelte Ruestungs-Reduktion auf einen bereits reduzierten Wert zu
    vermeiden). Der ausloesende Treffer selbst (der das Einfrieren startet)
    ist davon ausgenommen und wirkt normal. Die Knockback-Wucht eines
    Treffers wirkt sofort, noch bevor der naechste geplante Tick sie
    korrigieren wuerde — deshalb werden Position/Geschwindigkeit direkt im
    `entityHurt`-Handler selbst zurueckgesetzt, nicht erst einen Tick
    spaeter, damit ein Treffer waehrend des Einfrierens das Ziel wirklich
    gar nicht mehr bewegt. **Einschraenkung:** das kurze rote Aufblitzen
    ("Hurt"-Animation), das Bedrock bei jedem echten Treffer clientseitig
    zeigt, ist an das Feuern des Schadens-Events selbst gekoppelt, nicht an
    die tatsaechliche Lebenspunkt-Aenderung — das laesst sich nicht
    unterdruecken, ohne den Schaden komplett zu blockieren (z. B. via
    Resistance-Effekt Stufe 5), was aber die genaue Schadenssumme fuer die
    Freigabe am Ende zerstoeren wuerde. Bewegung ist komplett unterdrueckt,
    das kurze Aufblitzen bleibt sichtbar.
  - Ring aus Schneeflocken-Partikeln um Fuesse und Oberkoerper als
    "eingefrorene" Optik, alle `particleIntervalTicks` (5) Ticks statt
    jeden Tick — gleiche Drossel-Logik wie beim Schallbogen-Trail, aus
    genau demselben Grund (echtes, spuerbares Lag durch zu haeufige
    Partikel weiter oben in diesem Projekt).
  - **Einschraenkung, Textur-Faerbung**: Die Textur eines getroffenen Mobs
    oder Spielers laesst sich *nicht* hellblau einfaerben. Zwei getrennte
    Grenzen: Spieler-Skins gehoeren zum Microsoft/Xbox-Konto, kein Bedrock-
    Add-on kann die je einfaerben (Architektur-Grenze, keine Fleissfrage).
    Fuer echte Mobs (Zombie usw.) wuerde es bedeuten, deren komplette
    Verhaltensdatei (KI, Leben, Drops, Baby-Variante, Verhusk-Umwandlung,
    alles) selbst neu zu schreiben und zu ersetzen — riskant, bricht
    potenziell mit jedem Minecraft-Update, muesste einzeln pro Mob-Typ
    gemacht werden. Bewusst nicht umgesetzt (Nutzer-Entscheidung); der
    doppelte Partikel-Ring bleibt die einzige "eingefrorene" Optik. Fuer
    den eigenen Frost-Golem (dessen Dateien wir besitzen) waere ein
    echtes Farb-Overlay separat und risikofrei machbar, falls gewuenscht.
  - **Cooldown**: pro *getroffenem Ziel*, nicht pro Spieler — dieselbe
    Kreatur laesst sich erst nach `cooldownTicks` (1200 Ticks = 1 Minute)
    wieder einfrieren, ein *anderes* Ziel (z. B. ein zweiter Zombie) sofort
    unabhaengig davon. Ein Treffer auf ein Ziel, das noch auf Cooldown ist,
    macht gar nichts (kein Einfrieren, kein Haltbarkeitsverlust).
  - erneuter Treffer waehrend des Einfrierens (nach Ablauf des Cooldowns)
    verlaengert die Dauer neu, statt sich zu addieren.
  - kostet 1 Haltbarkeitspunkt pro erfolgreichem (nicht auf Cooldown
    liegendem) Treffer, zerbricht bei voller Abnutzung. Siehe
    `src/FrostSwordManager.ts`.
- Werte (Haltbarkeit 2031, Schaden 8, Verzauberbarkeit Slot `sword`) sind an
  den echten Netherit-Schwert angeglichen.
- Aussehen: Vanillas eigene `netherite_sword.png`, pixelidentisch in
  Form/Schattierung, per Helligkeit auf die Eis-Blau-Palette umgefaerbt
  (wie schon bei `frost_golem.png`) — daher auch nicht mehr Teil von
  `npm run textures`, sondern eine statische Datei.

### Frost-Erz: Vorkommen

Zwei Bloecke, wie bei Vanilla-Erzen ueblich eins fuer Stein und eins fuer
Tiefenschiefer:

- `myaddon:frost_ore` ersetzt `minecraft:stone`
- `myaddon:deepslate_frost_ore` ersetzt `minecraft:deepslate` (etwas
  laenger zum Abbauen: 4.5s statt 3.0s, wie bei Vanillas
  Tiefenschiefer-Erzen ueblich)

Beide sind praktisch **explosionsimmun** (`explosion_resistance: 3600000`,
statt eines Boolean-Werts — letzterer hat vermutlich denselben Pack-Absturz
verursacht wie der Score-Filter oben, siehe "Bekannte Probleme") — anders
als normales Vanilla-Erz ueberleben sie also auch Creeper/TNT/etc.

Beide werden von **derselben** Ader erzeugt (`features/frost_ore_feature.json`,
zwei `replace_rules` — welcher Block entsteht, haengt nur davon ab, ob an
der jeweiligen Position gerade Stein oder Tiefenschiefer ansteht) und sind
bewusst selten gehalten (kleine Ader, ein Versuch pro Chunk, nur in
Schneebiomen) — angelehnt an die Seltenheit von Antikem Schrott. Mojangs
echte Antiker-Schrott-Werte liegen nicht offen einsehbar vor (die
`bedrock-samples`-Rezept-/Feature-Dateien dafuer waren beim Schreiben nicht
erreichbar), es ist also eine bewusst knapp bemessene Annaeherung, keine
verifizierte 1:1-Kopie der echten Drop-Rate.

Hoehe: `y` zwischen -8 und 8, also rund um den Stein-Tiefenschiefer-
Uebergang (der in Bedrock etwa dort liegt), statt ueber den gesamten
Hoehenbereich verteilt. Siehe `feature_rules/frost_ore_feature_rules.json`.

Aussehen: Vanillas eigene `diamond_ore.png` / `deepslate_diamond_ore.png`,
pixelidentisch in Form und Farbe — aber anders als beim Frost-Golem/-Schwert
wird hier **kein** Farbton umgemappt. Nur die Diamant-Kristall-Pixel (bei
denen der hellste und dunkelste Farbkanal um mehr als 10 auseinanderliegen
— Diamant-Pixel sind deutlich cyanstichig, Gesteins-Pixel praktisch neutral
grau) werden 70% Richtung Weiss aufgehellt, bei ihrem urspruenglichen
Blauton. Alle restlichen (grauen) Pixel werden 1:1 unveraendert
uebernommen — das Gestein bleibt also echtes Grau/Blaugrau, die Splitter
sind schlicht ein helleres Blau als im Original. Beide Texturen sind
statische Dateien, nicht mehr Teil von `npm run textures`.

### Beschaffung

- **Frostschwert** (`myaddon:frost_sword`): am Crafting-Tisch, 3x3-Muster —
  1x `minecraft:netherite_sword` in der Mitte, ringsherum 8x
  `myaddon:frost_shard`:
  ```
  S S S
  S N S
  S S S
  ```
  (`S` = Eissplitter, `N` = Netherit-Schwert). Siehe
  `packs/behavior_pack/recipes/frost_sword.json`.
- **Frostblock**: 9x `myaddon:frost_shard` im vollen 3x3-Muster am
  Crafting-Tisch ergibt 1x `myaddon:frost_block` (siehe auch Abschnitt
  "Frostblock" oben).
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
  den Rezepten aus `HammerRecipes` in `src/config.ts`:
  - Schallbogen: 1x `minecraft:bow` + 1x `myaddon:warden_ingot`
  - Echoladung: 1x `minecraft:arrow` + 1x `minecraft:echo_shard`
  - Frostschwert: 1x `minecraft:netherite_sword` + 8x `myaddon:frost_shard`

  Fehlen die Zutaten im Inventar, passiert nichts (Hinweis im Chat); sonst
  werden sie sofort getauscht. Der Hammer selbst wird dabei **nicht**
  verbraucht — er bleibt als wiederverwendbares Werkzeug in der Hand. Ohne
  Hammer in der Hand verhaelt sich der Amboss weiterhin ganz normal.
  Technischer Hintergrund: Bedrocks Amboss hat eine fest codierte UI, die
  sich nicht durch ein echtes Item-Slot-Gitter ersetzen laesst (auch nicht
  per Script API) — dieses Knopf-Menue ist die naechstmoegliche Annaeherung
  und bietet bewusst nur diese Rezepte an, nichts sonst. (War zwischenzeitlich
  als Lag-Verdacht entfernt, siehe "Bekannte Probleme" — das Lag hat sich
  seitdem als wahrscheinlich device-bedingt herausgestellt, siehe dort.)
  Siehe `src/HammerMenu.ts`.

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

- **Massives, dauerhaftes Lag (Geraet wurde sehr heiss)** wurde gemeldet,
  nachdem das Hammer-Menue am Amboss (`@minecraft/server-ui`,
  `ActionFormData`, `world.beforeEvents.playerInteractWithBlock`)
  hinzugekommen war. Zwei andere, unabhaengig identifizierte und
  tatsaechlich staendig aktive Ursachen wurden behoben (die
  `entitySpawn`-Subscription ohne Typ-Filter, siehe oben; das
  `hud_screen.json`-Fadenkreuz) — keine davon hat das gemeldete Ausmass
  erklaert. Das Hammer-Menue wurde daraufhin testweise komplett entfernt,
  ohne messbare Besserung, und der Nutzer stufte das Lag danach selbst als
  wahrscheinlich device-bedingt ein (schwaches Handy), nicht als
  Addon-Ursache. Das Hammer-Menue ist seitdem wieder eingebaut. Falls
  irgendein Feature wieder Lag verursacht, hier nachschauen und ggf.
  wieder testweise entfernen.
- **Kompletter Skript-Ausfall** (v1.0.45–v1.0.47): nach dem Hinzufuegen der
  Frost-Golem-Vertrauens-Mechanik funktionierte praktisch jede
  skriptgetriebene Funktion nicht mehr — Schallbogen-Effekt, Hammer-Menue,
  Frostschwert-Effekt. Items/Bloecke/Rezepte selbst waren nicht betroffen
  (kein Warnsymbol beim Pack in den Welteinstellungen — der Pack **laedt**
  einwandfrei, nur das Skript darin lief nicht). Ursache war eine
  Registrierungsreihenfolge-Falle in `src/main.ts`: `FrostGolemManager`
  wird zuerst registriert, und `FrostGolemManager.register()` rief ganz am
  Anfang `world.scoreboard.addObjective()` auf — eine weltverändernde
  API, die aufgerufen zu frueh (synchron beim Skript-Laden, bevor die Welt
  fertig geladen ist) einen Fehler wirft. JavaScript bricht bei einem Fehler
  die gesamte Funktion ab, und da alle anderen `.register()`-Aufrufe
  (Schallbogen, Frostschwert, Hammer-Menue) danach in derselben Funktion
  standen, liefen die nie. Behoben:
  - `ensureTrustObjective()` laeuft jetzt per `system.run()` verzoegert
    (erster Tick statt Skript-Ladezeit).
  - `src/main.ts` faengt jetzt jeden `.register()`-Aufruf einzeln per
    try/catch ab (`Addon.registerSafely`) — ein Fehler in einem Manager
    kann nie wieder alle anderen mit sich reissen, sondern deaktiviert nur
    noch das eine betroffene Feature (mit Fehlermeldung im Content Log).

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
   /give @s myaddon:frost_sword
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
