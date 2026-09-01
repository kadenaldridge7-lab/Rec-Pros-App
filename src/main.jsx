import { StrictMode, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE = import.meta.env.VITE_RECPROS_API_BASE_URL || 'https://recpros-agents.vercel.app';

const blankReceipt = {
  is_receipt: true,
  merchant: '',
  date: '',
  subtotal: null,
  tax: null,
  tip: null,
  total: null,
  currency: 'USD',
  category: 'Other',
  city: '',
  business_purpose: '',
  confidence: 0,
  needs_review: false,
};

function AppNav({ tab, setTab }) {
  return (
    <nav>
      <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>⌂<small>Home</small></button>
      <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>▤<small>Activity</small></button>
      <button className={tab === 'more' ? 'active' : ''} onClick={() => setTab('more')}>•••<small>More</small></button>
    </nav>
  );
}

function App() {
  const [tab, setTab] = useState('home');
  const [flow, setFlow] = useState('idle');
  const [receipt, setReceipt] = useState(blankReceipt);
  const [image, setImage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [savedExpenseId, setSavedExpenseId] = useState('');
  const galleryInput = useRef(null);
  const cameraInput = useRef(null);

  const accessToken = useMemo(() => window.localStorage.getItem('recpros_api_token') || '', []);
  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const resetReceiptFlow = () => {
    setFlow('idle');
    setReceipt(blankReceipt);
    setImage('');
    setSelectedFile(null);
    setError('');
    setSavedExpenseId('');
    setTab('more');
  };

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImage(URL.createObjectURL(file));
    setError('');
    setFlow('processing');

    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch(`${API_BASE}/receipts/extract`, {
        method: 'POST',
        headers: authHeaders,
        body,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || `Receipt scan failed (${response.status}).`);
      }
      const draft = await response.json();
      setReceipt({ ...blankReceipt, ...draft, total: draft.total ?? null });
      setFlow('confirm');
    } catch (scanError) {
      setError(scanError.message || 'The receipt could not be read.');
      setFlow('error');
    }
  };

  const update = (field, value) => {
    const numericFields = new Set(['subtotal', 'tax', 'tip', 'total']);
    setReceipt((current) => ({
      ...current,
      [field]: numericFields.has(field) ? (value === '' ? null : Number(value)) : value,
    }));
  };

  const confirmAndSave = async () => {
    if (!selectedFile) return;
    setFlow('saving');
    setError('');

    try {
      const body = new FormData();
      body.append('file', selectedFile);
      body.append('draft_json', JSON.stringify(receipt));
      const response = await fetch(`${API_BASE}/receipts/confirm`, {
        method: 'POST',
        headers: authHeaders,
        body,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || `Expense save failed (${response.status}).`);
      }

      const pdf = await response.blob();
      const expenseId = response.headers.get('X-Expense-ID') || 'recpros-expense';
      const url = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${expenseId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSavedExpenseId(expenseId);
      setFlow('saved');
    } catch (saveError) {
      setError(saveError.message || 'The expense could not be saved.');
      setFlow('confirm');
    }
  };

  if (flow === 'processing' || flow === 'saving') {
    return <main className="app"><div className="scanner"><div className="scan-icon">⌁</div><h1>{flow === 'processing' ? 'Reading your receipt' : 'Saving your expense'}</h1><p>{flow === 'processing' ? 'Finding the merchant, date, total, tax, and category automatically.' : 'Creating the expense record and PDF.'}</p><div className="progress"><span /></div></div></main>;
  }

  if (flow === 'error') {
    return <main className="app"><header className="topbar"><button className="back" onClick={resetReceiptFlow}>‹</button><span>Receipt scanner</span><button className="text-button" onClick={resetReceiptFlow}>Cancel</button></header><section className="confirm"><div className="error-mark">!</div><p className="eyebrow">SCAN NEEDS ATTENTION</p><h1>We couldn’t read that receipt.</h1><p className="subcopy">{error}</p><button className="primary" onClick={() => cameraInput.current?.click()}>Try another photo</button></section><input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={handleImage} /></main>;
  }

  if (flow === 'confirm') {
    return <main className="app"><header className="topbar"><button className="back" onClick={resetReceiptFlow}>‹</button><span>Confirm receipt</span><button className="text-button" onClick={resetReceiptFlow}>Cancel</button></header><section className="confirm"><div className="success-mark">✓</div><p className="eyebrow">RECEIPT FOUND</p><h1>Does this look right?</h1><p className="subcopy">We filled these in automatically. Make any correction you need, then confirm once.</p>{image && <img className="receipt-preview" src={image} alt="Selected receipt" />}<div className="fields"><label>Merchant<input value={receipt.merchant || ''} onChange={(e) => update('merchant', e.target.value)} /></label><div className="field-row"><label>Date<input value={receipt.date || ''} onChange={(e) => update('date', e.target.value)} /></label><label>Total<input className="money" inputMode="decimal" value={receipt.total ?? ''} onChange={(e) => update('total', e.target.value)} /></label></div><label>Category<select value={receipt.category || 'Other'} onChange={(e) => update('category', e.target.value)}><option>Materials</option><option>Equipment Rental</option><option>Fuel</option><option>Travel</option><option>Meals</option><option>Office</option><option>Other</option></select></label><label>Business purpose<input value={receipt.business_purpose || ''} onChange={(e) => update('business_purpose', e.target.value)} placeholder="Job or reason for expense" /></label></div>{error && <p className="inline-error">{error}</p>}<button className="primary" onClick={confirmAndSave}>Looks correct</button><button className="retake" onClick={() => cameraInput.current?.click()}>Use a different photo</button></section><input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={handleImage} /></main>;
  }

  if (flow === 'saved') {
    return <main className="app"><div className="scanner"><div className="success-mark">✓</div><h1>Expense saved</h1><p>{receipt.merchant} was added and its PDF was generated{savedExpenseId ? ` as ${savedExpenseId}` : ''}.</p><button className="primary" onClick={resetReceiptFlow}>Done</button></div></main>;
  }

  return <main className="app">
    {tab === 'home' && <><header className="more-header"><p className="greeting">REC PROS</p><h1>Home</h1><div className="avatar">RP</div></header><section className="hero"><div><p className="eyebrow">BUSINESS CONTROL CENTER</p><h2>Run the field.<br />Know the numbers.</h2><p>Jobs, expenses, receipts, and activity in one place.</p></div><div className="receipt-art">RP<span>✓</span></div></section><section className="actions"><h2>Quick actions</h2><button className="action-card" onClick={() => { setTab('more'); cameraInput.current?.click(); }}><span className="action-icon">⌑</span><span><strong>Scan receipt</strong><small>Auto-fill an expense from a photo</small></span><b>›</b></button><button className="action-card" onClick={() => setTab('activity')}><span className="action-icon">▤</span><span><strong>View activity</strong><small>See recent Rec Pros records</small></span><b>›</b></button></section></>}

    {tab === 'activity' && <><header className="more-header"><p className="greeting">REC PROS</p><h1>Activity</h1><div className="avatar">RP</div></header><section className="actions"><h2>Recent business activity</h2><p className="section-copy">Confirmed receipts and expense records will appear here as the live data layer is connected.</p><div className="empty-card"><strong>No synced activity yet</strong><span>Your first confirmed receipt will create the first expense record.</span></div></section></>}

    {tab === 'more' && <><header className="more-header"><p className="greeting">REC PROS</p><h1>More</h1><div className="avatar">RP</div></header><section className="hero"><div><p className="eyebrow">MONEY & EXPENSES</p><h2>Keep every receipt<br />with the job.</h2><p>Take or upload a receipt. Rec Pros fills it in.</p></div><div className="receipt-art">$<span>✓</span></div></section><section className="actions"><h2>Add a receipt</h2><p className="section-copy">The only expense action after scanning is “Looks correct.”</p><button className="action-card" onClick={() => cameraInput.current?.click()}><span className="action-icon">⌑</span><span><strong>Take a photo</strong><small>Open the camera and scan a receipt</small></span><b>›</b></button><button className="action-card" onClick={() => galleryInput.current?.click()}><span className="action-icon">▧</span><span><strong>Upload from photos</strong><small>Use a receipt already on your phone</small></span><b>›</b></button></section></>}

    <AppNav tab={tab} setTab={setTab} />
    <input ref={cameraInput} className="hidden" type="file" accept="image/*" capture="environment" onChange={handleImage} />
    <input ref={galleryInput} className="hidden" type="file" accept="image/*" onChange={handleImage} />
  </main>;
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
