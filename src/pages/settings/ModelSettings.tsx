import { useState, useEffect } from 'react';
import {
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Key,
  Globe,
  RefreshCw,
  Zap,
  Eye,
  EyeOff,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { useModelStore } from '../../store/modelStore';
import { useAiStore } from '../../store/aiStore';
import { userModelService } from '../../services/userModelService';
import { useUiStore } from '../../store/uiStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { getErrorMessage } from '../../utils/errors';
import type { ModelProvider } from '../../types/model';

interface ProviderOption {
  id: ModelProvider;
  name: string;
  badge: 'Cloud' | 'Local';
  presets: string[];
  defaultUrl?: string;
  requiresKey: boolean;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    badge: 'Cloud',
    presets: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4-turbo'],
    requiresKey: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    badge: 'Cloud',
    presets: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    requiresKey: true,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    badge: 'Cloud',
    presets: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    requiresKey: true,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    badge: 'Cloud',
    presets: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
    requiresKey: true,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    badge: 'Local',
    presets: ['llama3.2', 'deepseek-r1', 'qwen2.5', 'mistral'],
    defaultUrl: 'http://localhost:11434',
    requiresKey: false,
  },
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    badge: 'Local',
    presets: [],
    defaultUrl: 'http://localhost:1234/v1',
    requiresKey: false,
  },
];

