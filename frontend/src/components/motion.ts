/** Shared motion language. Durations are seconds because Framer Motion uses seconds. */
export const motionTokens = {
  instant: 0.09,
  fast: 0.13,
  normal: 0.18,
  relaxed: 0.24,
  emphasis: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const dashboardEntrance = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: motionTokens.normal, ease: motionTokens.ease },
};
