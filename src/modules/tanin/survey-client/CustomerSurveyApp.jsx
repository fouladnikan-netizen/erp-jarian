import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSurveyById } from '../../../mockData/surveySchema';
import { toPersianDigits } from '../../nabz/dateUtils';
import useSurveyEngine from './useSurveyEngine';
import QuestionRenderer from './components/QuestionRenderer';
import './customer-survey.css';

/**
 * تجربه تمام‌صفحه نظرسنجی مشتری (Tanin Path A).
 * بدون سایدبار/هدر ERP — فقط موتور + رندرر.
 */
export default function CustomerSurveyApp() {
  const { surveyId } = useParams();
  const survey = getSurveyById(surveyId || 'mock-id');
  const engine = useSurveyEngine(survey);

  const {
    currentStep,
    currentQuestion,
    currentAnswer,
    total,
    progress,
    isLast,
    isSubmitted,
    error,
    canContinue,
    setAnswer,
    goNext,
    goBack,
  } = engine;

  useEffect(() => {
    document.title = survey?.config?.title
      ? `${survey.config.title} | جریان`
      : 'نظرسنجی | جریان';
  }, [survey?.config?.title]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (e.target?.tagName === 'TEXTAREA') return;
      if (isSubmitted) return;
      e.preventDefault();
      goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, isSubmitted]);

  if (isSubmitted) {
    return (
      <div className="tanin-survey" dir="rtl">
        <div className="tanin-survey__shell tanin-survey__shell--success">
          <span className="tanin-survey__success-icon" aria-hidden="true">
            <CheckCircle size={28} strokeWidth={1.75} />
          </span>
          <h1 className="tanin-survey__success-title font-meem">
            از وقتی که گذاشتید سپاسگزاریم.
          </h1>
          <p className="tanin-survey__success-msg font-meem">
            نظر شما به بهبود خدمات پترو فولاد نیکان کمک می‌کند.
          </p>
        </div>
      </div>
    );
  }

  const q = currentQuestion;

  return (
    <div className="tanin-survey" dir="rtl">
      <div className="tanin-survey__shell" key={q?.id || currentStep}>
        <header className="tanin-survey__progress">
          <div className="tanin-survey__progress-meta">
            <span className="tanin-survey__brand font-meem">
              {survey.config?.title || 'نظرسنجی'}
            </span>
            <span className="tanin-survey__step font-yekan">
              سؤال
              {' '}
              {toPersianDigits(currentStep + 1)}
              {' '}
              از
              {' '}
              {toPersianDigits(total)}
            </span>
          </div>
          <div
            className="tanin-survey__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span
              className="tanin-survey__bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        <main className="tanin-survey__main">
          <p className="tanin-survey__q-label font-meem">
            {q?.required ? (
              <span className="tanin-survey__req" aria-hidden="true">*</span>
            ) : null}
            {q?.text}
          </p>

          <QuestionRenderer
            question={q}
            value={currentAnswer}
            onAnswer={(value) => setAnswer(q.id, value)}
          />

          {error ? (
            <p className="tanin-survey__error font-meem" role="alert">
              {error}
            </p>
          ) : null}
        </main>

        <footer className="tanin-survey__foot">
          <button
            type="button"
            className="tanin-survey__btn tanin-survey__btn--ghost"
            onClick={goBack}
            disabled={currentStep === 0}
          >
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="font-meem">قبلی</span>
          </button>

          <button
            type="button"
            className="tanin-survey__btn tanin-survey__btn--primary"
            onClick={goNext}
            disabled={!canContinue && q?.required}
          >
            <span className="font-meem">
              {isLast ? 'ارسال' : 'ادامه'}
            </span>
            <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </footer>
      </div>
    </div>
  );
}
