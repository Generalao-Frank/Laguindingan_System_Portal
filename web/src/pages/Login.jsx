import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff, Mail, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import schoolLogo from '../assets/les_logo.png';
import API_URL from '../config';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendDisabled, setResendDisabled] = useState(false);
  
  const videoRef = useRef(null);

  // Force video to play
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log("Auto-play failed:", error);
        videoRef.current.muted = true;
        videoRef.current.play();
      });
    }
  }, []);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          username: username,
          password: password,
          device_type: 'web' 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userData', JSON.stringify(data.user));
        localStorage.setItem('userProfilePicture', data.user.profile_picture_url || '');
        
        onLogin(data.user.role);
      } else {
        setError(data.message || 'Invalid username or password. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Cannot connect to server. Please check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForgotSuccess('OTP code sent to your email! Please check your inbox.');
        setStep(2);
        setCountdown(60);
        setResendDisabled(true);
      } else {
        setForgotError(data.message || 'Email not found. Please enter a registered email.');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setForgotError('Cannot connect to server. Please try again later.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail, otp: otpCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForgotSuccess('OTP verified! You can now reset your password.');
        setStep(3);
      } else {
        setForgotError(data.message || 'Invalid OTP code. Please try again.');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setForgotError('Cannot connect to server. Please try again later.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          email: forgotEmail, 
          otp: otpCode,
          new_password: newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForgotSuccess('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          // Close forgot password modal
          setShowForgotPassword(false);
          setStep(1);
          setForgotEmail('');
          setOtpCode('');
          setNewPassword('');
          setConfirmPassword('');
          setForgotError('');
          setForgotSuccess('');
        }, 2000);
      } else {
        setForgotError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setForgotError('Cannot connect to server. Please try again later.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendDisabled) return;
    
    setForgotLoading(true);
    setForgotError('');
    
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForgotSuccess('New OTP code sent to your email!');
        setCountdown(60);
        setResendDisabled(true);
      } else {
        setForgotError(data.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setForgotError('Cannot connect to server. Please try again later.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setStep(1);
    setForgotEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
    setCountdown(0);
  };

  return (
    <div className="min-h-screen font-sans overflow-x-hidden relative">
      
      {/* VIDEO BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <video 
          ref={videoRef}
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/lesV.mp4" type="video/mp4" />
        </video>
        
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 to-indigo-900/70"></div>
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        
        <div className="w-full max-w-[440px]">
          
          {/* Branding Section with Logo */}
          <div className="text-center mb-8 group">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl group-hover:-translate-y-1 transition-transform duration-500">
                <img 
                  src={schoolLogo} 
                  alt="LES Logo" 
                  className="w-16 h-16 object-contain"
                />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-md">Welcome Back</h1>
            <p className="text-indigo-200 font-medium uppercase text-[10px] tracking-[0.3em] mt-2">
              Laguindingan Central School
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-400/50 rounded-xl">
                  <p className="text-red-200 text-xs font-medium text-center">{error}</p>
                </div>
              )}
              
              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider ml-1">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-white transition-colors">
                    <User size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Enter your username"
                    className="w-full pl-11 pr-4 py-3 bg-white/20 border border-white/20 rounded-xl focus:bg-white/30 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all font-medium text-white placeholder:text-white/50"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[10px] font-medium text-indigo-300 hover:text-white transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-focus-within:text-white transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-11 py-3 bg-white/20 border border-white/20 rounded-xl focus:bg-white/30 focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition-all font-medium text-white placeholder:text-white/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 space-y-3">
            <div className="flex justify-center gap-6">
              <button className="text-[10px] font-medium text-indigo-200/70 hover:text-white transition-colors uppercase tracking-wider">
                Privacy Policy
              </button>
              <button className="text-[10px] font-medium text-indigo-200/70 hover:text-white transition-colors uppercase tracking-wider">
                Help Desk
              </button>
            </div>
            <p className="text-indigo-200/50 text-[9px] font-medium leading-relaxed">
              This system is for authorized Laguindingan ES personnel only.<br />
              All activities are logged and monitored for security.
            </p>
            <div className="flex items-center justify-center gap-1.5 text-indigo-300/40 text-[8px]">
              <ShieldCheck size={10} />
              <span>© LES Portal 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl max-w-md w-full p-6 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Reset Password</h2>
              <button 
                onClick={closeForgotPassword}
                className="text-indigo-300 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Success/Error Messages */}
            {forgotSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded-xl flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400" />
                <p className="text-green-200 text-xs">{forgotSuccess}</p>
              </div>
            )}
            {forgotError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-400/50 rounded-xl">
                <p className="text-red-200 text-xs text-center">{forgotError}</p>
              </div>
            )}

            {/* Step 1: Email Input */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-indigo-200 mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/20 rounded-lg focus:bg-white/30 focus:ring-2 focus:ring-indigo-400 outline-none text-white placeholder:text-white/50 text-sm"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-indigo-300/70 mt-1">
                    We'll send a verification code to this email address
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-indigo-200 mb-1">Verification Code</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-2 bg-white/20 border border-white/20 rounded-lg focus:bg-white/30 focus:ring-2 focus:ring-indigo-400 outline-none text-white placeholder:text-white/50 text-sm text-center tracking-widest"
                    maxLength={6}
                    required
                  />
                  <p className="text-[10px] text-indigo-300/70 mt-1">
                    Enter the 6-digit code sent to {forgotEmail}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    ) : (
                      'Verify Code'
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendDisabled}
                  className="w-full text-center text-xs text-indigo-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendDisabled ? `Resend code in ${countdown}s` : 'Resend Code'}
                </button>
              </form>
            )}

            {/* Step 3: Reset Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-indigo-200 mb-1">New Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-2 bg-white/20 border border-white/20 rounded-lg focus:bg-white/30 focus:ring-2 focus:ring-indigo-400 outline-none text-white placeholder:text-white/50 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-indigo-200 mb-1">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-10 py-2 bg-white/20 border border-white/20 rounded-lg focus:bg-white/30 focus:ring-2 focus:ring-indigo-400 outline-none text-white placeholder:text-white/50 text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;