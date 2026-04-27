import { FormEvent, useState } from 'react';
import { Plane } from 'lucide-react';
import type { Language } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

export default function LoginPage({ onLogin, language, setLanguage, t }: LoginPageProps) {
  const [username, setUsername] = useState('dispatcher01');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch {
      setError(t('invalidLogin'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md gap-0 rounded-lg p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Plane className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{t('appName')}</h1>
            <p className="text-sm text-muted-foreground">{t('loginTitle')}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-2 block text-sm" htmlFor="username">{t('username')}</label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm" htmlFor="password">{t('password')}</label>
            <Input
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? `${t('loading')}...` : t('signIn')}
          </Button>
        </form>

        <div className="mt-6 flex justify-between text-sm text-muted-foreground">
          <span>dispatcher01 / Admin123!</span>
          <select
            className="rounded-md border border-border bg-background px-2"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </Card>
    </div>
  );
}
