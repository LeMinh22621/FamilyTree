import React from 'react';

export default function Header({ user, onLogout }) {
  return (
    <header className="ft-header">
      <div className="header-decor-top">
        {/* Left dragon ornament */}
        <div className="decor-dragon left">
          <svg viewBox="0 0 140 90" width="120" height="76">
            <path d="M10 80 Q20 30 50 50 Q80 70 100 25 Q110 10 130 15" stroke="#c8a44e" strokeWidth="3" fill="none"/>
            <path d="M15 75 Q25 35 50 52 Q75 65 98 28 Q108 15 125 18" stroke="#d4af37" strokeWidth="2" fill="none"/>
            <circle cx="130" cy="15" r="4" fill="#d4af37"/>
            <path d="M5 78 Q8 72 14 75" stroke="#c8a44e" strokeWidth="2" fill="none"/>
          </svg>
        </div>

        {/* Center banner */}
        <div className="header-banner">
          <div className="banner-scroll">
            <div className="banner-top-ornament">
              <svg viewBox="0 0 240 24" width="240" height="24">
                <path d="M0 22 Q60 2 120 14 Q180 2 240 22" stroke="#d4af37" strokeWidth="2" fill="none"/>
                <circle cx="120" cy="10" r="4" fill="#d4af37"/>
                <circle cx="60" cy="12" r="2.5" fill="#c8a44e"/>
                <circle cx="180" cy="12" r="2.5" fill="#c8a44e"/>
              </svg>
            </div>
            <h1 className="banner-title">GIA PHẢ</h1>
            <h2 className="banner-subtitle">DÒNG HỌ {user?.clanName ? user.clanName.toUpperCase() : ''}</h2>
            <div className="banner-bottom-ornament">
              <svg viewBox="0 0 240 18" width="240" height="18">
                <path d="M10 2 Q60 16 120 8 Q180 16 230 2" stroke="#d4af37" strokeWidth="2" fill="none"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Right dragon ornament */}
        <div className="decor-dragon right">
          <svg viewBox="0 0 140 90" width="120" height="76">
            <path d="M130 80 Q120 30 90 50 Q60 70 40 25 Q30 10 10 15" stroke="#c8a44e" strokeWidth="3" fill="none"/>
            <path d="M125 75 Q115 35 90 52 Q65 65 42 28 Q32 15 15 18" stroke="#d4af37" strokeWidth="2" fill="none"/>
            <circle cx="10" cy="15" r="4" fill="#d4af37"/>
            <path d="M135 78 Q132 72 126 75" stroke="#c8a44e" strokeWidth="2" fill="none"/>
          </svg>
        </div>
      </div>

      {/* User bar */}
      {user && (
        <div className="header-userbar">
          <div className="userbar-info">
            <span className="userbar-name">{user.displayName}</span>
            <span className={`userbar-role ${user.role}`}>
              {user.role === 'sysadmin' ? '� Quản trị hệ thống' : user.role === 'admin' ? '�🛡 Quản trị viên' : '👁 Chỉ xem'}
            </span>
            {user.clanName && <span className="userbar-clan">{user.clanName}</span>}
          </div>
          <button className="userbar-logout" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      )}
    </header>
  );
}
