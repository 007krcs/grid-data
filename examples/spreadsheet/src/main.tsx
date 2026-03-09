import { createRoot } from 'react-dom/client';
import { ErrorCatcher } from '../../shared/ErrorCatcher';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);
root.render(
  <ErrorCatcher>
    <App />
  </ErrorCatcher>
);
