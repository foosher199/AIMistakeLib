import { useState } from 'react';
import { User, Lock, Mail, Eye, EyeOff, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface AuthSectionProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, username?: string) => Promise<void>;
  onAnonymousLogin: () => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export function AuthSection({
  onLogin,
  onRegister,
  onAnonymousLogin,
  isLoading,
  error,
}: AuthSectionProps) {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  
  // 表单状态
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  // 登录提交
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error('请填写完整信息');
      return;
    }
    try {
      await onLogin(loginForm.email, loginForm.password);
      toast.success('登录成功');
    } catch (error: any) {
      toast.error(error.message || '登录失败');
    }
  };

  // 注册提交
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.email || !registerForm.password) {
      toast.error('请填写完整信息');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('两次密码不一致');
      return;
    }
    if (registerForm.password.length < 6) {
      toast.error('密码至少6位');
      return;
    }
    try {
      await onRegister(registerForm.email, registerForm.password, registerForm.username);
      toast.success('注册成功');
    } catch (error: any) {
      toast.error(error.message || '注册失败');
    }
  };

  // 游客登录
  const handleAnonymousLogin = async () => {
    try {
      await onAnonymousLogin();
      toast.success('已以游客身份登录');
    } catch (error: any) {
      toast.error(error.message || '登录失败');
    }
  };

  return (
    <section className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0070a0] to-[#2c90c9] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">错</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1f1f1f]">错没错？</h1>
          <p className="text-[#626a72]">登录后同步你的错题数据</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-[#ffe4e6] border border-[#f43f5e] rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#f43f5e] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#f43f5e] font-medium">发生错误</p>
              <p className="text-sm text-[#f43f5e]">{error}</p>
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-[#dee5eb] p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                  <Input
                    type="email"
                    placeholder="邮箱"
                    value={loginForm.email}
                    onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="pl-10 h-12 border-[#c2cdd8] rounded-xl"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="密码"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="pl-10 pr-10 h-12 border-[#c2cdd8] rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-[#626a72]" />
                    ) : (
                      <Eye className="w-5 h-5 text-[#626a72]" />
                    )}
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#0070a0] hover:bg-[#004968] rounded-xl"
                >
                  {isLoading ? '登录中...' : '登录'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </form>

              {/* Anonymous Login */}
              <div className="mt-4 pt-4 border-t border-[#dee5eb]">
                <button
                  onClick={handleAnonymousLogin}
                  disabled={isLoading}
                  className="w-full py-3 flex items-center justify-center gap-2 text-[#0070a0] hover:bg-[#cce5f3] rounded-xl transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>游客快速体验</span>
                </button>
              </div>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                  <Input
                    placeholder="用户名（可选）"
                    value={registerForm.username}
                    onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })}
                    className="pl-10 h-12 border-[#c2cdd8] rounded-xl"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                  <Input
                    type="email"
                    placeholder="邮箱"
                    value={registerForm.email}
                    onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="pl-10 h-12 border-[#c2cdd8] rounded-xl"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="密码（至少6位）"
                    value={registerForm.password}
                    onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="pl-10 pr-10 h-12 border-[#c2cdd8] rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-[#626a72]" />
                    ) : (
                      <Eye className="w-5 h-5 text-[#626a72]" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                  <Input
                    type="password"
                    placeholder="确认密码"
                    value={registerForm.confirmPassword}
                    onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    className="pl-10 h-12 border-[#c2cdd8] rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#0070a0] hover:bg-[#004968] rounded-xl"
                >
                  {isLoading ? '注册中...' : '注册'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Tips */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[#626a72]">
            登录即表示同意
            <a href="#" className="text-[#0070a0] hover:underline">服务条款</a>
            和
            <a href="#" className="text-[#0070a0] hover:underline">隐私政策</a>
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { title: '云端同步', desc: '数据安全存储' },
            { title: '多设备', desc: '随时随地访问' },
            { title: '免费使用', desc: ' generous 额度' },
          ].map((item, index) => (
            <div key={index} className="text-center">
              <p className="text-sm font-medium text-[#1f1f1f]">{item.title}</p>
              <p className="text-xs text-[#626a72]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
