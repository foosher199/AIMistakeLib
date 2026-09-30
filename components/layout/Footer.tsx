import Link from 'next/link'
import { Camera, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#403a9f] via-[#4b46b8] to-[#237b69] py-12 text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-black/10">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI错题本</h3>
                <p className="text-white/60 text-sm">智能错题本</p>
              </div>
            </div>
            <p className="text-white/70 max-w-sm mb-4">
              让学习更高效，让复习更轻松。AI 驱动的智能错题管理工具，帮助中小学生高效查漏补缺。
            </p>
          </div>


          <div>
            <h4 className="font-bold mb-4">支持</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard/feedback" className="text-white/70 hover:text-white transition-colors">
                  意见反馈
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} AI错题本 All rights reserved.
          </p>
          <p className="text-white/60 text-sm flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-[#f43f5e]" /> for students
          </p>
        </div>
      </div>
    </footer>
  )
}
