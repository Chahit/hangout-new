import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

const Modal = ({ children, onClose, maxWidth = 'max-w-lg' }: ModalProps) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} mx-auto`}
      >
        {children}
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

export default Modal; 