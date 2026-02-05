import { useState, useEffect } from 'react';
import { User, Mail, Lock, Shield, LogOut, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { User as UserType } from '@/hooks/useTCBAuth';

interface UserCenterProps {
  user: UserType;
  onBindEmail: (email: string, verificationCode: string, verificationInfo: any) => Promise<void>;
  onSendVerificationCode: (email: string) => Promise<any>;
  onLogout: () => void;
  onViewChange: (view: 'home' | 'upload' | 'list' | 'history' | 'detail') => void;
}

export function UserCenter({
  user,
  onBindEmail,
  onSendVerificationCode,
  onLogout,
  onViewChange,
}: UserCenterProps) {
  const [showBindEmail, setShowBindEmail] = useState(false);
  const [bindForm, setBindForm] = useState({
    email: '',
    verificationCode: '',
  });
  const [verificationInfo, setVerificationInfo] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isBinding, setIsBinding] = useState(false);

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const handleSendVerificationCode = async () => {
    if (!bindForm.email) {
      toast.error('请先填写邮箱');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bindForm.email)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    try {
      setIsSendingCode(true);
      const result = await onSendVerificationCode(bindForm.email);
      setVerificationInfo(result);
      setCountdown(60);
      toast.success('验证码已发送到邮箱');
    } catch (error: any) {
      toast.error(error.message || '发送验证码失败');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 绑定邮箱
  const handleBindEmail = async () => {
    if (!bindForm.email || !bindForm.verificationCode) {
      toast.error('请填写完整信息');
      return;
    }

    if (!verificationInfo) {
      toast.error('请先发送验证码');
      return;
    }

    try {
      setIsBinding(true);
      await onBindEmail(bindForm.email, bindForm.verificationCode, verificationInfo);
      toast.success('邮箱绑定成功');
      setShowBindEmail(false);
      setBindForm({ email: '', verificationCode: '' });
      setVerificationInfo(null);
    } catch (error: any) {
      toast.error(error.message || '绑定失败');
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <section className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#0070a0] to-[#2c90c9] rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#1f1f1f] mb-2">个人中心</h1>
          <p className="text-[#626a72]">{user.username}</p>
        </div>

        {/* 用户信息卡片 */}
        <div className="bg-white rounded-3xl shadow-lg border border-[#dee5eb] p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">账户信息</h2>

          <div className="space-y-4">
            {/* 用户ID */}
            <div className="flex items-center gap-3 p-4 bg-[#f7f9fa] rounded-xl">
              <Shield className="w-5 h-5 text-[#0070a0]" />
              <div className="flex-1">
                <p className="text-sm text-[#626a72]">用户 ID</p>
                <p className="text-[#1f1f1f] font-mono text-sm">{user.uid.slice(0, 16)}...</p>
              </div>
            </div>

            {/* 用户名 */}
            <div className="flex items-center gap-3 p-4 bg-[#f7f9fa] rounded-xl">
              <User className="w-5 h-5 text-[#0070a0]" />
              <div className="flex-1">
                <p className="text-sm text-[#626a72]">用户名</p>
                <p className="text-[#1f1f1f]">{user.username}</p>
              </div>
            </div>

            {/* 邮箱 */}
            <div className="flex items-center gap-3 p-4 bg-[#f7f9fa] rounded-xl">
              <Mail className="w-5 h-5 text-[#0070a0]" />
              <div className="flex-1">
                <p className="text-sm text-[#626a72]">邮箱</p>
                <p className="text-[#1f1f1f]">{user.email || '未绑定'}</p>
              </div>
              {user.isAnonymous && !user.email && (
                <Button
                  onClick={() => setShowBindEmail(!showBindEmail)}
                  size="sm"
                  className="bg-[#0070a0] hover:bg-[#004968]"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  绑定邮箱
                </Button>
              )}
            </div>

            {/* 账户类型 */}
            <div className="flex items-center gap-3 p-4 bg-[#f7f9fa] rounded-xl">
              <Lock className="w-5 h-5 text-[#0070a0]" />
              <div className="flex-1">
                <p className="text-sm text-[#626a72]">账户类型</p>
                <p className="text-[#1f1f1f]">{user.isAnonymous ? '游客账户' : '正式账户'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 绑定邮箱表单 */}
        {showBindEmail && user.isAnonymous && (
          <div className="bg-white rounded-3xl shadow-lg border border-[#dee5eb] p-6 mb-6">
            <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">绑定邮箱</h2>
            <p className="text-sm text-[#626a72] mb-4">
              绑定邮箱后，你的游客账户将转为正式账户，数据更加安全
            </p>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                <Input
                  type="email"
                  placeholder="邮箱"
                  value={bindForm.email}
                  onChange={e => setBindForm({ ...bindForm, email: e.target.value })}
                  className="pl-10 h-12 border-[#c2cdd8] rounded-xl"
                />
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#626a72]" />
                  <Input
                    type="text"
                    placeholder="邮箱验证码"
                    value={bindForm.verificationCode}
                    onChange={e => setBindForm({ ...bindForm, verificationCode: e.target.value })}
                    className="pl-10 h-12 border-[#c2cdd8] rounded-xl"
                    maxLength={6}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={countdown > 0 || isSendingCode}
                  className="h-12 px-6 bg-[#0070a0] hover:bg-[#004968] rounded-xl whitespace-nowrap"
                >
                  {isSendingCode ? '发送中...' : countdown > 0 ? `${countdown}秒` : '发送验证码'}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleBindEmail}
                  disabled={isBinding}
                  className="flex-1 h-12 bg-[#0070a0] hover:bg-[#004968] rounded-xl"
                >
                  {isBinding ? '绑定中...' : '确认绑定'}
                </Button>
                <Button
                  onClick={() => {
                    setShowBindEmail(false);
                    setBindForm({ email: '', verificationCode: '' });
                    setVerificationInfo(null);
                  }}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 快捷操作 */}
        <div className="bg-white rounded-3xl shadow-lg border border-[#dee5eb] p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1f1f1f] mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => onViewChange('upload')}
              variant="outline"
              className="h-16 rounded-xl"
            >
              上传错题
            </Button>
            <Button
              onClick={() => onViewChange('list')}
              variant="outline"
              className="h-16 rounded-xl"
            >
              错题列表
            </Button>
            <Button
              onClick={() => onViewChange('history')}
              variant="outline"
              className="h-16 rounded-xl"
            >
              复习记录
            </Button>
            <Button
              onClick={() => onViewChange('home')}
              variant="outline"
              className="h-16 rounded-xl"
            >
              返回首页
            </Button>
          </div>
        </div>

        {/* 退出登录 */}
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full h-12 rounded-xl text-[#f43f5e] border-[#f43f5e] hover:bg-[#ffe4e6]"
        >
          <LogOut className="w-5 h-5 mr-2" />
          退出登录
        </Button>
      </div>
    </section>
  );
}
