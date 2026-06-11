import type { TermsContent } from './index'

export const fr: TermsContent = {
  title: 'Terminologie',
  intro: [
    'Cette page documente les choix de terminologie française du partenariat DOXA. Pour chaque terme : sa définition, les autres options envisagées, ce qu’utilisent Joshua Project et PeopleGroups.org (IMB), et la raison de notre choix.',
    'Nos sources : les données officielles en français de PeopleGroups.org (IMB), les ressources françaises de Joshua Project, l’usage des ministères évangéliques francophones, et la Bible Louis Segond pour toute expression d’origine biblique.'
  ],
  seeDefinitionsBefore: 'Les définitions complètes se trouvent sur la page',
  definitionsLinkLabel: 'Définitions',
  seeDefinitionsAfter: '.',
  labels: {
    english: 'Anglais :',
    definition: 'Définition :',
    alternatives: 'Autres options :',
    jp: 'Joshua Project :',
    pg: 'PeopleGroups.org :',
    rationale: 'Pourquoi ce choix :'
  },
  entries: [
    {
      term: 'Peuple',
      english: 'people group',
      definition:
        'un groupe ethnolinguistique dont les membres partagent langue, culture, religion et vision du monde — le plus grand groupe au sein duquel l’Évangile peut se répandre sans rencontrer de barrières de compréhension ou d’acceptation.',
      alternatives: 'groupe ethnique · groupe de personnes · groupe de peuples',
      jp: '« groupe de personnes ».',
      pg: 'alterne « groupe de personnes » et « groupe ethnique ».',
      rationale:
        'c’est le mot qu’emploie naturellement le monde évangélique francophone (« les peuples non atteints »). Il évite la lecture politique de « groupe ethnique » et le caractère générique de « groupe de personnes », et donne des composés courts et lisibles.'
    },
    {
      term: 'Non atteint',
      english: 'unreached',
      definition:
        'environ 2 disciples ou moins pour 100 personnes (≤ 2 %), sans capacité d’établir des églises autochtones sans aide transculturelle.',
      alternatives: 'non-atteint (avec trait d’union) · non évangélisé · sans accès à l’Évangile',
      jp: '« Peuple Non-Atteint du Jour » (avec trait d’union).',
      pg: '« non atteint », sans trait d’union (« Engagé mais non atteint »).',
      rationale:
        'terme standard de la missiologie francophone ; orthographe sans trait d’union (« non » + adjectif), conforme à l’usage de l’IMB. « Sans accès à l’Évangile » reste une périphrase explicative utile, mais pas le terme technique.'
    },
    {
      term: 'Non engagé',
      english: 'unengaged',
      definition:
        'aucun travail actif d’implantation d’églises n’est en cours — les quatre niveaux d’engagement effectif sont absents. Il ne s’agit pas d’un peuple « indifférent » : à la première mention, on peut préciser « sans engagement missionnaire actif ».',
      alternatives: 'non ciblé · non évangélisé · sans engagement missionnaire',
      jp: 'pas d’équivalent français (catégorie surtout utilisée par l’IMB).',
      pg: '« Non engagé et non atteint ».',
      rationale:
        'aligné sur les données officielles de l’IMB, et cohérent avec la famille du mot « engagement » que notre page Vision définit — le statut et la définition partagent la même racine, comme en anglais. « Non ciblé » relevait du registre du marketing et rompait ce lien.'
    },
    {
      term: 'Peuple non atteint et non engagé (UUPG)',
      english: 'unengaged unreached people group (UUPG)',
      definition:
        'la catégorie combinée — non atteint ET dépourvu des quatre niveaux d’engagement effectif.',
      pg: 'UUPG est l’acronyme international établi.',
      rationale:
        'il n’existe pas d’acronyme français répandu ; nous conservons UUPG dans les contextes techniques pour rester alignés avec les outils de prière internationaux.'
    },
    {
      term: 'Sous-engagé',
      english: 'under-engaged',
      definition:
        'environ 1 disciple ou moins pour 100 personnes (≤ 1 %) — le travail a commencé mais demeure insuffisant en envergure.',
      alternatives: 'peu engagé · sous-ciblé',
      rationale: 'morphologie naturelle, cohérente avec « non engagé » et « engagement fructueux ».'
    },
    {
      term: 'Peuple « frontière »',
      english: 'frontier people group',
      definition:
        'environ 1 disciple ou moins pour 1 000 personnes (≤ 0,1 %), sans mouvement confirmé et soutenu vers Jésus.',
      alternatives: 'peuple frontalier · peuples pionniers · peuple-frontière',
      jp: '« Groupes de Personnes Frontières » dans ses ressources françaises.',
      rationale:
        '« frontière » en apposition suit l’usage de Joshua Project. « Frontalier » signifie transfrontalier en français courant, et « pionnier » décrit le travail missionnaire, pas le peuple. Les guillemets signalent l’emploi technique du mot.'
    },
    {
      term: 'Engagement · s’engager auprès d’un peuple',
      english: 'engagement · to engage',
      definition:
        'une activité soutenue, en résidence, transculturelle, orientée vers un mouvement d’implantation d’églises (voir « Qu’est-ce que l’engagement ? » sur la page Vision).',
      alternatives: 'implication · contact · cibler',
      rationale:
        'terme de précision — un rendu vague comme « implication » vide le sens. Au verbe, nous préférons « s’engager auprès d’un peuple » : « engager un peuple » évoquerait une embauche.'
    },
    {
      term: 'Mouvement d’implantation d’églises (MPÉ)',
      english: 'church-planting movement (CPM)',
      definition:
        'une multiplication d’églises autochtones qui implantent à leur tour d’autres églises — au moins quatre courants de quatre générations spirituelles totalisant plus de 1 000 personnes.',
      alternatives: 'plantation d’églises · l’acronyme anglais CPM',
      rationale:
        '« implantation d’églises » est le terme consacré en francophonie (mouvement de Lausanne, formations du CNEF). L’acronyme MPÉ vient de la relecture francophone de notre glossaire.'
    },
    {
      term: 'Église autochtone',
      english: 'indigenous church',
      definition:
        'une église née au sein même du peuple, autonome et mûrissant dans les cinq « piliers » (auto-propagatrice, auto-gouvernée, auto-financée, auto-théologisante, auto-missionnaire).',
      alternatives: 'église indigène',
      pg: 'emploie parfois « indigène ».',
      rationale:
        '« autochtone » dit l’enracinement local sans les connotations coloniales d’« indigène » en français contemporain.'
    },
    {
      term: 'Ouvriers transculturels',
      english: 'cross-cultural workers',
      alternatives: 'ouvriers interculturels · missionnaires étrangers',
      rationale:
        '« transculturel » exprime le franchissement vers une autre culture — le sens missionnaire (la « mission transculturelle ») — là où « interculturel » évoque le dialogue entre cultures qui coexistent.'
    },
    {
      term: 'Maître de la moisson',
      english: 'Lord of the harvest',
      alternatives: 'Seigneur de la moisson (version Darby)',
      rationale:
        'Matthieu 9:38 dans la Segond : « Priez donc le maître de la moisson d’envoyer des ouvriers dans sa moisson. » Nos expressions bibliques suivent la Louis Segond.'
    },
    {
      term: 'La prière prépare le chemin',
      english: 'prayer prepares the way',
      alternatives: 'prépare la voie · prépare le terrain',
      rationale:
        'écho direct de « Préparez le chemin du Seigneur » (Segond). « Préparer le terrain » reste juste quand l’anglais dit « prepares the soil ».'
    },
    {
      term: 'Langue du cœur',
      english: 'heart language',
      alternatives: 'langue maternelle',
      rationale:
        'la notion missiologique — la langue dans laquelle une personne pense et ressent le plus profondément — distincte de la langue officielle ou véhiculaire, ce que « langue maternelle » ne dit pas.'
    },
    {
      term: 'Sujets de prière',
      english: 'prayer points',
      alternatives: 'points de prière',
      rationale:
        '« sujets de prière » est l’expression naturelle des églises francophones ; « points de prière » est un calque de l’anglais.'
    },
    {
      term: 'Adopter un peuple',
      english: 'adopt a people group',
      alternatives: 'choisir · parrainer',
      rationale:
        'précédent missionnaire francophone direct (« Adopte un peuple », Génération Propulsion) et continuité avec l’anglais. « Choisir » est réservé à l’étape de sélection (« Choisissez un peuple ») ; dans nos formulations, nous évitons le registre de l’adoption familiale (le concept est un parrainage missionnaire).'
    },
    {
      term: 'Notre offrande à Jésus',
      english: 'our gift to Jesus',
      alternatives: 'notre cadeau à Jésus',
      rationale: '« offrande » porte le registre sacrificiel de l’adoration ; « cadeau » sonne transactionnel.'
    },
    {
      term: 'Association mondiale des Assemblées de Dieu (WAGF)',
      english: 'World Assemblies of God Fellowship (WAGF)',
      alternatives: 'conserver le nom anglais · « Fraternité mondiale des Assemblées de Dieu »',
      rationale:
        'c’est le nom français établi de la communion mondiale des Assemblées de Dieu. L’acronyme WAGF reste inchangé sur tout le site.'
    },
    {
      term: 'Agences missionnaires',
      english: 'sending agencies',
      alternatives: 'agences d’envoi',
      rationale: 'terme usuel des structures missionnaires francophones ; « agence d’envoi » est un calque.'
    },
    {
      term: 'Couverture de prière 24h/24',
      english: '24-hour prayer coverage',
      definition:
        'au moins 144 intercesseurs priant chacun 10 minutes par jour pour un même peuple — soit 24 heures de prière quotidienne.',
      alternatives: 'couverture de prière de 24 heures',
      rationale: '« 24h/24 » est la forme idiomatique française pour une couverture continue.'
    },
    {
      term: 'Toute tribu, toute langue, tout peuple et toute nation',
      english: 'every tribe, tongue, people, and nation',
      rationale:
        'Apocalypse 5:9 dans la Segond : « …de toute tribu, de toute langue, de tout peuple, et de toute nation. » Chacun des quatre termes porte une dimension distincte de la diversité humaine.'
    }
  ]
}
