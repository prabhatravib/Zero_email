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
      const sessionToken = searchParams.get('session');

      console.log('Auth callback parameters:', { error, success, email, sessionToken });

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
        
        // If we have a session token in the URL, set it as a cookie
        if (sessionToken) {
          console.log('Gmail session token found, setting cookie');
          // Set cookie on the frontend domain (pitext-email.onrender.com)
          document.cookie = `session=${sessionToken}; path=/; max-age=${24 * 60 * 60}; secure; samesite=strict`;
          
          // Verify the cookie was set
          setTimeout(() => {
            const cookies = document.cookie;
            const sessionCookie = cookies.split(';')
              .find(cookie => cookie.trim().startsWith('session='));
            console.log('Cookie verification - All cookies:', cookies);
            console.log('Cookie verification - Session cookie:', sessionCookie ? 'found' : 'not found');
            
            console.log('Redirecting to /mail after Gmail authentication');
            navigate('/mail');
          }, 1000);
          return;
        }
        
        // If no session token, try to redirect anyway
        console.log('No session token, redirecting to /mail');
        setTimeout(() => {
          navigate('/mail');
        }, 1000);
        return;
      }

      // If no specific parameters, try to get session info
      try {
        console.log('No callback parameters, checking existing session');
        const response = await fetch('/api/auth/get-session', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            toast.success('Gmail session found!');
            console.log('Existing Gmail session found, redirecting to /mail');
            setTimeout(() => {
              navigate('/mail');
            }, 100);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to get Gmail session:', error);
      }

      // Fallback: redirect to home
      console.log('No valid authentication found, redirecting to home');
      toast.error('Gmail authentication failed. Please try again.');
      navigate('/');
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