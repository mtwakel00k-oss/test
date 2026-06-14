import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Navbar } from '@/components/restoos/navbar'
import { Hero } from '@/components/restoos/hero'
import { LogosBar } from '@/components/restoos/logos-bar'
import { Footer } from '@/components/restoos/footer'

const Features = dynamic(() => import('@/components/restoos/features').then(m => ({ default: m.Features })))
const Stats = dynamic(() => import('@/components/restoos/stats').then(m => ({ default: m.Stats })))
const HowItWorks = dynamic(() => import('@/components/restoos/how-it-works').then(m => ({ default: m.HowItWorks })))
const Pricing = dynamic(() => import('@/components/restoos/pricing').then(m => ({ default: m.Pricing })))
const Testimonials = dynamic(() => import('@/components/restoos/testimonials').then(m => ({ default: m.Testimonials })))
const Faq = dynamic(() => import('@/components/restoos/faq').then(m => ({ default: m.Faq })))
const CtaBanner = dynamic(() => import('@/components/restoos/cta-banner').then(m => ({ default: m.CtaBanner })))

export const metadata: Metadata = {
  title: 'RestoOS — نظام نقاط البيع الذكي متعدد المستأجرين',
  description:
    'منصة سحابية متعددة المستأجرين تدير طلبات مطاعمك، مطابخك، وتقاريرك من مكان واحد. حل رقمي متكامل للمطاعم والسلسلات.',
}

export default function Home() {
  return (
    <main className="landing-page overflow-x-hidden">
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
