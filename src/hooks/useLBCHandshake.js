import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export const useLBCHandshake = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const handshakeToken = params.get('lbc_handshake');
    if (!handshakeToken) return;

    const consumeToken = async () => {
      try {
        const res = await base44.functions.invoke('lbcUniversalBridge', {
          action: 'verify',
          token: handshakeToken,
          currentDomain: window.location.hostname
        });

        if (res.data?.valid) {
          // Strip the token from the URL cleanly
          const newParams = new URLSearchParams(location.search);
          newParams.delete('lbc_handshake');
          const cleanSearch = newParams.toString();
          navigate({
            pathname: location.pathname,
            search: cleanSearch ? `?${cleanSearch}` : ''
          }, { replace: true });
        }
      } catch (error) {
        console.error('LBC Handshake failed:', error);
      }
    };

    consumeToken();
  }, [location.search]);
};