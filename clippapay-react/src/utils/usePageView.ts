import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-0HGFW8728G', {
        page_path: location.pathname,
      });
    }
  }, [location]);
}
