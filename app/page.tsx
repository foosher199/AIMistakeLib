'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Camera, BookOpen, Sparkles, ArrowRight, PenLine } from 'lucide-react'
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
    {
      icon: Camera,
      text: '拍照识别题目',
      iconClass: 'text-[#059669]',
      shellClass: 'border-[#a7f3d0] bg-[#ecfdf5]',
    },
    {
      icon: Sparkles,
      text: 'AI智能分析',
      iconClass: 'text-[#d97706]',
      shellClass: 'border-[#fde68a] bg-[#fffbeb]',
    },
    {
      icon: BookOpen,
      text: '高效复习',
      iconClass: 'text-[#2563eb]',
      shellClass: 'border-[#bfdbfe] bg-[#eff6ff]',
    },
  ]

  return (
    <div className="-mt-8 space-y-10 pb-4">
      <section
        ref={heroRef}
        className="relative min-h-[80vh] flex items-center overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#fbfdff_0%,#f5faff_38%,#edf8f5_72%,#f8fcff_100%)]" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-28 -top-24 h-[34rem] w-[34rem] rounded-full bg-white/90 blur-3xl" />
          <div className="absolute left-[42%] top-[-58%] h-[165%] w-44 rotate-[42deg] bg-white/55 blur-sm" />
          <div className="absolute left-[58%] top-[-48%] h-[155%] w-72 rotate-[42deg] bg-[#b8d9f5]/20 blur-md" />
          <div className="absolute -right-24 top-4 h-[32rem] w-[32rem] rounded-full bg-[#a7e8cf]/30 blur-3xl" />
          <div className="absolute bottom-[-35%] left-[28%] h-[28rem] w-[52rem] rounded-full bg-white/75 blur-3xl" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#172b4d] sm:text-5xl lg:text-6xl">
                错题本，
                <br />
                <span className="bg-gradient-to-r from-[#397ff0] via-[#258de0] to-[#16a085] bg-clip-text text-transparent">
                  但有了超能力
                </span>
              </h1>

              <p className="max-w-lg text-lg leading-8 text-[#64748b]">
                拍照、上传、搞定。让复习像刷手机一样简单。
                <br />
                智能识别、自动分类、个性化复习计划，帮你高效查漏补缺。
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard/upload">
                  <Button
                    size="lg"
                    variant="jelly"
                    className="h-[52px] rounded-2xl px-7 text-base font-bold"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    拍照识题
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 pt-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div key={index} className="flex items-center gap-2 text-[#64748b]">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-sm ${feature.shellClass}`}>
                        <Icon className={`h-4 w-4 ${feature.iconClass}`} />
                      </div>
                      <span className="text-sm font-medium">{feature.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div
              ref={imageRef}
              className="relative transition-transform duration-200 ease-out"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Decorative study-desk elements restored from the approved landing-page direction */}
              <div className="pointer-events-none absolute -right-8 -top-12 z-20 hidden h-40 w-36 sm:block">
                <div className="absolute right-5 top-7 h-24 w-20 rounded-b-[18px] rounded-t-[10px] border border-[#d8e6f1] bg-gradient-to-b from-[#e7f1f8] to-[#c9ddeb] shadow-[0_14px_26px_rgba(58,108,150,0.13)]">
                  <div className="absolute inset-x-2 top-[-7px] h-5 rounded-full border border-[#d2e1ec] bg-[#f5faff]" />
                  <div className="absolute left-3 top-[-44px] h-14 w-2.5 -rotate-6 rounded-full bg-[#397ff0] shadow-[0_4px_8px_rgba(47,121,213,0.18)]" />
                  <div className="absolute left-5 top-[-47px] h-8 w-1 -rotate-6 rounded-full bg-[#f59e0b]" />
                  <div className="absolute left-10 top-[-35px] h-45px w-2.5 rotate-6 rounded-full bg-[#10b981] shadow-[0_4px_8px_rgba(16,185,129,0.15)]" />
                  <div className="absolute left-12 top-[-39px] h-8 w-1 rotate-6 rounded-full bg-[#f59e0b]" />
                  <div className="absolute right-2 top-[-26px] h-12 w-2 -rotate-12 rounded-full bg-[#64748b]" />
                </div>
                <div className="absolute right-0 top-20 h-7 w-7 rounded-full bg-[#fff7d6] shadow-sm" />
                <PenLine className="absolute right-[-3px] top-[78px] h-4 w-4 rotate-12 text-[#d97706]" />
              </div>

              <div className="pointer-events-none absolute -bottom-7 -left-10 z-20 hidden h-28 w-32 sm:block">
                <div className="absolute bottom-2 left-2 h-16 w-24 -rotate-6 rounded-xl border border-[#d8e6f1] bg-white shadow-[0_12px_24px_rgba(58,108,150,0.10)]" />
                <div className="absolute bottom-6 left-6 h-3 w-16 -rotate-6 rounded-full bg-[#bfdbfe]" />
                <div className="absolute bottom-12 left-8 h-3 w-12 -rotate-6 rounded-full bg-[#a7f3d0]" />
              </div>

              <div className="relative rounded-[28px] border border-[#dce8f3] bg-white/95 p-6 shadow-[0_24px_70px_rgba(58,108,150,0.13)] backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-[#4b91ed] to-[#2f79d5] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_8px_18px_rgba(47,121,213,0.18)]">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#172b4d]">拍照识题</h3>
                      <p className="text-sm text-[#64748b]">AI 自动识别题目内容</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-3 py-1 text-xs font-bold text-[#0f766e]">
                    已识别
                  </span>
                </div>

                <div className="mb-4 rounded-2xl border border-[#dce7f5] bg-[#f8fbff] p-5">
                  <div className="flex items-start gap-3">
                    <span className="rounded-lg bg-[#eaf3ff] px-2.5 py-1 text-xs font-bold text-[#3577d4]">数学</span>
                    <span className="px-2 py-1 bg-[#fff5d6] text-[#c98a16] text-xs font-medium rounded">中等</span>
                  </div>
                  <p className="mt-3 font-medium text-[#172b4d]">
                    已知函数 f(x) = x² - 2x + 1，求 f(2) 的值。
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-sm text-[#64748b]">答案：</span>
                    <span className="rounded-lg bg-[#eaf3ff] px-3 py-1 font-bold text-[#3577d4]">1</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 rounded-xl border border-[#bcebd8] bg-[#effbf5] py-3 text-center font-semibold text-[#15866d]">
                    已自动保存
                  </div>
                  <button className="rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 font-medium text-[#64748b] transition-colors hover:bg-[#eff6ff]">
                    编辑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-[24px] border border-[#dce7f5] bg-gradient-to-br from-white to-[#f5fafc] p-6 shadow-[0_12px_35px_rgba(30,64,100,0.08)]">
        <h2 className="mb-4 text-xl font-bold text-[#172b4d]">使用说明</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-sm font-bold text-white shadow-[0_3px_0_#1e40af]">1</div>
            <div><p className="font-semibold text-[#172b4d]">上传错题图片</p><p className="mt-0.5 text-sm text-[#64748b]">拍照或选择错题图片，支持多种格式</p></div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#10b981] text-sm font-bold text-white shadow-[0_3px_0_#0f766e]">2</div>
            <div><p className="font-semibold text-[#172b4d]">AI 自动识别</p><p className="mt-0.5 text-sm text-[#64748b]">系统自动识别题目内容、学科、难度和答案</p></div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#f7c95f] text-sm font-bold text-[#3d2b0a] shadow-[0_3px_0_#bd7620]">3</div>
            <div><p className="font-semibold text-[#172b4d]">保存到错题本</p><p className="mt-0.5 text-sm text-[#64748b]">识别完成后自动保存到个人错题库</p></div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-sm font-bold text-white shadow-[0_3px_0_#1e40af]">4</div>
            <div><p className="font-semibold text-[#172b4d]">定期复习</p><p className="mt-0.5 text-sm text-[#64748b]">记录复习次数，标记掌握状态，科学管理学习进度</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}