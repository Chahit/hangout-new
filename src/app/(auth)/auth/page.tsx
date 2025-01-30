'use client';

import { Suspense } from 'react';
import AuthForm from './auth-form';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-zinc-900/50 p-8 rounded-xl backdrop-blur">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Welcome to SNU Hangout</h2>
          <p className="mt-2 text-gray-400">Sign in with your SNU email</p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
} 