export function ModelSettings() {
  const setSelectedModelId = useAiStore((state) => state.setSelectedModelId);
  const {
    models,
    activeModel,
    isLoading,
    fetchModels,
    createModel,
    deleteModel,
    setDefaultModel,
    testConnection,
  } = useModelStore();
  const { addToast } = useUiStore();

  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>('openai');
  const [label, setLabel] = useState('');
  const [modelName, setModelName] = useState('gpt-4o');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [contextTokens, setContextTokens] = useState(8192);
  // No "set as default" control exists yet — default is switched from the model
  // list. Kept as a value (not state) so the create payload shape is unchanged.
  const isDefault = false;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingDraft, setIsTestingDraft] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; message?: string } | null>(null);

  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [isProbingOllama, setIsProbingOllama] = useState(false);
  const [detectedOllamaModels, setDetectedOllamaModels] = useState<string[]>([]);
  const [ollamaModels, setOllamaModels] = useState<Array<{ name: string; sizeBytes: number }>>([]);
  const [ollamaReachable, setOllamaReachable] = useState<boolean | null>(null);
  const [pullName, setPullName] = useState('');
  const [pullStatus, setPullStatus] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<number | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  const refreshOllama = async () => {
    const status = await userModelService.getOllamaStatus();
    setOllamaReachable(status.reachable);
    setOllamaBaseUrl(status.baseUrl);
    setOllamaModels(status.reachable ? await userModelService.getOllamaModels() : []);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshOllama().catch(() => setOllamaReachable(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handlePullOllama = async () => {
    if (!pullName.trim() || isPulling) return;
    setIsPulling(true);
    setPullStatus('Starting download…');
    setPullProgress(null);
    try {
      await userModelService.pullOllamaModel(pullName.trim(), (event) => {
        setPullStatus(event.status ?? 'Downloading…');
        setPullProgress(event.total && event.completed !== undefined ? Math.min(100, Math.round(event.completed / event.total * 100)) : null);
      });
      setPullName('');
      await refreshOllama();
      addToast({ type: 'success', title: 'Model ready', message: 'Ollama model download completed.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Model pull failed', message: getErrorMessage(error, 'Could not download model') });
    } finally {
      setIsPulling(false);
      setPullStatus(null);
      setPullProgress(null);
    }
  };

  const handleUseOllamaModel = async (name: string) => {
    try {
      const existing = models.find((model) => model.provider === 'ollama' && model.modelName === name);
      if (existing) await setDefaultModel(existing.id);
      else await createModel({ label: `Ollama · ${name}`, provider: 'ollama', modelName: name, baseUrl: ollamaBaseUrl, isDefault: true });
      setSelectedModelId(null);
      addToast({ type: 'success', title: 'Model selected', message: `${name} is ready for generation.` });
    } catch (error) {
      addToast({ type: 'error', title: 'Could not select model', message: getErrorMessage(error, 'Please try again') });
    }
  };

  const currentProviderConfig = PROVIDERS.find((p) => p.id === selectedProvider) ?? PROVIDERS[0];

  // Auto-fill defaults when provider changes
  const handleSelectProvider = (providerId: ModelProvider) => {
    setSelectedProvider(providerId);
    setTestResult(null);
    const cfg = PROVIDERS.find((p) => p.id === providerId);
    if (!cfg) return;

    if (cfg.presets.length > 0) {
      setModelName(cfg.presets[0]);
      setIsCustomModel(false);
    } else {
      setIsCustomModel(true);
      setModelName('');
    }

    if (cfg.defaultUrl) {
      setBaseUrl(cfg.defaultUrl);
    } else {
      setBaseUrl('');
    }

    if (!label || PROVIDERS.some((p) => label === p.name || label.startsWith(p.name))) {
      setLabel(cfg.name);
    }
  };

  // Probe local Ollama on localhost:11434
  const handleDetectOllama = async () => {
    setIsProbingOllama(true);
    try {
      const urlToTest = baseUrl || 'http://localhost:11434';
      const res = await userModelService.probeLocalOllama(urlToTest);
      if (res.success && res.models.length > 0) {
        setDetectedOllamaModels(res.models);
        setModelName(res.models[0]);
        addToast({
          type: 'success',
          title: 'Ollama Detected',
          message: `Found ${res.models.length} installed model(s)`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Ollama Unreachable',
          message: res.error || 'Could not connect to Ollama on ' + urlToTest,
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to probe local Ollama instance',
      });
    } finally {
      setIsProbingOllama(false);
    }
  };

  // Test draft connection
  const handleTestDraft = async () => {
    const finalModelName = isCustomModel ? customModelName.trim() : modelName;
    if (!finalModelName) {
      addToast({ type: 'warning', title: 'Model Name Required', message: 'Please select or enter a model name' });
      return;
    }

    setIsTestingDraft(true);
    setTestResult(null);
    try {
      const res = await testConnection({
        provider: selectedProvider,
        modelName: finalModelName,
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      });

      if (res.success) {
        setTestResult({ success: true, latencyMs: res.latencyMs, message: res.message });
        addToast({
          type: 'success',
          title: 'Connection Successful',
          message: `Connected in ${res.latencyMs}ms`,
        });
      } else {
        setTestResult({ success: false, latencyMs: res.latencyMs, message: res.error });
        addToast({
          type: 'error',
          title: 'Connection Failed',
          message: res.error || 'Check your credentials and endpoint',
        });
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Connection test failed');
      setTestResult({ success: false, latencyMs: 0, message: msg });
      addToast({ type: 'error', title: 'Connection Failed', message: msg });
    } finally {
      setIsTestingDraft(false);
    }
  };

  // Save new model
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalModelName = isCustomModel ? customModelName.trim() : modelName;

    if (!finalModelName) {
      addToast({ type: 'warning', title: 'Validation Error', message: 'Model name cannot be empty' });
      return;
    }

    if (currentProviderConfig.requiresKey && !apiKey.trim()) {
      addToast({ type: 'warning', title: 'Validation Error', message: 'API key is required for cloud providers' });
      return;
    }

    setIsSubmitting(true);
    try {
      await createModel({
        label: label.trim() || `${currentProviderConfig.name} (${finalModelName})`,
        provider: selectedProvider,
        modelName: finalModelName,
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
        isDefault,
        contextTokens,
      });

      addToast({
        type: 'success',
        title: 'Model Added',
        message: `${finalModelName} configured successfully`,
      });

      // Reset form
      setApiKey('');
      setTestResult(null);
      if (currentProviderConfig.presets.length > 0) {
        setModelName(currentProviderConfig.presets[0]);
        setIsCustomModel(false);
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to save model');
      addToast({ type: 'error', title: 'Save Failed', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Test an existing saved model
  const handleTestExisting = async (id: string) => {
    setTestingModelId(id);
    try {
      const res = await testConnection({ id });
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Connection OK',
          message: `Responded in ${res.latencyMs}ms`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Connection Failed',
          message: res.error || 'Failed to connect to model',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: getErrorMessage(err, 'Test failed'),
      });
    } finally {
      setTestingModelId(null);
    }
  };

  // Delete saved model
  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteModel(id);
      addToast({ type: 'success', title: 'Model Deleted', message: `Removed ${name}` });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete model configuration' });
    }
  };

  // Set default model
  const handleSetDefault = async (id: string, name: string) => {
    try {
      await setDefaultModel(id);
      addToast({ type: 'success', title: 'Default Updated', message: `${name} is now the active model` });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to update default model' });
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* ── Header Banner: Active Model Status ── */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: activeModel ? 'var(--color-surface)' : 'rgba(234, 179, 8, 0.08)',
          border: '1px solid',
          borderColor: activeModel ? 'var(--color-border)' : 'rgba(234, 179, 8, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeModel ? 'var(--color-primary-subtle, rgba(99,102,241,0.1))' : 'rgba(234, 179, 8, 0.15)',
              color: activeModel ? 'var(--color-primary)' : '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Cpu size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: activeModel ? 'var(--color-success)' : '#eab308',
                }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {activeModel ? 'Active Model' : 'No Active Model'}
              </span>
              {activeModel && (
                <Badge variant="purple">
                  {activeModel.provider.toUpperCase()}
                </Badge>
              )}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
              {activeModel
                ? `${activeModel.label} (${activeModel.modelName}) — used for story generation`
                : 'AI generation is blocked until you configure and activate a model.'}
            </p>
          </div>
        </div>

        {activeModel && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Zap size={14} />}
            loading={testingModelId === activeModel.id}
            onClick={() => handleTestExisting(activeModel.id)}
            id="test-active-model-btn"
          >
            Test Connection
          </Button>
        )}
      </div>

      {/* ── Add New Model Form Card ── */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Add AI Model
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Bring your own API key or connect to local Ollama. API keys are encrypted at rest with AES-256-GCM.
          </p>
        </div>

        {/* Provider Selection Tabs */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Provider
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
            {PROVIDERS.map((p) => {
              const isSelected = p.id === selectedProvider;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProvider(p.id)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.name}</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSaveModel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Model Name Preset / Custom */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                Model Name
              </label>
              {currentProviderConfig.presets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCustomModel((v) => !v)}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-primary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {isCustomModel ? 'Pick from presets' : 'Enter custom model'}
                </button>
              )}
            </div>

            {selectedProvider === 'ollama' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Sparkles size={14} />}
                  loading={isProbingOllama}
                  onClick={handleDetectOllama}
                  id="ollama-detect-btn"
                >
                  Auto-Detect Local Models
                </Button>
                {detectedOllamaModels.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={13} /> {detectedOllamaModels.length} models found
                  </span>
                )}
              </div>
            )}

            {!isCustomModel && (currentProviderConfig.presets.length > 0 || detectedOllamaModels.length > 0) ? (
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                id="model-preset-select"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-base)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                {(detectedOllamaModels.length > 0 ? detectedOllamaModels : currentProviderConfig.presets).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="e.g. gpt-4o, llama3.2:latest, deepseek-r1"
                value={isCustomModel ? customModelName : modelName}
                onChange={(e) => (isCustomModel ? setCustomModelName(e.target.value) : setModelName(e.target.value))}
                id="custom-model-input"
              />
            )}
          </div>

          <label style={{ display: 'grid', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Model context window
            <select value={contextTokens} onChange={(event) => setContextTokens(Number(event.target.value))} style={{ padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}>
              {[4096, 8192, 16384, 32768, 65536].map((size) => <option key={size} value={size}>{size.toLocaleString()} tokens</option>)}
            </select>
          </label>

          {/* Cloud Provider: API Key */}
          {currentProviderConfig.requiresKey && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  API Key
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <ShieldCheck size={13} color="var(--color-success)" /> Encrypted at rest
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-... or api key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  leftIcon={<Key size={14} />}
                  id="model-api-key-input"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showApiKey ? 'Hide key' : 'Show key'}
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Local or Custom: Base URL */}
          {(!currentProviderConfig.requiresKey || selectedProvider === 'custom') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
                Base URL
              </label>
              <Input
                placeholder="http://localhost:11434"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                leftIcon={<Globe size={14} />}
                id="model-base-url-input"
              />
            </div>
          )}

          {/* Label Nickname */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
              Nickname (Label)
            </label>
            <Input
              placeholder="e.g. My Fast Claude, Local Llama"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              id="model-label-input"
            />
          </div>

          {/* Test connection result badge */}
          {testResult && (
            <div
              style={{
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: testResult.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: '1px solid',
                borderColor: testResult.success ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>
                {testResult.success ? `Connection successful (${testResult.latencyMs}ms)` : `Failed: ${testResult.message}`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<Zap size={15} />}
              loading={isTestingDraft}
              onClick={handleTestDraft}
              id="model-test-draft-btn"
            >
              Test Connection
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Plus size={15} />}
              loading={isSubmitting}
              id="model-save-btn"
            >
              Save Model
            </Button>
          </div>
        </form>
      </div>

      {/* ── Saved Models List ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Configured Models ({models.length})
          </h2>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={13} />}
            loading={isLoading}
            onClick={() => void fetchModels()}
          >
            Refresh
          </Button>
        </div>

        {models.length === 0 ? (
          <div
            style={{
              padding: '2.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-border)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            <Cpu size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
              No models configured yet
            </p>
            <p style={{ fontSize: '0.8125rem' }}>
              Add a cloud API key or local Ollama model above to enable AI writing in Narrax.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {models.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid',
                  borderColor: m.isDefault ? 'var(--color-primary)' : 'var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-bg-base)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                        {m.label}
                      </span>
                      {m.isDefault && (
                        <Badge variant="purple">
                          Default
                        </Badge>
                      )}
                      <Badge variant="gray">
                        {m.provider.toUpperCase()}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                      <span>Model: {m.modelName}</span>
                      {m.maskedApiKey && <span>Key: {m.maskedApiKey}</span>}
                      {m.baseUrl && <span>URL: {m.baseUrl}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!m.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(m.id, m.label)}
                      id={`set-default-${m.id}`}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Zap size={13} />}
                    loading={testingModelId === m.id}
                    onClick={() => handleTestExisting(m.id)}
                    id={`test-btn-${m.id}`}
                  >
                    Test
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => handleDelete(m.id, m.label)}
                    id={`delete-model-${m.id}`}
                    title="Delete model"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <section style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Local Ollama models</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{ollamaReachable === null ? 'Checking Ollama…' : ollamaReachable ? `${ollamaModels.length} model(s) installed` : 'Ollama is not reachable. Start Ollama to list or download models.'}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={13} />} onClick={() => void refreshOllama().catch(() => setOllamaReachable(false))}>Refresh</Button>
        </div>
        {ollamaReachable && <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Input aria-label="Ollama model to pull" placeholder="e.g. qwen2.5:7b" value={pullName} onChange={(event) => setPullName(event.target.value)} />
            <Button variant="primary" size="sm" loading={isPulling} disabled={!pullName.trim()} onClick={() => void handlePullOllama()}>Pull model</Button>
          </div>
          {pullStatus && <div aria-live="polite" style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{pullStatus}{pullProgress !== null ? ` · ${pullProgress}%` : ''}{pullProgress !== null && <progress value={pullProgress} max={100} style={{ display: 'block', width: '100%' }} />}</div>}
          {ollamaModels.length > 0 && <div style={{ display: 'grid', gap: '0.5rem' }}>
            {ollamaModels.map((model) => <div key={model.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{model.name} · {(model.sizeBytes / 1024 ** 3).toFixed(1)} GB</span>
              <Button variant="secondary" size="sm" onClick={() => void handleUseOllamaModel(model.name)}>Use this model</Button>
            </div>)}
          </div>}
          {ollamaModels.length === 0 && !isPulling && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Ollama is running but no models are installed yet.</p>}
        </>}
      </section>
    </div>
  );
}
