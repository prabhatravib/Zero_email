import { signIn, useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import React from 'react';

export default function HomeContent() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  return (
    <main className="relative flex h-screen flex-1 flex-col overflow-x-hidden bg-white px-2">
      <section className="z-10 flex flex-1 flex-col items-center justify-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-6xl font-medium text-black md:text-8xl"
        >
          Infflow Email
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 flex flex-col items-center gap-4"
        >
          <div className="flex items-center justify-center rounded-xl border border-gray-300 bg-gray-50 p-3">
            <Button
              className="h-8 bg-blue-600 text-white hover:bg-blue-700"
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
            className="text-center text-sm text-black"
          >
            Forked from: <a href="https://0.email/" target="_blank" rel="noopener noreferrer" className="text-black hover:underline">https://0.email/</a>
          </motion.p>
        </motion.div>
      </section>
    </main>
  );
}
