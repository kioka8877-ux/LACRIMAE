import React, {useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import './fonts.css';
import App from './App';

function FontGate() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!document.fonts || !document.fonts.load) {
          throw new Error('Font Loading API indisponible');
        }
        const loaded = await document.fonts.load('400 64px Anton');
        const available = loaded.length > 0 && document.fonts.check('400 64px Anton');
        if (!available) throw new Error('Anton non détectée');
        if (!cancelled) setStatus('ready');
      } catch (error) {
        if (!cancelled) setStatus(error.message || 'Anton non chargée');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status !== 'ready') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f8dd30', display: 'grid', placeItems: 'center', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: 620, padding: 28, textAlign: 'center', border: '1px solid #6b5d00', borderRadius: 12, background: '#151300' }}>
          <h2 style={{ marginTop: 0 }}>⏳ Chargement de la police Anton</h2>
          <p style={{ color: '#ddd' }}>La preview reste bloquée tant que la police locale obligatoire n’est pas disponible.</p>
          {status !== 'loading' && <p style={{ color: '#ff8888' }}>Anton non chargée — rendu non validable : {status}</p>}
        </div>
      </div>
    );
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FontGate />
  </React.StrictMode>
);
