import { useState } from 'react'

const TOPICS = [
  { key: 'elements', label: '음양오행' },
  { key: 'ganzhi', label: '천간/지지' },
  { key: 'relations', label: '십성' },
  { key: 'hiddenStems', label: '지장간' },
  { key: 'interactions', label: '합충형파해' },
  { key: 'shinsal', label: '신살' },
] as const

const RELATION_TABS = [
  { key: 'same', label: '비겁' },
  { key: 'output', label: '식상' },
  { key: 'wealth', label: '재성' },
  { key: 'officer', label: '관성' },
  { key: 'resource', label: '인성' },
] as const

type GuideTopic = (typeof TOPICS)[number]['key']
type RelationTab = (typeof RELATION_TABS)[number]['key']
type ElementKey = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water'
type PolarityKey = 'Yang' | 'Yin'

const ELEMENT_NODES: Record<ElementKey, { x: number; y: number; label: string; className: string }> = {
  Wood: { x: 130, y: 30, label: '목(木)', className: 'guide-node-wood' },
  Fire: { x: 224, y: 100, label: '화(火)', className: 'guide-node-fire' },
  Earth: { x: 188, y: 212, label: '토(土)', className: 'guide-node-earth' },
  Metal: { x: 72, y: 212, label: '금(金)', className: 'guide-node-metal' },
  Water: { x: 36, y: 100, label: '수(水)', className: 'guide-node-water' },
}

const GENERATE_EDGES: Array<[ElementKey, ElementKey]> = [
  ['Wood', 'Fire'],
  ['Fire', 'Earth'],
  ['Earth', 'Metal'],
  ['Metal', 'Water'],
  ['Water', 'Wood'],
]

const CONTROL_EDGES: Array<[ElementKey, ElementKey]> = [
  ['Wood', 'Earth'],
  ['Earth', 'Water'],
  ['Water', 'Fire'],
  ['Fire', 'Metal'],
  ['Metal', 'Wood'],
]

function edgeLine(from: ElementKey, to: ElementKey, gap = 28) {
  const start = ELEMENT_NODES[from]
  const end = ELEMENT_NODES[to]
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length

  return {
    x1: start.x + ux * gap,
    y1: start.y + uy * gap,
    x2: end.x - ux * gap,
    y2: end.y - uy * gap,
  }
}

const ELEMENT_LABEL: Record<ElementKey, string> = {
  Wood: '목(木)',
  Fire: '화(火)',
  Earth: '토(土)',
  Metal: '금(金)',
  Water: '수(水)',
}

const POLARITY_LABEL: Record<PolarityKey, string> = {
  Yang: '양(陽)',
  Yin: '음(陰)',
}

const STEM_ELEMENT_ROWS: Array<{ stem: string; polarity: PolarityKey; element: ElementKey }> = [
  { stem: '갑(甲)', polarity: 'Yang', element: 'Wood' },
  { stem: '을(乙)', polarity: 'Yin', element: 'Wood' },
  { stem: '병(丙)', polarity: 'Yang', element: 'Fire' },
  { stem: '정(丁)', polarity: 'Yin', element: 'Fire' },
  { stem: '무(戊)', polarity: 'Yang', element: 'Earth' },
  { stem: '기(己)', polarity: 'Yin', element: 'Earth' },
  { stem: '경(庚)', polarity: 'Yang', element: 'Metal' },
  { stem: '신(辛)', polarity: 'Yin', element: 'Metal' },
  { stem: '임(壬)', polarity: 'Yang', element: 'Water' },
  { stem: '계(癸)', polarity: 'Yin', element: 'Water' },
]

