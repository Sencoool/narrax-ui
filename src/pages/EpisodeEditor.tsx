import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Sparkles, CheckCircle, AlertCircle, BookOpen, Maximize2,
  Upload, Eye, EyeOff, Trash2, History as HistoryIcon,
} from 'lucide-react';
import { TiptapEditor } from '../components/editor/TiptapEditor';
import { AiPanel } from '../components/ai/AiPanel';
import { TxtUploadModal } from '../components/novel/TxtUploadModal';
import { ToastContainer } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useEpisodeStore } from '../store/episodeStore';
import { useAiStore } from '../store/aiStore';
import { useUiStore } from '../store/uiStore';
import { useDebounce } from '../hooks/useDebounce';
import { episodeService } from '../services/episodeService';
import { ContextDrawer } from '../components/editor/ContextDrawer';
import { useNovelContext } from '../hooks/useNovelContext';
import { FocusMode } from '../components/editor/FocusMode';
import { CastSelector } from '../components/editor/CastSelector';
import { RevisionHistoryDrawer } from '../components/editor/RevisionHistoryDrawer';
import type { Editor } from '@tiptap/react';

const AUTOSAVE_DELAY = 2500; // 2.5s after last keystroke

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const map = {
    idle: null,
    saving: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
        <Spinner size={14} /> Saving…
      </span>
    ),
    saved: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-success)', fontSize: '0.8125rem' }}>
        <CheckCircle size={14} /> Saved
      </span>
    ),
    error: (
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-danger)', fontSize: '0.8125rem' }}>
        <AlertCircle size={14} /> Save failed
      </span>
    ),
  };
  return map[status] ?? null;
}

