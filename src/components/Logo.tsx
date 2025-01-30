import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <motion.div 
      className={`flex items-center gap-2 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="relative w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-lg overflow-hidden"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="absolute inset-0.5 bg-black rounded-lg flex items-center justify-center text-white font-bold">
          SH
        </div>
      </motion.div>
      <motion.span 
        className="text-lg font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 text-transparent bg-clip-text"
        whileHover={{ scale: 1.05 }}
      >
        SNU Hangout
      </motion.span>
    </motion.div>
  );
} 