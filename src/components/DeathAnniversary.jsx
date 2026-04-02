import React from 'react';

// Compute upcoming anniversaries (giỗ) from ngayMat
export default function DeathAnniversary({ members = [], daysAhead = 60 }) {
  const today = new Date();

  // Helper to get next occurrence of month/day from a date string
  const nextOccurrence = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const month = d.getMonth();
    const day = d.getDate();

    let occ = new Date(today.getFullYear(), month, day);
    if (occ < today) occ = new Date(today.getFullYear() + 1, month, day);
    return occ;
  };

  // Build list with days until next giỗ
  const list = members
    .map((m) => {
      const occ = nextOccurrence(m.ngayMat);
      if (!occ) return null;
      const diffDays = Math.ceil((occ - today) / (1000 * 60 * 60 * 24));
      return { member: m, occ, diffDays };
    })
    .filter(Boolean)
    .filter((x) => x.diffDays >= 0 && x.diffDays <= daysAhead)
    .sort((a, b) => a.diffDays - b.diffDays);

  return (
    <section className="ft-anniv">
      <h2 className="section-title">Giỗ sắp tới (trong {daysAhead} ngày)</h2>
      {list.length === 0 ? (
        <p>Không có giỗ sắp tới trong khoảng thời gian này.</p>
      ) : (
        <ul className="anniv-list">
          {list.map((item) => (
            <li key={item.member.id} className="anniv-item">
              <div className="anniv-left">
                <strong>{item.member.tenTu}</strong>
                <div className="anniv-meta">Mộ phần: {item.member.moPhan || '—'}</div>
              </div>
              <div className="anniv-right">
                <div>{item.occ.toLocaleDateString()}</div>
                <div className="muted">còn {item.diffDays} ngày</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
