import { useEffect, useRef } from 'react';
import { Camera, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ViewMode } from '@/types';

interface HeroProps {
  onViewChange: (view: ViewMode) => void;
}

export function Hero({ onViewChange }: HeroProps) {
  const heroRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rotateY = ((e.clientX - centerX) / rect.width) * 10;
      const rotateX = ((centerY - e.clientY) / rect.height) * 10;
      imageRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      if (imageRef.current) {
        imageRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
      }
    };

    const hero = heroRef.current;
    if (hero) {
      hero.addEventListener('mousemove', handleMouseMove);
      hero.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (hero) {
        hero.removeEventListener('mousemove', handleMouseMove);
        hero.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  const features = [
    { icon: Camera, text: '拍照识别题目' },
    { icon: Sparkles, text: 'AI智能分析' },
    { icon: BookOpen, text: '高效复习' },
  ];

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#cce5f3]/30 via-[#f7f9fa] to-[#f7f9fa]" />
      
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#0070a0]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#2c90c9]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#cce5f3]/20 to-transparent rounded-full" />
      </div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#cce5f3] rounded-full">
              <Sparkles className="w-4 h-4 text-[#0070a0]" />
              <span className="text-sm font-medium text-[#0070a0]">
                AI 驱动的智能错题本
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1f1f1f] leading-tight">
              错题本，
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0070a0] to-[#2c90c9]">
                但有了超能力
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg text-[#626a72] max-w-lg">
              拍照、上传、搞定。让复习像刷手机一样简单。
              <br />
              智能识别、自动分类、个性化复习计划，帮你高效查漏补缺。
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => onViewChange('upload')}
                className="bg-[#0070a0] hover:bg-[#004968] text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-[#0070a0]/25 hover:shadow-xl hover:shadow-[#0070a0]/30 transition-all hover:-translate-y-1"
              >
                <Camera className="w-5 h-5 mr-2" />
                拍照识题
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onViewChange('list')}
                className="border-[#c2cdd8] text-[#33383f] hover:bg-[#f7f9fa] px-8 py-6 text-lg rounded-xl"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                查看错题
              </Button>
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-6 pt-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-[#626a72]"
                  >
                    <div className="w-8 h-8 bg-[#cce5f3] rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#0070a0]" />
                    </div>
                    <span className="text-sm font-medium">{feature.text}</span>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right Content - 3D Interface Preview */}
          <div
            ref={imageRef}
            className="relative transition-transform duration-200 ease-out"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Main Card */}
            <div className="relative bg-white rounded-3xl shadow-2xl shadow-[#0070a0]/10 p-6 border border-[#dee5eb]">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0070a0] to-[#2c90c9] rounded-xl flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1f1f1f]">拍照识题</h3>
                    <p className="text-sm text-[#626a72]">AI 自动识别题目内容</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-[#d1fae5] text-[#10b981] text-xs font-medium rounded-full">
                  已识别
                </span>
              </div>

              {/* Question Preview */}
              <div className="bg-[#f7f9fa] rounded-2xl p-5 mb-4">
                <div className="flex items-start gap-3">
                  <span className="px-2 py-1 bg-[#0070a0] text-white text-xs font-bold rounded">数学</span>
                  <span className="px-2 py-1 bg-[#f59e0b]/10 text-[#f59e0b] text-xs font-medium rounded">中等</span>
                </div>
                <p className="mt-3 text-[#1f1f1f] font-medium">
                  已知函数 f(x) = x² - 2x + 1，求 f(2) 的值。
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-[#626a72]">答案：</span>
                  <span className="px-3 py-1 bg-[#cce5f3] text-[#0070a0] font-bold rounded-lg">1</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 py-3 bg-[#0070a0] text-white font-medium rounded-xl hover:bg-[#004968] transition-colors">
                  保存到错题本
                </button>
                <button className="px-4 py-3 border border-[#c2cdd8] text-[#626a72] rounded-xl hover:bg-[#f7f9fa] transition-colors">
                  编辑
                </button>
              </div>
            </div>

            {/* Floating Elements */}
            <div
              className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-lg p-4 border border-[#dee5eb]"
              style={{ transform: 'translateZ(50px)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#d1fae5] rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#10b981]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1f1f1f]">AI 分析</p>
                  <p className="text-xs text-[#626a72]">知识点：二次函数</p>
                </div>
              </div>
            </div>

            <div
              className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-4 border border-[#dee5eb]"
              style={{ transform: 'translateZ(30px)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b] to-[#fbbf24] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">85%</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1f1f1f]">掌握度</p>
                  <p className="text-xs text-[#626a72]">继续加油！</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
