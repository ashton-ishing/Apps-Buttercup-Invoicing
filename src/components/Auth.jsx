import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export default function Auth() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
         <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
                <img src="https://7ui4aegvhooyq7am.public.blob.vercel-storage.com/buttercup-logo.png" alt="Buttercup Logo" className="h-16 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500">Sign in to manage your invoices</p>
        </div>
        <div className="flex justify-center">
            <SignIn />
        </div>
      </div>
    </div>
  );
}
