import React, { useState } from 'react';
import { Users, Plus, Minus, Shuffle } from 'lucide-react';
import { Student } from '../types';

interface GroupDividerProps {
  students: Student[];
  activeClassName: string;
}

interface Group {
  id: number;
  name: string;
  members: Student[];
}

export default function GroupDivider({ students, activeClassName }: GroupDividerProps) {
  const [numGroups, setNumGroups] = useState(4);
  const [groups, setGroups] = useState<Group[]>([]);

  const handleIncrement = () => {
    setNumGroups(prev => Math.min(prev + 1, students.length || 10));
  };

  const handleDecrement = () => {
    setNumGroups(prev => Math.max(2, prev - 1));
  };

  const splitGroups = () => {
    if (students.length === 0) return;

    // Create a copy and shuffle students randomly (Fisher-Yates)
    const shuffled = [...students];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Distribute into G groups
    const G = Math.min(numGroups, students.length);
    const result: Group[] = Array.from({ length: G }, (_, idx) => ({
      id: idx + 1,
      name: `ក្រុមទី${idx + 1}`,
      members: []
    }));

    shuffled.forEach((student, index) => {
      const groupIdx = index % G;
      result[groupIdx].members.push(student);
    });

    setGroups(result);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Set Number of Teams Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-850 dark:text-white leading-tight">កំណត់ចំនួនក្រុម</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              ថ្នាក់៖ <span className="text-indigo-650 dark:text-indigo-400">{activeClassName}</span> | សិស្សសរុប៖ <span className="text-indigo-650 dark:text-indigo-400 font-bold">{students.length} នាក់</span>
            </p>
          </div>
        </div>

        {/* Adjusters & Button */}
        <div className="flex items-center gap-4 self-end md:self-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-inner select-none">
            <button
              onClick={handleDecrement}
              disabled={numGroups <= 2}
              className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center text-lg font-black text-slate-850 dark:text-white font-mono">{numGroups}</span>
            <button
              onClick={handleIncrement}
              disabled={numGroups >= students.length}
              className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={splitGroups}
            disabled={students.length === 0}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-95 transition-all"
          >
            <Shuffle className="w-4 h-4" />
            <span>បែងចែកក្រុម</span>
          </button>
        </div>
      </div>

      {/* Divided Groups Content Grid */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white dark:bg-slate-905 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-extrabold text-indigo-600 dark:text-indigo-400 font-sans">{group.name}</h3>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-300 font-bold px-2.5 py-0.5 rounded-full uppercase">
                  {group.members.length} នាក់
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-xl text-slate-750 dark:text-slate-300 text-sm font-semibold"
                  >
                    <span className="text-lg">{member.emoji || "👤"}</span>
                    <span className="truncate">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-50" />
          <p className="text-sm font-bold text-slate-400 dark:text-slate-500">សូមចុចប៊ូតុង «បែងចែកក្រុម» ដើម្បីស្វ័យប្រវត្តិកំណត់ក្រុមជម្រើសរំភើប!</p>
        </div>
      )}
    </div>
  );
}
