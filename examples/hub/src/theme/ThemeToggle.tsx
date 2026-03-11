import { Icon } from '../icons/Icon';
import { useTheme, type HubTheme } from './ThemeProvider';

const themeIcons: Record<HubTheme, string> = {
  light: 'sun',
  dark: 'moon',
  'high-contrast': 'contrast',
};

const themeLabels: Record<HubTheme, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  'high-contrast': 'High contrast mode',
};

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();

  return (
    <button
      className="btn-github"
      onClick={cycleTheme}
      aria-label={themeLabels[theme]}
      title={themeLabels[theme]}
    >
      <Icon name={themeIcons[theme]} size={18} />
    </button>
  );
}
