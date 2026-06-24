import type { Metadata } from 'next'
import { Navbar } from '@/components/simploo-landing/navbar'
import { Hero } from '@/components/simploo-landing/hero'
import { Capabilities } from '@/components/simploo-landing/capabilities'
import { Pricing } from '@/components/simploo-landing/pricing'
import { Faq } from '@/components/simploo-landing/faq'
import { Footer } from '@/components/simploo-landing/footer'

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
