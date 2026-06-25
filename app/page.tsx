import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Navbar } from '@/components/simploo-landing/navbar'
import { Hero } from '@/components/simploo-landing/hero'

const Capabilities = dynamic(() => import('@/components/simploo-landing/capabilities').then(m => ({ default: m.Capabilities })))
const Pricing = dynamic(() => import('@/components/simploo-landing/pricing').then(m => ({ default: m.Pricing })))
const Faq = dynamic(() => import('@/components/simploo-landing/faq').then(m => ({ default: m.Faq })))
const Footer = dynamic(() => import('@/components/simploo-landing/footer').then(m => ({ default: m.Footer })))

export const metadata: Metadata = {
  title: 'Simploo — أدر مطعمك بذكاء النخبة',
  description:
    'نظام سحابي متكامل يربط الكاشير بالمطبخ في أجزاء من الثانية، ويكشف لك النزيف المالي والمنتجات الراكدة فوراً وبدون تعقيد.',
}

export default function Home() {
  return (
    <main className="landing-page overflow-x-hidden">
      <Navbar />
      <Hero />
      <Capabilities />
      <Pricing />
      <Faq />
      <Footer />
    </main>
  )
}
