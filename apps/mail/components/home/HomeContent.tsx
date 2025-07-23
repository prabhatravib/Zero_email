import { Plus } from '../icons/icons';
import { signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Balancer } from 'react-wrap-balancer';
import { Navigation } from '../navigation';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import Footer from './footer';

export default function HomeContent() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  const handleGmailConnect = async () => {
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/mail`,
      });
    } catch (error) {
      toast.error('Failed to connect Gmail');
    }
  };

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-x-hidden bg-[#0F0F0F] px-2">
      <Navigation />

      <section className="z-10 mt-32 flex flex-col items-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-4xl font-medium md:text-6xl"
        >
          <Balancer className="mb-3 max-w-[1130px]">
            Simple Gmail Client
          </Balancer>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mx-auto mb-8 max-w-2xl text-center text-base font-medium text-[#B7B7B7] md:text-lg"
        >
          Connect your Gmail account and manage your emails with a clean, simple interface.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <Button
            onClick={handleGmailConnect}
            className="bg-[#006FFE] hover:bg-[#006FFE]/90 text-white px-8 py-3 text-lg font-medium"
          >
            <Plus className="mr-2 h-5 w-5" />
            Connect Gmail
          </Button>
          
          <p className="text-sm text-[#B7B7B7]/60">
            Secure OAuth connection - we never store your password
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 max-w-4xl"
        >
          <div className="text-center">
            <div className="mb-4 text-3xl">📧</div>
            <h3 className="mb-2 text-lg font-semibold">Gmail Integration</h3>
            <p className="text-sm text-[#B7B7B7]/80">
              Full Gmail API integration with real-time sync
            </p>
          </div>
          
          <div className="text-center">
            <div className="mb-4 text-3xl">🎨</div>
            <h3 className="mb-2 text-lg font-semibold">Clean Interface</h3>
            <p className="text-sm text-[#B7B7B7]/80">
              Modern, responsive design that works on all devices
            </p>
          </div>
          
          <div className="text-center">
            <div className="mb-4 text-3xl">🔒</div>
            <h3 className="mb-2 text-lg font-semibold">Secure</h3>
            <p className="text-sm text-[#B7B7B7]/80">
              OAuth 2.0 authentication with Google's security standards
            </p>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  );
} 