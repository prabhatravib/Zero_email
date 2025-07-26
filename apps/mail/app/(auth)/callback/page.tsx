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
      const code = searchParams.get('code');

      console.log('Auth callback parameters:', { error, success, email, name, picture, code });

      // Handle OAuth errors from Google
      if (error) {
        console.error('Gmail authentication error:', error);
        toast.error(`Gmail authentication failed: ${error}`);
        navigate('/');
        return;
      }

      // Handle successful Gmail authentication (current redirect-based flow)
      if (success === 'true' && email) {
        toast.success(`Successfully connected to Gmail as ${email}`);
        
        // Store user data in localStorage
        const userDataToStore = {
          email,
          name: name || email,
          picture: picture || '',
          authenticated: true,
          timestamp: Date.now()
        };
        
        localStorage.setItem('gmail_user_data', JSON.stringify(userDataToStore));
        
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
        console.log('User data and session token stored in localStorage:', userDataToStore);
        
        // Redirect to mail with user data
        console.log('Authentication successful, redirecting to /mail');
        navigate('/mail');
        return;
      }

      // Handle OAuth code from Google (future JSON-based flow)
      if (code) {
        try {
          console.log('Processing OAuth code:', code);
          
          // Make request to Cloudflare Workers callback endpoint with the code
          const response = await fetch(`/auth/callback/google?code=${encodeURIComponent(code)}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('Callback response:', data);

          if (data.error) {
            console.error('Gmail authentication error:', data.message);
            toast.error(`Gmail authentication failed: ${data.message}`);
            navigate('/');
            return;
          }

          if (data.success && data.user) {
            const userData = data.user;
            toast.success(`Successfully connected to Gmail as ${userData.email}`);
            
            // Store user data in localStorage
            const userDataToStore = {
              email: userData.email,
              name: userData.name || userData.email,
              picture: userData.picture || '',
              authenticated: true,
              timestamp: Date.now()
            };
            
            localStorage.setItem('gmail_user_data', JSON.stringify(userDataToStore));
            
            // Create a session token that the server can validate
            const sessionToken = btoa(JSON.stringify({
              email: userData.email,
              name: userData.name || userData.email,
              picture: userData.picture || '',
              access_token: userData.access_token || 'temp_token',
              refresh_token: userData.refresh_token || 'temp_refresh',
              expires_at: Date.now() + (userData.expires_in * 1000) || (24 * 60 * 60 * 1000)
            }));
            
            localStorage.setItem('gmail_session_token', sessionToken);
            console.log('DEBUG: sessionToken stored:', sessionToken);
            console.log('DEBUG: sessionToken length:', sessionToken.length);
            console.log('DEBUG: sessionToken type:', typeof sessionToken);
            console.log('User data and session token stored in localStorage:', userDataToStore);
            
            // Redirect to mail with user data
            console.log('Authentication successful, redirecting to /mail');
            navigate('/mail');
            return;
          }

        } catch (error) {
          console.error('Failed to process OAuth callback:', error);
          toast.error('Failed to complete Gmail authentication. Please try again.');
          navigate('/');
          return;
        }
      }

      // If no code or error, try to get existing user data
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