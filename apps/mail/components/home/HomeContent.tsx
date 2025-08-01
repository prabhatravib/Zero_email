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
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#0F0F0F]">
      <PixelatedBackground
        className="z-1 absolute left-1/2 top-[-40px] h-auto w-screen min-w-[1920px] -translate-x-1/2 object-cover"
        style={{
          mixBlendMode: 'screen',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
      />

      <section className="z-10 flex w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex w-full flex-col items-center justify-center space-y-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full text-4xl font-medium text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
          >
            <Balancer className="w-full text-center">
              Pitext-email
            </Balancer>
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex w-full justify-center"
          >
            <Button
              size="lg"
              className="px-12 py-4 text-xl"
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
            className="w-full text-center"
          >
            <p className="text-base text-[#B7B7B7]/60 sm:text-lg lg:text-xl">
              Forked from{' '}
              <Link 
                to="https://0.email" 
                target="_blank" 
                className="text-[#B7B7B7] underline hover:text-white transition-colors"
              >
                0.email
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
