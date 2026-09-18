import type { TermsContent } from './index'

export const zh: TermsContent = {
  title: '术语',
  intro: [
    '本页记录 DOXA 伙伴关系的中文术语选择。每个术语都列出定义、曾考虑过的其他译法，以及选用的理由。',
    '我们的依据：DOXA 词汇表、祷告应用和中文每日祷告内容中已经在用的措辞、中文福音派与宣教学的既有词汇，以及和合本（简体，CUNPS）——凡出于圣经的表达都以它为准。Joshua Project 和 PeopleGroups.org（IMB）没有确认的中文版本，因此本版不引用它们。',
    '中文术语尚未经过母语审核者确认。以下选择反映各产品目前的实际用法，将来会由审核者复核并更新。'
  ],
  seeDefinitionsBefore: '完整定义见',
  definitionsLinkLabel: '定义',
  seeDefinitionsAfter: '页面。',
  labels: {
    english: '英语：',
    definition: '定义：',
    alternatives: '曾考虑的译法：',
    jp: 'Joshua Project：',
    pg: 'PeopleGroups.org：',
    rationale: '选用理由：'
  },
  entries: [
    {
      term: '族群',
      english: 'people group',
      definition:
        '一个民族语言群体，其成员因语言、文化、宗教和世界观而彼此认同——是福音能够在其中传开而不遇理解或接受障碍的最大群体。这是 DOXA 一切统计的基本单位。',
      alternatives: '民族群体 · 人群 · 民族 · 部落',
      rationale:
        '祷告应用、手机应用、认领证书和中文祷告内容都已经统一用“族群”。“民族”在中文里更多指向国族或法定民族身份，“部落”带有原始色彩，“人群”丢掉了民族语言的含义。1040 地图曾用“民族群体”，现已改齐。'
    },
    {
      term: '未得之民（UPG）',
      english: 'unreached people group (UPG)',
      definition:
        '每 100 人中约有 2 位或更少的门徒（≤ 2%），且没有跨文化协助就无力建立本土教会。Joshua Project 另加“基督徒人口 ≤ 5%”的标准；DOXA 采用 IMB 的定义。',
      alternatives: '未得之族 · 未触及族群 · 福音未及群体',
      rationale:
        '“未得之民”是中文宣教界长期沿用的说法，也是祷告应用里一整组标签的基础——前沿未得之民、开拓型未得之民、扩展型未得之民。英文缩写保持不变，因为中文没有稳定的对应缩写，另造一个会让国际数据无法对读。'
    },
    {
      term: '未接触',
      english: 'unengaged people group',
      definition:
        '没有已知的工作以建立能自立的教会为目标：有效接触的四个层面都不具备（驻地的开拓性事工；使用当地文化和心灵语言；长期委身；以植堂运动为目标撒下福音的种子）。这是 IMB 体系的专门用语：它说的是无人在他们中间做工，而不是这个族群冷淡。',
      alternatives: '未有宣教参与 · 尚无福音工作 · 无人问津',
      rationale:
        '“未接触／已接触”是祷告应用的状态标签，也是全部 2,085 个族群自动生成的描述所用的措辞，改动牵动的面最广。需要留意的是，其他五种语言的审核者都不肯用“接触”这一层意思的词——德语选了“在当地的宣教工作”而不是“接触”，葡萄牙语的文件明确说“参与”或“接触”会掏空这个术语。保留“未接触”是因为它已在使用，也因为中文宣教语境里它已经承载“无人在他们中间做工”的意思；中文审核者若不同意，这一整组词都要随之改动。'
    },
    {
      term: '未接触且未得之民（UUPG）',
      english: 'unengaged unreached people group (UUPG)',
      definition: '两项合起来的类别——既未接触又未得之民。这就是 DOXA 动员祷告的 2,085 个族群。',
      alternatives: '尚无福音工作的未得之族 · 另造中文缩写',
      rationale:
        '“未接触且未得之民”是祷告应用现成的复合标签，与它的姊妹标签“已接触但未得之民”成对。UUPG 是国际通行的缩写，予以保留——1040 地图的图例本来就直接写 UUPGs。'
    },
    {
      term: '接触不足',
      english: 'under-engaged people group',
      definition: '每 100 人中约有 1 位或更少的门徒（≤ 1%）：工作已经开始，但要有果效的宣教参与还需要更多植堂团队。',
      alternatives: '福音工作投入不足 · 接触薄弱 · 参与不足',
      rationale:
        '与“未接触／已接触”同一组词，读起来也对称。它说的是规模不够，不是这个族群本身冷淡。目前还没有任何产品用到这个词。'
    },
    {
      term: '前沿族群',
      english: 'frontier people group',
      definition:
        '每 1,000 人中约有 1 位或更少的门徒（≤ 0.1%），且没有确认的、持续的归向耶稣的运动——未得之民中最未得的。这个说法出自 Joshua Project。',
      alternatives: '边疆族群 · 最前线族群',
      rationale:
        '“前沿”已经用在祷告应用的 IMB 标签“前沿未得之民”上。“边疆”会读成地理上的国境，正是德语审核者否掉 Grenzvolksgruppe 的同一个理由。'
    },
    {
      term: '接触',
      english: 'engagement',
      definition:
        '持续的、驻地的跨文化事工，以传扬基督、造就门徒为内容，以能自立的教会为目标，并以合乎当地文化、贴近当地处境的方式进行。这是一个精确的术语——“参与”或“有过往来”都不算接触。',
      alternatives: '宣教参与 · 参与 · 投入',
      rationale:
        '祷告应用用“接触”作名词（接触状态、接触标准、迈向接触的关键第一步）。但在英文把 engagement 当抽象名词用的地方——有果效的宣教参与、广义宣教参与、驻地宣教工作——本版改用“宣教参与”“宣教工作”，因为“有果效的接触”“广义接触”不是能用的中文。审核者确认这一条时，也请一并确认这个分工。'
    },
    {
      term: '植堂运动（CPM）',
      english: 'church-planting movement (CPM)',
      definition: '本土教会不断建立教会的倍增：至少四条支线、各达四代属灵世代，合计超过 1,000 人。',
      alternatives: '教会倍增运动 · 建立教会运动',
      rationale:
        '“植堂”是祷告应用一贯的用词——植堂状态、分散性植堂、集中性植堂、尚无植堂工作在他们中间开展。祷告内容里的“教会倍增运动”译的是 church multiplication movement，那是另一个英文术语，不是 CPM 的另一种译法。'
    },
    {
      term: '本土教会',
      english: 'indigenous church',
      definition:
        '从族群内部兴起的教会，在五项自立原则上渐趋成熟：自传、自治、自养、自立神学、自差宣教。',
      alternatives: '原住民教会 · 本地教会 · 土著教会',
      rationale:
        '“本土”指扎根本地、自行治理，“原住民”和“土著”在中文里指特定的族裔身份，会读成另一回事——葡萄牙语审核者对 indígena 的顾虑正是如此。祷告应用的接触标准已经写“本土教会”。'
    },
    {
      term: '跨文化工人',
      english: 'cross-cultural workers',
      definition:
        '来自另一种文化、在某个族群中服事的宣教工人。“跨文化”这个限定是有意的——他们不是这个族群里的人——在某些语境中比单说“宣教士”更合适。',
      alternatives: '宣教士 · 传教士 · 跨文化宣教士',
      rationale:
        '祷告应用的三条接触标准都写“驻地的跨文化工人”。“宣教士”保留给泛指的差派语境；“传教士”在中文里常带负面的历史联想，全线不用。'
    },
    {
      term: '庄稼的主',
      english: 'Lord of the harvest',
      definition:
        '耶稣的一个圣经称号（马太福音 9:38），用在呼吁祷告、求祂差派工人到未接触族群中去的地方。',
      alternatives: '收割的主 · 禾场的主',
      rationale:
        '和合本马太福音 9:38 作“你们当求庄稼的主打发工人出去收他的庄稼”，中文祷告内容已经照此引用。农事的比喻（庄稼＝已经预备好回应的人）必须保留。'
    },
    {
      term: '祷告预备道路',
      english: 'prayer prepares the way',
      definition:
        '这一信念是：在工人到达之前，代祷就已经为福音的突破预备了属灵的条件——呼应“预备主的道”。',
      alternatives: '祷告开路 · 祷告铺平道路',
      rationale:
        '“预备……道”是和合本以赛亚书 40:3 和马太福音 3:3 的措辞，中文读者一听就能听出圣经的回声，这正是这句话要达到的效果。'
    },
    {
      term: '心灵语言',
      english: 'heart language',
      definition:
        '一个人的第一语言——他思考和感受时所用的那一种。福音和门训必须用这种语言进行才会真正有效；它不同于官方语言或通商语言。',
      alternatives: '母语 · 本族语言',
      rationale:
        '“母语”在中文里通常只指出生时所学的语言，而这个术语要说的是情感和属灵上的归属，所以保留“心灵语言”这个更贴近原意的说法。目前还没有任何产品用到这个词，是审核者最值得复核的一条。'
    },
    {
      term: '祷告事项',
      english: 'prayer points',
      definition:
        'DOXA 每天发给代祷者、针对具体族群的祷告内容——以圣经为中心，与工场实况相连，不同于一般的灵修材料。',
      alternatives: '祷告要点 · 祷告提示 · 祷告指引',
      rationale:
        '同一个中文文件里本来并存着四种说法，“祷告事项”出现得最多，现已统一。“每日祷告指南”保留给整份指南（daily prayer guide），与其中的单条祷告事项区分开。'
    },
    {
      term: '认领',
      english: 'adopt (a people group)',
      definition:
        '由教会带领的长期承诺——祷告、奉献并差派，使某一个未接触族群开始有福音可及性。这是宣教上的承担，不是家事法上的收养。',
      alternatives: '领养 · 收养 · 认养',
      rationale:
        '“认领”说的是主动承担责任，正是这个词要表达的意思。“领养”和“收养”在中文里专指收养儿女，会把整件事读成家庭关系。祷告应用、1040 地图和认领证书都已统一用“认领”。'
    },
    {
      term: '我们献给耶稣的礼物',
      english: 'our gift to Jesus',
      definition: '整件事的定位：到 2033 年接触每一个族群，作为教会共同献上的敬拜——是献祭式的，不是交易式的。',
      alternatives: '我们给耶稣的礼物 · 献给耶稣的供物',
      rationale:
        '“献给”带出献祭和敬拜的语气，单说“给”则显得像交易，这正是葡萄牙语审核者从 dádiva 改到 oferta 时所把握的分别。'
    },
    {
      term: '世界神召会团契（WAGF）',
      english: 'World Assemblies of God Fellowship (WAGF)',
      definition: '创立并托管 DOXA 的全球团契。',
      alternatives: '世界神召会联会 · 全球神召会团契',
      rationale:
        '“神召会”是 Assemblies of God 在中文里的既定名称。英文缩写 WAGF 在各语言版本中一律保持不变。'
    },
    {
      term: '差派机构',
      english: 'sending agencies',
      definition:
        '招募、培训、支持并差派宣教士的机构。DOXA 与差派机构合作（截至 2026 年有 129 个隶属 WAGF 的机构），但不取代它们。',
      alternatives: '宣教机构 · 差会',
      rationale:
        '“差派”与认领证书的第三根支柱（祷告、奉献、差派）用同一个词，使这一组词彼此呼应。“差会”是中文里的传统说法，但没有点出“差派”这个动作。'
    },
    {
      term: '每日祷告',
      english: 'daily prayer (for a people group)',
      definition:
        '承诺每天为某一个未接触族群祷告，使用每日祷告指南。目标是每个族群有 100 位以上的每日代祷者。',
      alternatives: '日常祷告 · 定期祷告',
      rationale:
        '“每日”是有意的——是每一天的承诺，不是经常或偶尔祷告。祷告应用的每日祷告内容、每日祷告提醒、每日祷告更新都用这个词。'
    },
    {
      term: '各族、各方、各民、各国',
      english: 'every tribe, tongue, people, and nation',
      definition:
        '启示录 5:9 和 7:9 的异象，是这项使命的动力。四个名词各自指向人类多样性的一个面向。',
      alternatives: '各支派、各方言、各民族、各邦国 · 万族万民',
      rationale:
        '和合本启示录 5:9 作“从各族、各方、各民、各国中买了人来”，这是应用为中文取用经文的版本。此前草稿里的“各支派、各方言、各民族、各邦国”不属于任何一个中文译本。'
    }
  ]
}
