import type { Metadata } from 'next'
import { AquariumApp } from '@/components/aquarium/AquariumApp'

/* eslint-disable react-refresh/only-export-components */
export const metadata: Metadata = {
  title: 'AquaLab · 淡水真水模拟',
  description:
    '氮循环、非离子氨、pH/GH/KH、混养相克与爆藻的教学向淡水鱼缸模拟器',
}

export default function AquariumPage() {
  return <AquariumApp />
}
