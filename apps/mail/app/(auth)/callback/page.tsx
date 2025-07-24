import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get('error');
      const code = searchParams.get('code');
      const success = searchParams.get('success');
      const email = searchParams.get('email');
      const sessionToken = searchParams.get('session');

      // Handle OAuth errors
      if (error) {
        console.error('Authentication error:', error);
        toast.error(`Authentication failed: ${error}`);
        navigate('/login');
        return;
      }

      // Handle success redirect from server
      if (success === 'true' && email) {
        toast.success(`Successfully authenticated as ${email}`);
        
        // If we have a session token in the URL, set it as a cookie
        if (sessionToken) {
          console.log('Session token found in URL, setting cookie');
          document.cookie = `session=${sessionToken}; path=/; secure; samesite=none; domain=${window.location.hostname}; max-age=${24 * 60 * 60}`;
        }
        
        // Debug: Check session before redirecting
        try {
          const sessionResponse = await fetch(`${import.meta.env.VITE_PUBLIC_BACKEND_URL}/api/auth/get-session`, {
            credentials: 'include',
          });
          
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            console.log('Session data before redirect:', sessionData);
            
            if (sessionData.user) {
              // Session is valid, redirect to mail
              console.log('Session valid, redirecting to /mail/inbox');
              setTimeout(() => {
                navigate('/mail/inbox');
              }, 500); // Increased delay
              return;
            } else {
              console.log('Session not found, will try to exchange code');
            }
          }
        } catch (error) {
          console.error('Failed to check session:', error);
        }
        
        // If session check failed, try code exchange as fallback
        console.log('Falling back to code exchange');
        return; // Don't return here, let it continue to code exchange
      }

      // Handle OAuth code exchange
      if (code) {
        try {
          toast.loading('Completing authentication...');
          
          // Exchange code for tokens via backend
          const response = await fetch(`${import.meta.env.VITE_PUBLIC_BACKEND_URL}/api/auth/exchange-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (data.success && data.user) {
            toast.success(`Successfully authenticated as ${data.user.email}`);
            console.log('Code exchange successful, user data:', data.user);
            
            // Verify session was set
            try {
              const sessionResponse = await fetch(`${import.meta.env.VITE_PUBLIC_BACKEND_URL}/api/auth/get-session`, {
                credentials: 'include',
              });
              
              if (sessionResponse.ok) {
                const sessionData = await sessionResponse.json();
                console.log('Session after code exchange:', sessionData);
                
                if (sessionData.user) {
                  console.log('Session verified, redirecting to /mail/inbox');
                  setTimeout(() => {
                    navigate('/mail/inbox');
                  }, 500);
                  return;
                }
              }
            } catch (error) {
              console.error('Failed to verify session after code exchange:', error);
            }
            
            // If session verification failed, still try to redirect
            console.log('Session verification failed, but attempting redirect anyway');
            setTimeout(() => {
              navigate('/mail/inbox');
            }, 500);
            return;
          } else {
            throw new Error(data.error || 'Authentication failed');
          }
        } catch (error) {
          console.error('OAuth code exchange failed:', error);
          toast.error('Authentication failed. Please try again.');
          navigate('/login');
          return;
        }
      }

      // If no specific parameters, try to get session info
      try {
        const response = await fetch(`${import.meta.env.VITE_PUBLIC_BACKEND_URL}/api/auth/get-session`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            toast.success('Successfully authenticated!');
            // Add a small delay to ensure session is set
            setTimeout(() => {
              navigate('/mail/inbox');
            }, 100);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to get session:', error);
      }

      // Fallback: redirect to login
      toast.error('Authentication failed. Please try again.');
      navigate('/login');
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
} 