import { PurpleThickCheck, ThickCheck } from '../icons/icons';
import { useSession, signIn } from '@/lib/auth-client';
import { useBilling } from '@/hooks/use-billing';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRICING_CONSTANTS = {
  FREE_FEATURES: [
    'One email connection',
    'AI-powered chat with your inbox',
    'Basic labeling',
    'Limited AI email writing',
  ],
  PRO_FEATURES: [
    'Unlimited email connections',
    'AI-powered chat with your inbox',
    'Auto labeling',
  ],
  ENTERPRISE_FEATURES: [
    'Unlimited email connections',
    'AI-powered chat with your inbox',
    'Auto labeling',
    'Dedicated Slack channel',
    'Priority customer support',
  ],
  CARD_STYLES: {
    base: 'relative flex-1 min-w-[280px] max-w-[384px] min-h-[630px] flex flex-col items-start justify-between overflow-hidden rounded-2xl border border-[#2D2D2D] bg-zinc-900/50 p-5',
    header: 'inline-flex items-center justify-start gap-2.5 rounded-lg p-2',
    headerFree: 'bg-[#422F10]',
    headerPro: 'bg-[#B183FF]',
    pro: 'outline outline-2 outline-offset-[3.5px] outline-[#2D2D2D]',
    divider: 'h-0 self-stretch outline outline-1 outline-offset-[-0.50px] outline-white/10',
  },
  MONTHLY_PRICE: 20,
} as const;

const handleGoogleSignIn = (
  callbackURL: string,
  options?: { loading?: string; success?: string },
) => {
  return toast.promise(
    signIn.social({
      provider: 'google',
      callbackURL,
    }),
    {
      success: options?.success || 'Redirecting to login...',
      error: 'Login redirect failed',
    },
  );
};

interface FeatureItemProps {
  text: string;
  isPro?: boolean;
}

const FeatureItem = ({ text, isPro }: FeatureItemProps) => (
  <div className="inline-flex items-center justify-start gap-2.5">
    <div className="flex h-5 w-5 items-start justify-start gap-3 rounded-[125px] bg-white/10 p-[5px]">
      {isPro ? (
        <PurpleThickCheck className="relative left-[1px] top-[1px]" />
      ) : (
        <ThickCheck className="relative left-[1px] top-[1px]" />
      )}
    </div>
    <div className="justify-center text-sm font-normal leading-normal text-white lg:text-base">
      {text}
    </div>
  </div>
);

