import { signIn, useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import React from 'react';

export default function HomeContent() {
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const { data: session } = useSession();

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  return (
    <main className="relative flex h-screen flex-1 flex-col overflow-x-hidden bg-[#0F0F0F] px-2">
      <section className="z-10 flex flex-1 flex-col items-center justify-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-6xl font-medium md:text-8xl"
        >
          Infflow Email
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex flex-col items-center gap-4"
        >
          <div className="flex items-center justify-center rounded-xl border-t border-[#2A2A2A] bg-[#1E1E1E] p-3">
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
          </div>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center text-sm text-[#B7B7B7]/60"
          >
            Forked from: <a href="https://0.email/" target="_blank" rel="noopener noreferrer" className="text-[#B7B7B7] hover:underline">https://0.email/</a>
          </motion.p>
        </motion.div>
      </section>
    </main>
  );
}
