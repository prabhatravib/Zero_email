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
        
        // Session is now managed via HTTP-only cookies set by the backend
        // No need to store anything in localStorage
        
        // Check if we have a valid session
        try {
          const response = await fetch('/api/auth/get-session', {
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              console.log('Valid session found, redirecting to /mail');
              navigate('/mail');
              return;
            }
          }
        } catch (error) {
          console.error('Failed to validate session:', error);
        }
        
        // If session validation fails, still redirect to mail (session will be checked there)
        console.log('Redirecting to /mail');
        navigate('/mail');
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