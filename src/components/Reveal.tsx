import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

type Tag = 'div' | 'ul' | 'li' | 'section'

const MOTION_TAG = {
  div: motion.div,
  ul: motion.ul,
  li: motion.li,
  section: motion.section,
} as const

const PLAIN_TAG = {
  div: 'div',
  ul: 'ul',
  li: 'li',
  section: 'section',
} as const

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

type RevealProps = {
  children: ReactNode
  className?: string
  as?: Tag
  id?: string
}

/** Fades + slides a block in when it scrolls into view. Renders statically (no animation) under prefers-reduced-motion. */
export function Reveal({ children, className, as = 'div', id }: RevealProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    const Plain = PLAIN_TAG[as]
    return <Plain id={id} className={className}>{children}</Plain>
  }
  const MotionTag = MOTION_TAG[as]
  return (
    <MotionTag
      id={id}
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: '0px 0px -10% 0px' }}
      variants={fadeUp}
    >
      {children}
    </MotionTag>
  )
}

/** Wraps a list; direct RevealItem children stagger in by 50ms once the group scrolls into view. */
export function RevealGroup({ children, className, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    const Plain = PLAIN_TAG[as]
    return <Plain className={className}>{children}</Plain>
  }
  const MotionTag = MOTION_TAG[as]
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: '0px 0px -10% 0px' }}
      variants={stagger}
    >
      {children}
    </MotionTag>
  )
}

/** A single staggered item inside a RevealGroup. */
export function RevealItem({ children, className, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion()
  if (reduced) {
    const Plain = PLAIN_TAG[as]
    return <Plain className={className}>{children}</Plain>
  }
  const MotionTag = MOTION_TAG[as]
  return (
    <MotionTag className={className} variants={fadeUp}>
      {children}
    </MotionTag>
  )
}
