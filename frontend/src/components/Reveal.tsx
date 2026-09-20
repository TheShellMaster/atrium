import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Apparition lente (« slow motion ») : fondu + glissement, une seule fois. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  duration = 0.9,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number; duration?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Conteneur qui décale l'apparition de ses enfants. */
export function RevealGroup({
  children,
  stagger = 0.08,
  className,
}: {
  children: ReactNode;
  stagger?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
        show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
