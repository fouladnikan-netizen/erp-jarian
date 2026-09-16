import { useEffect, useState } from 'react';

/**
 * Fill a companion Latin/code field from a Persian source until the operator
 * types in the companion field. Clearing the companion unlocks suggestions.
 */
export default function useSuggestedLatin(source, suggest) {
  const [locked, setLocked] = useState(false);
  const [value, setValue] = useState(() => suggest(source) || '');

  useEffect(() => {
    if (locked) return;
    setValue(suggest(source) || '');
  }, [source, locked, suggest]);

  const onChange = (next) => {
    setValue(next);
    setLocked(String(next || '').trim() !== '');
  };

  const reset = () => {
    setLocked(false);
    setValue('');
  };

  return { value, onChange, reset };
}
