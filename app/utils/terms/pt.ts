import type { TermsContent } from './index'

export const pt: TermsContent = {
  title: 'Definições',
  intro: [
    'Esta página documenta as decisões terminológicas da parceria DOXA em português. Para cada termo: a definição, as alternativas consideradas, o que o Joshua Project e o PeopleGroups.org (IMB) usam, e o motivo da nossa escolha.',
    'Nossas fontes: o glossário DOXA revisado por tradutores de língua portuguesa, o uso já estabelecido em doxa.life/pt e no aplicativo, o vocabulário das missões brasileiras e as traduções de Almeida para as expressões de origem bíblica.'
  ],
  labels: {
    english: 'Inglês:',
    definition: 'Definição:',
    alternatives: 'Alternativas consideradas:',
    jp: 'Joshua Project:',
    pg: 'PeopleGroups.org:',
    rationale: 'Por que esta escolha:'
  },
  entries: [
    {
      term: 'Grupo étnico',
      english: 'people group',
      definition:
        'um grupo etnolinguístico cujos membros percebem entre si uma afinidade comum baseada na língua, na cultura, na religião e na cosmovisão — o maior grupo dentro do qual o evangelho pode difundir-se como um movimento de plantação de igrejas sem encontrar barreiras de compreensão ou de aceitação. A unidade fundamental de tudo o que a DOXA conta.',
      alternatives: 'povo · grupo de pessoas · grupo de povos · etnia · tribo',
      rationale:
        'o rótulo que doxa.life/pt já usa nas contagens e nos botões (“2.085 grupos étnicos não engajados”, “Escolha um grupo étnico”); o revisor corrigiu “grupos de pessoas” para “grupos étnicos”. “Povo” continua natural na prosa corrida (“povos não engajados”, “um povo de fronteira”) e é o termo do glossário revisado; a página de Definições trata os dois como sinônimos (“Povo (Grupo Étnico)”). “Grupo de pessoas” é tradução automática; “tribo” carrega conotações primitivas; “etnia” perde a dimensão linguística.'
    },
    {
      term: 'Grupo étnico não alcançado (PNA)',
      english: 'unreached people group (UPG)',
      definition:
        'aproximadamente 2 discípulos ou menos em cada 100 pessoas (≤ 2%) e sem capacidade para estabelecer igrejas autóctones sem assistência transcultural. O Joshua Project acrescenta um critério de ≤ 5% de cristãos; a DOXA segue a definição da IMB.',
      alternatives: 'povo não alcançado · UPG (sigla inglesa)',
      rationale:
        'a página de Definições já escreve “povo (grupo étnico) não alcançado (PNA)”. As siglas são aportuguesadas em vez de mantidas em inglês: UPG torna-se PNA, como UUPG torna-se PNANE e CPM torna-se MPI.'
    },
    {
      term: 'Não engajado',
      english: 'unengaged people group',
      definition:
        'um grupo étnico sem crentes conhecidos ou com muito poucos, e sem os quatro níveis primários de engajamento efetivo (esforço apostólico pioneiro residente; trabalho na cultura local e na língua do coração; compromisso ministerial de longo prazo; semeadura do evangelho visando um movimento de plantação de igrejas). Um termo técnico da IMB: diz que ninguém trabalha entre eles, não que as pessoas sejam indiferentes.',
      alternatives: 'não envolvido · desligado · sem compromisso · não evangelizado',
      rationale:
        '“engajar” e “engajamento” são o vocabulário estabelecido das missões brasileiras para esse sentido técnico, e o revisor substituiu “Desligado” e “não envolvidas” por “não engajados”. “Envolvimento” e “compromisso” descrevem uma atitude; “não evangelizado” descreve outra coisa — a ausência de proclamação, não a ausência de obreiros residentes.'
    },
    {
      term: 'Grupo étnico não alcançado e não engajado (PNANE)',
      english: 'unengaged unreached people group (UUPG)',
      definition:
        'a categoria combinada — não alcançado e não engajado. Os 2.085 grupos étnicos pelos quais a DOXA mobiliza oração.',
      alternatives: 'povo não alcançado não engajado · UUPG (sigla inglesa)',
      pg: 'UUPG é a sigla estabelecida internacionalmente.',
      rationale:
        'o site já usa a sigla portuguesa (“Encontre um PNANE”) e o glossário revisado pede que PNANE seja usada de forma consistente. Na expansão, o “e” torna a expressão legível; no plural escrevemos PNANEs, como no glossário revisado.'
    },
    {
      term: 'Sub-engajado',
      english: 'under-engaged people group',
      definition:
        'aproximadamente 1 discípulo ou menos em cada 100 (≤ 1%): o trabalho começou, mas são necessárias mais equipes de plantação de igrejas para um engajamento frutífero.',
      alternatives: 'subengajado · pouco engajado · menos envolvido',
      rationale:
        'o composto hifenizado é a forma do glossário revisado e a que o revisor escolheu na página inicial (“Sub-engajados”); descreve a escala do trabalho, não a atitude do povo. As variantes “subengajados” e “pouco engajados” são resíduos de tradução automática.'
    },
    {
      term: 'Povo de fronteira',
      english: 'frontier people group',
      definition:
        'aproximadamente 1 discípulo ou menos em cada 1.000 (≤ 0,1%), sem qualquer movimento confirmado e sustentado em direção a Jesus — os mais não alcançados entre os não alcançados. O termo vem do Joshua Project.',
      alternatives: 'povo fronteiriço · grupo étnico de fronteira · Povo da Fronteira',
      rationale:
        'o revisor trocou “povos fronteiriços” por “povos de fronteira”. “Fronteiriço” evoca a fronteira entre países; “de fronteira” preserva o sentido de vanguarda missiológica, o primeiro contato com o evangelho. Aqui fica “povo”, e não “grupo étnico”, porque é a forma fixada no glossário revisado e a mais curta para rótulos.'
    },
    {
      term: 'Engajamento · engajado',
      english: 'engagement · engaged',
      definition:
        'atividade sustentada, residente e transcultural para compartilhar Cristo e fazer discípulos, com esforços para estabelecer igrejas autossustentáveis, de formas culturalmente apropriadas e localmente relevantes (ver “O que é engajamento?” na página Visão).',
      alternatives: 'envolvimento · compromisso · participação · contato',
      rationale:
        'um termo de precisão: residente, sustentado, transcultural, orientado para um MPI. O revisor substituiu “compromisso” por “engajamento” (“O engajamento começa com a oração”) e “Envolver-se” por “Engaje-se”. “Envolvimento” ou “participação” esvaziam o sentido, e a família engajar / engajado / engajamento / não engajado / sub-engajado / engajamento frutífero deve manter-se unida — por isso a manchete “Envolvimento frutífero” da página inicial passa a “Engajamento frutífero”.'
    },
    {
      term: 'Movimento de plantação de igrejas (MPI)',
      english: 'church-planting movement (CPM)',
      definition:
        'uma multiplicação de igrejas autóctones que plantam igrejas, incluindo pelo menos quatro correntes de quatro gerações espirituais que juntas totalizam mais de 1.000 pessoas.',
      alternatives: 'movimento de implantação de igrejas · CPM (sigla inglesa)',
      rationale:
        '“plantação de igrejas” é a expressão corrente nas missões brasileiras. A sigla é aportuguesada (MPI), seguindo o padrão de PNA e PNANE que o site já usa; o glossário revisado usa MPI em todas as menções.'
    },
    {
      term: 'Igreja autóctone',
      english: 'indigenous church',
      definition:
        'uma igreja que emerge do interior do próprio grupo étnico e amadurece nos cinco “autos”: autopropagação, autogoverno, autossustento, autoteologização e automissionação.',
      alternatives: 'igreja indígena · igreja nativa · igreja local',
      rationale:
        '“autóctone” significa com raízes locais e autogoverno. No Brasil, “indígena” remete aos povos indígenas e às religiões tradicionais, o que tornaria “igreja indígena” ambíguo; o revisor reconheceu que “autóctone” é um pouco acadêmico, mas manteve-o (“If translators chose it, keep it”). As menções a “igreja indígena” no site foram alinhadas.'
    },
    {
      term: 'Obreiros transculturais',
      english: 'cross-cultural workers',
      alternatives: 'trabalhadores interculturais · obreiros interculturais · missionários estrangeiros',
      rationale:
        '“transcultural” é forte no vocabulário missionário brasileiro — o revisor pediu para manter “obreiros transculturais” e “assistência transcultural”. “Obreiro” é a palavra das igrejas para quem trabalha na obra; “trabalhador” soa laboral. “Intercultural” descreve o diálogo entre culturas vizinhas, não o atravessar de uma cultura para outra.'
    },
    {
      term: 'Senhor da seara',
      english: 'Lord of the harvest',
      rationale:
        'Mateus 9:38 nas traduções de Almeida: “Rogai, pois, ao Senhor da seara que mande ceifeiros para a sua seara” (Revista e Corrigida; a Revista e Atualizada diz “trabalhadores”) — a citação que a página Ore já traz. A edição de referência desta versão do site é a Nova Almeida Atualizada, que diz “peçam ao Senhor da seara que mande trabalhadores”: o termo “Senhor da seara” é o mesmo em todas as edições de Almeida, mas a citação da página Ore segue a Revista e Corrigida. A NVI diz “Senhor da colheita”; seguimos Almeida, corrente nas Assembleias de Deus. A metáfora agrícola (seara = pessoas prontas a responder) fica preservada.'
    },
    {
      term: 'A oração prepara o caminho',
      english: 'prayer prepares the way',
      alternatives: 'a oração abre o caminho · a oração prepara o terreno',
      rationale:
        'eco de Isaías 40:3 (Almeida): “Preparai no deserto o caminho do SENHOR”. A intercessão cria as condições espirituais para o evangelho muito antes de os obreiros chegarem. “Prepara o terreno” continua certo onde o inglês diz “prepares the soil”.'
    },
    {
      term: 'Língua do coração',
      english: 'heart language',
      alternatives: 'língua materna · idioma do coração',
      rationale:
        'a expressão estabelecida nas missões e na tradução da Bíblia para a língua em que a pessoa pensa e sente — distinta da língua oficial ou da língua franca, distinção que “língua materna” não faz. “Língua” em vez de “idioma” porque é a forma consagrada da expressão.'
    },
    {
      term: 'Pontos de oração',
      english: 'prayer points',
      alternatives: 'motivos de oração · pedidos de oração · tópicos de oração',
      rationale:
        '“motivos de oração” é a expressão mais comum nas igrejas brasileiras, e “pedidos de oração” a mais comum para pedidos pessoais; o glossário revisado e o site fixaram “pontos de oração diários” (“Receba pontos de oração diários”), e a consistência entre o site, o aplicativo e os e-mails pesa mais do que a preferência. O conjunto diário chama-se “guia de oração diário”.'
    },
    {
      term: 'Adotar (um grupo étnico)',
      english: 'adopt a people group',
      alternatives: 'acolher · apadrinhar · assumir · escolher',
      rationale:
        'um compromisso formal e de longo prazo, liderado pela igreja, de orar, doar e enviar para que o acesso ao evangelho comece. “Adotar” já é o que se diz em português (“adotar um povo”), e a página Adote deixa claro que não se trata da adoção familiar. “Igreja de acolhimento” e “adesão”, que a tradução automática produziu, foram corrigidos para “igreja adotante” e “adoção”. “Escolher” fica reservado ao passo de seleção (“Escolha um grupo étnico”).'
    },
    {
      term: 'Nossa oferta a Jesus',
      english: 'our gift to Jesus',
      alternatives: 'nossa dádiva a Jesus · nosso presente para Jesus',
      rationale:
        'o revisor pensou duas vezes: propôs “dádiva” e depois pediu “Nossa oferta a Jesus”, que está no ar. “Oferta” tem o calor de uma oferta de adoração — sacrificial, não transacional; “presente” soa a aniversário, “dádiva” é literário.'
    },
    {
      term: 'World Assemblies of God Fellowship (WAGF)',
      english: 'World Assemblies of God Fellowship (WAGF)',
      alternatives: 'Comunhão das Assembleias de Deus Mundial · Fraternidade Mundial das Assembleias de Deus',
      rationale:
        'nomes de organizações não se traduzem pela regra do glossário, mas o site usa a forma que o revisor escolheu, “Comunhão das Assembleias de Deus Mundial”, seguida do nome em inglês e da sigla WAGF, que se mantém igual em todo o site.'
    },
    {
      term: 'Secretarias de missões',
      english: 'sending agencies',
      alternatives: 'agências enviadoras · agências de envio · agências missionárias',
      rationale:
        'o glossário revisado dizia “agência enviadora”, mas a página Sobre já usa “secretaria de missões” (e “secretaria enviadora”) em toda a declaração — o nome que as Assembleias de Deus dão ao seu departamento de missões, e por isso o termo que os leitores reconhecem.'
    },
    {
      term: 'Oração diária (por um grupo étnico)',
      english: 'daily prayer (for a people group)',
      definition:
        'o compromisso de orar todos os dias por um grupo étnico não engajado específico, com o guia de oração diário. A meta: mais de 100 intercessores diários por grupo étnico.',
      alternatives: 'oração regular · cobertura de oração de 24 horas (meta anterior: 144 intercessores × 10 minutos)',
      rationale:
        '“diária” é intencional — um compromisso para cada dia, não uma oração ocasional. A imagem anterior de 144 intercessores que juntos cobrem 24 horas foi substituída pela meta de mais de 100 intercessores diários.'
    },
    {
      term: 'Todas as tribos, línguas, povos e nações',
      english: 'every tribe, tongue, people, and nation',
      rationale:
        'Apocalipse 5:9 e 7:9 — a visão que motiva todo o trabalho. Almeida traduz 7:9 por “de todas as nações, tribos, povos e línguas”, que a página Visão cita; a forma do glossário mantém a ordem do inglês e o plural, como na frase “Jesus é digno da glória de todas as tribos, línguas, povos e nações” que o revisor deixou na página inicial. Cada um dos quatro substantivos nomeia uma dimensão própria da diversidade humana.'
    }
  ]
}
