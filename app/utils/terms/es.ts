import type { TermsContent } from './index'

export const es: TermsContent = {
  title: 'Terminología',
  intro: [
    'Esta página documenta las decisiones terminológicas en español de la asociación DOXA. Para cada término: la definición, las alternativas consideradas, lo que usan Joshua Project y PeopleGroups.org (IMB) y la razón de nuestra elección.',
    'Nuestras fuentes: el glosario de DOXA revisado por un traductor hispanohablante, sus comentarios sobre el sitio web y, para toda expresión de origen bíblico, la Nueva Versión Internacional (NVI) y la Reina-Valera 1960 (RVR1960).'
  ],
  seeDefinitionsBefore: 'Las definiciones completas están en la página',
  definitionsLinkLabel: 'Definiciones',
  seeDefinitionsAfter: '.',
  labels: {
    english: 'Inglés:',
    definition: 'Definición:',
    alternatives: 'Alternativas consideradas:',
    jp: 'Joshua Project:',
    pg: 'PeopleGroups.org:',
    rationale: 'Por qué esta elección:'
  },
  entries: [
    {
      term: 'Grupo étnico',
      english: 'people group',
      definition:
        'un grupo etnolingüístico cuyos miembros perciben entre sí una afinidad común basada en el idioma, la cultura, la religión y la cosmovisión: el grupo más amplio dentro del cual el evangelio puede extenderse sin barreras de comprensión o aceptación. La unidad fundamental de todo lo que DOXA cuenta.',
      alternatives: 'grupo de personas · pueblo étnico · pueblo · tribu · grupo etnolingüístico',
      rationale:
        'preguntado si «grupo de personas» debía mantenerse, nuestro revisor respondió «grupo étnico»: recoge con más precisión el concepto etnolingüístico, mientras que «grupo de personas» suena a estadística y «pueblo» a nación. Es también la base de las siglas en español (GENANC). «Tribu» se evita por sus connotaciones primitivas.'
    },
    {
      term: 'Grupo étnico no alcanzado (UPG)',
      english: 'unreached people group (UPG)',
      definition:
        'aproximadamente 2 discípulos o menos de cada 100 personas (≤ 2 %), sin la capacidad de establecer iglesias autóctonas sin obreros transculturales. Joshua Project añade un criterio de ≤ 5 % de cristianos; DOXA sigue la definición de la IMB.',
      alternatives: 'pueblo étnico no alcanzado (PNA) · pueblo no alcanzado',
      rationale:
        'el glosario revisado no fija una sigla propia en español para este término, así que se conserva la inglesa, UPG, y en texto corrido se escribe completo. «PNA» se construyó sobre «pueblo» y se abandonó con él. Para la movilización general basta el término «grupos étnicos no alcanzados»; las categorías más finas de abajo se dirigen a los responsables estratégicos.'
    },
    {
      term: 'Grupo étnico no comprometido',
      english: 'unengaged people group',
      definition:
        'sin creyentes conocidos o con muy pocos, y sin los cuatro niveles primarios de compromiso efectivo (esfuerzo apostólico residente; compromiso con la cultura local y la lengua del corazón; compromiso ministerial a largo plazo; siembra del evangelio orientada a un movimiento de plantación de iglesias). Un término técnico del entorno de la IMB: dice que nadie trabaja entre ellos, no que el pueblo sea indiferente.',
      alternatives: 'sin compromiso · grupo desvinculado · no involucrado · sin participación misionera activa',
      rationale:
        'se le pidió al revisor que reconsiderara «no comprometido» porque podía sonar a que el grupo mismo carece de compromiso. Lo mantuvo: «comprometido es la palabra correcta para implicar a alguien con responsabilidad y compromiso; involucramiento significa implicar a alguien en un proyecto o una acción». «Sin compromiso» y «desvinculado», usados en borradores anteriores, quedan sustituidos. En texto corrido va en minúscula.'
    },
    {
      term: 'Grupo étnico no alcanzado no comprometido (GENANC)',
      english: 'unengaged unreached people group (UUPG)',
      definition:
        'la categoría combinada: no alcanzado y no comprometido. Los 2.085 grupos étnicos por los que DOXA moviliza oración.',
      alternatives: 'PNANC (pueblo no alcanzado no comprometido) · GNANC · UUPG (sigla inglesa)',
      pg: 'UUPG es la sigla internacional establecida.',
      rationale:
        'nuestro revisor usa siglas en español en lugar de las inglesas: «he usado una abreviatura en español en vez de la inglesa; por favor, añádanla donde aparece UUPG en la versión inglesa». Trabajó primero con PNANC y, al adoptarse «grupo étnico», propuso «GENANC o GNANC»; el glosario revisado usa GENANC en todo el texto. Como término técnico o al desplegar la sigla va sin «y»; en prosa descriptiva «grupo étnico no alcanzado y no comprometido» se lee con más naturalidad.'
    },
    {
      term: 'Grupo étnico poco comprometido',
      english: 'under-engaged people group',
      definition:
        'aproximadamente 1 discípulo o menos de cada 100 (≤ 1 %): el trabajo ha comenzado, pero se necesitan más equipos de plantación de iglesias para un compromiso fructífero.',
      alternatives: 'subcomprometido · menos alcanzado · pocos alcanzados',
      rationale:
        'transmite que el trabajo es insuficiente en escala, no que el pueblo sea indiferente, y mantiene la familia «comprometido». «Menos alcanzados» confunde esta categoría con el grado de alcance; «subcomprometido» es un calco poco natural.'
    },
    {
      term: 'Grupo fronterizo',
      english: 'frontier people group',
      definition:
        'aproximadamente 1 discípulo o menos de cada 1.000 (≤ 0,1 %) sin ningún movimiento confirmado y sostenido hacia Jesús: los más no alcanzados entre los no alcanzados. El término procede de Joshua Project.',
      alternatives: 'gente fronteriza · pueblo fronterizo · grupo étnico frontera · gente de la frontera',
      rationale:
        '«fronterizo» señala el extremo misionológico, el primer contacto con el evangelio, sin la connotación militar de «frontera». Para la cifra de la página de inicio el revisor corrigió «gente de la frontera» por «gente fronteriza», que se conserva en esa etiqueta.'
    },
    {
      term: 'Compromiso · comprometido',
      english: 'engagement · engaged',
      definition:
        'actividad sostenida, residente y transcultural para compartir a Cristo y hacer discípulos, orientada a iglesias autosustentables y realizada de maneras culturalmente apropiadas y localmente relevantes (véase «¿Qué es el compromiso?» en la página de Visión).',
      alternatives: 'involucramiento · participación · implicación · contacto',
      rationale:
        'se le pidió al revisor que considerara «compromiso» con cuidado, porque puede confundir el ministerio residente con una actitud. Lo confirmó por la misma razón que «comprometido»: implica responsabilidad y compromiso, mientras que «involucramiento» solo significa tomar parte en un proyecto. El verbo es «comprometer» («Comprometer a todos los grupos étnicos no comprometidos para 2033»); «involucrar» y «participación», de borradores anteriores, quedan sustituidos. En las etiquetas de interfaz: «Estado del compromiso», «Criterios de compromiso».'
    },
    {
      term: 'Movimiento de plantación de iglesias (MPI)',
      english: 'church-planting movement (CPM)',
      definition:
        'una multiplicación de iglesias autóctonas que plantan iglesias, con al menos cuatro corrientes de cuatro generaciones espirituales que juntas suman más de 1.000 personas.',
      alternatives: 'CPM (sigla inglesa) · movimiento de multiplicación de iglesias',
      rationale:
        'la expresión es la habitual en el ámbito misionológico hispano. La sigla se traduce, como GENANC, siguiendo la regla de nuestro revisor de sustituir las siglas inglesas; el glosario revisado usa MPI.'
    },
    {
      term: 'Iglesia autóctona',
      english: 'indigenous church',
      definition:
        'una iglesia que surge desde dentro del grupo étnico y madura en los cinco «auto»: autogobierno, autosustento, autopropagación, autoteologización y automisionología.',
      alternatives: 'iglesia indígena · iglesia nativa · iglesia local',
      rationale:
        '«autóctona» significa con raíces locales y autogobernada. «Indígena» evoca en español a los pueblos indígenas y sus religiones, lo que invita a asociaciones con el sincretismo; «local» no dice que la iglesia sea propia del grupo étnico.'
    },
    {
      term: 'Obreros transculturales',
      english: 'cross-cultural workers',
      alternatives: 'trabajadores interculturales · trabajadores transculturales · misioneros extranjeros',
      rationale:
        '«obrero» es la palabra del uso evangélico hispano para quien sirve en la mies (Mateo 9:38); «transcultural» nombra el paso a otra cultura, el sentido misionero, mientras que «intercultural» sugiere el intercambio entre culturas que conviven. «Extranjero» solo dice de dónde viene el obrero, no que cruza una cultura.'
    },
    {
      term: 'Señor de la cosecha',
      english: 'Lord of the harvest',
      rationale:
        'Mateo 9:38 (NVI): «Pídanle, por tanto, al Señor de la cosecha que envíe obreros a su campo». La RVR1960 dice «Señor de la mies»; el glosario revisado eligió «cosecha» y conserva «mies» como glosa (mies = personas listas para responder). Nuestras expresiones bíblicas siguen estas dos traducciones.'
    },
    {
      term: 'La oración prepara el camino',
      english: 'prayer prepares the way',
      alternatives: 'la oración abre el camino · la oración prepara el terreno',
      rationale:
        'eco de Isaías 40:3 («Preparen el camino del Señor», NVI; «Preparad camino a Jehová», RVR1960). Dice que la intercesión crea las condiciones para el evangelio mucho antes de que lleguen los obreros. «Prepara el terreno» sigue siendo correcto donde el texto inglés dice «prepares the soil».'
    },
    {
      term: 'Lengua del corazón',
      english: 'heart language',
      alternatives: 'idioma del corazón · lengua materna',
      rationale:
        'la expresión establecida en la obra misionera y de traducción bíblica para la lengua en la que una persona piensa y siente, a diferencia de la lengua oficial o franca, matiz que «lengua materna» no expresa. La cita de la página de Definiciones conserva «idioma del corazón».'
    },
    {
      term: 'Motivos de oración',
      english: 'prayer points',
      alternatives: 'puntos de oración · pedidos de oración · peticiones de oración · indicaciones de oración',
      rationale:
        '«motivos de oración» es la expresión natural de las iglesias hispanas; «puntos de oración» es un calco. El glosario revisado fija «motivos diarios de oración», que el sitio ya usa en lugar de los «pedidos de oración» que el revisor había escrito en el formulario. El conjunto diario se llama «guía diaria de oración»; el encabezado del sitio conserva el orden «Tu guía de oración diaria».'
    },
    {
      term: 'Adoptar (un grupo étnico)',
      english: 'adopt a people group',
      alternatives: 'apadrinar · acoger · elegir · comprometerse con',
      rationale:
        'el concepto es un patrocinio misional: una iglesia asume la responsabilidad estratégica de orar, dar y enviar por un grupo étnico. «Apadrinar» y «acoger» desplazan el sentido hacia el padrinazgo o la acogida familiar; «elegir» queda para el paso de selección («Elige un grupo étnico»). Se evita el lenguaje legal de la adopción de menores.'
    },
    {
      term: 'Nuestro regalo para Jesús',
      english: 'our gift to Jesus',
      alternatives: 'nuestra ofrenda a Jesús · nuestro don a Jesús',
      rationale: '«regalo» conserva la calidez de una entrega de adoración; «ofrenda» suena a colecta y «don» a lenguaje litúrgico.'
    },
    {
      term: 'Fraternidad Mundial de las Asambleas de Dios (FMAD)',
      english: 'World Assemblies of God Fellowship (WAGF)',
      alternatives: 'World Assemblies of God Fellowship (sin traducir) · Asambleas de Dios Mundial · Comunidad Mundial de las Asambleas de Dios',
      rationale:
        'a diferencia de otros idiomas, el español tiene un nombre establecido para la fraternidad, y nuestro revisor lo fijó: «WAGF, la traducción al español es FMAD». La sigla FMAD se mantiene igual en todo el sitio.'
    },
    {
      term: 'Agencias enviadoras',
      english: 'sending agencies',
      alternatives: 'agencias de envío · agencias misioneras · agencias misioneras de envío',
      rationale:
        'término del glosario revisado. «Agencia misionera» es la palabra corriente, pero más amplia; «enviadora» mantiene visible la función de enviar, que forma parte del tríptico orar, dar y enviar.'
    },
    {
      term: 'Oración diaria (por un grupo étnico)',
      english: 'daily prayer (for a people group)',
      definition:
        'el compromiso de orar todos los días por un grupo étnico no comprometido específico, con la guía diaria de oración. La meta: más de 100 intercesores diarios por cada grupo étnico.',
      alternatives: 'oración regular · cobertura de oración las 24 horas (meta anterior: 144 intercesores × 10 minutos)',
      rationale:
        '«diaria» es intencional: un compromiso para cada día, no una oración ocasional. La imagen anterior de 144 intercesores que juntos cubren 24 horas fue sustituida por la meta de más de 100 intercesores diarios; la métrica del sitio se llama «cobertura diaria de oración».'
    },
    {
      term: 'Cada tribu, lengua, pueblo y nación',
      english: 'every tribe, tongue, people, and nation',
      rationale:
        'Apocalipsis 5:9 y 7:9, el cuadro que motiva toda la obra. La NVI traduce 7:9 «de toda nación, tribu, pueblo y lengua» y la RVR1960 «de todas naciones y tribus y pueblos y lenguas»; la forma del glosario conserva el orden inglés de los cuatro sustantivos. Cada uno nombra una dimensión distinta de la diversidad humana: tribu (clan), lengua (idioma), pueblo (grupo étnico), nación (unidad política).'
    }
  ]
}