export default function PricingCard() {
  const monthlyPrice = PRICING_CONSTANTS.MONTHLY_PRICE;
  const { attach } = useBilling();
  const { data: session } = useSession();
  const navigate = useNavigate();

  const handleUpgrade = async () => {
    if (!session) {
      handleGoogleSignIn(`${window.location.origin}/pricing`);
      return;
    }

    if (attach) {
      toast.promise(
        attach({
          productId: 'pro-example',
          successUrl: `${window.location.origin}/mail/inbox?success=true`,
        }),
        {
          success: 'Redirecting to payment...',
          error: 'Failed to process upgrade. Please try again later.',
        },
      );
    }
  };
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center gap-5 lg:flex-row lg:items-stretch">
        <div className={PRICING_CONSTANTS.CARD_STYLES.base}>
          <div className="absolute inset-0 z-0 h-full w-full overflow-hidden"></div>

          <div className="relative z-10 flex flex-col items-start justify-start gap-5 self-stretch">
            <div className="flex flex-col items-start justify-start gap-4 self-stretch">
              <div
                className={cn(
                  PRICING_CONSTANTS.CARD_STYLES.header,
                  PRICING_CONSTANTS.CARD_STYLES.headerFree,
                )}
              >
              </div>

              <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                <div className="inline-flex items-end justify-start gap-1 self-stretch">
                  <div className="justify-center text-4xl font-semibold leading-10 text-white">
                    Free
                  </div>
                </div>
                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="justify-center self-stretch text-sm font-normal leading-normal text-white opacity-70 lg:text-base">
                    Start with the essentials — ideal for personal use and light email
                    workflows.{' '}
                  </div>
                </div>
              </div>
            </div>
            <div className={PRICING_CONSTANTS.CARD_STYLES.divider}></div>
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch">
              {PRICING_CONSTANTS.FREE_FEATURES.map((feature) => (
                <FeatureItem key={feature} text={feature} />
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              if (session) {
                navigate('/mail/inbox');
              } else {
                handleGoogleSignIn(`${window.location.origin}/mail`, {
                  loading: undefined,
                  success: undefined,
                });
              }
            }}
            className="z-30 mt-auto inline-flex h-10 items-center justify-center gap-2.5 self-stretch overflow-hidden rounded-lg bg-[#2D2D2D] p-3 shadow shadow-black/30 outline outline-1 outline-offset-[-1px] outline-[#434343]"
          >
            <div className="flex items-center justify-center gap-2.5 px-1">
              <div className="justify-start text-center font-semibold leading-none text-[#D5D5D5]">
                Get started
              </div>
            </div>
          </button>
        </div>

        <div className={cn(PRICING_CONSTANTS.CARD_STYLES.base, PRICING_CONSTANTS.CARD_STYLES.pro)}>
          <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
          </div>
          <div className="relative z-10 flex flex-col items-start justify-start gap-5 self-stretch">
            <div className="flex flex-col items-start justify-start gap-4 self-stretch">
              <div
                className={cn(
                  PRICING_CONSTANTS.CARD_STYLES.header,
                  PRICING_CONSTANTS.CARD_STYLES.headerPro,
                )}
              >
              </div>

              <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                <div className="inline-flex items-end justify-start gap-1 self-stretch">
                  <div className="justify-center text-4xl font-semibold leading-10 text-white">
                    ${monthlyPrice}
                  </div>
                  <div className="flex items-center justify-center gap-2.5 pb-0.5">
                    <div className="justify-center text-sm font-medium leading-tight text-white/40">
                      /MONTH
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={PRICING_CONSTANTS.CARD_STYLES.divider}></div>
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch">
              {PRICING_CONSTANTS.PRO_FEATURES.map((feature) => (
                <FeatureItem key={feature} text={feature} isPro />
              ))}
            </div>
          </div>
          <button
            className="z-30 mt-auto inline-flex h-10 cursor-pointer items-center justify-center gap-2.5 self-stretch overflow-hidden rounded-lg bg-white p-3 outline outline-1 outline-offset-[-1px]"
            onClick={handleUpgrade}
          >
            <div className="flex items-center justify-center gap-2.5 px-1">
              <div className="justify-start text-center font-semibold leading-none text-black">
                Start 14 day free trial
              </div>
            </div>
          </button>
        </div>

        <div className={PRICING_CONSTANTS.CARD_STYLES.base}>
          <div className="absolute inset-0 z-0 h-full w-full overflow-hidden"></div>
          <div className="relative z-10 flex flex-col items-start justify-start gap-5 self-stretch">
            <div className="flex flex-col items-start justify-start gap-4 self-stretch">
              <div
                className={cn(
                  PRICING_CONSTANTS.CARD_STYLES.header,
                  PRICING_CONSTANTS.CARD_STYLES.headerFree,
                  'bg-[#B183FF]/60',
                )}
              >
              </div>

              <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                <div className="inline-flex items-end justify-start gap-1 self-stretch">
                  <div className="justify-center text-4xl font-semibold leading-10 text-white">
                    Enterprise
                  </div>
                </div>
                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="justify-center self-stretch text-sm font-normal leading-normal text-white opacity-70 lg:text-base">
                    For teams and organizations that need advanced features and support.
                  </div>
                </div>
              </div>
            </div>
            <div className={PRICING_CONSTANTS.CARD_STYLES.divider}></div>
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch">
              {PRICING_CONSTANTS.ENTERPRISE_FEATURES.map((feature) => (
                <FeatureItem key={feature} text={feature} isPro />
              ))}
            </div>
          </div>
          <button
            className="z-30 mt-auto inline-flex h-10 items-center justify-center gap-2.5 self-stretch overflow-hidden rounded-lg bg-[#2D2D2D] p-3 shadow shadow-black/30 outline outline-1 outline-offset-[-1px] outline-[#434343]"
            onClick={() => window.open('https://cal.com/team/0/chat', '_blank')}
          >
            <div className="flex items-center justify-center gap-2.5 px-1">
              <div className="justify-start text-center font-semibold leading-none text-[#D5D5D5]">
                Contact us
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
