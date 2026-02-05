import { useState, useEffect, useCallback } from 'react';
import { initTCB, getTCBApp } from '@/config/tcb';

export interface User {
  uid: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isAnonymous: boolean;
}

export function useTCBAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化 TCB
  useEffect(() => {
    const init = async () => {
      try {
        const app = initTCB();
        setIsInitialized(true);

        // 检查当前登录状态
        const loginState = await app.auth().getLoginState();

        if (loginState) {
          const currentUser = app.auth().currentUser;
          if (currentUser) {
            setUser({
              uid: currentUser.uid,
              username: currentUser.uid.slice(0, 8),
              email: currentUser.email || undefined,
              phone: currentUser.phone || undefined,
              isAnonymous: currentUser.isAnonymous,
            });
          }
        }
      } catch (err: any) {
        console.error('TCB init failed:', err);
        setError(err.message || '初始化失败');
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);

  // 匿名登录（快速体验）
  const loginAnonymous = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const app = getTCBApp();
      await app.auth().signInAnonymously();

      const currentUser = app.auth().currentUser;
      
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          username: `游客${currentUser.uid.slice(0, 6)}`,
          isAnonymous: true,
        });
      } else {
        throw new Error('登录成功但获取用户信息失败');
      }
    } catch (err: any) {
      console.error('Anonymous login failed:', err);
      setError(err.message || '游客登录失败');
      throw err;
    }
  }, []);

  // 发送邮箱验证码
  const sendVerificationCode = useCallback(async (email: string): Promise<any> => {
    try {
      setError(null);
      const app = getTCBApp();
      const result = await app.auth().getVerification({ email });
      return result;
    } catch (err: any) {
      console.error('Send verification code failed:', err);
      setError(err.message || '发送验证码失败');
      throw err;
    }
  }, []);

  // 使用验证码注册
  const registerWithVerificationCode = useCallback(async (
    email: string,
    verificationCode: string,
    verificationInfo: any,
    username?: string,
    password?: string
  ): Promise<void> => {
    try {
      setError(null);
      const app = getTCBApp();

      // 使用验证码注册
      await app.auth().signUp({
        email,
        verification_code: verificationCode,
        verification_token: verificationInfo.verification_token,
        username,
        password,
      });

      // 注册后自动登录，获取当前用户
      const currentUser = app.auth().currentUser;

      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          username: username || email.split('@')[0],
          email,
          isAnonymous: false,
        });
      } else {
        throw new Error('注册成功但获取用户信息失败');
      }
    } catch (err: any) {
      console.error('Register failed:', err);
      setError(err.message || '注册失败');
      throw err;
    }
  }, []);

  // 绑定邮箱（匿名用户转正）
  const bindEmail = useCallback(async (
    email: string,
    verificationCode: string,
    verificationInfo: any
  ): Promise<void> => {
    try {
      setError(null);
      const app = getTCBApp();

      // 绑定邮箱
      await app.auth().bindEmail({
        email,
        verification_code: verificationCode,
        verification_token: verificationInfo.verification_token,
      });

      // 更新用户信息
      const currentUser = app.auth().currentUser;

      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          username: email.split('@')[0],
          email,
          isAnonymous: false,
        });
      }
    } catch (err: any) {
      console.error('Bind email failed:', err);
      setError(err.message || '绑定邮箱失败');
      throw err;
    }
  }, []);

  // 邮箱密码登录
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      const app = getTCBApp();
      await app.auth().signInWithEmailAndPassword(email, password);

      const currentUser = app.auth().currentUser;
      
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          username: currentUser.email?.split('@')[0] || currentUser.uid.slice(0, 8),
          email: currentUser.email || undefined,
          isAnonymous: false,
        });
      } else {
        throw new Error('登录成功但获取用户信息失败');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || '登录失败');
      throw err;
    }
  }, []);

  // 退出登录
  const logout = useCallback(async (): Promise<void> => {
    try {
      const app = getTCBApp();
      await app.auth().signOut();
      setUser(null);
    } catch (err: any) {
      console.error('Logout failed:', err);
      setError(err.message || '退出失败');
      throw err;
    }
  }, []);

  return {
    user,
    isLoading,
    isInitialized,
    isLoggedIn: !!user,
    error,
    loginAnonymous,
    sendVerificationCode,
    registerWithVerificationCode,
    bindEmail,
    login,
    logout,
  };
}
