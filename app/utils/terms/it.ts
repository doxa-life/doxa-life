import type { TermsContent } from './index'

export const it: TermsContent = {
  title: 'Definizioni',
  intro: [
    'Questa pagina documenta le scelte terminologiche italiane della partnership DOXA. Per ogni termine: la definizione, le alternative considerate e il motivo della scelta.',
    'Le nostre fonti: il glossario DOXA, l’uso già consolidato sull’app di preghiera e nei contenuti di preghiera quotidiani in italiano, il vocabolario missionario evangelico italiano e la Nuova Riveduta 2006 per ogni espressione di origine biblica. Joshua Project e PeopleGroups.org (IMB) non pubblicano dati in italiano, quindi questa edizione non li cita.'
  ],
  labels: {
    english: 'Inglese:',
    definition: 'Definizione:',
    alternatives: 'Alternative considerate:',
    jp: 'Joshua Project:',
    pg: 'PeopleGroups.org:',
    rationale: 'Perché questa scelta:'
  },
  entries: [
    {
      term: 'Gruppo etnico',
      english: 'people group',
      definition:
        'un gruppo etnolinguistico i cui membri percepiscono tra loro un’affinità comune fondata su lingua, cultura, religione e visione del mondo — il gruppo più ampio all’interno del quale il Vangelo può diffondersi senza incontrare barriere di comprensione o di accettazione. È l’unità fondamentale di tutto ciò che DOXA conta.',
      alternatives: 'popolo · gruppo di persone · etnia · tribù',
      rationale:
        'è l’etichetta che l’app di preghiera e i contenuti di preghiera italiani usano già ovunque nei conteggi e nei pulsanti. «Popolo» resta naturale nella prosa corrente («i popoli non raggiunti», «un popolo di frontiera»), ma come etichetta è ambiguo perché in italiano indica anche una nazione. «Gruppo di persone» è traduzione automatica; «tribù» porta con sé connotazioni primitive; «etnia» perde la dimensione linguistica.'
    },
    {
      term: 'Gruppo etnico non raggiunto (UPG)',
      english: 'unreached people group (UPG)',
      definition:
        'circa 2 discepoli o meno ogni 100 persone (≤ 2%), senza la capacità di fondare chiese autoctone senza assistenza transculturale. Joshua Project aggiunge un criterio del ≤ 5% di cristiani dichiarati; DOXA segue la definizione dell’IMB.',
      alternatives: 'popolo non raggiunto · UPG scritto per esteso',
      rationale:
        'la sigla inglese resta invariata, come UUPG e CPM: l’italiano non ha una sigla missiologica stabile per questa categoria e inventarne una renderebbe illeggibili i dati internazionali. «Non raggiunto» è il termine consolidato della missiologia evangelica italiana.'
    },
    {
      term: 'Non coinvolto',
      english: 'unengaged people group',
      definition:
        'un gruppo etnico presso il quale non risulta alcuno sforzo mirato a fondare chiese capaci di sostenersi: mancano i quattro livelli del coinvolgimento efficace (sforzo apostolico pionieristico residente; lavoro nella cultura locale e nella lingua del cuore; impegno a lungo termine; semina del Vangelo orientata a un movimento di fondazione di chiese). È un termine tecnico dell’IMB: dice che nessuno lavora tra loro, non che quel popolo sia indifferente.',
      alternatives: 'non impegnato · non toccato · senza presenza missionaria · non evangelizzato',
      rationale:
        '«coinvolgimento» e «coinvolto» formano in italiano una famiglia completa e coerente con tutti i termini derivati — coinvolgere, coinvolto, non coinvolto, poco coinvolto, coinvolgimento fruttuoso — cosa che «impegno» non fa, perché in italiano descrive già la dedizione personale di chi prega. «Non evangelizzato» descrive un’altra cosa: l’assenza di annuncio, non l’assenza di operai residenti.'
    },
    {
      term: 'Gruppo etnico non coinvolto e non raggiunto (UUPG)',
      english: 'unengaged unreached people group (UUPG)',
      definition:
        'la categoria combinata — non coinvolto e non raggiunto. Sono i 2.085 gruppi etnici per cui DOXA mobilita la preghiera.',
      alternatives: 'popolo non raggiunto e non coinvolto · sigla italiana di nuovo conio',
      rationale:
        'UUPG è la sigla affermata a livello internazionale e viene mantenuta, come fa l’edizione francese. Nella forma estesa «non coinvolto» viene prima di «non raggiunto», seguendo l’ordine dell’inglese e quello già usato dall’app di preghiera.'
    },
    {
      term: 'Poco coinvolto',
      english: 'under-engaged people group',
      definition:
        'circa 1 discepolo o meno ogni 100 persone (≤ 1%): il lavoro è cominciato, ma servono altre squadre di fondazione di chiese perché il coinvolgimento sia fruttuoso.',
      alternatives: 'sotto-coinvolto · scarsamente coinvolto · parzialmente coinvolto',
      rationale:
        '«poco coinvolto» descrive l’ampiezza del lavoro svolto, non l’atteggiamento del popolo, e resta nella stessa famiglia di «coinvolto» e «non coinvolto». Il calco «sotto-coinvolto» non è italiano corrente.'
    },
    {
      term: 'Popolo di frontiera',
      english: 'frontier people group',
      definition:
        'circa 1 discepolo o meno ogni 1.000 persone (≤ 0,1%), senza alcun movimento verso Gesù confermato e duraturo — i più non raggiunti tra i non raggiunti. Il termine viene da Joshua Project.',
      alternatives: 'popolo di confine · gruppo etnico di frontiera',
      rationale:
        '«frontiera» conserva l’immagine del limite estremo da superare che l’inglese frontier porta con sé; «confine» in italiano indica soltanto una linea amministrativa. È la forma già usata nei contenuti di preghiera italiani.'
    },
    {
      term: 'Coinvolgimento',
      english: 'engagement',
      definition:
        'attività transculturale duratura e residente, volta ad annunciare Cristo e fare discepoli, orientata a chiese capaci di sostenersi e condotta in modo culturalmente appropriato e localmente pertinente. È un termine di precisione: «contatto» o «interessamento» non sono coinvolgimento.',
      alternatives: 'impegno · presenza missionaria · lavoro sul campo',
      rationale:
        'è il termine attorno al quale ruota tutta la terminologia DOXA, perché da esso derivano coinvolto, non coinvolto, poco coinvolto e coinvolgimento fruttuoso. «Impegno» è riservato alla dedizione di chi prega, dona o adotta, così che le due idee non si confondano in una sola parola.'
    },
    {
      term: 'Movimento di fondazione di chiese (CPM)',
      english: 'church-planting movement (CPM)',
      definition:
        'una moltiplicazione di chiese autoctone che fondano altre chiese: almeno quattro filoni di quattro generazioni spirituali, per un totale superiore a 1.000 persone.',
      alternatives: 'movimento di piantagione di chiese · movimento di moltiplicazione di chiese',
      rationale:
        '«fondazione di chiese» è italiano corrente e inequivocabile. Il verbo «piantare chiese» è diffuso negli ambienti evangelici italiani e resta utilizzabile nella prosa, ma il sostantivo «piantagione» indica anzitutto una coltivazione ed è un calco che non regge come etichetta. La sigla inglese CPM è mantenuta.'
    },
    {
      term: 'Chiesa autoctona',
      english: 'indigenous church',
      definition:
        'una chiesa nata all’interno del gruppo etnico stesso, che matura nelle cinque autonomie: si propaga, si governa, si sostiene, elabora la propria teologia e invia i propri missionari.',
      alternatives: 'chiesa indigena · chiesa locale · chiesa nazionale',
      rationale:
        'in italiano «indigeno» rimanda ai popoli indigeni ed è già usato da DOXA per distinguere un gruppo etnico autoctono da una popolazione della diaspora: riutilizzarlo qui creerebbe due sensi diversi nello stesso contesto. «Chiesa locale» in italiano indica semplicemente la singola congregazione e perde del tutto il senso tecnico.'
    },
    {
      term: 'Operatori transculturali',
      english: 'cross-cultural workers',
      definition:
        'operai missionari provenienti da una cultura diversa che servono tra un gruppo etnico. La precisazione «transculturale» è voluta — non provengono dall’interno del gruppo — ed è preferita al semplice «missionario» in alcuni contesti.',
      alternatives: 'operatori interculturali · operai transculturali · missionari',
      rationale:
        'in missiologia italiana l’aggettivo consolidato è «transculturale» («missione transculturale»), mentre «interculturale» appartiene al lessico della scuola e del lavoro sociale e indica il dialogo fra culture, non l’attraversarle. Le edizioni spagnola, portoghese e francese usano tutte la forma trans-.'
    },
    {
      term: 'Signore della messe',
      english: 'Lord of the harvest',
      definition:
        'un titolo biblico di Gesù (Matteo 9:38), usato nell’invito a pregare che egli mandi operai tra i non coinvolti.',
      alternatives: 'Signore della mietitura · padrone della messe',
      rationale:
        'è la formulazione della Nuova Riveduta 2006, la traduzione di riferimento italiana di DOXA: «Pregate dunque il Signore della mèsse che mandi degli operai nella sua mèsse». Manteniamo anche il verbo «mandare» della stessa versione nell’invito a pregare, donare e mandare.'
    },
    {
      term: 'La preghiera prepara la via',
      english: 'prayer prepares the way',
      definition:
        'la convinzione che l’intercessione crei le condizioni spirituali per le svolte del Vangelo ancora prima che gli operai arrivino.',
      alternatives: 'la preghiera prepara il terreno · la preghiera apre la strada',
      rationale:
        'riprende «Preparate la via del SIGNORE» (Isaia 40:3, Nuova Riveduta 2006) e conserva quindi l’eco biblica che l’inglese porta con sé. «Preparare il terreno» è un’immagine agricola corretta ma priva di quel riferimento.'
    },
    {
      term: 'Lingua del cuore',
      english: 'heart language',
      definition:
        'la prima lingua di una persona, quella in cui pensa e sente. Perché l’annuncio del Vangelo e il discepolato siano pienamente efficaci devono avvenire in questa lingua; è cosa diversa da una lingua ufficiale o veicolare.',
      alternatives: 'lingua materna · lingua madre · prima lingua',
      rationale:
        'è la formulazione già usata in tutti i contenuti di preghiera italiani. «Lingua materna» è il termine linguistico corretto, ma «lingua del cuore» conserva la dimensione affettiva e spirituale che rende il concetto significativo nel contesto missionario.'
    },
    {
      term: 'Spunti di preghiera',
      english: 'prayer points',
      definition:
        'le richieste di preghiera quotidiane e specifiche per ciascun gruppo etnico che DOXA invia agli intercessori: centrate sulla Scrittura e collegate al campo, distinte da un contenuto devozionale generico.',
      alternatives: 'punti di preghiera · motivi di preghiera · soggetti di preghiera',
      rationale:
        '«spunti» dice che si tratta di indicazioni da cui partire per pregare, che è esattamente ciò che il contenuto quotidiano offre. «Punti di preghiera» è un calco dall’inglese; «motivi di preghiera» in italiano indica le richieste portate dai membri di una comunità, cioè un’altra cosa.'
    },
    {
      term: 'Adottare (un gruppo etnico)',
      english: 'adopt (a people group)',
      definition:
        'l’impegno duraturo, guidato da una chiesa, a pregare, donare e mandare perché per uno specifico gruppo etnico non coinvolto cominci l’accesso al Vangelo. È un patrocinio missionario, non l’adozione del diritto di famiglia.',
      alternatives: 'sostenere · patrocinare · farsi carico di',
      rationale:
        '«adottare» conserva la forza del legame permanente e di responsabilità che il programma chiede, ed è la parola già usata nel certificato di adozione italiano e in tutta l’app. Le alternative descrivono un sostegno che si può interrompere.'
    },
    {
      term: 'Il nostro dono a Gesù',
      english: 'our gift to Jesus',
      definition:
        'la cornice di tutta l’iniziativa: coinvolgere ogni popolo entro il 2033 come offerta di adorazione della Chiesa intera — un dono sacrificale, non uno scambio.',
      alternatives: 'il nostro regalo a Gesù · la nostra offerta a Gesù',
      rationale:
        '«dono» ha in italiano il registro della gratuità e dell’offerta; «regalo» è quotidiano e domestico. «Offerta» è corretto ma nelle chiese italiane indica anzitutto la colletta.'
    },
    {
      term: 'Fratellanza Mondiale delle Assemblee di Dio (WAGF)',
      english: 'World Assemblies of God Fellowship (WAGF)',
      definition:
        'la comunione mondiale che ha fondato DOXA e la custodisce. La sigla WAGF resta invariata in ogni lingua.',
      alternatives: 'nome inglese non tradotto · Comunione Mondiale delle Assemblee di Dio',
      rationale:
        'le Assemblee di Dio in Italia (ADI) fanno parte di questa comunione e il nome proprio italiano corrente della denominazione è «Assemblee di Dio». La resa dell’organismo mondiale attende conferma da un revisore italiano; nel frattempo la sigla WAGF garantisce che il riferimento resti riconoscibile.'
    },
    {
      term: 'Agenzie missionarie',
      english: 'sending agencies',
      definition:
        'organizzazioni che reclutano, formano, sostengono e inviano missionari. DOXA collabora con le agenzie missionarie (129 affiliate alla WAGF nel 2026) ma non le sostituisce.',
      alternatives: 'agenzie di invio · enti invianti · società missionarie',
      rationale:
        '«agenzia missionaria» è la formula corrente in italiano e si regge da sola: la precisazione «di invio» è ridondante, perché inviare è ciò che un’agenzia missionaria fa.'
    },
    {
      term: 'Preghiera quotidiana (per un gruppo etnico)',
      english: 'daily prayer (for a people group)',
      definition:
        'l’impegno a pregare ogni giorno per uno specifico gruppo etnico non coinvolto, servendosi della guida di preghiera quotidiana. L’obiettivo è di oltre 100 intercessori quotidiani per ciascun gruppo etnico.',
      alternatives: 'preghiera giornaliera · preghiera regolare',
      rationale:
        '«quotidiana» è voluto: indica un impegno di ogni giorno, non una preghiera regolare od occasionale. Sostituisce l’impostazione precedente dei 144 intercessori che coprivano 24 ore.'
    },
    {
      term: 'Ogni tribù, lingua, popolo e nazione',
      english: 'every tribe, tongue, people, and nation',
      definition:
        'la visione di Apocalisse 5:9 e 7:9 che muove tutta la missione. Ciascuno dei quattro sostantivi porta una dimensione distinta della diversità umana.',
      alternatives: 'ogni tribù, lingua, popolo e nazione (altro ordine) · ogni stirpe, lingua, popolo e nazione',
      rationale:
        'è la formulazione esatta di Apocalisse 5:9 nella Nuova Riveduta 2006, già usata in tutti i contenuti di preghiera italiani. Per la folla di Apocalisse 7:9 la stessa versione dice «davanti al trono», non «intorno al trono».'
    }
  ]
}
