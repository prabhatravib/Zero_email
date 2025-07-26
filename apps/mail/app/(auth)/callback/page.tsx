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
        
        // Get the session token from the backend
        const sessionToken = searchParams.get('session');
        
        if (sessionToken) {
          // Store the real session token from the backend
          localStorage.setItem('gmail_session_token', sessionToken);
          
          // Store user data for compatibility
          const userData = {
            email,
            name: name || email,
            picture: picture || '',
            authenticated: true,
            timestamp: Date.now()
          };
          localStorage.setItem('gmail_user_data', JSON.stringify(userData));
          
          console.log('DEBUG: Real session token stored from backend');
          console.log('DEBUG: sessionToken length:', sessionToken.length);
          console.log('DEBUG: User data stored:', userData);
        } else {
          console.error('No session token received from backend');
          toast.error('Authentication failed: No session token received');
          navigate('/login');
          return;
        }
        
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