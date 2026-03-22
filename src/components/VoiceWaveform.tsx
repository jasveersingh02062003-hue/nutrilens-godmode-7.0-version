import { motion } from 'framer-motion';

interface Props {
  amplitude: number; // 0-1
}

export default function VoiceWaveform({ amplitude }: Props) {
  const bars = 24;

  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: bars }, (_, i) => {
        const distance = Math.abs(i - bars / 2) / (bars / 2);
        const baseHeight = 8;
        const maxExtra = 48 * amplitude;
        const height = baseHeight + maxExtra * Math.max(0, 1 - distance * 1.2) * (0.6 + Math.random() * 0.4);

        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-primary"
            animate={{ height }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            style={{ opacity: 0.4 + amplitude * 0.6 }}
          />
        );
      })}
    </div>
  );
}
