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
}

export function EmailGroups({
  groups,
  selectedGroupId,
  onGroupSelect,
  totalGroups,
  totalEmails
}: EmailGroupsProps) {
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
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2c5aa0]">{totalGroups}</div>
              <div className="text-[#5a7ba8]">Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2c5aa0]">{totalEmails}</div>
              <div className="text-[#5a7ba8]">Emails</div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Panels */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#2c5aa0]">Groups</h2>
            {selectedGroupId && (
              <button 
                onClick={() => onGroupSelect(null)} 
                className="text-sm transition-colors hover:opacity-80 text-[#4a8dd9]"
              >
                View All Groups
              </button>
            )}
          </div>
          
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 h-full pb-4">
              {groups.map(group => (
                <motion.div 
                  key={group.id} 
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex-shrink-0 w-72 h-32 rounded-xl border cursor-pointer transition-all duration-200",
                    selectedGroupId === group.id 
                      ? "shadow-lg ring-2 ring-[#4a8dd9]" 
                      : "hover:shadow-md"
                  )}
                  style={{
                    borderColor: selectedGroupId === group.id ? "#4a8dd9" : "#b8d4f0",
                    boxShadow: selectedGroupId === group.id 
                      ? "0 10px 25px rgba(74, 141, 217, 0.15)" 
                      : undefined
                  }}
                  onClick={() => onGroupSelect(selectedGroupId === group.id ? null : group.id)}
                >
                  <div className="p-4 flex flex-col justify-between h-full rounded-xl bg-white/90">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-base mb-1 line-clamp-1 text-[#2c5aa0]">
                          {group.name}
                        </h3>
                        <p className="text-sm text-[#5a7ba8]">
                          {group.count} emails
                        </p>
                      </div>
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0 ml-2"
                        style={{
                          background: "linear-gradient(135deg, #7bb3f0 0%, #5a9de8 50%, #4a8dd9 100%)"
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-1">
                        {group.emails.slice(0, 3).map((email, index) => (
                          <div 
                            key={email.id} 
                            className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium"
                            style={{
                              zIndex: 3 - index,
                              backgroundColor: "#e1f0ff",
                              borderColor: "rgba(255, 255, 255, 0.9)",
                              color: "#4a8dd9"
                            }}
                          >
                            {email.sender.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {group.emails.length > 3 && (
                          <div 
                            className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium"
                            style={{
                              backgroundColor: "#e1f0ff",
                              borderColor: "rgba(255, 255, 255, 0.9)",
                              color: "#4a8dd9"
                            }}
                          >
                            +{group.emails.length - 3}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-[#5a7ba8]">
                        {group.emails.length > 0 && 
                          new Date(Math.max(...group.emails.map(e => e.timestamp.getTime())))
                            .toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })
                        }
                      </div>
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
  />;
}; 