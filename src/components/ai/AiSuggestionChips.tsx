import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { getStorylineSuggestions, type StorylineSuggestion } from '../../services/aiService';
import { useAiStore } from '../../store/aiStore';
import { useUiStore } from '../../store/uiStore';

interface Props {
  novelId: string;
  episodeId?: string;
  onSelect: () => void;
}

export function AiSuggestionChips({ novelId, episodeId, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<StorylineSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const setDraft = useAiStore((state) => state.setDraft);
  const addToast = useUiStore((state) => state.addToast);

  const fetchSuggestions = async () => {
    if (loading) return;
    setLoading(true);
    try {
      setSuggestions(await getStorylineSuggestions(novelId, episodeId));
    } catch {
      addToast({ type: 'error', title: 'Suggestions unavailable', message: 'Could not get storyline ideas. Check your local model and try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!suggestions && !loading) {
    return <button type="button" onClick={() => void fetchSuggestions()} aria-label="ขอแนวคิด 3 แบบ" style={buttonStyle}><Sparkles size={13} /> ขอแนวคิด 3 แบบ</button>;
  }

  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {loading ? [0, 1, 2].map((index) => (
        <span key={index} aria-label="Loading suggestion" style={{ ...buttonStyle, width: 80, height: 26, opacity: 0.4 }} />
      )) : suggestions?.map((suggestion, index) => (
        <button
          key={`${index}-${suggestion.title}`}
          type="button"
          title={suggestion.prompt}
          onClick={() => { setDraft(suggestion.prompt); onSelect(); }}
          style={buttonStyle}
        >
          {suggestion.title}
        </button>
      ))}
      {!loading && <button type="button" onClick={() => void fetchSuggestions()} aria-label="Refresh storyline suggestions" title="Refresh" style={buttonStyle}><RefreshCw size={13} /></button>}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
  padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)',
  border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)',
  color: 'var(--color-text-secondary)', fontSize: '0.75rem', cursor: 'pointer',
};
