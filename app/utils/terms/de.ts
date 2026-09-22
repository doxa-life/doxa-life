import type { TermsContent } from './index'

export const de: TermsContent = {
  title: 'Terminologie',
  intro: [
    'Diese Seite dokumentiert die deutschen Begriffsentscheidungen der DOXA-Partnerschaft. Zu jedem Begriff: die Definition, die erwogenen Alternativen, was Joshua Project und PeopleGroups.org (IMB) verwenden, und der Grund für unsere Wahl.',
    'Unsere Quellen: das von einem deutschsprachigen Prüfer durchgesehene DOXA-Glossar, der Sprachgebrauch deutschsprachiger Missionswerke und Gebetsnetzwerke (etwa Unerreichte-Volksgruppen.de) sowie Schlachter 2000 als Referenzübersetzung – zum Abgleich auch Luther 2017 – für jede Wendung biblischen Ursprungs.'
  ],
  seeDefinitionsBefore: 'Die vollständigen Definitionen stehen auf der Seite',
  definitionsLinkLabel: 'Begriffsbestimmungen',
  seeDefinitionsAfter: '.',
  labels: {
    english: 'Englisch:',
    definition: 'Definition:',
    alternatives: 'Erwogene Alternativen:',
    jp: 'Joshua Project:',
    pg: 'PeopleGroups.org:',
    rationale: 'Warum diese Wahl:'
  },
  entries: [
    {
      term: 'Volksgruppe',
      english: 'people group',
      definition:
        'eine ethno-linguistische Gruppe, deren Mitglieder sich durch Sprache, Kultur, Religion und Weltanschauung verbunden wissen – die größte Gruppe, innerhalb derer sich das Evangelium ohne Verständnis- oder Akzeptanzbarrieren ausbreiten kann. Die Grundeinheit von allem, was DOXA zählt.',
      alternatives: 'Völker · Volk · ethnische Gruppe · Menschengruppe · Personengruppe',
      rationale:
        'der eingeführte Begriff der deutschsprachigen Missionsbewegung. Unser Prüfer: „Wir sagen nie Völker, sondern immer Volksgruppen.“ Der Plural „Völker“ klingt nach Nationen, „Personengruppe“ nach Statistik. In der Schweiz ist „Völker“ geläufiger; wir folgen dem deutschen Gebrauch und schreiben durchgehend „Volksgruppe“, auch in Zusammensetzungen (Volksgruppenprofil, DOXA-Volksgruppen).'
    },
    {
      term: 'Unerreichte Volksgruppe (UVG)',
      english: 'unreached people group (UPG)',
      definition:
        'etwa 2 Jünger oder weniger auf 100 Menschen (≤ 2 %), ohne die Fähigkeit, ohne kulturübergreifende Hilfe einheimische Gemeinden zu gründen. Joshua Project ergänzt ein Kriterium von ≤ 5 % Christen; DOXA folgt der IMB-Definition.',
      alternatives: 'nicht erreichte Volksgruppe · UPG (englisches Kürzel)',
      rationale:
        'Standardbegriff im deutschsprachigen evangelikalen Raum (Unerreichte-Volksgruppen.de). Kürzel werden eingedeutscht statt englisch übernommen: Aus UPG wird UVG. Für die allgemeine Gemeindearbeit genügt der Oberbegriff „unerreichte Volksgruppen“; die feineren Kategorien unten richten sich an strategisch Verantwortliche.'
    },
    {
      term: 'Unberührte Volksgruppe',
      english: 'unengaged people group',
      definition:
        'keine bekannten Bemühungen, sich selbst tragende Gemeinden zu gründen – die vier Ebenen wirksamer missionarischer Arbeit vor Ort fehlen (apostolischer Einsatz in der Pionierphase vor Ort; Arbeit in Kultur und Herzenssprache; langfristige Verbindlichkeit; Evangelisation mit dem Ziel einer Gemeindegründungsbewegung). Ein Fachbegriff aus dem Umfeld der IMB: Er sagt, dass niemand unter ihnen arbeitet – nicht, dass die Menschen gleichgültig wären.',
      alternatives: 'nicht-engagierte Volksgruppe · völlig unerreichte Volksgruppe · Volksgruppe ohne missionarische Arbeit vor Ort',
      rationale:
        'die abschließende Entscheidung unseres Prüfers: „Im Deutschen sprechen wir von unberührten Landstrichen.“ „Unberührt“ sagt, dass noch niemand begonnen hat, ohne Gleichgültigkeit zu unterstellen. „Nicht-engagiert“ klingt nach persönlichem Desinteresse; „völlig unerreicht“ bleibt der kombinierten Kategorie VUVG vorbehalten.'
    },
    {
      term: 'Völlig unerreichte Volksgruppe (VUVG)',
      english: 'unengaged unreached people group (UUPG)',
      definition:
        'die kombinierte Kategorie – unerreicht und unberührt. Die 2.085 Volksgruppen, für die DOXA Gebet mobilisiert.',
      alternatives: 'unerreichte und unberührte Volksgruppe · UUPG (englisches Kürzel)',
      pg: 'UUPG ist das international eingeführte Kürzel.',
      rationale:
        '„völlig unerreicht“ bringt auf den Punkt, was UUPG meint: keine Gläubigen und niemand, der unter ihnen arbeitet. Das Kürzel wird wie UVG eingedeutscht (VUVG). „Unberührt“ und „völlig unerreicht“ bleiben bewusst zwei getrennte Begriffe, damit die Kategorien unterscheidbar bleiben.'
    },
    {
      term: 'Am wenigsten erreichte Volksgruppe',
      english: 'under-engaged people group',
      definition:
        'etwa 1 Jünger oder weniger auf 100 (≤ 1 %): Die Arbeit hat begonnen, aber es braucht mehr Gemeindegründungsteams für eine fruchtbare Arbeit vor Ort.',
      alternatives: 'unterversorgte Volksgruppe · wenig erreichte Volksgruppe · unterengagierte Volksgruppe',
      rationale:
        'die Wendung, die Unerreichte-Volksgruppen.de verwendet, und die abschließende Wahl unseres Prüfers. Sie beschreibt den Grad der Erreichung, nicht eine Haltung der Menschen.'
    },
    {
      term: 'Frontier-Volksgruppe',
      english: 'frontier people group',
      definition:
        'etwa 1 Jünger oder weniger auf 1.000 (≤ 0,1 %), ohne bestätigte, anhaltende Bewegung zu Jesus hin – die unerreichtesten der Unerreichten. Der Begriff stammt von Joshua Project.',
      alternatives: 'Grenzvolksgruppe · Pioniervolksgruppe',
      jp: '„Grenzvolksgruppen“ in einem deutsch untertitelten Video.',
      rationale:
        'das englische Lehnwort wird beibehalten und bei der ersten Nennung erklärt. „Grenze“ liest sich im Deutschen als Landesgrenze; „Pionier“ beschreibt die Arbeit, nicht die Volksgruppe.'
    },
    {
      term: 'Missionarische Arbeit vor Ort · engagiert',
      english: 'engagement · engaged',
      definition:
        'eine dauerhafte, ansässige, kulturübergreifende Arbeit, die Christus bezeugt und Jünger macht, auf sich selbst tragende Gemeinden zielt und kulturell angemessen geschieht (siehe „Was ist Engagement?“ auf der Seite Vision).',
      alternatives: 'Engagement · Beteiligung · Kontakt · Einsatz',
      rationale:
        '„missionarische Arbeit vor Ort“ macht konkret, was gemeint ist: ansässig, dauerhaft, kulturübergreifend. „Beteiligung“ oder „Kontakt“ würden den Begriff entleeren, und „Engagement“ allein klingt im Deutschen nach ehrenamtlichem Einsatz. Das Adjektiv bleibt „engagiert“, damit Status und Definition denselben Wortstamm teilen; in Zusammensetzungen steht „Engagement vor Ort“ (Arbeit ansässiger Mitarbeiter/innen) und „weiteres Engagement“ (Beiträge von Projektpartnern von außen). In Oberflächenbeschriftungen steht die Kurzform „Arbeit vor Ort“ (Status der Arbeit vor Ort, Kriterien für Arbeit vor Ort).'
    },
    {
      term: 'Gemeindegründungsbewegung',
      english: 'church-planting movement (CPM)',
      definition:
        'eine Vervielfältigung einheimischer Gemeinden, die ihrerseits Gemeinden gründen – mindestens vier Stränge von je vier geistlichen Generationen mit insgesamt mehr als 1.000 Personen.',
      alternatives: 'Kirchengründungsbewegung · das englische Kürzel CPM',
      rationale:
        '„Gemeinde“ ist das Wort der deutschsprachigen Freikirchen für die örtliche Gemeinde; „Kirche“ klingt institutionell. Ein deutsches Kürzel hat sich nicht eingebürgert, deshalb steht in technischen Zusammenhängen weiterhin CPM daneben.'
    },
    {
      term: 'Einheimische Gemeinde',
      english: 'indigenous church',
      definition:
        'eine Gemeinde, die aus der Volksgruppe selbst hervorgeht und in den fünf „Selbst“ heranreift: sich selbst ausbreitend, sich selbst leitend, sich selbst finanzierend, selbst Theologie treibend, selbst missionierend.',
      alternatives: 'indigene Gemeinde · autochthone Gemeinde · Ortsgemeinde',
      rationale:
        '„einheimisch“ sagt lokal verwurzelt und selbstständig. „Indigen“ weckt im Deutschen die Assoziation an indigene Völker und Naturreligionen; „autochthon“ ist Fachsprache, die im Gemeindealltag kaum jemand benutzt.'
    },
    {
      term: 'Kulturübergreifende Mitarbeiter/innen',
      english: 'cross-cultural workers',
      alternatives: 'interkulturelle Mitarbeiter · transkulturelle Mitarbeiter · ausländische Missionare',
      rationale:
        '„kulturübergreifend“ benennt das Hinübergehen in eine andere Kultur – den missionarischen Sinn –, während „interkulturell“ eher den Austausch zwischen nebeneinander lebenden Kulturen meint (interkulturelle Kompetenz). Die Form mit „/innen“ ist die des geprüften Glossars.'
    },
    {
      term: 'Herr der Ernte',
      english: 'Lord of the harvest',
      rationale:
        'Matthäus 9,38 (Schlachter 2000, unsere Referenzübersetzung): „Darum bittet den Herrn der Ernte, dass er Arbeiter in seine Ernte aussende!“ Luther 2017 lautet bis auf die Wortstellung gleich. Glossar und Referenzübersetzung stimmen hier überein.'
    },
    {
      term: 'Gebet bahnt den Weg',
      english: 'prayer prepares the way',
      alternatives: 'Gebet bereitet den Weg · Gebet bereitet den Boden',
      rationale:
        'Anklang an Jesaja 40,3. Hier gehen Glossar und Referenzübersetzung auseinander: Schlachter 2000 liest „In der Wüste bereitet den Weg des Herrn, ebnet in der Steppe eine Straße unserem Gott!“ – also „bereiten“, während „Bahn“ nur bei Luther 2017 steht („macht in der Steppe eine ebene Bahn unserm Gott“). Das Glossar bleibt bei „bahnen“, weil es sagt, dass ein Weg entsteht, wo noch keiner war – genau das tut Fürbitte, lange bevor Mitarbeiter eintreffen. Wo die Wendung als Bibelzitat gesetzt wird, gilt der Schlachter-Wortlaut. „Den Boden bereiten“ bleibt richtig, wo der englische Text „prepares the soil“ sagt.'
    },
    {
      term: 'Herzenssprache',
      english: 'heart language',
      alternatives: 'Muttersprache',
      rationale:
        'der eingeführte Begriff der deutschsprachigen Missions- und Bibelübersetzungsarbeit für die Sprache, in der ein Mensch denkt und fühlt – im Unterschied zur Amts- oder Verkehrssprache, was „Muttersprache“ nicht ausdrückt.'
    },
    {
      term: 'Gebetsanliegen',
      english: 'prayer points',
      alternatives: 'Gebetspunkte · Gebetsimpulse · Gebetsaufforderungen',
      rationale:
        '„Gebetsanliegen“ ist das natürliche Wort deutschsprachiger Gemeinden; „Gebetspunkte“ ist eine Lehnübersetzung, „Gebetsaufforderung“ klingt nach Befehl. Das tägliche Ganze heißt „täglicher Gebetsleitfaden“.'
    },
    {
      term: 'Adoptieren (eine Volksgruppe)',
      english: 'adopt a people group',
      alternatives: 'eine Patenschaft übernehmen · auswählen · sich verpflichten',
      rationale:
        'unser Prüfer hat „Patenschaft übernehmen“ verworfen: Im deutschsprachigen Raum sagt man längst „eine Volksgruppe adoptieren“, und „adoptieren“ trägt nicht mehr familienrechtliches Gewicht als das englische Wort. „Auswählen“ bleibt dem Schritt der Auswahl vorbehalten („Wählen Sie eine Volksgruppe aus“).'
    },
    {
      term: 'Unser Geschenk an Jesus',
      english: 'our gift to Jesus',
      alternatives: 'unsere Gabe an Jesus · unser Opfer für Jesus',
      rationale: '„Geschenk“ behält die Wärme einer Gabe aus Anbetung; „Gabe“ klingt nach Kollekte, „Opfer“ nach Verlust.'
    },
    {
      term: 'World Assemblies of God Fellowship (WAGF)',
      english: 'World Assemblies of God Fellowship (WAGF)',
      alternatives: 'Weltweite Gemeinschaft der Assemblies of God',
      rationale:
        'ein etablierter deutscher Name existiert nicht, und Organisationsnamen bleiben nach unserer Glossarregel unübersetzt. Das Kürzel WAGF bleibt auf der ganzen Website gleich.'
    },
    {
      term: 'Sendeorganisationen',
      english: 'sending agencies',
      alternatives: 'Entsendeorganisationen · Missionswerke · Missionsgesellschaften',
      rationale:
        'Begriff des geprüften Glossars. „Missionswerk“ ist das gängige deutsche Wort, aber weiter gefasst; „Sendeorganisation“ hält die Aufgabe des Sendens sichtbar, die zum Dreiklang beten, geben und senden gehört.'
    },
    {
      term: 'Tägliches Gebet (für eine Volksgruppe)',
      english: 'daily prayer (for a people group)',
      definition:
        'die Verpflichtung, jeden Tag für eine bestimmte unberührte Volksgruppe zu beten – mit dem täglichen Gebetsleitfaden. Das Ziel: mehr als 100 tägliche Fürbitter/innen für jede Volksgruppe.',
      alternatives: 'regelmäßiges Gebet · 24-Stunden-Gebetsabdeckung (früheres Ziel: 144 Fürbitter × 10 Minuten)',
      rationale:
        '„täglich“ ist gewollt – eine Verpflichtung für jeden Tag, kein gelegentliches Gebet. Das frühere Bild von 144 Fürbittern, die zusammen 24 Stunden abdecken, wurde durch das Ziel von mehr als 100 täglichen Fürbitter/innen abgelöst.'
    },
    {
      term: 'Jeder Stamm, jede Zunge, jedes Volk und jede Nation',
      english: 'every tribe, tongue, people, and nation',
      rationale:
        'Offenbarung 5,9 und 7,9 – das Bild, das die ganze Arbeit motiviert. Auch hier gehen Glossar und Referenzübersetzung auseinander: Schlachter 2000 liest „aus allen Stämmen und Sprachen und Völkern und Nationen“ (5,9) und „aus allen Nationen und Stämmen und Völkern und Sprachen“ (7,9), Luther 2017 ebenso mit „Sprachen“. Die Glossarform behält „Zunge“ als wörtliche Wiedergabe des biblischen Begriffs bei, weil jedes der vier Wörter eine eigene Dimension menschlicher Vielfalt benennt und „Sprache“ sich sonst mit der Herzenssprache überschneidet. Wo der Satz als Bibelzitat gesetzt wird, gilt der Schlachter-Wortlaut.'
    }
  ]
}
