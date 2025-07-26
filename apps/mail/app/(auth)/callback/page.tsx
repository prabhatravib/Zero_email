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
      const name = searchParams.get('name');
      const picture = searchParams.get('picture');
      const exchangeToken = searchParams.get('exchange');

      console.log('Auth callback parameters:', { error, success, email, name, picture, exchangeToken });

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
        
        // Store user data in localStorage for now (temporary solution)
        const userData = {
          email,
          name: name || email,
          picture: picture || '',
          authenticated: true,
          timestamp: Date.now()
        };
        
        // Store both user data and session token for compatibility
        localStorage.setItem('gmail_user_data', JSON.stringify(userData));
        
        // Create a session token that the server can validate
        const sessionToken = btoa(JSON.stringify({
          email,
          name: name || email,
          picture: picture || '',
          access_token: 'temp_token', // Placeholder for now
          refresh_token: 'temp_refresh', // Placeholder for now
          expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
        }));
        
        localStorage.setItem('gmail_session_token', sessionToken);
        console.log('DEBUG: sessionToken stored:', sessionToken);
        console.log('DEBUG: sessionToken length:', sessionToken.length);
        console.log('DEBUG: sessionToken type:', typeof sessionToken);
        console.log('User data and session token stored in localStorage:', userData);
        
        // Redirect to mail with user data
        console.log('Authentication successful, redirecting to /mail');
        navigate('/mail');
        return;
      }

      // If no specific parameters, try to get existing user data
      try {
        console.log('No callback parameters, checking existing user data');
        
        const userDataStr = localStorage.getItem('gmail_user_data');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.authenticated) {
            toast.success('Gmail session found!');
            console.log('Existing Gmail session found, redirecting to /mail');
            navigate('/mail');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to get existing user data:', error);
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