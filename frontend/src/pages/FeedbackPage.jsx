import React, { useState } from 'react';
import Icon from '../components/Icon';

const CATEGORIES = ['Bug Report', 'Feature Request', 'UI / Design', 'AI Accuracy', 'Performance', 'Other'];
const RATINGS    = [1, 2, 3, 4, 5];

export default function FeedbackPage() {
  const [category, setCategory] = useState('');
  const [rating, setRating]     = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage]   = useState('');
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!category)         { setError('Please select a category.'); return; }
    if (!message.trim())   { setError('Please describe your feedback.'); return; }
    // In a real implementation, send to Appwrite or an API endpoint here.
    console.log('[Feedback submitted]', { category, rating, message, email });
    setSubmitted(true);
  };

  const handleReset = () => {
    setCategory(''); setRating(0); setMessage(''); setEmail(''); setSubmitted(false); setError('');
  };

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 620 }}>
        <div>
          <h1 className="page-heading">Feedback</h1>
          <p className="page-subheading">Help us improve InsideInvest.</p>
        </div>
        <div className="card card-padded" style={{ textAlign: 'center', padding: '48px 40px' }}>
          <div style={{ marginBottom: 16 }}>
            <Icon name="check" size={44} color="var(--color-invest)" />
          </div>
          <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Thank you for your feedback!
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
            Your input helps make InsideInvest better for everyone. We review all submissions carefully.
          </p>
          <button className="btn-ghost" onClick={handleReset}>Submit more feedback</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 620 }}>
      <div>
        <h1 className="page-heading">Feedback</h1>
        <p className="page-subheading">Found a bug? Have an idea? We'd love to hear from you.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Star rating */}
        <div className="card card-padded">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon"><Icon name="award" size={15} color="var(--color-brand)" /></div>
              Overall Experience
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RATINGS.map(n => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '2rem', lineHeight: 1, padding: '2px 4px',
                  color: n <= (hoverRating || rating) ? '#F59E0B' : '#D1D5DB',
                  transition: 'color 0.15s, transform 0.1s',
                  transform: n <= (hoverRating || rating) ? 'scale(1.15)' : 'scale(1)',
                }}
              >★</button>
            ))}
            {rating > 0 && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 8 }}>
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
              </span>
            )}
          </div>
        </div>

        {/* Category + message */}
        <div className="card card-padded">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon"><Icon name="message" size={15} color="var(--color-brand)" /></div>
              Your Feedback
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="settings-field">
              <label className="settings-field-label">Category</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`audit-tag-btn${category === c ? ' selected' : ''}`}
                    style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-field">
              <label className="settings-field-label">Description</label>
              <textarea
                className="feedback-textarea"
                placeholder="Describe your feedback in detail — steps to reproduce a bug, what feature you'd like to see, etc."
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ minHeight: 120 }}
              />
            </div>

            <div className="settings-field">
              <label className="settings-field-label">Email (optional)</label>
              <input
                className="settings-input"
                type="email"
                placeholder="your@email.com — if you'd like a reply"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="auth-error" style={{ marginBottom: 0 }}>
                <Icon name="alert" size={14} color="var(--color-pass)" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-brand" style={{ padding: '11px 28px', alignSelf: 'flex-start', borderRadius: 50 }}>
              Submit Feedback
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
