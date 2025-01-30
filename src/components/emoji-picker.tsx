'use client';

import { useEffect, useRef } from 'react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_LIST = [
  '👍', '❤️', '😊', '😂', '🎉', '👏', '🙌', '💪',
  '🤔', '👀', '🔥', '💯', '✨', '🌟', '💫', '💡',
  '📚', '💻', '🎯', '🎮', '🎵', '🎨', '📷', '☕️'
];

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
      ref={containerRef} 
      className="bg-gray-900 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1"
      style={{ width: '240px' }}
    >
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onEmojiSelect(emoji)}
          className="w-7 h-7 flex items-center justify-center hover:bg-gray-800 rounded transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
} 