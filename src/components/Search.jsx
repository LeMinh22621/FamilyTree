import React from 'react';

export default function Search({ onSearch }) {
  const [q, setQ] = React.useState('');
  const [moPhan, setMoPhan] = React.useState('');

  const submit = (e) => {
    e.preventDefault();
    onSearch({ q: q.trim(), moPhan: moPhan.trim() || null });
  };

  return (
    <section className="ft-search">
      <h2 className="section-title">Tìm kiếm</h2>
      <form onSubmit={submit} className="search-form">
        <input aria-label="tên" placeholder="Tên..." value={q} onChange={(e) => setQ(e.target.value)} />
        <input aria-label="mộ phần" placeholder="Mộ phần..." value={moPhan} onChange={(e) => setMoPhan(e.target.value)} />
        <button type="submit" className="btn">Tìm</button>
      </form>
    </section>
  );
}