const BRANCH_ELEMENT_ROWS: Array<{ branch: string; polarity: PolarityKey; element: ElementKey }> = [
  { branch: '자(子)', polarity: 'Yang', element: 'Water' },
  { branch: '축(丑)', polarity: 'Yin', element: 'Earth' },
  { branch: '인(寅)', polarity: 'Yang', element: 'Wood' },
  { branch: '묘(卯)', polarity: 'Yin', element: 'Wood' },
  { branch: '진(辰)', polarity: 'Yang', element: 'Earth' },
  { branch: '사(巳)', polarity: 'Yin', element: 'Fire' },
  { branch: '오(午)', polarity: 'Yang', element: 'Fire' },
  { branch: '미(未)', polarity: 'Yin', element: 'Earth' },
  { branch: '신(申)', polarity: 'Yang', element: 'Metal' },
  { branch: '유(酉)', polarity: 'Yin', element: 'Metal' },
  { branch: '술(戌)', polarity: 'Yang', element: 'Earth' },
  { branch: '해(亥)', polarity: 'Yin', element: 'Water' },
]

const BRANCH_META_BY_LABEL = BRANCH_ELEMENT_ROWS.reduce(
  (acc, row) => {
    acc[row.branch] = { polarity: row.polarity, element: row.element }
    return acc
  },
  {} as Record<string, { polarity: PolarityKey; element: ElementKey }>,
)

const HIDDEN_STEM_ROWS: Array<{
  branch: string
  parts: Array<{ stem: string; days: number }>
}> = [
  { branch: '자(子)', parts: [{ stem: '계(癸)', days: 20 }, { stem: '임(壬)', days: 10 }] },
  { branch: '축(丑)', parts: [{ stem: '기(己)', days: 18 }, { stem: '계(癸)', days: 9 }, { stem: '신(辛)', days: 3 }] },
  { branch: '인(寅)', parts: [{ stem: '갑(甲)', days: 16 }, { stem: '병(丙)', days: 7 }, { stem: '무(戊)', days: 7 }] },
  { branch: '묘(卯)', parts: [{ stem: '을(乙)', days: 20 }, { stem: '갑(甲)', days: 10 }] },
  { branch: '진(辰)', parts: [{ stem: '무(戊)', days: 18 }, { stem: '을(乙)', days: 9 }, { stem: '계(癸)', days: 3 }] },
  { branch: '사(巳)', parts: [{ stem: '병(丙)', days: 16 }, { stem: '무(戊)', days: 7 }, { stem: '경(庚)', days: 7 }] },
  { branch: '오(午)', parts: [{ stem: '정(丁)', days: 11 }, { stem: '기(己)', days: 9 }, { stem: '병(丙)', days: 10 }] },
  { branch: '미(未)', parts: [{ stem: '기(己)', days: 18 }, { stem: '정(丁)', days: 9 }, { stem: '을(乙)', days: 3 }] },
  { branch: '신(申)', parts: [{ stem: '경(庚)', days: 16 }, { stem: '임(壬)', days: 7 }, { stem: '무(戊)', days: 7 }] },
  { branch: '유(酉)', parts: [{ stem: '신(辛)', days: 20 }, { stem: '경(庚)', days: 10 }] },
  { branch: '술(戌)', parts: [{ stem: '무(戊)', days: 18 }, { stem: '신(辛)', days: 9 }, { stem: '정(丁)', days: 3 }] },
  { branch: '해(亥)', parts: [{ stem: '임(壬)', days: 16 }, { stem: '갑(甲)', days: 7 }, { stem: '무(戊)', days: 7 }] },
]

const STEM_HANJA_TO_ELEMENT: Record<string, ElementKey> = {
  甲: 'Wood',
  乙: 'Wood',
  丙: 'Fire',
  丁: 'Fire',
  戊: 'Earth',
  己: 'Earth',
  庚: 'Metal',
  辛: 'Metal',
  壬: 'Water',
  癸: 'Water',
}

function stemElementFromLabel(stemLabel: string): ElementKey {
  const hanja = stemLabel.match(/[甲乙丙丁戊己庚辛壬癸]/)?.[0]
  if (!hanja) return 'Earth'
  return STEM_HANJA_TO_ELEMENT[hanja]
}

