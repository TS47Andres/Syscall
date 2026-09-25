import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '../types';
import { AuthScreen } from '../components/auth/AuthScreen';

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isSignUp = location.pathname.includes('signup') || location.pathname.includes('create');
  const initialMode = isSignUp ? 'create' : 'signin';

  const handleNavigateMode = (mode: 'signin' | 'create') => {
    if (mode === 'create') {
      navigate('/signup');
    } else {
      navigate('/login');
    }
  };

  const handleSuccess = (user: User) => {
    onAuthSuccess(user);
    navigate('/mail/inbox', { replace: true });
  };

  return (
    <AuthScreen
      initialMode={initialMode}
      onNavigateMode={handleNavigateMode}
      onSuccess={handleSuccess}
    />
  );
};
