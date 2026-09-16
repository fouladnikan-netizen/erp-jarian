import { RatingInput, BooleanInput, TextInput } from './SurveyInputs';

/**
 * رندرر سؤال — سوئیچ روی type؛ بدون منطق ناوبری/وضعیت.
 */
export default function QuestionRenderer({
  question,
  value,
  onAnswer,
  disabled = false,
}) {
  if (!question) return null;

  switch (question.type) {
    case 'rating':
      return (
        <RatingInput
          value={value}
          onChange={onAnswer}
          min={question.validation?.min ?? 1}
          max={question.validation?.max ?? 5}
          disabled={disabled}
        />
      );
    case 'boolean':
      return (
        <BooleanInput
          value={value}
          onChange={onAnswer}
          disabled={disabled}
        />
      );
    case 'text':
      return (
        <TextInput
          value={value ?? ''}
          onChange={onAnswer}
          disabled={disabled}
        />
      );
    default:
      return (
        <p className="tanin-unsupported font-meem">
          نوع سؤال پشتیبانی نمی‌شود.
        </p>
      );
  }
}