const STEM_INTERACTION_RULES: Array<{
  kind: string
  check: string
  targets: string
  effect: string
}> = [
  {
    kind: '천간합(天干合)',
    check: '정해진 5쌍 매칭 여부 확인',
    targets: '甲己, 乙庚, 丙辛, 丁壬, 戊癸',
    effect: '조건 충족 시 합화 방향: 토, 금, 수, 목, 화',
  },
  {
    kind: '천간충(天干沖)',
    check: '천간 인덱스 차이 6 확인',
    targets: '甲庚, 乙辛, 丙壬, 丁癸',
    effect: '충돌 관계로 상극 긴장 발생',
  },
]

const BRANCH_PAIR_RULES: Array<{
  kind: string
  check: string
  targets: string
  effect: string
}> = [
  {
    kind: '육합(六合)',
    check: '정해진 6쌍 매칭',
    targets: '子丑, 寅亥, 卯戌, 辰酉, 巳申, 午未',
    effect: '결속/결합 성향 강화',
  },
  {
    kind: '충(沖)',
    check: '지지 인덱스 차이 6',
    targets: '자오, 축미, 인신, 묘유, 진술, 사해',
    effect: '정면 충돌로 변화·이동성 증가',
  },
  {
    kind: '파(破)',
    check: '정해진 6쌍 매칭',
    targets: '子酉, 丑辰, 寅亥, 卯午, 巳申, 未戌',
    effect: '균열·불안정 요소 발생',
  },
  {
    kind: '해(害)',
    check: '정해진 6쌍 매칭',
    targets: '子未, 丑午, 寅巳, 卯辰, 申亥, 酉戌',
    effect: '보이지 않는 소모·마찰',
  },
]

const BRANCH_GROUP_RULES: Array<{
  kind: string
  check: string
  targets: string
  effect: string
}> = [
  {
    kind: '형(刑)',
    check: '3지지/특수 조합 매칭',
    targets: '寅巳申, 丑戌未, 子卯 + 자형(辰午酉亥)',
    effect: '압박·구속 성향, 반복 갈등',
  },
  {
    kind: '방합(方合)',
    check: '계절 3지지 완성 여부',
    targets: '寅卯辰(목), 巳午未(화), 申酉戌(금), 亥子丑(수)',
    effect: '국면 강화, 계절 기운 집중',
  },
  {
    kind: '삼합(三合)',
    check: '삼합 3지지 완성 여부',
    targets: '寅午戌(화), 亥卯未(목), 申子辰(수), 巳酉丑(금)',
    effect: '강한 결속, 오행 응집력 상승',
  },
]

const SHINSAL_GROUPS: Array<{
  basis: string
  stars: string[]
  target: string
  match: string
}> = [
  {
    basis: '연지/일지 기준',
    stars: ['도화살', '역마살', '원진살', '귀문관살'],
    target: '기준 지지를 규칙 맵에 대입해 대상 지지를 계산',
    match: '계산된 대상 지지가 다른 기둥 지지에 있는지 확인',
  },
  {
    basis: '일간 기준',
    stars: ['천을귀인', '문창귀인', '학당귀인', '양인살'],
    target: '일간 매핑표로 대상 지지를 계산',
    match: '4개 지지에서 대상 지지 일치 여부 탐색',
  },
  {
    basis: '월지 기준',
    stars: ['천덕귀인', '월덕귀인'],
    target: '월지 기준으로 대상 지지/천간 계산',
    match: '4주 간지에서 대상 간지 일치 여부 확인',
  },
  {
    basis: '일주 기준',
    stars: ['공망', '괴강살'],
    target: '공망은 일간/일지로 2개 공망 지지 계산, 괴강은 특정 일주 여부 확인',
    match: '공망 지지는 다른 기둥 지지 매칭, 괴강은 일주 자체 판정',
  },
  {
    basis: '연지 기준',
    stars: ['백호살'],
    target: '연지 매핑표로 대상 지지를 계산',
    match: '다른 기둥 지지와 매칭 여부 확인',
  },
]

const RELATION_INFO: Record<
  RelationTab,
  {
    title: string
    summary: string
    relationRule: string
    flowSymbol: string
    flowLabel: string
    samePolarity: { name: string; keyword: string }
    oppositePolarity: { name: string; keyword: string }
    note: string
  }
