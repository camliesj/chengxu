import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SCREEN_CATALOG } from './screen-catalog.js';
import { SCREEN_REGISTRY } from './screens/registry.jsx';
import { AtlasBoard } from './components/AtlasBoard.jsx';
import './tokens.css';
import './app.css';

function UnknownScreen({ id }) {
  return (
    <main className="atlas-root">
      <section className="phone-shell">
        <div className="phone-shell__status">
          <span>Android UI Atlas</span>
          <span>{id}</span>
        </div>
        <div className="phone-shell__body">
          <div className="unknown-screen">
            <p className="unknown-screen__eyebrow">Unknown screen</p>
            <h1>{id}</h1>
            <p>No prototype screen is registered for this id yet.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

const searchParams = new URLSearchParams(location.search);
const atlasGroup = searchParams.get('atlas');
const screenId = searchParams.get('screen') ?? SCREEN_CATALOG[0].id;
const Screen = SCREEN_REGISTRY[screenId];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {atlasGroup ? <AtlasBoard group={atlasGroup} /> : Screen ? <Screen /> : <UnknownScreen id={screenId} />}
  </StrictMode>,
);
