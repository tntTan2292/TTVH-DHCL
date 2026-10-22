import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound, LogIn, LogOut, RefreshCw, X } from 'lucide-react';
import api from '../api/client';
import { SESSION_SOURCES, describeSession, disconnectConfirmText } from './dkclSessionStripModel';

const POLL_MS = 5000;

const TONE_CLASS = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  progress: 'border-blue-200 bg-blue-50 text-blue-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  bad: 'border-red-200 bg-red-50 text-red-800',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700'
};

const DOT_CLASS = {
  ok: 'bg-emerald-500',
  progress: 'bg-blue-500 animate-pulse',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-slate-400'
};

const apiMessage = (err, fallback) => (
  err?.response?.data?.error?.message || err?.response?.data?.data?.error?.message || err?.message || fallback
);

/**
 * IMPORT-SESSION-01: always-visible sign-in state of the two DKCL sources with Đăng nhập / Ngắt session buttons, so the
 * person can sign in (e.g. right after changing the account password) without waiting for an import to need it.
 */
export default function DkclSessionStrip({ onChanged = null }) {
  const [sessions, setSessions] = useState({});
  const [busy, setBusy] = useState({});
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const lastStatus = useRef({});

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/import/dkcl/session/status');
      const sources = res.data?.data?.sources || {};
      setSessions(sources);
      setLoadError(null);
      for (const [code, session] of Object.entries(sources)) {
        if (lastStatus.current[code] && lastStatus.current[code] !== session.status) onChangedRef.current?.(code, session.status);
        lastStatus.current[code] = session.status;
      }
    } catch (err) {
      setLoadError(apiMessage(err, 'Không đọc được trạng thái phiên đăng nhập.'));
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const run = async (code, action) => {
    setBusy((current) => ({ ...current, [code]: true }));
    setErrors((current) => ({ ...current, [code]: null }));
    try {
      await action();
    } catch (err) {
      setErrors((current) => ({ ...current, [code]: apiMessage(err, 'Thao tác không thành công.') }));
    } finally {
      setBusy((current) => ({ ...current, [code]: false }));
      await refresh();
      onChangedRef.current?.(code, null);
    }
  };

  const login = (code) => run(code, () => api.post('/import/dkcl/session/interactive-auth', { source: code }));
  const cancel = (code) => run(code, () => api.post('/import/dkcl/session/cancel-login', { source: code }));
  const disconnect = (code, name) => {
    if (!window.confirm(disconnectConfirmText(name))) return;
    run(code, () => api.post('/import/dkcl/session/disconnect', { source: code }));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="dkcl-session-strip">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <KeyRound size={16} className="text-[var(--color-vnpost-blue)]" />
          Phiên đăng nhập nguồn dữ liệu
        </h2>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          title="Đọc lại trạng thái"
        >
          <RefreshCw size={12} /> Làm mới
        </button>
      </div>

      {loadError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{loadError}</div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SESSION_SOURCES.map(({ code, name }) => {
          const view = describeSession(sessions[code] || null, { busy: Boolean(busy[code]) });
          return (
            <div key={code} className={`rounded-xl border px-4 py-3 ${TONE_CLASS[view.tone]}`} data-testid={`dkcl-session-${code}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASS[view.tone]}`} />
                  <span className="text-sm font-bold">{name}</span>
                  <span className="text-sm font-semibold" data-testid={`dkcl-session-${code}-label`}>{view.label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!view.canLogin}
                    onClick={() => login(code)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-vnpost-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                    data-testid={`dkcl-session-${code}-login`}
                  >
                    <LogIn size={13} /> {busy[code] ? 'Đang xử lý…' : view.loginLabel}
                  </button>
                  {view.canCancel && (
                    <button
                      type="button"
                      onClick={() => cancel(code)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      data-testid={`dkcl-session-${code}-cancel`}
                    >
                      <X size={13} /> Huỷ đăng nhập
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!view.canDisconnect}
                    onClick={() => disconnect(code, name)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                    data-testid={`dkcl-session-${code}-disconnect`}
                  >
                    <LogOut size={13} /> Ngắt session
                  </button>
                </div>
              </div>
              {view.detail && <p className="mt-1.5 text-xs font-medium opacity-90">{view.detail}</p>}
              {errors[code] && <p className="mt-1.5 text-xs font-semibold text-red-700">{errors[code]}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
