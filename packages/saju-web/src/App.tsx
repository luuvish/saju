import { useState, useCallback } from 'react'
import SajuForm from './components/SajuForm'
import type { SajuFormData } from './components/SajuForm'
import ResultDashboard from './components/ResultDashboard'
import CalculationGuide from './components/CalculationGuide'
import { calculate, type SajuResult, type SajuRequest, type Lang } from 'saju-lib'
import { invalidInputEffects } from './appInvalidState'

type AppPage = 'calculator' | 'guide'

export default function App() {
  const [result, setResult] = useState<SajuResult | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<Lang>('Ko')
  const [page, setPage] = useState<AppPage>('calculator')
  const handleInvalid = useCallback((message: string | null) => {
    const effects = invalidInputEffects(message)
    if (effects.stopLoading) setLoading(false)
    if (effects.clearResult) setResult(null)
    if (effects.clearError) setError(null)
  }, [])
  // setState 함수들은 React가 보장하는 안정적 참조이므로 deps가 비어 있어도 안전하다
  const handleSubmit = useCallback((formData: SajuFormData) => {
    setLoading(true)
    const formLang = formData.lang === 'en' ? 'En' : 'Ko'
    setLang(formLang as Lang)
    setName(formData.name ?? '')
    try {
      const req: SajuRequest = {
        date: formData.date,
        time: formData.time,
        calendar: (formData.calendar as SajuRequest['calendar']) ?? 'Solar',
        leapMonth: formData.leapMonth ?? false,
        gender: (formData.gender as SajuRequest['gender']) ?? 'Male',
        tz: formData.tz ?? 'Asia/Seoul',
        useLmt: formData.useLmt ?? false,
        longitude: formData.longitude ?? null,
        location: formData.location ?? null,
        daewonCount: formData.daewonCount ?? 10,
        monthYear: formData.monthYear ?? null,
        yearStart: formData.yearStart ?? null,
        yearCount: formData.yearCount ?? 3,
      }
      const calculated = calculate(req)
      setResult(calculated)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '계산에 실패했습니다'
      setError(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className={`container${page === 'guide' ? ' container-guide' : ''}`}>
      <header>
        <h1>사주팔자</h1>
        <p className="subtitle">四柱八字</p>
        <nav className="page-tabs" aria-label="페이지 전환">
          <button
            type="button"
            className={`page-tab${page === 'calculator' ? ' is-active' : ''}`}
            aria-pressed={page === 'calculator'}
            onClick={() => setPage('calculator')}
          >
            사주 계산
          </button>
          <button
            type="button"
            className={`page-tab${page === 'guide' ? ' is-active' : ''}`}
            aria-pressed={page === 'guide'}
            onClick={() => setPage('guide')}
          >
            계산 원리
          </button>
        </nav>
      </header>
      {page === 'calculator' ? (
        <>
          <SajuForm onSubmit={handleSubmit} onInvalid={handleInvalid} />
          {loading && (
            <div className="loading-indicator">
              <div className="spinner" />
              <span>계산 중...</span>
            </div>
          )}
          {error && (
            <div className="error-message">
              <h3>오류</h3>
              <p>{error}</p>
            </div>
          )}
          {result && !loading && <ResultDashboard result={result} lang={lang} name={name} />}
        </>
      ) : (
        <CalculationGuide />
      )}
    </div>
  )
}
