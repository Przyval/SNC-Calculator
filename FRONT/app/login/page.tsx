"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Email atau password salah. Silakan coba lagi.');
        setIsLoading(false);
      } else if (result?.ok) {
        router.replace('/');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi nanti.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-black/90 text-white border-l-4 border-yellow-500 shadow-2xl">
        <div className="text-center mb-8">
            <KeyRound className="mx-auto h-16 w-16 text-amber-500 mb-4" />
            <h1 className="text-3xl font-bold headline text-white">Agent Login</h1>
            <p className="text-gray-400">Silakan masuk untuk melanjutkan</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/50 border-amber-600 text-white"
              placeholder="agent@snc.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-black/50 border-amber-600 text-white"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold" disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Login'}
          </Button>
        </form>
      </Card>
    </main>
  );
}