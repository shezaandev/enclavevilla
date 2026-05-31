import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  Mail, 
  LogOut, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  Edit3,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminProfile() {
  const { 
    user, 
    logout, 
    updateAdminDisplayName, 
    updateAdminPassword, 
    updateAdminEmail, 
    sendAdminVerificationEmail 
  } = useAuth();

  const navigate = useNavigate();
  const displayNameInputRef = useRef<HTMLInputElement>(null);

  // Common UI State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- SECTION 1: Verification Email State ---
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSendVerification = async () => {
    setSendingVerification(true);
    try {
      await sendAdminVerificationEmail();
      showToast('Verification email sent! Check your inbox.');
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 5000);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to send. Try again later.', 'error');
    } finally {
      setSendingVerification(false);
    }
  };

  // Helper: compute initials
  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    const initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
    return initials;
  };

  const handleFocusDisplayName = () => {
    if (displayNameInputRef.current) {
      displayNameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      displayNameInputRef.current.focus();
    }
  };

  // --- SECTION 2: Edit Display Name State ---
  const [displayName, setDisplayName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingName(true);
    setNameError(null);
    setNameSuccess(false);

    try {
      await updateAdminDisplayName(displayName);
      setNameSuccess(true);
      showToast('Name updated successfully!');
      setTimeout(() => setNameSuccess(false), 2000);
    } catch (err: any) {
      console.error(err);
      setNameError(err.message || 'Failed to update name.');
    } finally {
      setUpdatingName(false);
    }
  };

  // --- SECTION 3: Change Password State ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: '', width: 'w-0', bg: 'bg-white/10' };
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const isAtLeast8 = pwd.length >= 8;

    if (!isAtLeast8 || !hasNumber) {
      return { 
        label: 'Weak', 
        color: 'text-red-500', 
        width: 'w-1/3', 
        bg: 'bg-red-500' 
      };
    }
    if (isAtLeast8 && hasNumber && !hasSpecial) {
      return { 
        label: 'Fair', 
        color: 'text-yellow-500', 
        width: 'w-2/3', 
        bg: 'bg-yellow-500' 
      };
    }
    if (isAtLeast8 && hasNumber && hasSpecial) {
      return { 
        label: 'Strong', 
        color: 'text-green-500', 
        width: 'w-full', 
        bg: 'bg-green-500' 
      };
    }
    return { label: 'Weak', color: 'text-red-500', width: 'w-1/3', bg: 'bg-red-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await updateAdminPassword(currentPassword, newPassword);
      setPwdSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully!');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwdError('Incorrect current password. Please try again.');
      } else if (err.code === 'auth/weak-password') {
        setPwdError('Password is too weak. Use at least 8 characters.');
      } else if (err.code === 'auth/too-many-requests') {
        setPwdError('Too many attempts. Please wait a few minutes.');
      } else {
        setPwdError(err.message || 'Something went wrong. Please try again.');
      }
      setTimeout(() => setPwdError(null), 5000);
    } finally {
      setUpdatingPassword(false);
    }
  };

  // --- SECTION 4: Change Email State ---
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showEmailPwd, setShowEmailPwd] = useState(false);

  const [sendingEmailVerif, setSendingEmailVerif] = useState(false);
  const [emailSuccessSent, setEmailSuccessSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccessSent(false);

    // Basic email format check
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailCurrentPassword || !newEmail) {
      setEmailError('All fields are required.');
      return;
    }
    if (!emailPattern.test(newEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setSendingEmailVerif(true);
    try {
      await updateAdminEmail(emailCurrentPassword, newEmail);
      setEmailSuccessSent(true);
      showToast('Verification email sent to ' + newEmail);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setEmailError('Incorrect password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setEmailError('This email is already in use by another account.');
      } else if (err.code === 'auth/invalid-email') {
        setEmailError('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setEmailError('Too many attempts. Please wait.');
      } else {
        setEmailError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSendingEmailVerif(false);
    }
  };

  const resetEmailForm = () => {
    setEmailCurrentPassword('');
    setNewEmail('');
    setEmailSuccessSent(false);
    setEmailError(null);
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      
      {/* HEADER SECTION WITH BACK BUTTON */}
      <div className="flex items-center gap-6 mb-10">
        <Link to="/admin" className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-white transition-all shadow-lg group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
          <h1 className="text-white font-serif text-4xl mb-1">My Profile</h1>
          <p className="text-brand-ivory/40 text-[10px] font-bold tracking-widest uppercase">Manage your admin account</p>
        </div>
      </div>

      {/* SECTION 1: PROFILE OVERVIEW (READ ONLY) */}
      <div className="bg-brand-forest-light rounded-[2.5rem] border border-white/5 p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-brand-gold flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
          {user?.displayName ? (
            <span className="font-serif text-3xl">{getInitials(user.displayName)}</span>
          ) : (
            <User size={32} className="text-white" />
          )}
        </div>
        <div className="text-center md:text-left space-y-2 overflow-hidden w-full">
          <h2 className="text-white font-serif text-2xl truncate">{user?.displayName || 'Administrator'}</h2>
          <p className="text-brand-gold text-sm font-medium truncate">{user?.email}</p>
          <div className="pt-1">
            {user?.emailVerified ? (
              <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                ✓ Email Verified
              </span>
            ) : (
              <>
                {verificationSent ? (
                  <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    Email Sent ✓
                  </span>
                ) : (
                  <button 
                    onClick={handleSendVerification} 
                    disabled={sendingVerification}
                    className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                  >
                    {sendingVerification ? (
                      <>
                        <Loader2 size={10} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      '⚠ Verify Email'
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <button 
          onClick={handleFocusDisplayName}
          className="md:ml-auto text-brand-gold text-[10px] font-bold uppercase tracking-widest hover:underline transition-all whitespace-nowrap pt-2 md:pt-0"
        >
          Edit Profile
        </button>
      </div>

      {/* SECTION 2: EDIT DISPLAY NAME */}
      <div className="bg-brand-forest-light rounded-[2.5rem] border border-white/5 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/5 rounded-2xl text-brand-gold">
            <Edit3 size={24} />
          </div>
          <div>
            <h3 className="text-white font-serif text-xl">Display Name</h3>
            <p className="text-brand-ivory/40 text-xs">This name appears in the admin sidebar</p>
          </div>
        </div>

        <form onSubmit={handleUpdateName} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest uppercase text-brand-ivory/30 block">
              DISPLAY NAME
            </label>
            <input 
              ref={displayNameInputRef}
              id="display-name-input"
              type="text" 
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none"
              placeholder="e.g. Shezaan"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Sidebar Preview Box */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-brand-ivory/30 block">
              Sidebar Preview
            </span>
            <div className="bg-brand-forest-deep/50 rounded-2xl p-4 flex items-center gap-4 border border-white/5 max-w-sm">
              <div className="w-10 h-10 rounded-full bg-brand-gold flex items-center justify-center text-white font-bold shrink-0">
                {displayName.trim() ? (
                  <span className="font-serif text-sm">{getInitials(displayName)}</span>
                ) : (
                  <User size={20} />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-xs font-bold truncate">
                  {displayName.trim() || user?.email || 'Administrator'}
                </p>
                <p className="text-brand-gold text-[10px] font-bold uppercase tracking-widest">
                  Administrator
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={updatingName || !displayName.trim()}
                className="bg-brand-gold text-white rounded-2xl px-6 py-4 text-[10px] font-bold tracking-widest uppercase hover:bg-brand-gold/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {updatingName ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Updating...
                  </>
                ) : (
                  'Update Name'
                )}
              </button>

              {nameSuccess && (
                <span className="text-green-400 text-xs font-bold font-serif animate-fade-in flex items-center gap-1">
                  ✓ Name updated!
                </span>
              )}
            </div>

            {nameError && (
              <p className="text-red-400 text-xs mt-1 font-medium">{nameError}</p>
            )}
          </div>
        </form>
      </div>

      {/* SECTION 3: CHANGE PASSWORD */}
      <div className="bg-brand-forest-light rounded-[2.5rem] border border-white/5 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/5 rounded-2xl text-brand-gold">
            <Lock size={24} />
          </div>
          <div>
            <h3 className="text-white font-serif text-xl">Change Password</h3>
            <p className="text-brand-ivory/40 text-xs">You'll need your current password to set a new one</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          
          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest uppercase text-brand-ivory/30 block">
              CURRENT PASSWORD
            </label>
            <div className="relative">
              <input 
                type={showCurrentPwd ? "text" : "password"} 
                className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-white focus:border-brand-gold focus:outline-none"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-ivory/40 hover:text-white transition-colors"
              >
                {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest uppercase text-brand-ivory/30 block">
              NEW PASSWORD
            </label>
            <div className="relative">
              <input 
                type={showNewPwd ? "text" : "password"} 
                className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-white focus:border-brand-gold focus:outline-none"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowNewPwd(!showNewPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-ivory/40 hover:text-white transition-colors"
              >
                {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="space-y-1.5 pt-1 animate-fade-in">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-brand-ivory/30">Password Strength</span>
                  <span className={strength.color}>{strength.label}</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden w-full">
                  <div className={`h-full transition-all duration-300 ${strength.bg} ${strength.width}`} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-widest uppercase text-brand-ivory/30 block">
              CONFIRM NEW PASSWORD
            </label>
            <div className="relative">
              <input 
                type={showConfirmPwd ? "text" : "password"} 
                className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-white focus:border-brand-gold focus:outline-none"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-ivory/40 hover:text-white transition-colors"
              >
                {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Match Helper Label */}
            {confirmPassword && (
              <div className="text-xs font-semibold pt-1">
                {confirmPassword === newPassword ? (
                  <span className="text-green-400">✓ Passwords match</span>
                ) : (
                  <span className="text-red-400">Passwords do not match</span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={updatingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="bg-brand-gold text-white rounded-2xl px-6 py-4 text-[10px] font-bold tracking-widest uppercase hover:bg-brand-gold/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {updatingPassword ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>

              {pwdSuccess && (
                <span className="text-green-400 text-xs font-bold font-serif animate-fade-in">
                  Password updated successfully!
                </span>
              )}
            </div>

            {pwdError && (
              <p className="text-red-400 text-xs mt-1 font-medium">{pwdError}</p>
            )}
          </div>
        </form>
      </div>

      {/* SECTION 4: CHANGE EMAIL */}
      <div className="bg-brand-forest-light rounded-[2.5rem] border border-white/5 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/5 rounded-2xl text-brand-gold">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="text-white font-serif text-xl">Change Email Address</h3>
            <p className="text-brand-ivory/40 text-xs">A verification link will be sent to your new email address</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-yellow-400/90 text-xs leading-relaxed font-medium">
            Changing your email will send a verification link to the new address. 
            Your login email will only update after you click the link. 
            You will remain logged in during this process.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {emailSuccessSent ? (
            <motion.div 
              key="success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <CheckCircle size={24} />
              </div>
              <h4 className="text-white font-serif text-lg font-bold">Verification Email Sent!</h4>
              <p className="text-brand-ivory/60 text-sm max-w-sm">
                Check <span className="text-brand-gold font-bold">{newEmail}</span> and click the link to complete the change. 
                Come back and refresh after verifying.
              </p>
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left max-w-sm w-full flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-amber-500 text-xs font-bold">
                    Important: Check Spam Folder!
                  </p>
                  <p className="text-brand-ivory/80 text-[11px] leading-relaxed">
                    There's a 90% chance this automated email will land in your <strong className="text-white">Spam</strong> or <strong className="text-white">Junk</strong> folder. Please check there if you don't see it within a minute.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetEmailForm}
                className="bg-[#c9a84c] text-[#1a1a1a] px-6 py-2.5 rounded-xl font-bold font-serif hover:bg-[#b89740] transition-colors text-xs"
              >
                Done
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="email-form"
              onSubmit={handleUpdateEmail} 
              className="space-y-6"
            >
              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-brand-ivory/30 block">
                  CURRENT PASSWORD
                </label>
                <div className="relative">
                  <input 
                    type={showEmailPwd ? "text" : "password"} 
                    className="w-full bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-white focus:border-brand-gold focus:outline-none"
                    placeholder="Enter current password"
                    value={emailCurrentPassword}
                    onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowEmailPwd(!showEmailPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-ivory/40 hover:text-white transition-colors"
                  >
                    {showEmailPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest uppercase text-brand-ivory/30 block">
                  NEW EMAIL ADDRESS
                </label>
                <input 
                  type="email" 
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white focus:border-brand-gold focus:outline-none"
                  placeholder="new@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div>
                  <button
                    type="submit"
                    disabled={sendingEmailVerif || !emailCurrentPassword || !newEmail}
                    className="bg-brand-gold text-white rounded-2xl px-6 py-4 text-[10px] font-bold tracking-widest uppercase hover:bg-brand-gold/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingEmailVerif ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Sending...
                      </>
                    ) : (
                      'Send Verification to New Email'
                    )}
                  </button>
                </div>

                {emailError && (
                  <p className="text-red-400 text-xs mt-1 font-medium">{emailError}</p>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 5: DANGER ZONE (SIGN OUT) */}
      <div className="border border-red-500/20 bg-red-500/5 rounded-[2.5rem] p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
            <LogOut size={24} />
          </div>
          <div>
            <h3 className="text-red-400 font-serif text-xl">Sign Out</h3>
            <p className="text-brand-ivory/40 text-xs">Sign out of the admin panel on this device</p>
          </div>
        </div>

        <button 
          onClick={async () => {
            await logout();
            navigate('/admin/login');
          }} 
          className="w-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 py-4 px-6 rounded-2xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-3"
        >
          <LogOut size={16} /> Sign Out of Admin Panel
        </button>
      </div>

      {/* Custom Global Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] 
                        flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl
                        ${toast.type === 'success' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'}`}
          >
            {toast.type === 'success' 
              ? <CheckCircle size={18} /> 
              : <AlertTriangle size={18} />}
            <span className="font-medium text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
