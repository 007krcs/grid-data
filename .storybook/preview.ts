import type { Preview } from '@storybook/html';
import '../packages/theme-default/src/index.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
  },
};

export default preview;