> = {
  same: {
    title: '비겁(比劫)',
    summary: '일간과 같은 오행에서 나오는 관계로, 자존감과 경쟁 의식이 함께 작동합니다.',
    relationRule: '일간과 동일 오행',
    flowSymbol: '=',
    flowLabel: '일간과 대상 오행이 동일',
    samePolarity: { name: '비견(比肩)', keyword: '협력, 자존, 주체성' },
    oppositePolarity: { name: '겁재(劫財)', keyword: '경쟁, 분배, 동료 압박' },
    note: '강해지면 자기주도·경쟁성 강화, 과하면 충돌/소모로 이어질 수 있습니다.',
  },
  output: {
    title: '식상(食傷)',
    summary: '일간이 생하는 오행 관계로, 표현력과 생산성이 바깥으로 발산되는 축입니다.',
    relationRule: '일간이 생하는 오행',
    flowSymbol: '생 →',
    flowLabel: '일간이 대상 오행을 생함',
    samePolarity: { name: '식신(食神)', keyword: '생산, 안정적 표현, 완성' },
    oppositePolarity: { name: '상관(傷官)', keyword: '돌파, 비판, 창의 발산' },
    note: '강하면 생산성과 표현력이 올라가고, 과하면 에너지 분산이 커질 수 있습니다.',
  },
  wealth: {
    title: '재성(財星)',
    summary: '일간이 극하는 오행 관계로, 자원 운용과 현실 성과를 다루는 실무 축입니다.',
    relationRule: '일간이 극하는 오행',
    flowSymbol: '극 →',
    flowLabel: '일간이 대상 오행을 극함',
    samePolarity: { name: '편재(偏財)', keyword: '유동 자원, 확장, 기회 포착' },
    oppositePolarity: { name: '정재(正財)', keyword: '고정 자원, 관리, 누적' },
    note: '강하면 실행력과 성과 지향이 높아지고, 과하면 부담/소진이 늘 수 있습니다.',
  },
  officer: {
    title: '관성(官星)',
    summary: '일간을 극하는 오행 관계로, 규범과 책임, 외부 압력에 대응하는 축입니다.',
    relationRule: '일간을 극하는 오행',
    flowSymbol: '← 극',
    flowLabel: '대상 오행이 일간을 극함',
    samePolarity: { name: '편관(偏官)', keyword: '압박, 결단, 돌파' },
    oppositePolarity: { name: '정관(正官)', keyword: '규범, 직무, 책임' },
    note: '적절하면 질서와 성장을 돕고, 과하면 압박·긴장감이 높아질 수 있습니다.',
  },
  resource: {
    title: '인성(印星)',
    summary: '일간을 생하는 오행 관계로, 보호·학습·회복을 담당하는 지원 축입니다.',
    relationRule: '일간을 생하는 오행',
    flowSymbol: '← 생',
    flowLabel: '대상 오행이 일간을 생함',
    samePolarity: { name: '편인(偏印)', keyword: '직관, 응용, 변칙' },
    oppositePolarity: { name: '정인(正印)', keyword: '학습, 보호, 지원' },
    note: '강하면 안정성과 학습력이 좋고, 과하면 의존성/지연이 생길 수 있습니다.',
  },
}

