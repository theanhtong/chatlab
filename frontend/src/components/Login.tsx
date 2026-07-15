import React, { useState } from 'react';
import { API_URL } from '../config';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  lang: 'vi' | 'en';
  toggleLang: () => void;
}

export const Login: React.FC<LoginProps> = ({ 
  onLoginSuccess, 
  theme, 
  toggleTheme, 
  lang, 
  toggleLang 
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const t = {
    titleRegister: lang === 'vi' ? 'Tạo tài khoản' : 'Create Account',
    titleLogin: lang === 'vi' ? 'Chào mừng trở lại' : 'Welcome Back',
    subRegister: lang === 'vi' ? 'Tham gia ChatLab để bắt đầu trò chuyện' : 'Join ChatLab to start chatting',
    subLogin: lang === 'vi' ? 'Đăng nhập để tiếp tục vào ChatLab' : 'Log in to continue to ChatLab',
    username: lang === 'vi' ? 'Tên tài khoản' : 'Username',
    password: lang === 'vi' ? 'Mật khẩu' : 'Password',
    confirmPassword: lang === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm Password',
    displayName: lang === 'vi' ? 'Tên hiển thị' : 'Display Name',
    phone: lang === 'vi' ? 'Số điện thoại' : 'Phone Number',
    submitRegister: lang === 'vi' ? 'Đăng ký' : 'Register',
    submitLogin: lang === 'vi' ? 'Đăng nhập' : 'Login',
    processing: lang === 'vi' ? 'Đang xử lý...' : 'Processing...',
    toggleRegister: lang === 'vi' ? 'Chưa có tài khoản? Đăng ký' : "Don't have an account? Register",
    toggleLogin: lang === 'vi' ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Login',
    mismatchError: lang === 'vi' ? 'Mật khẩu xác nhận không khớp' : 'Confirm password does not match',
    successRegister: lang === 'vi' ? 'Đăng ký thành công! Vui lòng đăng nhập.' : 'Registration successful! Please login.',
    failAuth: lang === 'vi' ? 'Xác thực không thành công' : 'Authentication failed',
    generalError: lang === 'vi' ? 'Có lỗi xảy ra' : 'Something went wrong',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister && password !== confirmPassword) {
      setError(t.mismatchError);
      return;
    }

    setLoading(true);

    const url = `${API_URL}/auth/${isRegister ? 'register' : 'login'}`;
    const body = isRegister 
      ? { username, password, displayName, phone } 
      : { username, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || t.failAuth);
      }

      if (isRegister) {
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
        setError(t.successRegister);
      } else {
        localStorage.setItem('token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user || { username }));
        onLoginSuccess(data.accessToken, data.user || { username });
      }
    } catch (err: any) {
      setError(err.message || t.generalError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 selection:bg-blue-500 selection:text-white transition-colors duration-200 relative ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Settings bar */}
      <div className="absolute top-6 right-6 flex items-center gap-2.5">
        {/* Language selector */}
        <button
          onClick={toggleLang}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            theme === 'light' 
              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm' 
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {lang === 'vi' ? 'English' : 'Tiếng Việt'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
            theme === 'light' 
              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm' 
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {theme === 'light' ? (lang === 'vi' ? 'Tối' : 'Dark') : (lang === 'vi' ? 'Sáng' : 'Light')}
        </button>
      </div>

      <div className={`max-w-md w-full p-8 rounded-2xl shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200 border ${
        theme === 'light' ? 'bg-white border-slate-200/80 shadow-slate-200/50' : 'bg-slate-900 border-slate-800/80'
      }`}>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
            {isRegister ? t.titleRegister : t.titleLogin}
          </h2>
          <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
            {isRegister ? t.subRegister : t.subLogin}
          </p>
        </div>

        {error && (
          <div className={`p-4 rounded-xl text-sm border ${
            error.includes('thành công') || error.includes('successful')
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block ${
              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
            }`}>{t.username}</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full bg-transparent border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                theme === 'light' ? 'border-slate-200 text-slate-900 placeholder:text-slate-350' : 'border-slate-800 text-slate-100 placeholder:text-slate-600'
              }`}
              placeholder="nhapten"
            />
          </div>

          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider block ${
              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
            }`}>{t.password}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-transparent border rounded-xl pl-4 pr-11 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                  theme === 'light' ? 'border-slate-200 text-slate-900 placeholder:text-slate-350' : 'border-slate-800 text-slate-100 placeholder:text-slate-600'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors ${
                  theme === 'light' ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <>
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}>{t.confirmPassword}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-transparent border rounded-xl pl-4 pr-11 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                      theme === 'light' ? 'border-slate-200 text-slate-900 placeholder:text-slate-350' : 'border-slate-800 text-slate-100 placeholder:text-slate-600'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors ${
                      theme === 'light' ? 'text-slate-400 hover:text-slate-600' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}>{t.displayName}</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full bg-transparent border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                    theme === 'light' ? 'border-slate-200 text-slate-900 placeholder:text-slate-350' : 'border-slate-800 text-slate-100 placeholder:text-slate-600'
                  }`}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase tracking-wider block ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}>{t.phone}</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full bg-transparent border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                    theme === 'light' ? 'border-slate-200 text-slate-900 placeholder:text-slate-350' : 'border-slate-800 text-slate-100 placeholder:text-slate-600'
                  }`}
                  placeholder="0912345678"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 active:scale-[0.98] text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            {loading ? t.processing : isRegister ? t.submitRegister : t.submitLogin}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-sm font-semibold text-blue-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            {isRegister ? t.toggleLogin : t.toggleRegister}
          </button>
        </div>

        {!isRegister && (
          <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/80 space-y-3">
            <p className={`text-[10px] font-bold uppercase tracking-wider text-center ${
              theme === 'light' ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {lang === 'vi' ? 'Đăng nhập nhanh tài khoản test' : 'Quick Login (Test Accounts)'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: 'Admin', user: 'admin' },
                { name: 'User 1', user: 'user1' },
                { name: 'User 2', user: 'user2' }
              ].map(acc => (
                <button
                  key={acc.user}
                  type="button"
                  onClick={async () => {
                    setUsername(acc.user);
                    setPassword('password123');
                    setLoading(true);
                    setError('');
                    try {
                      const response = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: acc.user, password: 'password123' }),
                      });
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data.message || t.failAuth);
                      }
                      localStorage.setItem('token', data.accessToken);
                      if (data.refreshToken) {
                        localStorage.setItem('refreshToken', data.refreshToken);
                      }
                      localStorage.setItem('user', JSON.stringify(data.user || { username: acc.user }));
                      onLoginSuccess(data.accessToken, data.user || { username: acc.user });
                    } catch (err: any) {
                      setError(err.message || t.generalError);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-blue-50/50 hover:bg-blue-50 text-blue-600 border-blue-100/70'
                      : 'bg-blue-950/20 hover:bg-blue-950/40 text-blue-400 border-blue-900/30'
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
