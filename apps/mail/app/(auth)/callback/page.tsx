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
          
          // Clear any existing session cookies first
          document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          
          // Set the new session cookie with proper attributes
          const cookieValue = `session=${sessionToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
          document.cookie = cookieValue;
          
          // Verify the cookie was set
          setTimeout(() => {
            const cookies = document.cookie;
            const sessionCookies = cookies.split(';')
              .filter(cookie => cookie.trim().startsWith('session='));
            
            console.log('Cookie verification - All cookies:', cookies);
            console.log('Cookie verification - Session cookies found:', sessionCookies.length);
            
            if (sessionCookies.length === 1) {
              console.log('Cookie verification - Single session cookie set successfully');
              console.log('Redirecting to /mail/inbox after setting session cookie');
              navigate('/mail/inbox');
            } else {
              console.error('Cookie verification - Multiple or no session cookies found');
              // Try to redirect anyway
              navigate('/mail/inbox');
            }
          }, 1000);
          return;
        }
        
        // If no session token, try to redirect anyway
        console.log('No session token, redirecting to /mail/inbox');
        setTimeout(() => {
          navigate('/mail/inbox');
        }, 1000);
        return;
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
            
            // Set session cookie if provided
            if (data.sessionToken) {
              // Clear any existing session cookies first
              document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
              
              // Set the new session cookie
              const cookieValue = `session=${data.sessionToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
              document.cookie = cookieValue;
            }
            
            // Redirect immediately after successful code exchange
            console.log('Redirecting to /mail/inbox after code exchange');
            setTimeout(() => {
              navigate('/mail/inbox');
            }, 1000);
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