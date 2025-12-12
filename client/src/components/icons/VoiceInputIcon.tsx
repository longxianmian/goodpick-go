import { cn } from '@/lib/utils';

interface VoiceInputIconProps {
  className?: string;
}

export function VoiceInputIcon({ className }: VoiceInputIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-5 h-5", className)}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l1.5-1.5" />
      <path d="M12 9c1.5 1.5 1.5 4.5 0 6" />
      <path d="M14.5 7c2.5 2.5 2.5 7.5 0 10" />
    </svg>
  );
}
