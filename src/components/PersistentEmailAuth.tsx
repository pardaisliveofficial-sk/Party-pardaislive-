import React, { useEffect, useState } from 'react';
import { freshSignupRequest, freshSignupVerify, freshSignupComplete, freshLoginRequest, freshLoginVerify } from '../lib/apiClient';

type Props = { onAuthenticated: (payload: any) => void; onGoogleSignIn?: () => void | Promise<void> };
type Mode = 'login' | 'signup';
type Step = 'email' | 'otp' | 'profile';

export default function PersistentEmailAuth({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = window.setInterval(() => setCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const cleanEmail = () => email.trim().toLowerCase();
  const switchMode = (m: Mode) => { if (busy) return; setMode(m); setStep('email'); setOtp(''); setError(''); setNotice(''); };

  const requestCode = async () => {
    const e = cleanEmail();
    if (!e || !e.includes('@')) return setError('Enter a valid email address.');
    setBusy(true); setError(''); setNotice('');
    const result = mode === 'signup' ? await freshSignupRequest(e) : await freshLoginRequest(e);
    setBusy(false);
    if (!result?.success) return setError(result?.error || 'Could not send the code.');
    setCooldown(60); setOtp(''); setStep('otp');
    setNotice(mode === 'signup' ? 'Verification code sent. Check your email.' : 'Login code sent. Check your email.');
  };

  const verify = async () => {
    const e = cleanEmail(); const code = otp.replace(/\D/g, '');
    if (code.length !== 6) return setError('Enter the 6-digit code.');
    setBusy(true); setError('');
    const result = mode === 'signup' ? await freshSignupVerify(e, code) : await freshLoginVerify(e, code);
    setBusy(false);
    if (!result?.success || !result?.token || !result?.user) return setError(result?.error || 'Verification failed.');
    if (mode === 'login') return onAuthenticated(result);
    try { sessionStorage.setItem('pardais_fresh_signup_token', result.token); } catch {}
    setName(result.user?.fullName || ''); setUsername(result.user?.username || ''); setDob(result.user?.dob || ''); setStep('profile'); setNotice('Email verified. Complete your Pardais profile.');
  };

  const complete = async () => {
    if (!name.trim()) return setError('Enter your full name.');
    const u = username.trim().replace(/^@/, '');
    if (u.length < 3) return setError('Username must contain at least 3 characters.');
    if (!dob) return setError('Select your date of birth.');
    let token = ''; try { token = sessionStorage.getItem('pardais_fresh_signup_token') || ''; } catch {}
    if (!token) { setError('Verification session expired. Please verify your email again.'); return setStep('email'); }
    setBusy(true); setError('');
    const result = await freshSignupComplete(token, name.trim(), u, dob);
    setBusy(false);
    if (!result?.success || !result?.token || !result?.user) return setError(result?.error || 'Could not create your account.');
    try { sessionStorage.removeItem('pardais_fresh_signup_token'); } catch {}
    onAuthenticated(result);
  };

  const resend = async () => { if (cooldown || busy) return; setBusy(true); setError(''); const r = mode === 'signup' ? await freshSignupRequest(cleanEmail()) : await freshLoginRequest(cleanEmail()); setBusy(false); if (!r?.success) return setError(r?.error || 'Could not resend the code.'); setCooldown(60); setNotice('A new code has been sent.'); };

  return <div className="space-y-3">
    {step === 'email' && <>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
        <button type="button" onClick={() => switchMode('login')} className={`py-2.5 rounded-lg text-sm font-black ${mode === 'login' ? 'bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white shadow-lg' : 'text-gray-400'}`}>LOG IN</button>
        <button type="button" onClick={() => switchMode('signup')} className={`py-2.5 rounded-lg text-sm font-black ${mode === 'signup' ? 'bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white shadow-lg' : 'text-gray-400'}`}>SIGN UP</button>
      </div>
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email address" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm" autoComplete="email" disabled={busy} />
      <button type="button" disabled={busy} onClick={requestCode} className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold">{busy ? 'Please wait…' : mode === 'login' ? 'SEND LOGIN CODE' : 'SEND VERIFICATION CODE'}</button>
    </>}
    {step === 'otp' && <>
      {notice && <p className="text-green-300 text-xs bg-green-950/30 border border-green-500/30 rounded-xl p-3">{notice}</p>}
      <p className="text-xs text-gray-300">Code sent to <b>{email}</b></p>
      <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" className="w-full bg-[#12121a] border border-[#00f5ff] rounded-xl px-3 py-3 text-white text-center tracking-widest font-bold" disabled={busy} />
      <button type="button" disabled={busy || otp.length !== 6} onClick={verify} className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold">{busy ? 'Verifying…' : 'VERIFY & CONTINUE'}</button>
      <button type="button" disabled={busy || cooldown > 0} onClick={resend} className="w-full py-2 text-gray-300 text-xs">{cooldown ? `Resend code in ${cooldown}s` : 'Resend code'}</button>
      <button type="button" disabled={busy} onClick={() => { setStep('email'); setOtp(''); setError(''); }} className="w-full py-2 text-gray-400 text-xs">Use another email</button>
    </>}
    {step === 'profile' && <>
      <div className="text-center"><p className="text-sm font-black text-white">Create Your Pardais Account</p><p className="text-[10px] text-gray-500 mt-1">Email verified. Your Pardais ID will stay permanent.</p></div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm" disabled={busy} />
      <input value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, '_'))} placeholder="Username" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm" disabled={busy} />
      <input value={email} readOnly className="w-full bg-[#151520] border border-[#303040] rounded-xl px-3 py-3 text-gray-400 text-sm" />
      <input value={dob} onChange={e => setDob(e.target.value)} type="date" className="w-full bg-[#1e1e2d] border border-[#303040] rounded-xl px-3 py-3 text-white text-sm" disabled={busy} />
      <button type="button" disabled={busy} onClick={complete} className="w-full bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white py-3 rounded-xl font-bold">{busy ? 'Creating…' : 'CREATE PARDAIS ACCOUNT'}</button>
    </>}
    {error && <p className="text-red-300 text-xs bg-red-950/30 border border-red-500/30 rounded-xl p-3">{error}</p>}
  </div>;
}
