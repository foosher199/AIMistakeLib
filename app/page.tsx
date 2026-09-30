'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Camera, BookOpen, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return
      const rect = imageRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const rotateY = ((e.clientX - centerX) / rect.width) * 10
      const rotateX = ((centerY - e.clientY) / rect.height) * 10
      imageRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    }

    const handleMouseLeave = () => {
      if (imageRef.current) {
        imageRef.current.style.transform =
          'perspective(1000px) rotateX(0deg) rotateY(0deg)'
      }
    }

    const hero = heroRef.current
    if (hero) {
      hero.addEventListener('mousemove', handleMouseMove)
      hero.addEventListener('mouseleave', handleMouseLeave)
    }

    return () => {
      if (hero) {
        hero.removeEventListener('mousemove', handleMouseMove)
        hero.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [])

  const features = [
    { icon: Camera, text: '拍照识别题目' },
    { icon: Sparkles, text: 'AI智能分析' },
    { icon: BookOpen, text: '高效复习' },
  ]

  return (
    <div className="-mt-8 space-y-10 pb-4">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[80vh] flex items-center overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#eeeafd] via-[#fff9f1] to-[#eaf9f5]" />

        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-16 left-6 h-72 w-72 rounded-full bg-[#8d86f5]/15 blur-3xl animate-pulse" />
          <div
            className="absolute bottom-12 right-4 h-96 w-96 rounded-full bg-[#35bfa7]/15 blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-[#ffcf70]/10 to-transparent" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ded9fb] bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-[#5b55d6]" />
                <span className="text-sm font-semibold text-[#514bb8]">
                  AI 驱动的智能错题本
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#29264a] sm:text-5xl lg:text-6xl">
                错题本，
                <br />
                <span className="bg-gradient-to-r from-[#5b55d6] to-[#35a991] bg-clip-text text-transparent">
                  但有了超能力
                </span>
              </h1>

              {/* Description */}
              <p className="max-w-lg text-lg leading-8 text-[#625f77]">
                拍照、上传、搞定。让复习像刷手机一样简单。
                <br />
                智能识别、自动分类、个性化复习计划，帮你高效查漏补缺。
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard/upload">
                  <Button
                    size="lg"
                    variant="jelly"
                    className="h-14 rounded-[18px] px-8 text-lg font-bold"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    拍照识题
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-6 pt-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-[#625f77]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d9f1eb] bg-[#e5f8f3] shadow-sm">
                        <Icon className="h-4 w-4 text-[#248b77]" />
                      </div>
                      <span className="text-sm font-medium">{feature.text}</span>
                    </div>
                  )
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
              <div className="relative rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(76,65,147,0.16)] backdrop-blur">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-gradient-to-br from-[#756ff0] to-[#5b55d6] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_0_#403a9f]">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#29264a]">拍照识题</h3>
                      <p className="text-sm text-[#716d86]">
                        AI 自动识别题目内容
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#c9eee5] bg-[#e5f8f3] px-3 py-1 text-xs font-bold text-[#237b69]">
                    已识别
                  </span>
                </div>

                {/* Question Preview */}
                <div className="mb-4 rounded-2xl border border-[#ebe7f7] bg-[#faf8ff] p-5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-[#5b55d6] px-2.5 py-1 text-xs font-bold text-white">
                      数学
                    </span>
                    <span className="px-2 py-1 bg-[#f59e0b]/10 text-[#f59e0b] text-xs font-medium rounded">
                      中等
                    </span>
                  </div>
                  <p className="mt-3 font-medium text-[#29264a]">
                    已知函数 f(x) = x² - 2x + 1，求 f(2) 的值。
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-sm text-[#716d86]">答案：</span>
                    <span className="rounded-lg bg-[#e7e4ff] px-3 py-1 font-bold text-[#514bb8]">
                      1
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl border border-[#c9eee5] bg-[#e5f8f3] py-3 text-center font-semibold text-[#237b69]">
                    已自动保存
                  </div>
                  <button className="rounded-xl border border-[#dcd7ef] bg-white px-4 py-3 font-medium text-[#625f77] transition-colors hover:bg-[#f1edff]">
                    编辑
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 使用说明 */}
      <div className="rounded-[24px] border border-[#e4def5] bg-gradient-to-br from-white to-[#f3efff] p-6 shadow-[0_12px_35px_rgba(76,65,147,0.08)]">
        <h2 className="mb-4 text-xl font-bold text-[#29264a]">使用说明</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#5b55d6] text-sm font-bold text-white shadow-[0_3px_0_#403a9f]">
              1
            </div>
            <div>
              <p className="font-semibold text-[#29264a]">上传错题图片</p>
              <p className="mt-0.5 text-sm text-[#716d86]">
                拍照或选择错题图片，支持多种格式
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#35a991] text-sm font-bold text-white shadow-[0_3px_0_#237b69]">
              2
            </div>
            <div>
              <p className="font-semibold text-[#29264a]">AI 自动识别</p>
              <p className="mt-0.5 text-sm text-[#716d86]">
                系统自动识别题目内容、学科、难度和答案
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#f0a735] text-sm font-bold text-[#3d2b0a] shadow-[0_3px_0_#bd7620]">
              3
            </div>
            <div>
              <p className="font-semibold text-[#29264a]">保存到错题本</p>
              <p className="mt-0.5 text-sm text-[#716d86]">
                识别完成后自动保存到个人错题库
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#5b55d6] text-sm font-bold text-white shadow-[0_3px_0_#403a9f]">
              4
            </div>
            <div>
              <p className="font-semibold text-[#29264a]">定期复习</p>
              <p className="mt-0.5 text-sm text-[#716d86]">
                记录复习次数，标记掌握状态，科学管理学习进度
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
