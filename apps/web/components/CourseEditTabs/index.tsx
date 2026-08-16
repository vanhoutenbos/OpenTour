'use client';

import { useState } from 'react';

type Tab = 'algemeen' | 'tees' | 'holes' | 'lussen';

interface Props {
  children: (activeTab: Tab) => React.ReactNode;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'algemeen', label: 'Algemeen' },
  { id: 'tees', label: 'Tees' },
  { id: 'holes', label: 'Holes' },
  { id: 'lussen', label: 'Lussen' },
];

export function CourseEditTabs({ children }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('algemeen');

  return (
    <div className="w-full">
      <div className="flex border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-green-400 border-b-2 border-green-500'
                : 'text-content-muted hover:text-content'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{children(activeTab)}</div>
    </div>
  );
}
