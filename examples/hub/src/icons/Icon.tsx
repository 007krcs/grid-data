import { iconPaths } from './paths';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = 'currentColor', className, strokeWidth = 2 }: IconProps) {
  const children = iconPaths[name];
  if (!children) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
         fill="none" stroke={color} strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round"
         className={className}>
      {children}
    </svg>
  );
}
