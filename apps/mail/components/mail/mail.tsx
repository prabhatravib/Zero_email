import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail, Search, RefreshCcw, X } from '../icons/icons';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useCallback, useEffect, useRef } from 'react';
import { ThreadDisplay } from '@/components/mail/thread-display';
import { useActiveConnection } from '@/hooks/use-connections';
import { useMediaQuery } from '../../hooks/use-media-query';
import { MailList } from '@/components/mail/mail-list';
import { isMac } from '@/lib/hotkeys/use-hotkey-utils';
import { useHotkeysContext } from 'react-hotkeys-hook';
import { useNavigate, useParams } from 'react-router';
import { useMail } from '@/components/mail/use-mail';
import { SidebarToggle } from '../ui/sidebar-toggle';
import { clearBulkSelectionAtom } from './use-mail';
import { useThreads } from '@/hooks/use-threads';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';
import { useQueryState } from 'nuqs';
import { useAtom } from 'jotai';

export function MailLayout() {
  const params = useParams<{ folder: string }>();
  const folder = params?.folder ?? 'inbox';
  const [mail, setMail] = useMail();
  const [, clearBulkSelection] = useAtom(clearBulkSelectionAtom);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const prevFolderRef = useRef(folder);
  const { enableScope, disableScope } = useHotkeysContext();
  const { data: activeConnection } = useActiveConnection();

  useEffect(() => {
    if (prevFolderRef.current !== folder && mail.bulkSelected.length > 0) {
      clearBulkSelection();
    }
    prevFolderRef.current = folder;
  }, [folder, mail.bulkSelected.length, clearBulkSelection]);

  useEffect(() => {
    if (!session?.user && !isPending) {
      navigate('/login');
    }
  }, [session?.user, isPending]);

  const [{ isFetching, refetch: refetchThreads }] = useThreads();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [threadId] = useQueryState('threadId');

  useEffect(() => {
    if (threadId) {
      enableScope('thread-display');
      disableScope('mail-list');
    } else {
      enableScope('mail-list');
      disableScope('thread-display');
    }

    return () => {
      disableScope('thread-display');
      disableScope('mail-list');
    };
  }, [threadId, enableScope, disableScope]);

  const handleMailListMouseEnter = useCallback(() => {
    enableScope('mail-list');
  }, [enableScope]);

  const handleMailListMouseLeave = useCallback(() => {
    disableScope('mail-list');
  }, [disableScope]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="rounded-inherit relative z-[5] flex p-0 md:mr-0.5 md:mt-1">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="mail-panel-layout"
          className="rounded-inherit overflow-hidden"
        >
          <ResizablePanel
            defaultSize={35}
            minSize={35}
            maxSize={35}
            className={cn(
              `bg-panelLight dark:bg-panelDark mb-1 w-fit shadow-sm md:mr-[3px] md:rounded-2xl lg:flex lg:h-[calc(100dvh-8px)] lg:shadow-sm`,
              isDesktop && threadId && 'hidden lg:block',
            )}
            onMouseEnter={handleMailListMouseEnter}
            onMouseLeave={handleMailListMouseLeave}
          >
            <div className="w-full md:h-[calc(100dvh-10px)]">
              <div
                className={cn(
                  'sticky top-0 z-[15] flex items-center justify-between gap-1.5 p-2 pb-0 transition-colors',
                )}
              >
                <div className="w-full">
                  <div className="grid grid-cols-12 gap-2 mt-1">
                    <SidebarToggle className="col-span-1 h-fit px-2" />
                    {mail.bulkSelected.length === 0 ? (
                      <div className="col-span-10 flex gap-2">
                        <Button
                          variant="outline"
                          className={cn(
                            'text-muted-foreground relative flex h-8 w-full select-none items-center justify-start overflow-hidden rounded-lg border bg-white pl-2 text-left text-sm font-normal shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-none dark:bg-[#141414]',
                          )}
                        >
                          <Search className="fill-[#71717A] dark:fill-[#6F6F6F]" />
                          <span className="hidden truncate pr-20 lg:inline-block">
                            Search
                          </span>
                          <span className="inline-block truncate pr-20 lg:hidden">
                            Search
                          </span>
                          <span className="absolute right-[0rem] flex items-center gap-1">
                            <kbd className="bg-muted text-md pointer-events-none mr-0.5 hidden h-7 select-none flex-row items-center gap-1 rounded-md border-none px-2 font-medium !leading-[0] opacity-100 sm:flex dark:bg-[#262626] dark:text-[#929292]">
                              <span
                                className={cn(
                                  'h-min !leading-[0.2]',
                                  isMac ? 'mt-[1px] text-lg' : 'text-sm',
                                )}
                              >
                                {isMac ? '⌘' : 'Ctrl'}{' '}
                              </span>
                              <span className="h-min text-sm !leading-[0.2]"> K</span>
                            </kbd>
                          </span>
                        </Button>
                      </div>
                    ) : null}
                    <Button
                      onClick={() => {
                        refetchThreads();
                      }}
                      variant="ghost"
                      className="md:h-fit md:px-2"
                    >
                      <RefreshCcw className="text-muted-foreground h-4 w-4 cursor-pointer" />
                    </Button>
                    {mail.bulkSelected.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                setMail({ ...mail, bulkSelected: [] });
                              }}
                              className="flex h-6 items-center gap-1 rounded-md bg-[#313131] px-2 text-xs text-[#A0A0A0] hover:bg-[#252525]"
                            >
                              <X className="h-3 w-3 fill-[#A0A0A0]" />
                              <span>esc</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {m['common.actions.exitSelectionModeEsc']()}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'bg-[#006FFE] relative z-[5] h-0.5 w-full transition-opacity',
                  isFetching ? 'opacity-100' : 'opacity-0',
                )}
              />
              <div className="relative z-[1] h-[calc(100dvh-(2px+2px))] overflow-hidden pt-0 md:h-[calc(100dvh-4rem)]">
                <MailList />
              </div>
            </div>
          </ResizablePanel>

          {isDesktop && (
            <ResizablePanel
              className={cn(
                'bg-panelLight dark:bg-panelDark mb-1 mr-0.5 w-fit rounded-2xl shadow-sm lg:h-[calc(100dvh-8px)]',
                !threadId && 'hidden lg:block',
              )}
              defaultSize={30}
              minSize={30}
            >
              <div className="relative flex-1">
                <ThreadDisplay />
              </div>
            </ResizablePanel>
          )}

          {/* Mobile Thread View */}
          {isMobile && threadId && (
            <div className="bg-panelLight dark:bg-panelDark fixed inset-0 z-50">
              <div className="flex h-full flex-col">
                <div className="h-full overflow-y-auto outline-none">
                  <ThreadDisplay />
                </div>
              </div>
            </div>
          )}
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  );
}
