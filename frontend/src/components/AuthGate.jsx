import { useEffect, useState } from 'react';
import { Briefcase, LockKey, SignIn } from '@phosphor-icons/react';
import { getAuthSession, login, logout, setCsrfToken } from '../api/applications.js';

export function AuthGate({ children }) {
  const [state, setState] = useState({ loading: true, user: null, error: '' });
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [fields, setFields] = useState({});

  useEffect(() => {
    getAuthSession()
      .then((response) => {
        if (response.data.authenticated) setCsrfToken(response.data.csrfToken);
        setState({ loading: false, user: response.data.user || null, error: '' });
      })
      .catch((error) => setState({ loading: false, user: null, error: error.message }));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFields({});
    setState((current) => ({ ...current, error: '' }));
    try {
      const response = await login(credentials);
      setState({ loading: false, user: response.data.user, error: '' });
    } catch (error) {
      setFields(error.fields || {});
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    try {
      await logout();
    } finally {
      setState({ loading: false, user: null, error: '' });
      setCredentials((current) => ({ email: current.email, password: '' }));
    }
  }

  if (state.loading) {
    return <div className="grid min-h-[100dvh] place-items-center bg-[#f7f8f5] text-sm font-semibold text-stone-600" role="status">Checking your session…</div>;
  }
  if (state.user) return children({ user: state.user, onLogout: signOut });

  return (
    <main className="app-canvas grid min-h-[100dvh] place-items-center bg-[#f7f8f5] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 sm:p-8" aria-labelledby="sign-in-heading">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-stone-950 text-white"><Briefcase size={21} weight="fill" /></span>
          <div><p className="font-semibold tracking-tight text-stone-950">Internship Tracker</p><p className="text-xs text-stone-500">Private owner workspace</p></div>
        </div>
        <div className="mt-8">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800"><LockKey size={18} /></span>
          <h1 id="sign-in-heading" className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-stone-950">Sign in to your pipeline</h1>
          <p className="copy-pretty mt-2 text-sm leading-6 text-stone-600">Applications, notes, and reminders stay behind your owner account.</p>
        </div>
        <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
          <label className="field-group"><span>Email</span><input className="field-control" type="email" autoComplete="username" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} aria-invalid={Boolean(fields.email)} />{fields.email && <span className="field-error">{fields.email}</span>}</label>
          <label className="field-group"><span>Password</span><input className="field-control" type="password" autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} aria-invalid={Boolean(fields.password)} />{fields.password && <span className="field-error">{fields.password}</span>}</label>
          {state.error && <div className="error-banner" role="alert">{state.error}</div>}
          <button className="primary-button w-full" disabled={submitting} type="submit"><SignIn size={18} />{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
