import { useCallback, useMemo, useState } from 'react';

/**
 * موتور وضعیت نظرسنجی — جدا از لایه UI رندر سؤال.
 * @param {{ questions?: object[] }} survey
 */
export default function useSurveyEngine(survey) {
  const questions = survey?.questions || [];
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const total = questions.length;
  const currentQuestion = questions[currentStep] || null;
  const isLast = total > 0 && currentStep >= total - 1;
  const progress = total ? ((currentStep + 1) / total) * 100 : 0;

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  const validateQuestion = useCallback((question, value) => {
    if (!question) return 'سؤال نامعتبر است.';
    if (question.required) {
      if (value === undefined || value === null || value === '') {
        return 'پاسخ به این سؤال الزامی است.';
      }
    }
    if (question.type === 'rating' && value != null && value !== '') {
      const min = question.validation?.min ?? 1;
      const max = question.validation?.max ?? 5;
      const n = Number(value);
      if (!Number.isFinite(n) || n < min || n > max) {
        return `امتیاز باید بین ${min} و ${max} باشد.`;
      }
    }
    return '';
  }, []);

  const setAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError('');
  }, []);

  const canContinue = useMemo(() => {
    if (!currentQuestion) return false;
    return !validateQuestion(currentQuestion, answers[currentQuestion.id]);
  }, [currentQuestion, answers, validateQuestion]);

  const goNext = useCallback(() => {
    if (!currentQuestion) return false;
    const msg = validateQuestion(currentQuestion, answers[currentQuestion.id]);
    if (msg) {
      setError(msg);
      return false;
    }
    setError('');
    if (isLast) {
      setIsSubmitted(true);
      return true;
    }
    setCurrentStep((s) => Math.min(s + 1, total - 1));
    return true;
  }, [currentQuestion, answers, validateQuestion, isLast, total]);

  const goBack = useCallback(() => {
    setError('');
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setAnswers({});
    setIsSubmitted(false);
    setError('');
  }, []);

  return {
    currentStep,
    currentQuestion,
    currentAnswer,
    answers,
    total,
    progress,
    isLast,
    isSubmitted,
    error,
    canContinue,
    setAnswer,
    goNext,
    goBack,
    reset,
  };
}
