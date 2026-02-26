import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const NAV_SECTIONS = [
  {
    title: 'Operations',
    items: [{ label: 'Dashboard', to: '/app' }]
  },
  {
    title: 'Workflow',
    items: [{ label: 'Workflows', to: '/app/workflows' }]
  },
  {
    title: 'Services',
    items: [
      { label: 'Extractors', to: '/app/services/extractors' },
      { label: 'Document Folders', to: '/app/services/document-folders' },
      { label: 'Reconciliation', to: '/app/services/reconciliation' },
      { label: 'Data Mapper', to: '/app/services/data-mapper' },
      { label: 'Document Splitting', to: '/app/services/document-splitting' },
      { label: 'Document Categorisation', to: '/app/services/document-categorisation' }
    ]
  }
];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);

  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .map((name) => name[0])
    .join('')
    .toUpperCase();

  const fallbackInitial = user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="brand-block">
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-title">Project Fibula-1</div>
            <div className="brand-subtitle">Workflow-first document ETL</div>
          </div>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="workspace-nav">
          <div className="user-card">
            <div className="user-avatar">{initials || fallbackInitial}</div>
            <div>
              <div className="user-name">
                {profile?.firstName || profile?.lastName
                  ? `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
                  : 'Welcome'}
              </div>
              <div className="user-email">{user?.email || 'unknown user'}</div>
            </div>
          </div>
          <div className="user-actions">
            <NavLink className="btn btn-ghost" to="/app/settings">
              Profile & Preferences
            </NavLink>
            <button type="button" className="btn btn-soft" onClick={signOut}>
              Sign out
            </button>
          </div>

          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="nav-section-title">{section.title}</div>
              <nav className="nav-list">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/app'}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </aside>

        <section className="workspace-main">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
