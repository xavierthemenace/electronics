/**
 * Application entry point.
 *
 * @module main
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';
import { App } from './ui/App.js';
import './style.css';

// Enable Immer Map/Set support for the circuit store
enableMapSet();

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);