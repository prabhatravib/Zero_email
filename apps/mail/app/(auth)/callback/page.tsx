import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get('error');
      const success = searchParams.get('success');
      const email = searchParams.get('email');
      const exchangeToken = searchParams.get('exchange');

      console.log('Auth callback parameters:', { error, success, email, exchangeToken });

      // Handle OAuth errors
      if (error) {
        console.error('Gmail authentication error:', error);
        toast.error(`Gmail authentication failed: ${error}`);
        navigate('/');
        return;
      }

      // Handle successful Gmail authentication
      if (success === 'true' && email) {
        toast.success(`Successfully connected to Gmail as ${email}`);
        
        // Exchange the exchange token for a session token
        if (exchangeToken) {
          try {
            const response = await fetch('/api/auth/exchange-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ exchangeToken }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.sessionId) {
                // Store session token in localStorage for cross-domain access
                localStorage.setItem('gmail_session_token', data.sessionId);
                console.log('Session token stored in localStorage');
                
                // Redirect to mail with valid session
                console.log('Valid session established, redirecting to /mail');
                navigate('/mail');
                return;
              }
            } else {
              const errorData = await response.json();
              console.error('Exchange token failed:', errorData);
            }
          } catch (error) {
            console.error('Failed to exchange token:', error);
          }
        }
        
        // If no exchange token or exchange fails, redirect to login
        console.log('No exchange token or exchange failed, redirecting to login');
        toast.error('Gmail authentication failed. Please try again.');
        navigate('/login');
        return;
      }

      // If no specific parameters, try to get session info
      try {
        console.log('No callback parameters, checking existing session');
        
        // Get session token from localStorage
        const sessionToken = localStorage.getItem('gmail_session_token');
        
        const headers: Record<string, string> = {};
        if (sessionToken) {
          headers['X-Session-Token'] = sessionToken;
        }
        
        const response = await fetch('/api/auth/get-session', {
          credentials: 'include',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            toast.success('Gmail session found!');
            console.log('Existing Gmail session found, redirecting to /mail');
            navigate('/mail');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to get Gmail session:', error);
      }

      // Fallback: redirect to login
      console.log('No valid authentication found, redirecting to login');
      toast.error('Gmail authentication failed. Please try again.');
      navigate('/login');
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Connecting to Gmail...</p>
      </div>
    </div>
  );
} 