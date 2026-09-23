import type { TermsContent } from './index'

export const ro: TermsContent = {
  title: 'Definiții',
  intro: [
    'Această pagină documentează deciziile terminologice românești ale parteneriatului DOXA. Pentru fiecare termen: definiția, alternativele luate în calcul și motivul alegerii.',
    'Sursele noastre: glosarul DOXA, completat de un recenzent român în septembrie 2026 — niciunul dintre cei 39 de termeni nu este încă confirmat, iar cinci sunt marcați pentru discuție —, vocabularul misionar evanghelic românesc și traducerile românești ale Bibliei pentru fiecare expresie de origine biblică. Recenzentul a indicat Biblia Cornilescu 1924 (VDC) ca ediție a comunității sale, în timp ce site-ul citează deocamdată Noua Traducere Românească (NTR); acolo unde cele două diferă, sunt arătate amândouă. Joshua Project și PeopleGroups.org (IMB) publică doar în engleză, așa că această ediție nu le citează.'
  ],
  labels: {
    english: 'În engleză:',
    definition: 'Definiție:',
    alternatives: 'Alternative luate în calcul:',
    jp: 'Joshua Project:',
    pg: 'PeopleGroups.org:',
    rationale: 'De ce am ales acest termen:'
  },
  entries: [
    {
      term: 'Grup etnolingvistic',
      english: 'people group',
      definition:
        'un grup de oameni care se percep pe ei înșiși ca având o afinitate comună, întemeiată pe limbă, cultură, religie și viziune despre lume — cel mai mare grup în interiorul căruia Evanghelia se poate răspândi fără bariere de înțelegere sau de acceptare. Este unitatea de măsură a tot ceea ce numără DOXA.',
      alternatives: 'grup etnic · popor · etnie · trib',
      rationale:
        'recenzentul a aprobat forma completă în locul lui „grup etnic”, care era termenul folosit până acum pe suprafețele românești ale DOXA. „Grup etnic” lasă pe dinafară limba, deși limba este criteriul care desparte două grupuri vecine de aceeași etnie; „popor” rămâne firesc în text curent, dar ca etichetă se confundă cu națiunea; „trib” aduce cu sine conotații primitive. În română, termenul tehnic și cel de zi cu zi sunt același, așa că „grup etnolingvistic” traduce și „ethnolinguistic group”.'
    },
    {
      term: 'Grup etnolingvistic neatins cu Evanghelia (UPG)',
      english: 'unreached people group (UPG)',
      definition:
        'aproximativ 2 ucenici sau mai puțin la 100 de oameni (≤ 2%), fără capacitatea de a întemeia biserici autohtone fără ajutor transcultural. Joshua Project adaugă un criteriu de ≤ 5% creștini declarați; DOXA urmează definiția IMB.',
      alternatives: 'grup etnolingvistic neatins · popor neatins · neevanghelizat',
      rationale:
        'recenzentul a adăugat „cu Evanghelia” la forma propusă: în română, „neatins” singur înseamnă neatins de orice, iar cititorul nu are de unde ști la ce se referă. „Neevanghelizat” descrie altceva — lipsa vestirii, nu lipsa capacității de a întemeia biserici. Sigla latină apare aici pentru că paginile fac trimitere la ea; recenzentul a scos-o din termen, iar întrebarea despre acronime este încă deschisă.'
    },
    {
      term: 'Neangajat misionar',
      english: 'unengaged people group',
      definition:
        'un grup etnolingvistic în mijlocul căruia nu se cunoaște niciun efort îndreptat spre întemeierea unor biserici care se susțin singure: lipsesc cele patru niveluri ale unei angajări misionare eficiente — lucrare apostolică de pionierat prin prezență activă, lucrare în cultura locală și în limba maternă, angajament pe termen lung și semănarea Evangheliei cu ținta unei mișcări de plantare de biserici. Este un termen tehnic al IMB: spune că nimeni nu lucrează în mijlocul lor, nu că oamenii ar fi nepăsători.',
      alternatives: 'fără angajare misionară activă · neangajat · neevanghelizat',
      rationale:
        'recenzentul a înlocuit formularea propusă, „fără angajare misionară activă”, cu adjectivul „neangajat misionar”, care se leagă direct de substantiv și formează o familie completă: angajare misionară, angajat misionar, neangajat misionar, puțin angajat misionar. Calificativul „misionar” este obligatoriu: „neangajat” singur înseamnă în română fără loc de muncă.'
    },
    {
      term: 'Grup etnolingvistic neatins și neangajat misionar (UUPG)',
      english: 'unengaged unreached people group (UUPG)',
      definition:
        'categoria combinată — neatins cu Evanghelia și neangajat misionar. Sunt cele 2.085 de grupuri etnolingvistice pentru care DOXA mobilizează rugăciunea.',
      alternatives:
        'grup etnolingvistic neatins și fără angajare misionară activă (UUPG) · un acronim românesc nou',
      rationale:
        'recenzentul a scurtat forma propusă și a renunțat la sigla latină, deși instrucțiunile cereau păstrarea ei. Sigla rămâne totuși pe site, pentru că „Găsește un UUPG” este o etichetă de interfață, iar expresia românească este prea lungă pentru un buton. Termenul este marcat pentru discuție în glosar: politica acronimelor ține de limbă, nu de un singur termen.'
    },
    {
      term: 'Puțin angajat misionar',
      english: 'under-engaged people group',
      definition:
        'aproximativ 1 ucenic sau mai puțin la 100 (≤ 1%): lucrarea a început, dar sunt necesare mai multe echipe de plantare de biserici pentru o angajare misionară roditoare.',
      alternatives: 'cu angajare misionară insuficientă · slab angajat misionar',
      rationale:
        '„puțin angajat” păstrează forma de adjectiv a familiei și spune că lucrarea este mică, nu că oamenii ar fi nepăsători. Forma propusă, „cu angajare misionară insuficientă”, era exactă, dar nu se putea folosi ca etichetă.'
    },
    {
      term: 'Grup etnolingvistic de frontieră',
      english: 'frontier people group',
      definition:
        'aproximativ 1 ucenic sau mai puțin la 1.000 (≤ 0,1%), fără o mișcare confirmată și susținută de oameni care se întorc în mod colectiv la Isus — cei mai neatinși dintre cei neatinși. Termenul vine de la Joshua Project.',
      alternatives: 'popor de frontieră · grup de pionierat',
      rationale:
        'aprobat ca atare. „De frontieră” păstrează sensul misiologic de margine a înaintării, fără conotația militară. Pentru „movement to Jesus” glosarul dă „oameni care se întorc în mod colectiv la Isus” și îl marchează pentru discuție tocmai aici: definiția se sprijină pe negație — „fără o mișcare confirmată și susținută” —, iar o expresie despre oameni nu poate fi negată în felul acesta, așa că substantivul „mișcare” rămâne în text.'
    },
    {
      term: 'Angajare misionară',
      english: 'engagement',
      definition:
        'lucrare susținută, cu prezență în mijlocul grupului și cu trecere dincolo de propria cultură, pentru a-L face cunoscut pe Hristos și a face ucenici, cu ținta unor biserici care se susțin singure, în forme potrivite culturii locale.',
      alternatives: 'implicare · angajament · lucrare misionară',
      rationale:
        '„implicare” și „angajament” descriu atitudinea celui care participă, nu prezența unei echipe în mijlocul unui popor. Recenzentul a păstrat „angajare misionară” tocmai pentru că, împreună cu „angajat misionar” și „neangajat misionar”, formează o familie unitară. Pentru „residential engagement” a ales „angajare misionară prin prezență activă”, păstrând „lucrători rezidenți” pentru oameni.'
    },
    {
      term: 'Mișcare de plantare de biserici (CPM)',
      english: 'church-planting movement (CPM)',
      definition:
        'înmulțirea bisericilor autohtone care plantează biserici: cel puțin patru fluxuri a câte patru generații spirituale, care însumează peste 1.000 de persoane.',
      alternatives: 'mișcare de întemeiere de biserici · CPM tradus integral',
      rationale:
        'este singura siglă latină pe care recenzentul a păstrat-o, pentru că datele internaționale o folosesc. „Plantare” este termenul consacrat în misiologia evanghelică românească.'
    },
    {
      term: 'Biserică autohtonă',
      english: 'indigenous church',
      definition:
        'o biserică ivită din interiorul grupului etnolingvistic, care se maturizează în cele cinci caracteristici de autonomie: se înmulțește singură, se conduce singură, se întreține singură, își dezvoltă singură teologia și trimite ea însăși misionari.',
      alternatives: 'biserică locală · biserică indigenă · biserică băștinașă',
      rationale:
        '„autohtonă” spune înrădăcinată local și de sine stătătoare, fără să alunece spre „religie tradițională”. „Biserică locală” înseamnă în română adunarea din localitatea ta, ceea ce este altceva. Româna nu are o formulă consacrată pentru cele cinci „selfs”, așa că lista este redată prin verbe.'
    },
    {
      term: 'Lucrători transculturali',
      english: 'cross-cultural workers',
      definition:
        'lucrători dintr-o altă cultură care slujesc în mijlocul unui grup etnolingvistic. Calificativul este intenționat: ei nu vin din interiorul grupului.',
      alternatives: 'lucrători interculturali · misionari străini',
      rationale:
        'recenzentul a schimbat „interculturali” în „transculturali”: „inter-” înseamnă între culturi, „trans-” înseamnă trecând dincolo de ele, ceea ce descrie exact ce face lucrătorul. „Misionari străini” mută accentul pe cetățenie, nu pe cultură.'
    },
    {
      term: 'Domnul secerișului',
      english: 'Lord of the harvest',
      definition:
        'titlu biblic al lui Isus (Matei 9:38), folosit în chemarea la rugăciune ca El să trimită lucrători la cei neangajați misionar.',
      rationale:
        'aprobat fără modificări. Este formularea din ambele ediții românești aflate în discuție — Cornilescu 1924, „Rugați dar pe Domnul secerișului”, și Noua Traducere Românească, „rugați-L fierbinte pe Domnul secerișului” — așa că alegerea nu depinde de ediție.'
    },
    {
      term: 'Rugăciunea pregătește calea',
      english: 'prayer prepares the way',
      definition:
        'convingerea că mijlocirea pregătește terenul spiritual pentru străpungerea Evangheliei cu mult înainte ca lucrătorii să ajungă acolo — cu ecoul chemării „Pregătiți calea Domnului”.',
      rationale:
        'aprobat ca atare; ecoul biblic se păstrează în ambele ediții românești.'
    },
    {
      term: 'Limba maternă',
      english: 'heart language',
      definition:
        'prima limbă a unui om — cea în care gândește și simte. Vestirea Evangheliei și ucenicia trebuie să se facă în această limbă ca să fie pe deplin lucrătoare; este altceva decât limba oficială sau limba de comerț.',
      alternatives: 'limba inimii · limba de acasă',
      rationale:
        'recenzentul a preferat expresia obișnuită din română în locul calcului „limba inimii”. „Limba maternă” desparte limba dintâi de limba oficială, dar pierde imaginea misiologică a originalului — o alegere asumată, nu o scăpare.'
    },
    {
      term: 'Motive de rugăciune',
      english: 'prayer points',
      definition:
        'cererile zilnice de rugăciune, specifice fiecărui grup etnolingvistic, pe care DOXA le trimite mijlocitorilor: centrate pe Scriptură și legate de realitatea de pe teren.',
      alternatives: 'subiecte de rugăciune · puncte de rugăciune',
      rationale:
        'recenzentul a înlocuit „subiecte” cu „motive”, cuvântul pe care bisericile românești îl folosesc pentru lucrurile pentru care se roagă o adunare. „Puncte de rugăciune” este traducere literală.'
    },
    {
      term: 'Adoptare',
      english: 'adopt (a people group)',
      definition:
        'angajamentul pe termen lung al unei biserici de a se ruga, de a dărui și de a trimite, pentru ca accesul la Evanghelie să înceapă pentru un anumit grup etnolingvistic neangajat misionar — o asumare misionară, nu o adopție în sensul dreptului familiei.',
      alternatives: 'adopție · adoptă un grup etnolingvistic neangajat misionar',
      rationale:
        '„adopție” este termenul juridic pentru copii și a fost evitat; „adoptare” păstrează sensul de asumare. În formular, recenzentul a scris chemarea întreagă — „adoptă un grup etnolingvistic neangajat misionar” — care merge în text curent, dar nu încape pe un buton, așa că termenul este marcat pentru discuție în glosar.'
    },
    {
      term: 'Darul nostru pentru Isus',
      english: 'our gift to Jesus',
      definition:
        'felul în care este așezat întregul efort: o lucrare misionară activă în fiecare grup etnolingvistic până în 2033, ca dar de închinare al Bisericii — jertfă, nu tranzacție.',
      rationale: 'aprobat ca atare.'
    },
    {
      term: 'World Assemblies of God Fellowship (WAGF)',
      english: 'World Assemblies of God Fellowship (WAGF)',
      definition: 'comuniunea mondială care a început DOXA și o poartă mai departe.',
      alternatives: 'Comuniunea Mondială a Adunărilor lui Dumnezeu',
      rationale:
        'numele rămâne în engleză, ca în celelalte ediții, iar sigla WAGF nu se schimbă nicăieri. Dacă Uniunea Penticostală din România folosește o denumire românească consacrată a comuniunii, un recenzent o poate adăuga aici.'
    },
    {
      term: 'Agenții misionare de trimitere',
      english: 'sending agencies',
      definition:
        'organizații care recrutează, pregătesc, sprijină și trimit misionari. DOXA lucrează împreună cu ele — 129 afiliate WAGF în 2026 — fără să le înlocuiască.',
      alternatives: 'agenții de trimitere · societăți misionare',
      rationale:
        'aprobat ca atare; „de trimitere” păstrează distincția față de partenerii care primesc lucrători pe câmp.'
    },
    {
      term: 'Rugăciune zilnică',
      english: 'daily prayer (for a people group)',
      definition:
        'angajamentul de a te ruga în fiecare zi pentru un anumit grup etnolingvistic neangajat misionar, folosind ghidul zilnic de rugăciune. Ținta este de peste 100 de mijlocitori zilnici pentru fiecare grup.',
      alternatives: 'rugăciune regulată · rugăciune constantă',
      rationale:
        '„zilnică” este intenționat: un angajament pentru fiecare zi, nu o rugăciune regulată sau ocazională.'
    },
    {
      term: 'Din orice neam, din orice seminție, din orice popor și de orice limbă',
      english: 'every tribe, tongue, people, and nation',
      definition:
        'viziunea din Apocalipsa 5:9 și 7:9 care pune în mișcare toată lucrarea. Fiecare dintre cele patru substantive poartă o altă dimensiune a diversității omenești.',
      alternatives:
        'din toate neamurile, semințiile, popoarele și limbile (Noua Traducere Românească) · din orice neam, din orice seminție, din orice norod și de orice limbă (Cornilescu 1924)',
      rationale:
        'formularea aprobată urmează construcția din Cornilescu 1924, cu „norod” modernizat în „popor”. Recenzentul a indicat Cornilescu 1924 ca ediția comunității sale, în timp ce site-ul citează Noua Traducere Românească; termenul este marcat pentru discuție până când se hotărăște ediția de referință.'
    }
  ]
}
