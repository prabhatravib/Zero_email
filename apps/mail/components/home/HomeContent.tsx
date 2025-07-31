import {
  ChevronDown,
  CurvedArrow,
  GitHub,
  Plus,
  Cube,
  MediumStack,
  Clock,
  PanelLeftOpen,
  Check,
  Filter,
  Search,
  User,
  Lightning,
  ExclamationTriangle,
  Bell,
  Tag,
  GroupPeople,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Figma,
  Docx,
  ImageFile,
  Expand,
} from '../icons/icons';
import { PixelatedBackground, PixelatedLeft, PixelatedRight } from '@/components/home/pixelated-bg';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { signIn, useSession } from '@/lib/auth-client';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Balancer } from 'react-wrap-balancer';
import { Navigation } from '../navigation';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import Footer from './footer';
import React from 'react';

export default function HomeContent() {
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const { data: session } = useSession();

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  return (
    <main className="relative flex h-full flex-1 flex-col overflow-x-hidden bg-[#0F0F0F] px-2">
      <PixelatedBackground
        className="z-1 absolute left-1/2 top-[-40px] h-auto w-screen min-w-[1920px] -translate-x-1/2 object-cover"
        style={{
          mixBlendMode: 'screen',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
      />

      <Navigation />

      <section className="z-10 mt-32 flex flex-col items-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-4xl font-medium md:text-6xl"
        >
          <Balancer className="mb-3 max-w-[1130px]">
            Pitext-email
          </Balancer>
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <Button
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
            Get Started
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center"
        >
          <p className="text-sm text-[#B7B7B7]/60">
            Forked from{' '}
            <Link 
              to="https://0.email/mail/inbox" 
              target="_blank" 
              className="text-[#B7B7B7] underline hover:text-white"
            >
              https://0.email/mail/inbox
            </Link>
          </p>
        </motion.div>
      </section>

      <div className="relative mt-52 flex items-center justify-center">
        <Footer />
      </div>
    </main>
  );
}
