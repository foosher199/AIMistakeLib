import { useState, useEffect } from 'react';
import { Camera, BookOpen, History, Menu, X, User, LogOut } from 'lucide-react';
import type { ViewMode } from '@/types';
import type { User as UserType } from '@/hooks/useTCBAuth';

interface NavbarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  user: UserType | null;
  onLogout: () => void;
}

export function Navbar({ currentView, onViewChange, user, onLogout }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home' as ViewMode, label: '首页', icon: BookOpen },
    { id: 'upload' as ViewMode, label: '拍照识题', icon: Camera },
    { id: 'list' as ViewMode, label: '我的错题', icon: BookOpen },
    { id: 'history' as ViewMode, label: '历史题库', icon: History },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'py-2 px-4'
          : 'py-4 px-6'
      }`}
    >
      <div
        className={`mx-auto transition-all duration-500 ${
          isScrolled
            ? 'max-w-4xl bg-white/80 backdrop-blur-xl shadow-lg rounded-full px-6 py-2'
            : 'max-w-7xl px-4'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#0070a0] to-[#2c90c9] rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <span className="text-white text-xl font-bold">错</span>
            </div>
            <span className={`font-bold text-lg text-[#1f1f1f] transition-opacity ${isScrolled ? 'hidden md:block' : ''}`}>
              错没错？
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`relative px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 ${
                    isActive
                      ? 'text-[#0070a0] bg-[#cce5f3]'
                      : 'text-[#626a72] hover:text-[#0070a0] hover:bg-[#f7f9fa]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:block relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-[#f7f9fa] transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#0070a0] to-[#2c90c9] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[#1f1f1f]">
                {user?.username}
              </span>
              {user?.isAnonymous && (
                <span className="text-xs text-[#626a72]">(游客)</span>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-[#dee5eb] py-2 z-50">
                <div className="px-4 py-2 border-b border-[#dee5eb]">
                  <p className="text-sm font-medium text-[#1f1f1f]">{user?.username}</p>
                  {user?.email && (
                    <p className="text-xs text-[#626a72]">{user.email}</p>
                  )}
                  {user?.isAnonymous && (
                    <p className="text-xs text-[#f59e0b]">游客账号，建议绑定邮箱</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2 text-[#f43f5e] hover:bg-[#ffe4e6] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[#f7f9fa] transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-[#1f1f1f]" />
            ) : (
              <Menu className="w-6 h-6 text-[#1f1f1f]" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-[#dee5eb] pt-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                      isActive
                        ? 'text-[#0070a0] bg-[#cce5f3]'
                        : 'text-[#626a72] hover:bg-[#f7f9fa]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
              <div className="border-t border-[#dee5eb] pt-2 mt-2">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-[#1f1f1f]">{user?.username}</p>
                  {user?.isAnonymous && (
                    <p className="text-xs text-[#f59e0b]">游客账号</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-[#f43f5e] hover:bg-[#ffe4e6] rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
