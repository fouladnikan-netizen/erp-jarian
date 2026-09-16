import { Link } from 'react-router-dom';
import { withReturnParams } from './SmartBackButton';
import { tokenizeEntityMentions } from './entityMentions';
import './entity-mentions.css';

/**
 * Renders event / note text with clickable entity mentions (orders, companies).
 * Uses withReturnParams so SmartBackButton can restore prior context.
 */
export default function EntityMentionText({
  text,
  returnTo,
  returnName,
  companies,
  extraLabels,
  className = '',
}) {
  const tokens = tokenizeEntityMentions(text, { companies, extraLabels });

  return (
    <span className={`entity-mention-text${className ? ` ${className}` : ''}`}>
      {tokens.map((token, index) => {
        if (token.type !== 'link' || !token.path) {
          return <span key={`t-${index}`}>{token.value}</span>;
        }
        const to = withReturnParams(token.path, returnTo, returnName);
        const isCode = token.kind === 'order' || /^JR/i.test(token.value) || token.value.includes('/');
        return (
          <Link
            key={`l-${index}-${token.path}`}
            to={to}
            className={`entity-mention-link${isCode ? ' font-yekan' : ' font-meem'}`}
          >
            {token.value}
          </Link>
        );
      })}
    </span>
  );
}