export default function EpisodeEditor() {
  const { novelId = '', episodeId = '' } = useParams<{ novelId: string; episodeId: string }>();
  const navigate = useNavigate();
  const isNew = episodeId === 'new';

  const [editor, setEditor] = useState<Editor | null>(null);

  const { activeEpisode, fetchEpisode, setActiveEpisode, deleteEpisode } = useEpisodeStore();
  const { openPanel, isPanelOpen } = useAiStore();
  const { addToast } = useUiStore();

  const [title, setTitle] = useState('');
  const [cast, setCast] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isSaving, setIsSaving] = useState(false);
  // Which episode the form is currently populated for — the loading spinner is
  // derived from it instead of being toggled synchronously inside an effect.
  const [loadedEpisodeId, setLoadedEpisodeId] = useState<string | null>(null);
  const isLoading = !isNew && loadedEpisodeId !== episodeId;
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const novelContext = useNovelContext(novelId);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  // Bumped after a restore: TiptapEditor only reads `content` on mount, so the
  // key is what actually re-renders the restored text.
  const [contentKey, setContentKey] = useState(0);

  // Load existing episode and seed the form from it
  useEffect(() => {
    if (isNew || !episodeId) {
      setActiveEpisode(null);
      return;
    }

    let cancelled = false;

    fetchEpisode(episodeId)
      .then(() => {
        if (cancelled) return;
        // Seed from the store: fetchEpisode resolves even when the request
        // failed, so only use the episode if it is the one we asked for.
        const episode = useEpisodeStore.getState().activeEpisode;
        if (!episode || episode.id !== episodeId) return;
        setTitle(episode.title);
        setIsPublished(episode.isPublished);
        setCast(episode.cast ?? []);
      })
      .catch(() => {
        if (!cancelled) addToast({ type: 'error', title: 'Failed to load episode' });
      })
      .finally(() => {
        // Marks the episode as resolved either way, so the spinner cannot hang
        if (!cancelled) setLoadedEpisodeId(episodeId);
      });

    return () => { cancelled = true; };
  }, [episodeId, isNew, fetchEpisode, setActiveEpisode, addToast]);

  // Autosave — debounced
  const performSave = useCallback(
    async (html: string) => {
      if (isNew || !episodeId || !title.trim()) return;
      setSaveStatus('saving');
      try {
        await episodeService.update(episodeId, { content: html, title, cast });
        setSaveStatus('saved');
        // Reset to idle after 3s
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch {
        setSaveStatus('error');
      }
    },
    [isNew, episodeId, title, cast],
  );

  const debouncedSave = useDebounce(performSave, AUTOSAVE_DELAY);

  const handleEditorChange = useCallback(
    (html: string) => {
      if (!isNew) debouncedSave(html);
    },
    [isNew, debouncedSave],
  );

  // Manual save (for new episodes)
  const handleManualSave = async () => {
    if (!title.trim()) {
      addToast({ type: 'warning', title: 'Title required', message: 'Please enter an episode title before saving.' });
      return;
    }

    const content = editor?.getHTML() ?? '';

    setIsSaving(true);
    try {
      if (isNew) {
        const created = await episodeService.create(novelId, {
          title: title.trim(),
          content,
          isPublished,
          cast,
        });
        addToast({ type: 'success', title: 'Episode created!' });
        navigate(`/writer/novel/${novelId}/episode/${created.id}`, { replace: true });
      } else {
        await episodeService.update(episodeId, {
          title: title.trim(),
          content,
          isPublished,
          cast,
        });
        setSaveStatus('saved');
        addToast({ type: 'success', title: 'Episode saved!' });
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch {
      addToast({ type: 'error', title: 'Save failed', message: 'Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cast change
  const handleCastChange = useCallback(
    async (newCast: string[]) => {
      setCast(newCast);
      if (!isNew && episodeId) {
        try {
          await episodeService.update(episodeId, { cast: newCast });
        } catch {
          addToast({ type: 'error', title: 'Failed to update cast' });
        }
      }
    },
    [isNew, episodeId, addToast],
  );

  const buildAiContext = useCallback(() => {
    const episodeOrder = activeEpisode?.order ?? 0;
    const pinned = novelContext.buildPinnedContext(episodeOrder);
    const editorText = editor?.getText() ?? '';
    const castContext = novelContext.buildEpisodeCastContext(cast, editorText, episodeOrder);
    return [pinned, castContext].filter(Boolean).join('\n\n');
  }, [novelContext, cast, editor, activeEpisode?.order]);

  // Delete episode
  const handleDelete = async () => {
    if (!episodeId) return;
    setIsDeleting(true);
    try {
      await deleteEpisode(episodeId);
      addToast({ type: 'success', title: 'Episode deleted' });
      navigate(`/writer/novel/${novelId}`, { replace: true });
    } catch {
      addToast({ type: 'error', title: 'Failed to delete episode', message: 'Please try again.' });
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  // Called by TxtUploadModal after successful upload
  const handleUploaded = (episodeId: string, openAi?: boolean) => {
    navigate(`/writer/novel/${novelId}/episode/${episodeId}`, { replace: true });
    if (openAi) openPanel();
  };

  // After a revision restore: re-read the episode, then remount the editor so the
  // restored text is what the writer sees.
  const handleRevisionRestored = useCallback(async () => {
    if (isNew || !episodeId) return;
    await fetchEpisode(episodeId);
    const episode = useEpisodeStore.getState().activeEpisode;
    if (episode && episode.id === episodeId) {
      setTitle(episode.title);
      setIsPublished(episode.isPublished);
      setCast(episode.cast ?? []);
    }
    setContentKey((key) => key + 1);
    setSaveStatus('idle');
  }, [isNew, episodeId, fetchEpisode]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
        <Spinner size={36} />
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 64px)',
          padding: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '1400px',
            gap: '0.75rem',
          }}
        >
          {/* Header Row (Title & Controls) hovering above the boxes, spanning full width */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <Link to={`/writer/novel/${novelId}`} aria-label="Back to novel" id="episode-back-btn">
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-strong)',
                    backgroundColor: 'var(--color-bg-base)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    flexShrink: 0,
                  }}
                >
                  <ArrowLeft size={16} />
                </button>
              </Link>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Episode Title"
                id="episode-title-input"
                style={{
                  flex: 1,
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                <SaveStatusIndicator status={saveStatus} />
                <button
                  onClick={() => setIsPublished((p) => !p)}
                  id="episode-publish-toggle"
                  title={isPublished ? 'Published — click to unpublish' : 'Draft — click to publish'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid',
                    borderColor: isPublished ? 'var(--color-success)' : 'var(--color-border)',
                    backgroundColor: isPublished ? 'var(--color-success-bg)' : 'var(--color-bg-base)',
                    color: isPublished ? 'var(--color-success)' : 'var(--color-text-muted)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {isPublished ? <Eye size={13} /> : <EyeOff size={13} />}
                  {isPublished ? 'Published' : 'Draft'}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Upload size={14} />}
                  onClick={() => setUploadModalOpen(true)}
                  id="episode-upload-btn"
                >
                  Import .txt
                </Button>
                <CastSelector
                  characters={novelContext.characters}
                  cast={cast}
                  onCastChange={handleCastChange}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<BookOpen size={14} />}
                  onClick={() => setIsContextDrawerOpen(true)}
                  id="episode-context-btn"
                  style={{ color: novelContext.pinnedItems.length > 0 ? 'var(--color-violet-600)' : undefined }}
                >
                  Context{novelContext.pinnedItems.length > 0 ? ` (${novelContext.pinnedItems.length})` : ''}
                </Button>
                {!isNew && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<HistoryIcon size={14} />}
                    onClick={() => setIsHistoryOpen(true)}
                    id="episode-history-btn"
                    title="Saved versions of this episode"
                  >
                    History
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon
                  leftIcon={<Maximize2 size={14} />}
                  onClick={() => setIsFocusMode(true)}
                  id="episode-focus-btn"
                  title="Focus Mode (F11)"
                />
                <Button
                  variant="ai"
                  size="sm"
                  leftIcon={<Sparkles size={14} />}
                  onClick={openPanel}
                  id="episode-ai-btn"
                >
                  AI Write
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Save size={14} />}
                  loading={isSaving}
                  onClick={handleManualSave}
                  id="episode-save-btn"
                >
                  {isNew ? 'Create' : 'Save'}
                </Button>
                {!isNew && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => setDeleteModalOpen(true)}
                    id="episode-delete-btn"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>

          {/* Main Content Area (Editor + AI Panel) */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              gap: '1.5rem',
            }}
          >
            {/* Left Column: Editor Box */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--color-bg-base)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                minHeight: '600px',
                height: 'calc(100vh - 160px)',
              }}
            >
              <TiptapEditor
                content={activeEpisode?.content ?? ''}
                onChange={handleEditorChange}
                onEditorReady={setEditor}
                placeholder="Begin your story here… Let the words flow across the page."
                className="h-full"
                key={contentKey}
              />
            </div>

          {/* Right Column: AI Panel */}
          {isPanelOpen && (
            <div
              style={{
                width: '380px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--color-bg-base)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                animation: 'slide-in-right var(--transition-normal) ease-out',
                minHeight: '600px',
                height: 'calc(100vh - 160px)',
              }}
            >
              <AiPanel
                novelId={novelId}
                episodeId={isNew ? undefined : episodeId}
                editor={editor}
                buildPinnedContext={buildAiContext}
              />
            </div>
          )}
          </div>
        </div>
      </div>
      {/* Focus Mode */}
      <FocusMode
        isOpen={isFocusMode}
        onClose={() => setIsFocusMode(false)}
        onOpenAiPanel={openPanel}
        wordCount={editor?.storage?.characterCount?.words?.() ?? 0}
      >
        <TiptapEditor
          content={activeEpisode?.content ?? ''}
          onChange={handleEditorChange}
          onEditorReady={setEditor}
          placeholder="Begin your story here… Let the words flow across the page."
          className="h-full"
          key={contentKey}
          novelId={novelId}
          episodeId={isNew ? undefined : episodeId}
        />
      </FocusMode>

      {/* Revision History Drawer */}
      <RevisionHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        episodeId={isNew ? undefined : episodeId}
        onRestored={handleRevisionRestored}
      />

      {/* Context Drawer */}
      <ContextDrawer
        isOpen={isContextDrawerOpen}
        onClose={() => setIsContextDrawerOpen(false)}
        novelContext={novelContext}
      />


      {/* .txt Upload Modal — extracted component */}
      <TxtUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        novelId={novelId}
        onUploaded={handleUploaded}
      />

      {/* Delete Episode Confirm Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => !isDeleting && setDeleteModalOpen(false)}
        title="Delete Episode"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              id="delete-episode-cancel-btn"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              loading={isDeleting}
              onClick={handleDelete}
              id="delete-episode-confirm-btn"
            >
              Delete Episode
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Are you sure you want to delete{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>
              &ldquo;{title || 'this episode'}&rdquo;
            </strong>
            ? This action <strong>cannot be undone</strong> and all content will be permanently lost.
          </p>
        </div>
      </Modal>

      {/* Global toasts for this layout */}
      <ToastContainer />
    </>
  );
}
