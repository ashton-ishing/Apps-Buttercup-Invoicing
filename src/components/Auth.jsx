import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: window.location.origin,
        }
      });

      if (error) throw error;
      setMessage('Check your email for the magic link!');
    } catch (error) {
      setMessage(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">B</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to Butter</h1>
            <p className="text-gray-500">Sign in to manage your invoices</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                    type="email"
                    placeholder="Your email"
                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
          </div>
          <button
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader className="animate-spin" size={20} /> : <Lock size={20} />}
            {loading ? 'Sending magic link...' : 'Send Magic Link'}
          </button>
        </form>
        
        {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm text-center ${message.includes('Check') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
            </div>
        )}
      </div>
    </div>
  );
}