export default function CalculationGuide() {
  const [topic, setTopic] = useState<GuideTopic>('elements')

  return (
    <div className="guide-page">
      <div className="guide-topic-bar">
        <div className="guide-topic-tabs" role="tablist" aria-label="계산 원리 항목">
          {TOPICS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={topic === item.key}
              className={`guide-topic-tab${topic === item.key ? ' is-active' : ''}`}
              onClick={() => setTopic(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="section guide-section guide-topic-panel">
        {topic === 'ganzhi' && (
          <>
            <h3>천간/지지</h3>
            <p className="guide-paragraph">
              천간과 지지를 오행/음양 기준으로 정리한 표입니다.
            </p>
            <div className="guide-grid guide-grid-2">
              <div className="guide-card">
                <h4>천간: 오행 + 음양</h4>
                <table className="guide-table guide-table-center">
                  <thead>
                    <tr>
                      <th>천간</th>
                      <th>오행</th>
                      <th>음양</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STEM_ELEMENT_ROWS.map((row) => (
                      <tr key={row.stem} className={`guide-row-${row.element.toLowerCase()}`}>
                        <td>
                          <span className={`guide-ganzhi-tag guide-ganzhi-tag-${row.element.toLowerCase()} guide-ganzhi-tag-${row.polarity.toLowerCase()}`}>
                            <span className="guide-ganzhi-text">{row.stem}</span>
                            <span className={`guide-ganzhi-polarity-badge guide-ganzhi-polarity-badge-${row.polarity.toLowerCase()}`}>
                              {row.polarity === 'Yang' ? '陽' : '陰'}
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className={`guide-element-chip guide-element-chip-${row.element.toLowerCase()}`}>
                            {ELEMENT_LABEL[row.element]}
                          </span>
                        </td>
                        <td>
                          <span className={`guide-polarity guide-polarity-${row.polarity.toLowerCase()}`}>
                            {POLARITY_LABEL[row.polarity]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="guide-card">
                <h4>지지: 오행 + 음양</h4>
                <table className="guide-table guide-table-center">
                  <thead>
                    <tr>
                      <th>지지</th>
                      <th>오행</th>
                      <th>음양</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BRANCH_ELEMENT_ROWS.map((row) => (
                      <tr key={row.branch} className={`guide-row-${row.element.toLowerCase()}`}>
                        <td>
                          <span className={`guide-ganzhi-tag guide-ganzhi-tag-${row.element.toLowerCase()} guide-ganzhi-tag-${row.polarity.toLowerCase()}`}>
                            <span className="guide-ganzhi-text">{row.branch}</span>
                            <span className={`guide-ganzhi-polarity-badge guide-ganzhi-polarity-badge-${row.polarity.toLowerCase()}`}>
                              {row.polarity === 'Yang' ? '陽' : '陰'}
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className={`guide-element-chip guide-element-chip-${row.element.toLowerCase()}`}>
                            {ELEMENT_LABEL[row.element]}
                          </span>
                        </td>
                        <td>
                          <span className={`guide-polarity guide-polarity-${row.polarity.toLowerCase()}`}>
                            {POLARITY_LABEL[row.polarity]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {topic === 'elements' && (
          <>
            <h3>음양오행</h3>
            <p className="guide-paragraph">
              상생(相生)과 상극(相剋) 흐름을 시각적으로 보여줍니다.
            </p>
            <div className="guide-grid guide-grid-2">
              <div className="guide-card">
                <h4>상생(相生) 순환도</h4>
                <svg className="guide-diagram" viewBox="0 0 260 260" role="img" aria-label="상생 순환도">
                  <defs>
                    <marker id="arrow-generate" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" className="guide-arrow-generate" />
                    </marker>
                  </defs>
                  {GENERATE_EDGES.map(([from, to]) => {
                    const line = edgeLine(from, to)
                    return (
                      <line
                        key={`${from}-${to}`}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        className="guide-diagram-edge guide-diagram-edge-generate"
                        markerEnd="url(#arrow-generate)"
                      />
                    )
                  })}
                  {(Object.keys(ELEMENT_NODES) as ElementKey[]).map((key) => (
                    <g key={key}>
                      <circle
                        cx={ELEMENT_NODES[key].x}
                        cy={ELEMENT_NODES[key].y}
                        r="22"
                        className={`guide-diagram-node ${ELEMENT_NODES[key].className}`}
                      />
                      <text x={ELEMENT_NODES[key].x} y={ELEMENT_NODES[key].y} className="guide-diagram-label">
                        {ELEMENT_NODES[key].label}
                      </text>
                    </g>
                  ))}
                </svg>
                <p className="guide-diagram-caption">목 → 화 → 토 → 금 → 수 → 목</p>
              </div>
              <div className="guide-card">
                <h4>상극(相剋) 관계도</h4>
                <svg className="guide-diagram" viewBox="0 0 260 260" role="img" aria-label="상극 관계도">
                  <defs>
                    <marker id="arrow-control" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" className="guide-arrow-control" />
                    </marker>
                  </defs>
                  {CONTROL_EDGES.map(([from, to]) => {
                    const line = edgeLine(from, to)
                    return (
                      <line
                        key={`${from}-${to}`}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        className="guide-diagram-edge guide-diagram-edge-control"
                        markerEnd="url(#arrow-control)"
                      />
                    )
                  })}
                  {(Object.keys(ELEMENT_NODES) as ElementKey[]).map((key) => (
                    <g key={key}>
                      <circle
                        cx={ELEMENT_NODES[key].x}
                        cy={ELEMENT_NODES[key].y}
                        r="22"
                        className={`guide-diagram-node ${ELEMENT_NODES[key].className}`}
                      />
                      <text x={ELEMENT_NODES[key].x} y={ELEMENT_NODES[key].y} className="guide-diagram-label">
                        {ELEMENT_NODES[key].label}
                      </text>
                    </g>
                  ))}
                </svg>
                <p className="guide-diagram-caption">목극토, 토극수, 수극화, 화극금, 금극목</p>
              </div>
            </div>
            <div className="guide-formula-block">
              <p className="guide-formula">
                일간 기준 분류: 비겁(같은 오행), 식상(내가 생함), 재성(내가 극함), 관성(나를 극함), 인성(나를 생함)
              </p>
            </div>
            <div className="guide-topic-jump">
              <p className="guide-topic-jump-text">
                십성은 음양오행 관계를 일간 기준으로 해석하는 응용 항목입니다.
              </p>
              <button
                type="button"
                className="guide-topic-jump-button"
                onClick={() => setTopic('relations')}
              >
                십성 탭으로 이동
              </button>
            </div>
          </>
        )}

        {topic === 'relations' && (
          <>
            <h3>십성</h3>
            <p className="guide-paragraph">
              일간을 기준으로 한 오행 관계를 비겁·식상·재성·관성·인성 다섯 축으로 펼쳐 설명합니다.
            </p>
            <section className="guide-relation-card" aria-label="비겁 재성 인성 설명">
              <h4>십성 판정 흐름</h4>
              <div className="guide-relation-legend" aria-label="생극 기호 안내">
                <span className="guide-relation-legend-chip">생 → : 내가 생함</span>
                <span className="guide-relation-legend-chip">← 생 : 나를 생함</span>
                <span className="guide-relation-legend-chip">극 → : 내가 극함</span>
                <span className="guide-relation-legend-chip">← 극 : 나를 극함</span>
                <span className="guide-relation-legend-chip">= : 동일 오행</span>
              </div>
              <div className="guide-relation-list">
                {RELATION_TABS.map((item) => {
                  const info = RELATION_INFO[item.key]
                  return (
                    <article key={item.key} className={`guide-relation-content guide-relation-content-${item.key}`}>
                      <p className="guide-relation-title">{info.title}</p>
                      <p className="guide-relation-summary">{info.summary}</p>
                      <div className="guide-relation-visual">
                        <span className="guide-relation-node">일간</span>
                        <span className={`guide-relation-connector guide-relation-connector-${item.key}`}>{info.flowSymbol}</span>
                        <span className="guide-relation-node">대상 오행</span>
                      </div>
                      <p className="guide-relation-visual-caption">{info.flowLabel}</p>
                      <div className="guide-relation-flowline">
                        <span className="guide-relation-flow-chip">1. 오행 관계: {info.relationRule}</span>
                        <span className="guide-relation-flow-arrow">→</span>
                        <span className="guide-relation-flow-chip">2. 음양 같음/다름 구분</span>
                      </div>
                      <div className="guide-tengod-grid">
                        <article className="guide-tengod-card">
                          <p className="guide-tengod-criterion">음양 같음</p>
                          <p className="guide-tengod-name">{info.samePolarity.name}</p>
                          <p className="guide-tengod-desc">{info.samePolarity.keyword}</p>
                        </article>
                        <article className="guide-tengod-card">
                          <p className="guide-tengod-criterion">음양 다름</p>
                          <p className="guide-tengod-name">{info.oppositePolarity.name}</p>
                          <p className="guide-tengod-desc">{info.oppositePolarity.keyword}</p>
                        </article>
                      </div>
                      <p className="guide-relation-note">{info.note}</p>
                    </article>
                  )
                })}
              </div>
              <div className="guide-relation-matrix-wrap">
                <p className="guide-relation-matrix-title">십성 한눈에 보기</p>
                <table className="guide-table guide-table-center guide-relation-matrix">
                  <thead>
                    <tr>
                      <th>오행 관계</th>
                      <th>생극 흐름</th>
                      <th>음양 같음</th>
                      <th>음양 다름</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RELATION_TABS.map((item) => {
                      const info = RELATION_INFO[item.key]
                      return (
                        <tr key={item.key}>
                          <td>{info.title}</td>
                          <td>
                            <div className="guide-relation-visual guide-relation-visual-inline">
                              <span className="guide-relation-node">일간</span>
                              <span className={`guide-relation-connector guide-relation-connector-${item.key}`}>{info.flowSymbol}</span>
                              <span className="guide-relation-node">대상 오행</span>
                            </div>
                          </td>
                          <td>{info.samePolarity.name}</td>
                          <td>{info.oppositePolarity.name}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {topic === 'hiddenStems' && (
          <>
            <h3>지장간</h3>
            <p className="guide-paragraph">
              지장간은 각 지지에 배치된 천간 순서를 그대로 유지하고, 각 천간의 일수를 한 막대 안에서 함께 표시했습니다.
              각 지지는 한 줄 막대로 표시하고, 천간과 일수만 보여줍니다.
            </p>
            <div className="hidden-chart-list">
              {HIDDEN_STEM_ROWS.map((row) => (
                <article key={row.branch} className={`hidden-chart-item guide-row-${(BRANCH_META_BY_LABEL[row.branch]?.element ?? 'Earth').toLowerCase()}`}>
                  <div className="hidden-chart-line">
                    <div className="hidden-chart-head">
                      <h4>{row.branch}</h4>
                      <div className="hidden-chart-meta">
                        <span className={`guide-polarity guide-polarity-${(BRANCH_META_BY_LABEL[row.branch]?.polarity ?? 'Yang').toLowerCase()}`}>
                          {POLARITY_LABEL[BRANCH_META_BY_LABEL[row.branch]?.polarity ?? 'Yang']}
                        </span>
                        <span className={`guide-element-chip guide-element-chip-${(BRANCH_META_BY_LABEL[row.branch]?.element ?? 'Earth').toLowerCase()}`}>
                          {ELEMENT_LABEL[BRANCH_META_BY_LABEL[row.branch]?.element ?? 'Earth']}
                        </span>
                      </div>
                    </div>
                    <div className="hidden-single-bar">
                      {row.parts.map((part) => {
                        const element = stemElementFromLabel(part.stem)
                        return (
                          <span
                            key={`${row.branch}-${part.stem}`}
                            className={`hidden-single-segment hidden-single-segment-${element.toLowerCase()}`}
                            style={{ width: `${(part.days / 30) * 100}%` }}
                            title={`${part.stem} ${part.days}일`}
                          >
                            {part.stem} {part.days}일
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="guide-formula-block">
              <p className="guide-formula">표기 방식: 지장간 순서대로 나열 + 해당 일수 표기 (예: 기(己) 18일)</p>
            </div>
          </>
        )}

        {topic === 'interactions' && (
          <>
            <h3>합충형파해</h3>
            <p className="guide-paragraph">
              네 기둥에서 뽑은 천간/지지를 2글자 조합과 3글자 조합으로 나눠 순서대로 판정합니다.
            </p>
            <div className="guide-interaction-flow" aria-label="합충형파해 판정 순서">
              <span className="guide-relation-flow-chip">1. 천간 4개 / 지지 4개 추출</span>
              <span className="guide-relation-flow-arrow">→</span>
              <span className="guide-relation-flow-chip">2. 2글자 조합: 합·충·파·해 확인</span>
              <span className="guide-relation-flow-arrow">→</span>
              <span className="guide-relation-flow-chip">3. 3글자 조합: 형·방합·삼합 확인</span>
            </div>
            <div className="guide-grid guide-grid-2 guide-interaction-grid">
              <div className="guide-card guide-interaction-card">
                <h4>천간 관계 (2글자)</h4>
                <div className="guide-interaction-list">
                  {STEM_INTERACTION_RULES.map((item) => (
                    <article key={item.kind} className="guide-interaction-item guide-interaction-item-stem">
                      <p className="guide-interaction-kind">{item.kind}</p>
                      <p className="guide-interaction-line"><span className="guide-interaction-label">판정 기준</span>{item.check}</p>
                      <p className="guide-interaction-line"><span className="guide-interaction-label">대상 조합</span>{item.targets}</p>
                      <p className="guide-interaction-line"><span className="guide-interaction-label">해석 포인트</span>{item.effect}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="guide-card guide-interaction-card">
                <h4>지지 관계 (2글자)</h4>
                <div className="guide-interaction-list">
                  {BRANCH_PAIR_RULES.map((item) => (
                    <article key={item.kind} className="guide-interaction-item guide-interaction-item-branch">
                      <p className="guide-interaction-kind">{item.kind}</p>
                      <p className="guide-interaction-line"><span className="guide-interaction-label">판정 기준</span>{item.check}</p>
                      <p className="guide-interaction-line"><span className="guide-interaction-label">대상 조합</span>{item.targets}</p>
                      <p className="guide-interaction-line"><span className="guide-interaction-label">해석 포인트</span>{item.effect}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
            <div className="guide-card guide-interaction-card">
              <h4>지지 관계 (3글자)</h4>
              <div className="guide-interaction-list guide-interaction-list-triple">
                {BRANCH_GROUP_RULES.map((item) => (
                  <article key={item.kind} className="guide-interaction-item guide-interaction-item-branch">
                    <p className="guide-interaction-kind">{item.kind}</p>
                    <p className="guide-interaction-line"><span className="guide-interaction-label">판정 기준</span>{item.check}</p>
                    <p className="guide-interaction-line"><span className="guide-interaction-label">대상 조합</span>{item.targets}</p>
                    <p className="guide-interaction-line"><span className="guide-interaction-label">해석 포인트</span>{item.effect}</p>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}

        {topic === 'shinsal' && (
          <>
            <h3>신살</h3>
            <p className="guide-paragraph">
              신살은 기준 축을 먼저 정한 뒤, 대상 간지를 계산하고 4주에서 매칭해 판정합니다.
            </p>
            <div className="guide-interaction-flow guide-shinsal-flow" aria-label="신살 판정 순서">
              <span className="guide-relation-flow-chip">1. 기준 축 선택 (연지/월지/일간/일주)</span>
              <span className="guide-relation-flow-arrow">→</span>
              <span className="guide-relation-flow-chip">2. 규칙 맵으로 대상 간지 계산</span>
              <span className="guide-relation-flow-arrow">→</span>
              <span className="guide-relation-flow-chip">3. 4주 간지와 매칭 여부 판정</span>
            </div>
            <div className="guide-shinsal-grid">
              {SHINSAL_GROUPS.map((item) => (
                <article key={item.basis} className="guide-shinsal-card">
                  <p className="guide-shinsal-basis">{item.basis}</p>
                  <div className="guide-shinsal-stars">
                    {item.stars.map((star) => (
                      <span key={`${item.basis}-${star}`} className="guide-shinsal-star-chip">{star}</span>
                    ))}
                  </div>
                  <p className="guide-shinsal-line"><span className="guide-interaction-label">대상 계산</span>{item.target}</p>
                  <p className="guide-shinsal-line"><span className="guide-interaction-label">매칭 확인</span>{item.match}</p>
                </article>
              ))}
            </div>
            <div className="guide-formula-block">
              <p className="guide-formula">12신살은 연지를 시작점으로 12지지를 순환 배치한 뒤, 해당 지지가 원국에 존재하는지 확인합니다.</p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
