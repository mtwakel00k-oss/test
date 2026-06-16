import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import { Navbar } from '@/components/restoos/navbar'
import { Hero } from '@/components/restoos/hero'
import { LogosBar } from '@/components/restoos/logos-bar'
import { Features } from '@/components/restoos/features'
import { Stats } from '@/components/restoos/stats'
import { HowItWorks } from '@/components/restoos/how-it-works'
import { Pricing } from '@/components/restoos/pricing'
import { Testimonials } from '@/components/restoos/testimonials'
import { Faq } from '@/components/restoos/faq'
import { CtaBanner } from '@/components/restoos/cta-banner'
import { Footer } from '@/components/restoos/footer'

export const metadata: Metadata = {
  title: 'RestoOS — نظام نقاط البيع الذكي متعدد المستأجرين',
  description:
    'منصة سحابية متعددة المستأجرين تدير طلبات مطاعمك، مطابخك، وتقاريرك من مكان واحد. حل رقمي متكامل للمطاعم والسلسلات.',
}

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
})

export default function Home() {
  return (
    <main className={`${tajawal.variable} landing-page overflow-x-hidden`} style={{ fontFamily: 'var(--font-tajawal), Tajawal Fallback' }}>
      <Navbar />
      <Hero />
      <LogosBar />
      <Features />
      <Stats />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <Faq />
      <CtaBanner />
      <Footer />
    </main>
  )
}
