"use client"

import { motion } from "framer-motion"

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

const variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function fadeInUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] as const } },
  }
}

export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
}
