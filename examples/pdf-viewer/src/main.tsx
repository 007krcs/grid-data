import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorCatcher } from '../../shared/ErrorCatcher';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorCatcher>
      <App />
    </ErrorCatcher>
  </React.StrictMode>,
);
