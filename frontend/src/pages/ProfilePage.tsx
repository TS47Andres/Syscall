import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useMail } from '../context/MailContext';
import { DedicatedProfilePage } from '../components/profile/DedicatedProfilePage';

export const ProfilePage: React.FC = () => {
  const { isSearchFilterOpen } = useOutletContext<{ isSearchFilterOpen: boolean }>();
  const navigate = useNavigate();
  const {
    currentUser,
    handleUpdateName,
    handleUpdatePhoto,
    handleUpdateProfileDetails,
    handleSignOut,
  } = useMail();

  const handleBackToMail = () => {
    navigate('/mail/inbox');
  };

  return (
    <main style={styles.profileContainer}>
      <DedicatedProfilePage
        currentUser={currentUser}
        onUpdateName={handleUpdateName}
        onUpdatePhoto={handleUpdatePhoto}
        onUpdateProfileDetails={handleUpdateProfileDetails}
        onSignOut={handleSignOut}
        onBackToMail={handleBackToMail}
        isSearchFilterOpen={isSearchFilterOpen}
      />
    </main>
  );
};

const styles: Record<string, React.CSSProperties> = {
  profileContainer: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
    height: '100%',
    minWidth: 0,
  },
};
