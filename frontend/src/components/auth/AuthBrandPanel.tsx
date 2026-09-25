import React from 'react';

export const AuthBrandPanel: React.FC = () => {
  return (
    <div style={styles.authRightPanel} className="auth-right-panel desktop-only" id="auth-right-space">
      {/* Open space reserved for future brand art / showcase */}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  authRightPanel: {
    flex: 1,
    minHeight: '100vh',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
};
