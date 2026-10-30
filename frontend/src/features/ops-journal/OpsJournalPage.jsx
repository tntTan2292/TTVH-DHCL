import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckSquare, Edit3, ListChecks } from 'lucide-react';
import { getVietnamToday } from './opsJournalHelpers.js';
import OpsJournalCandidatesPage from './OpsJournalCandidatesPage.jsx';
import OpsJournalComposerPage from './OpsJournalComposerPage.jsx';
import OpsJournalAssignedPage from './OpsJournalAssignedPage.jsx';

export default function OpsJournalPage() {
  const location = useLocation();
  // a notification opens /ops-journal?tab=composer&date=YYYY-MM-DD
  const params = new URLSearchParams(location.search);
  const linkedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : null;
  const TABS = ['candidates', 'composer', 'assigned']; // 1 choose, 2 compose and finalize, 3 the finalized list
  const [activeTab, setActiveTab] = useState(TABS.includes(params.get('tab')) ? params.get('tab') : 'candidates');
  const [flash, setFlash] = useState(null);
  const [sharedDate, setSharedDate] = useState(linkedDate || getVietnamToday());
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (['composer', 'assigned'].includes(p.get('tab'))) {
      setActiveTab(p.get('tab'));
      const d = p.get('date');
      if (/^\d{4}-\d{2}-\d{2}$/.test(d || '')) setSharedDate(d);
    }
  }, [location.search]);
  const [hasComposerDirty, setHasComposerDirty] = useState(false);

  const handleNavigateToComposer = (date) => {
    if (date) setSharedDate(date);
    setActiveTab('composer');
  };

  const handleNavigateToCandidates = () => {
    if (activeTab === 'composer' && hasComposerDirty) {
      const ok = globalThis.confirm?.(
        'Bạn có chỉnh sửa 6-rõ chưa lưu. Rời khỏi màn hình sẽ làm mất các thay đổi này. Bạn có chắc chắn muốn tiếp tục?'
      );
      if (!ok) return;
    }
    setActiveTab('candidates');
  };

  // finalizing in step 2 moves on to step 3 with a message
  const handleAssigned = (message, date) => {
    if (date) setSharedDate(date);
    setFlash(message);
    setHasComposerDirty(false);
    setActiveTab('assigned');
  };

  const handleSwitchTab = (tab) => {
    if (tab === activeTab) return;
    if (tab !== 'assigned') setFlash(null);
    if (activeTab === 'composer' && hasComposerDirty && tab !== 'composer') {
      const ok = globalThis.confirm?.(
        'Bạn có chỉnh sửa 6-rõ chưa lưu. Rời khỏi màn hình sẽ làm mất các thay đổi này. Bạn có chắc chắn muốn tiếp tục?'
      );
      if (!ok) return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Module Sub-navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => handleSwitchTab('candidates')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'candidates'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <CheckSquare size={15} />
            <span>1. Chọn điểm đen</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('composer')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'composer'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Edit3 size={15} />
            <span>2. Soạn nhật ký & Giao việc</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('assigned')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'assigned'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ListChecks size={15} />
            <span>3. Danh sách giao việc</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'candidates' ? (
          <OpsJournalCandidatesPage
            initialDate={sharedDate}
            onNavigateToComposer={handleNavigateToComposer}
          />
        ) : activeTab === 'composer' ? (
          <OpsJournalComposerPage
            key="compose"
            initialDate={sharedDate}
            onNavigateToCandidates={handleNavigateToCandidates}
            onNavigateToTab={handleSwitchTab}
            onAssigned={handleAssigned}
            onDirtyStateChange={setHasComposerDirty}
          />
        ) : (
          <OpsJournalAssignedPage
            key="assigned"
            initialDate={sharedDate}
            flash={flash}
            onNavigateToTab={handleSwitchTab}
          />
        )}
      </div>
    </div>
  );
}

