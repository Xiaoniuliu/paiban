import React, { useState } from 'react';
import { Plane } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 模拟登录
    onLogin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Plane className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">全球通货运排班系统</h1>
          <p className="text-sm text-muted-foreground">GLOBAL CREW SCHEDULING</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">账号</label>
            <Input
              type="text"
              placeholder="请输入账号"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">密码</label>
            <Input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">验证码</label>
              <Input
                type="text"
                placeholder="验证码"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="h-10" onClick={() => window.alert('验证码已刷新')}>
                刷新
              </Button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="remember" className="ml-2 text-sm">
              记住登录
            </label>
          </div>

          <Button type="submit" className="w-full">
            登 录
          </Button>

          <div className="text-center">
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => window.alert('请联系系统管理员重置密码')}>
              忘记密码
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
