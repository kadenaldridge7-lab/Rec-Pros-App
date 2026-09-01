import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const initialReceipt = {
  merchant: 'Green Valley Market',
  date: 'Sep 1, 2026',
  total: '42.68',
  category: 'Groceries',
};

function App() {
  const [screen, setScreen] = useState('more');
  const [receipt, setReceipt] = useState(initialReceipt);
  const [image, setImage] = useState('');
  const galleryInput = useRef(null);
  const cameraInput = useRef(null);

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImage(URL.createObjectURL(file));
    // This is where the receipt-recognition service result is applied. The UI
    // intentionally moves on without another button press once a photo exists.
    setScreen('processing');
    window.setTimeout(() => setScreen('confirm'), 1150);
  };

  const update = (field, value) => setReceipt((current) => ({ ...current, [field]: value }));

  if (screen === 'processing') return <main className="app"><div className="scanner"><div className="scan-icon">⌁</div><h1>Reading your receipt</h1><p>We’re finding the merchant, date, total, and category.</p><div className="progress"><span /></div></div></main>;

  if (screen === 'confirm') return <main className="app"><header className="topbar"><button className="back" onClick={() => setScreen('more')}>‹</button><span>Confirm receipt</span><button className="text-button" onClick={() => setScreen('more')}>Cancel</button></header><section className="confirm"><div className="success-mark">✓</div><p className="eyebrow">RECEIPT FOUND</p><h1>Does this look right?</h1><p className="subcopy">We filled these in from your receipt. Make any edits before saving.</p>{image && <img className="receipt-preview" src={image} alt="Selected receipt" />}<div className="fields"><label>Merchant<input value={receipt.merchant} onChange={(e) => update('merchant', e.target.value)} /></label><div className="field-row"><label>Date<input value={receipt.date} onChange={(e) => update('date', e.target.value)} /></label><label>Total<input className="money" value={`$${receipt.total}`} onChange={(e) => update('total', e.target.value.replace('$', ''))} /></label></div><label>Category<select value={receipt.category} onChange={(e) => update('category', e.target.value)}><option>Groceries</option><option>Dining</option><option>Travel</option><option>Shopping</option><option>Other</option></select></label></div><button className="primary" onClick={() => setScreen('saved')}>Confirm &amp; save</button><button className="retake" onClick={() => cameraInput.current?.click()}>Use a different photo</button></section><input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={handleImage} /></main>;

  if (screen === 'saved') return <main className="app"><div className="scanner"><div className="success-mark">✓</div><h1>Receipt saved</h1><p>{receipt.merchant} was added to your expenses.</p><button className="primary" onClick={() => setScreen('more')}>Done</button></div></main>;

  return <main className="app"><header className="more-header"><p className="greeting">GOOD MORNING</p><h1>More</h1><div className="avatar">JD</div></header><section className="hero"><div><p className="eyebrow">EXPENSES, SIMPLIFIED</p><h2>Keep every receipt<br />in one place.</h2><p>Take a photo and we’ll do the rest.</p></div><div className="receipt-art">$<span>✓</span></div></section><section className="actions"><h2>Add a receipt</h2><p className="section-copy">We’ll automatically read the details and ask you to confirm them.</p><button className="action-card" onClick={() => cameraInput.current?.click()}><span className="action-icon">⌑</span><span><strong>Take a photo</strong><small>Use your camera to scan a receipt</small></span><b>›</b></button><button className="action-card" onClick={() => galleryInput.current?.click()}><span className="action-icon">▧</span><span><strong>Upload from photos</strong><small>Choose a receipt you already took</small></span><b>›</b></button></section><nav><span>⌂<small>Home</small></span><span>▤<small>Activity</small></span><span className="active">•••<small>More</small></span></nav><input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={handleImage} /><input ref={galleryInput} className="hidden" type="file" accept="image/*" onChange={handleImage} /></main>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
