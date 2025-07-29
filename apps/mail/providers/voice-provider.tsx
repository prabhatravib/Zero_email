import { createContext, useContext, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

// Placeholder for removed elevenlabs functionality
const useConversation = () => ({
  messages: [],
  sendMessage: async () => {},
  isLoading: false,
  isRecording: false,
  startRecording: () => {},
  stopRecording: () => {},
  startSession: async () => {},
  endSession: async () => {},
});

interface VoiceContextType {
  status: string;
  isInitializing: boolean;
  isSpeaking: boolean;
  hasPermission: boolean;
  lastToolCall: string | null;
  isOpen: boolean;

  startConversation: (context?: any) => Promise<void>;
  endConversation: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  sendContext: (context: any) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState<any>(null);

  const conversation = useConversation();

  const { status, isSpeaking } = conversation;

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      return true;
    } catch {
      toast.error('Microphone access denied. Please enable microphone permissions.');
      setHasPermission(false);
      return false;
    }
  };

  const startConversation = async (context?: any) => {
    if (!hasPermission) {
      const result = await requestPermission();
      if (!result) return;
      setHasPermission(result);
    }

    try {
      setIsInitializing(true);
      if (context) {
        setCurrentContext(context);
      }

      // Voice functionality removed to reduce bundle size
      toast.info('Voice functionality has been removed to reduce bundle size');
      setOpen(true);
    } catch {
      toast.error('Failed to start conversation. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  const endConversation = async () => {
    try {
      setCurrentContext(null);
      setOpen(false);
    } catch {
      toast.error('Failed to end conversation');
    }
  };

  const sendContext = (context: any) => {
    setCurrentContext(context);
  };

  const value: VoiceContextType = {
    status,
    isInitializing,
    isSpeaking,
    hasPermission,
    lastToolCall,
    isOpen,
    startConversation,
    endConversation,
    requestPermission: requestPermission,
    sendContext,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}

export { VoiceContext };
