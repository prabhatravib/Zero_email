import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface EmailGroup {
  id: string;
  name: string;
  count: number;
  color: string;
  emails: Email[];
}

export interface Email {
  id: string;
  groupId: string;
  sender: string;
  subject: string;
  timestamp: Date;
}

interface EmailGroupsProps {
  groups: EmailGroup[];
  selectedGroupId: string | null;
  onGroupSelect: (groupId: string | null) => void;
  totalGroups: number;
  totalEmails: number;
  onCategorizeEmails?: () => Promise<void>;
  isCategorizing?: boolean;
  categorizationComplete?: boolean;
  processedEmails?: number;
  totalEmailsToProcess?: number;
}

export function EmailGroups({
  groups,
  selectedGroupId,
  onGroupSelect,
  totalGroups,
  totalEmails,
  onCategorizeEmails,
  isCategorizing,
  categorizationComplete,
  processedEmails,
  totalEmailsToProcess
}: EmailGroupsProps) {
  // Debug logging for spinner state
  console.log('🎯 EmailGroups spinner state:', {
    isCategorizing,
    categorizationComplete,
    processedEmails,
    totalEmailsToProcess,
    shouldShowSpinner: isCategorizing || (processedEmails && totalEmailsToProcess && processedEmails < totalEmailsToProcess)
  });

  return (
    <div className="h-full flex flex-col bg-[#f8fbff]">
      {/* Summary Statistics */}
      <div className="px-6 py-4 border-b bg-white/80 border-[#b8d4f0]">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-semibold mb-1 text-[#2c5aa0]">Email Groups</h1>
            <p className="text-sm text-[#5a7ba8]">Your emails organized by topic</p>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {onCategorizeEmails && (
              <button 
                onClick={onCategorizeEmails}
                disabled={isCategorizing}
                className={`text-sm transition-colors hover:opacity-80 px-3 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed ${
                  categorizationComplete 
                    ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'text-[#4a8dd9] bg-[#f0f7ff] border-[#b8d4f0] hover:bg-[#e1f0ff]'
                }`}
              >
                {isCategorizing 
                  ? `Categorizing... ${processedEmails}/${totalEmailsToProcess}` 
                  : categorizationComplete 
                    ? 'Categorization Complete' 
                    : 'Categorize emails'
                }
              </button>
            )}
            <button 
              onClick={() => onGroupSelect(null)} 
              className="text-sm transition-colors hover:opacity-80 text-[#4a8dd9]"
            >
              View all mails
            </button>
          </div>
        </div>
      </div>

      {/* Group Panels */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 h-full pb-6">
              {groups.map(group => (
                <motion.div 
                  key={group.id} 
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex-shrink-0 w-72 h-40 rounded-xl border cursor-pointer transition-all duration-200",
                    selectedGroupId === group.id 
                      ? "shadow-lg ring-2 ring-[#4a8dd9]" 
                      : "hover:shadow-md",
                    (isCategorizing || (processedEmails && totalEmailsToProcess && processedEmails < totalEmailsToProcess)) && "opacity-75"
                  )}
                  style={{
                    borderColor: selectedGroupId === group.id ? "#4a8dd9" : "#b8d4f0",
                    boxShadow: selectedGroupId === group.id 
                      ? "0 10px 25px rgba(74, 141, 217, 0.15)" 
                      : undefined
                  }}
                  onClick={() => onGroupSelect(selectedGroupId === group.id ? null : group.id)}
                >
                  <div className="p-5 flex flex-col justify-between h-full rounded-xl bg-white/90">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-base mb-2 line-clamp-1 text-[#2c5aa0]">
                          {group.name}
                        </h3>
                        <p className={cn(
                          "text-sm text-[#5a7ba8]",
                          (isCategorizing || (processedEmails && totalEmailsToProcess && processedEmails < totalEmailsToProcess)) && "animate-pulse"
                        )}>
                          {group.count} emails
                          {(isCategorizing || (processedEmails && totalEmailsToProcess && processedEmails < totalEmailsToProcess)) && (
                            <span className="ml-1 text-xs text-[#4a8dd9]">(updating...)</span>
                          )}
                        </p>
                      </div>
                      {/* Categorization spinner */}
                      {(isCategorizing || (processedEmails && totalEmailsToProcess && processedEmails < totalEmailsToProcess)) && (
                        <div className="ml-2">
                          <div className="w-5 h-5 border-2 border-[#4a8dd9] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {groups.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-center py-12">
                  <div>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-[#e1f0ff]">
                      <div className="w-6 h-6 rounded-full bg-[rgba(74,141,217,0.2)]" />
                    </div>
                    <h3 className="text-lg font-medium mb-1 text-[#2c5aa0]">No groups found</h3>
                    <p className="text-sm text-[#5a7ba8]">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export for use with real data
export const createEmailGroups = (groups: EmailGroup[]) => {
  return <EmailGroups 
    groups={groups}
    selectedGroupId={null}
    onGroupSelect={() => {}}
    totalGroups={groups.length}
    totalEmails={groups.reduce((sum, group) => sum + group.count, 0)}
    onCategorizeEmails={undefined}
    isCategorizing={false}
    categorizationComplete={false}
    processedEmails={0}
    totalEmailsToProcess={0}
  />;
}; 