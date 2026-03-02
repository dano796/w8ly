import { Variants } from "framer-motion";

// Configuración de transición optimizada para móviles
export const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export const fastTransition = {
  duration: 0.2,
  ease: "easeOut" as const,
};

// Variantes para páginas
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Variantes para listas con efecto stagger
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: fastTransition,
  },
};

// Animación para botones y elementos interactivos
export const tapAnimation = {
  scale: 0.95,
  transition: { duration: 0.1 },
};

// Animación para modals/sheets desde abajo
export const sheetVariants: Variants = {
  initial: { y: "100%", opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: fastTransition,
  },
};

// Animación para fade in simple
export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Animación para elementos que aparecen con scale
export const scaleInVariants: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", damping: 20, stiffness: 300 },
  },
};

// Animación para el logo central
export const logoVariants: Variants = {
  initial: { scale: 1 },
  tap: { scale: 0.85, transition: { duration: 0.1 } },
  hover: { scale: 1.05, transition: { duration: 0.2 } },
};
