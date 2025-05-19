import React from 'react';
import ReactDOM from 'react-dom/client';
import NowPlaying from './components/NowPlaying';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NowPlaying /> 
  </React.StrictMode>
);
