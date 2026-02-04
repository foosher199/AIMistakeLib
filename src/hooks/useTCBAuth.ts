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
        console.log('Initializing TCB...');
        const app = initTCB();
        console.log('TCB initialized, app:', app);
        setIsInitialized(true);
        
        // 检查当前登录状态
        console.log('Checking login state...');
        const loginState = await app.auth().getLoginState();
        console.log('Login state:', loginState);
        
        if (loginState) {
          const currentUser = app.auth().currentUser;
          console.log('Current user:', currentUser);
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
      console.log('Starting anonymous login...');
      setError(null);
      const app = getTCBApp();
      console.log('Got TCB app:', app);
      
      // 执行匿名登录
      console.log('Calling signInAnonymously...');
      await app.auth().signInAnonymously();
      console.log('Anonymous login successful');
      
      const currentUser = app.auth().currentUser;
      console.log('Current user after login:', currentUser);
      
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

  // 邮箱密码注册
  const register = useCallback(async (email: string, password: string, username?: string): Promise<void> => {
    try {
      console.log('Starting registration...', { email, username });
      setError(null);
      const app = getTCBApp();
      console.log('Got TCB app');
      
      // 使用邮箱注册
      console.log('Calling createUserWithEmailAndPassword...');
      await app.auth().createUserWithEmailAndPassword(email, password);
      console.log('Registration successful');
      
      // 注册后自动登录，获取当前用户
      const currentUser = app.auth().currentUser;
      console.log('Current user after registration:', currentUser);
      
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

  // 邮箱密码登录
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      console.log('Starting login...', { email });
      setError(null);
      const app = getTCBApp();
      console.log('Got TCB app');
      
      // 使用邮箱密码登录
      console.log('Calling signInWithEmailAndPassword...');
      await app.auth().signInWithEmailAndPassword(email, password);
      console.log('Login successful');
      
      const currentUser = app.auth().currentUser;
      console.log('Current user after login:', currentUser);
      
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
      console.log('Starting logout...');
      const app = getTCBApp();
      await app.auth().signOut();
      console.log('Logout successful');
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
    register,
    login,
    logout,
  };
}
