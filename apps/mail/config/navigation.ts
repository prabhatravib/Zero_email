import {
  Archive,
  Bin,
  ExclamationCircle,
  Folder,
  Inbox,
  SettingsGear,
  Plane2,
  ArrowLeft,
  Danger,
} from '@/components/icons/icons';
import { MessageSquareIcon } from 'lucide-react';
import { m } from '@/paraglide/messages';

export interface NavItem {
  id?: string;
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: number;
  isBackButton?: boolean;
  isSettingsButton?: boolean;
  disabled?: boolean;
  target?: string;
  shortcut?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavConfig {
  path: string;
  sections: NavSection[];
}

export const navigationConfig: Record<string, NavConfig> = {
  mail: {
    path: '/mail',
    sections: [
      {
        title: 'Core',
        items: [
          {
            id: 'inbox',
            title: m['navigation.sidebar.inbox'](),
            url: '/mail/inbox',
            icon: Inbox,
            shortcut: 'g + i',
          },
          {
            id: 'drafts',
            title: m['navigation.sidebar.drafts'](),
            url: '/mail/draft',
            icon: Folder,
            shortcut: 'g + d',
          },
          {
            id: 'sent',
            title: m['navigation.sidebar.sent'](),
            url: '/mail/sent',
            icon: Plane2,
            shortcut: 'g + t',
          },
        ],
      },
      {
        title: 'Management',
        items: [
          {
            id: 'archive',
            title: m['navigation.sidebar.archive'](),
            url: '/mail/archive',
            icon: Archive,
            shortcut: 'g + a',
          },
          {
            id: 'spam',
            title: m['navigation.sidebar.spam'](),
            url: '/mail/spam',
            icon: ExclamationCircle,
          },
          {
            id: 'trash',
            title: m['navigation.sidebar.bin'](),
            url: '/mail/bin',
            icon: Bin,
          },
        ],
      },
    ],
  },
  settings: {
    path: '/settings',
    sections: [
      {
        title: 'Settings',
        items: [
          {
            title: m['common.actions.back'](),
            url: '/mail',
            icon: ArrowLeft,
            isBackButton: true,
          },
          {
            title: m['navigation.settings.general'](),
            url: '/settings/general',
            icon: SettingsGear,
            shortcut: 'g + s',
          },
          {
            title: m['navigation.settings.connections'](),
            url: '/settings/connections',
            icon: MessageSquareIcon,
          },
          {
            title: m['navigation.settings.deleteAccount'](),
            url: '/settings/danger-zone',
            icon: Danger,
          },
        ].map((item) => ({
          ...item,
          isSettingsPage: true,
        })),
      },
    ],
  },
};

export const bottomNavItems = [
  {
    title: '',
    items: [
      {
        id: 'settings',
        title: m['navigation.sidebar.settings'](),
        url: '/settings/general',
        icon: SettingsGear,
        isSettingsButton: true,
      },
    ],
  },
];
