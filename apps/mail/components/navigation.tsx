import { signIn, useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Navigation() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  return (
    <header className="fixed left-[50%] z-50 flex w-full max-w-4xl translate-x-[-50%] items-center justify-end px-4 pt-6">
      <nav className="flex w-full max-w-4xl items-center justify-end gap-2 rounded-xl border-t border-[#2A2A2A] bg-[#1E1E1E] p-3 px-6">
        <Button
          className="h-8 bg-white text-black hover:bg-white hover:text-black"
          onClick={() => {
            if (session) {
              navigate('/mail/inbox');
            } else {
              toast.promise(
                signIn.social({
                  provider: 'google',
                  callbackURL: `${window.location.origin}/mail`,
                }),
                {
                  error: 'Login redirect failed',
                },
              );
            }
          }}
        >
          Login with Google
        </Button>
      </nav>
    </header>
  );
}
