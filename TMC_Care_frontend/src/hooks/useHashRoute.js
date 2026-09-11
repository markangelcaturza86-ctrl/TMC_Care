import { useEffect, useState, useCallback } from 'react';

function getHash() {
  const raw = window.location.hash.replace(/^#/, '');
  return raw || '/dashboard';
}

export function useHashRoute() {
  const [route, setRoute] = useState(getHash());

  useEffect(() => {
    const onHashChange = () => setRoute(getHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((path) => {
    if (window.location.hash.replace(/^#/, '') === path) {
      setRoute(path);
      return;
    }
    window.location.hash = path;
  }, []);

  return [route, navigate];
}
