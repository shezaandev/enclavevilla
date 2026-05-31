import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2, Home } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('Invalid credentials. Access Denied.');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-brand-forest-deep relative overflow-hidden px-6">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-gold rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-gold rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-forest/40 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-forest-light mx-auto rounded-full flex items-center justify-center border border-brand-gold/30 mb-6 shadow-glow">
            <Home className="text-brand-gold" size={32} />
          </div>
          <h1 className="text-white font-serif text-3xl mb-2">Admin Portal</h1>
          <p className="text-brand-ivory/60 text-xs font-sans font-bold tracking-[0.2em] uppercase">Lonavala Enclave Villa</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-brand-gold text-[10px] font-bold tracking-widest uppercase ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                required type="email" 
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-12 text-white focus:outline-none focus:border-brand-gold transition-all"
                placeholder="admin@villa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-brand-gold text-[10px] font-bold tracking-widest uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                required type="password" 
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-12 text-white focus:outline-none focus:border-brand-gold transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold tracking-widest uppercase py-3 text-center rounded-xl"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit" disabled={loading || authLoading}
            className="w-full gold-pill py-4 text-sm flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {(loading || authLoading) ? <Loader2 className="animate-spin" size={20} /> : 'Sign In To Dashboard'}
          </button>
        </form>

        <p className="text-center text-white/20 text-[10px] font-bold tracking-widest uppercase mt-10">
           Restricted access for property owners only
        </p>
      </motion.div>
    </div>
  );
}
