// "use client"

// import { motion } from "framer-motion"
// import type { ReactNode } from "react"

// interface StepTransitionProps {
//   children: ReactNode
//   direction: number
//   stepKey: string | number
// }

// export default function StepTransition({ children, direction, stepKey }: StepTransitionProps) {
//   const variants = {
//     enter: (direction: number) => ({
//       x: direction > 0 ? "100%" : "-100%",
//       opacity: 0,
//       scale: 0.9,
//     }),
//     center: {
//       x: 0,
//       opacity: 1,
//       scale: 1,
//       transition: {
//         duration: 0.5,
//         type: "spring",
//         stiffness: 300,
//         damping: 30,
//       },
//     },
//     exit: (direction: number) => ({
//       x: direction > 0 ? "-100%" : "100%",
//       opacity: 0,
//       scale: 0.9,
//       transition: {
//         duration: 0.5,
//       },
//     }),
//   }

//   return (
//     <motion.div
//       key={stepKey}
//       custom={direction}
//       variants={variants}
//       initial="enter"
//       animate="center"
//       exit="exit"
//       className="w-full"
//     >
//       {children}
//     </motion.div>
//   )
// }
