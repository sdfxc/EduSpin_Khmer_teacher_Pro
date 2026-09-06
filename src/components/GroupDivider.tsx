import React, { useState, useEffect } from 'react';
import { Users, Plus, Minus, Shuffle, Download, FileSpreadsheet, Award, Check, TrendingUp, Trophy, Loader2, Cloud, ClipboardList } from 'lucide-react';
import { Student, TeacherAccount } from '../types';
import * as XLSX from 'xlsx';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeSetDoc } from '../lib/firebase';
import { StudentQuickEditModal } from './StudentQuickEditModal';

interface GroupDividerProps {
  students: Student[];
  activeClassName: string;
  activeClassId: string;
  teacher: TeacherAccount | null;
  isDarkMode?: boolean;
  onBatchSyncStudents?: (names: string[], mode: 'replace' | 'append') => void | Promise<void>;
}

interface GroupMember extends Student {
  assignedRole?: 'ប្រធាន' | 'អនុប្រធាន' | 'សមាជិក';
  groupScore?: number;
}

interface Group {
  id: number;
  name: string;
  members: GroupMember[];
}

export default function GroupDivider({ 
  students, 
  activeClassName,
  activeClassId,
  teacher,
  isDarkMode = false,
  onBatchSyncStudents
}: GroupDividerProps) {
  const [numGroups, setNumGroups] = useState(4);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupScoreInputs, setGroupScoreInputs] = useState<Record<number, string>>({});
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [shuffleStats, setShuffleStats] = useState<{
    combinationsTested: number;
    fairPermutationsCount: number;
    boysRange: string;
    girlsRange: string;
    showNotification: boolean;
  } | null>(null);

  // Load saved state from local storage and firestore when activeClassId changes
  useEffect(() => {
    // 1. Reset local state
    setGroups([]);
    setCloudSynced(false);

    // 2. Load from localStorage immediately for high speed and instant display
    const localGroupsKey = `khmer_teacher_divided_groups_${activeClassId}`;
    const localNumGroupsKey = `khmer_teacher_divided_num_groups_${activeClassId}`;
    
    const savedLocalGroups = localStorage.getItem(localGroupsKey);
    const savedLocalNum = localStorage.getItem(localNumGroupsKey);

    if (savedLocalNum) {
      const parsedNum = parseInt(savedLocalNum, 10);
      if (!isNaN(parsedNum)) {
        setNumGroups(parsedNum);
      }
    } else {
      setNumGroups(4);
    }

    if (savedLocalGroups) {
      try {
        setGroups(JSON.parse(savedLocalGroups));
      } catch (err) {
        console.error('Error parsing groups from localstorage:', err);
      }
    }

    // 3. Load from cloud if logged in
    const loadFromCloud = async () => {
      if (!teacher || !activeClassId) return;
      setIsCloudLoading(true);
      try {
        const docRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'groupsData', 'current');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.groups) {
            setGroups(data.groups);
            // Also update localStorage with the latest cloud data
            localStorage.setItem(localGroupsKey, JSON.stringify(data.groups));
          }
          if (data.numGroups) {
            setNumGroups(data.numGroups);
            localStorage.setItem(localNumGroupsKey, String(data.numGroups));
          }
          setCloudSynced(true);
        }
      } catch (err) {
        console.error('Failed to load groups from Firestore:', err);
        handleFirestoreError(err, OperationType.GET, `teachers/${teacher.id}/classes/${activeClassId}/groupsData/current`);
      } finally {
        setIsCloudLoading(false);
      }
    };

    loadFromCloud();
  }, [activeClassId, teacher]);

  // Helper to save groups to localstorage and firestore
  const saveGroupsState = async (updatedGroups: Group[], numG = numGroups) => {
    // Save to local storage
    const localGroupsKey = `khmer_teacher_divided_groups_${activeClassId}`;
    const localNumGroupsKey = `khmer_teacher_divided_num_groups_${activeClassId}`;
    
    localStorage.setItem(localGroupsKey, JSON.stringify(updatedGroups));
    localStorage.setItem(localNumGroupsKey, String(numG));

    // Save to Firestore if teacher is logged in
    if (teacher && activeClassId) {
      try {
        const docRef = doc(db, 'teachers', teacher.id, 'classes', activeClassId, 'groupsData', 'current');
        await safeSetDoc(docRef, {
          groups: updatedGroups,
          numGroups: numG,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setCloudSynced(true);
      } catch (err) {
        console.error('Failed to save groups to Firestore:', err);
        setCloudSynced(false);
        handleFirestoreError(err, OperationType.WRITE, `teachers/${teacher.id}/classes/${activeClassId}/groupsData/current`);
      }
    }
  };

  const handleIncrement = () => {
    const nextNum = Math.min(numGroups + 1, students.length || 10);
    setNumGroups(nextNum);
    localStorage.setItem(`khmer_teacher_divided_num_groups_${activeClassId}`, String(nextNum));
    if (groups.length > 0) {
      // Just save selected number of groups
      saveGroupsState(groups, nextNum);
    }
  };

  const handleDecrement = () => {
    const nextNum = Math.max(2, numGroups - 1);
    setNumGroups(nextNum);
    localStorage.setItem(`khmer_teacher_divided_num_groups_${activeClassId}`, String(nextNum));
    if (groups.length > 0) {
      // Just save selected number of groups
      saveGroupsState(groups, nextNum);
    }
  };

  const splitGroups = () => {
    if (students.length === 0) return;

    const G = Math.min(numGroups, students.length);

    // 1. Group students by gender & academic status for highly diverse randomized distribution
    const getStatusWeight = (status?: string) => {
      if (status === 'ឆ្នើម') return 4;
      if (status === 'សកម្ម') return 3;
      if (status === 'គួរឲ្យបារម្ភ') return 1;
      return 2; // កំពុងរីកចម្រើន
    };

    const boysHigh = students.filter(s => s.gender === 'ប្រុស' && getStatusWeight(s.status) >= 3);
    const boysLow = students.filter(s => s.gender === 'ប្រុស' && getStatusWeight(s.status) <= 2);
    const girlsHigh = students.filter(s => s.gender === 'ស្រី' && getStatusWeight(s.status) >= 3);
    const girlsLow = students.filter(s => s.gender === 'ស្រី' && getStatusWeight(s.status) <= 2);
    const others = students.filter(s => s.gender !== 'ប្រុស' && s.gender !== 'ស្រី');

    // Shuffle helper
    const shuffleArray = <T,>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    // Ideal bounds for sizes and genders
    const idealSizeMin = Math.floor(students.length / G);
    const idealSizeMax = Math.ceil(students.length / G);

    const totalBoys = students.filter(s => s.gender === 'ប្រុស').length;
    const totalGirls = students.filter(s => s.gender === 'ស្រី').length;
    const idealBoysMin = Math.floor(totalBoys / G);
    const idealBoysMax = Math.ceil(totalBoys / G);
    const idealGirlsMin = Math.floor(totalGirls / G);
    const idealGirlsMax = Math.ceil(totalGirls / G);

    const totalAcademicWeight = students.reduce((sum, s) => sum + getStatusWeight(s.status), 0);
    const targetAcademicPerGroup = totalAcademicWeight / G;

    // Generate candidates
    const CANDIDATES_COUNT = 2000;
    const candidates: { groups: GroupMember[][]; penalty: number }[] = [];

    for (let c = 0; c < CANDIDATES_COUNT; c++) {
      const shufBoysHigh = shuffleArray(boysHigh);
      const shufBoysLow = shuffleArray(boysLow);
      const shufGirlsHigh = shuffleArray(girlsHigh);
      const shufGirlsLow = shuffleArray(girlsLow);
      const shufOthers = shuffleArray(others);

      const candidateGroups: GroupMember[][] = Array.from({ length: G }, () => []);

      // Distribute pools with random group-offsets to prevent systematic bias
      let idx1 = Math.floor(Math.random() * G);
      shufBoysHigh.forEach((s) => {
        candidateGroups[idx1 % G].push({ ...s, groupScore: 0 });
        idx1++;
      });

      let idx2 = Math.floor(Math.random() * G);
      shufBoysLow.forEach((s) => {
        candidateGroups[idx2 % G].push({ ...s, groupScore: 0 });
        idx2++;
      });

      let idx3 = Math.floor(Math.random() * G);
      shufGirlsHigh.forEach((s) => {
        candidateGroups[idx3 % G].push({ ...s, groupScore: 0 });
        idx3++;
      });

      let idx4 = Math.floor(Math.random() * G);
      shufGirlsLow.forEach((s) => {
        candidateGroups[idx4 % G].push({ ...s, groupScore: 0 });
        idx4++;
      });

      let idx5 = Math.floor(Math.random() * G);
      shufOthers.forEach((s) => {
        candidateGroups[idx5 % G].push({ ...s, groupScore: 0 });
        idx5++;
      });

      // Calculate penalties
      let penalty = 0;

      // 1. Group Size Constraint
      candidateGroups.forEach(g => {
        const size = g.length;
        if (size < idealSizeMin || size > idealSizeMax) {
          penalty += 10000; // heavy size mismatch penalty
        }
      });

      // 2. Gender Balance Constraint
      candidateGroups.forEach(g => {
        const boysCount = g.filter(m => m.gender === 'ប្រុស').length;
        const girlsCount = g.filter(m => m.gender === 'ស្រី').length;

        if (boysCount < idealBoysMin || boysCount > idealBoysMax) {
          penalty += 200 * Math.pow(Math.abs(boysCount - (totalBoys / G)), 2);
        }
        if (girlsCount < idealGirlsMin || girlsCount > idealGirlsMax) {
          penalty += 200 * Math.pow(Math.abs(girlsCount - (totalGirls / G)), 2);
        }
      });

      // 3. Academic Balanced Proportions Constraint
      let academicVariance = 0;
      candidateGroups.forEach(g => {
        const gWeight = g.reduce((sum, m) => sum + getStatusWeight(m.status), 0);
        academicVariance += Math.pow(gWeight - targetAcademicPerGroup, 2);

        // Mix Guard: A group should not have 0 high-capability or 0 low-capability students if they are enough to go around
        const smarts = g.filter(m => getStatusWeight(m.status) >= 3).length;
        const weaks = g.filter(m => getStatusWeight(m.status) <= 2).length;

        const totalSmarts = boysHigh.length + girlsHigh.length;
        const totalWeaks = boysLow.length + girlsLow.length;

        if (totalSmarts >= G && smarts === 0) {
          penalty += 1000; 
        }
        if (totalWeaks >= G && weaks === 0) {
          penalty += 1000;
        }
      });

      penalty += academicVariance * 10;
      candidates.push({ groups: candidateGroups, penalty });
    }

    // 2. Find minimum penalty score
    let minPenalty = Infinity;
    candidates.forEach(c => {
      if (c.penalty < minPenalty) {
        minPenalty = c.penalty;
      }
    });

    // 3. Keep candidates with optimal penalty (allow small tolerance for high diversity)
    const threshold = minPenalty + 0.1;
    const bestCandidates = candidates.filter(c => c.penalty <= threshold);

    // Pick one candidate from the best ones!
    const selectedIndex = Math.floor(Math.random() * bestCandidates.length);
    const selectedCandidate = bestCandidates[selectedIndex];
    const finalGroupsMembers = selectedCandidate.groups;

    // Create final mapped result groups
    const resultGroups: Group[] = Array.from({ length: G }, (_, idx) => ({
      id: idx + 1,
      name: `ក្រុមទី${idx + 1}`,
      members: finalGroupsMembers[idx]
    }));

    // 4. Sort and Assign Roles inside each group
    resultGroups.forEach(group => {
      // Sort by status weight descending
      group.members.sort((a, b) => getStatusWeight(b.status) - getStatusWeight(a.status));

      // Now assign roles:
      group.members.forEach((member, index) => {
        if (index === 0) {
          member.assignedRole = 'ប្រធាន';
        } else if (index === 1) {
          member.assignedRole = 'អនុប្រធាន';
        } else {
          member.assignedRole = 'សមាជិក';
        }
      });
    });

    // Compute actual gender limits inside the chosen grouping for statistics
    let maxB = 0, minB = Infinity;
    let maxG = 0, minG = Infinity;
    resultGroups.forEach(g => {
      const bCount = g.members.filter(m => m.gender === 'ប្រុស').length;
      const gCount = g.members.filter(m => m.gender === 'ស្រី').length;
      if (bCount > maxB) maxB = bCount;
      if (bCount < minB) minB = bCount;
      if (gCount > maxG) maxG = gCount;
      if (gCount < minG) minG = gCount;
    });

    setShuffleStats({
      combinationsTested: CANDIDATES_COUNT,
      fairPermutationsCount: bestCandidates.length,
      boysRange: `${minB} - ${maxB}`,
      girlsRange: `${minG} - ${maxG}`,
      showNotification: true
    });

    setGroups(resultGroups);
    saveGroupsState(resultGroups);
  };

  // Add Points or Deduct Points for all members of a specific group
  const handleAddGroupScore = (groupId: number, customPoints?: number) => {
    const pointsStr = groupScoreInputs[groupId] || '';
    const pointsVal = customPoints !== undefined ? customPoints : parseInt(pointsStr, 10);

    if (isNaN(pointsVal)) {
      alert('សូមបញ្ចូលពិន្ទុជាលេខត្រឹមត្រូវ!');
      return;
    }

    const updatedGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map(m => {
            const currentGScore = m.groupScore || 0;
            return { ...m, groupScore: currentGScore + pointsVal };
          })
        };
      }
      return g;
    });

    setGroups(updatedGroups);
    saveGroupsState(updatedGroups);

    // Reset input for this group
    setGroupScoreInputs(prev => ({ ...prev, [groupId]: '' }));
  };

  // Update score of a single member inside a group (E.g. add representative points or deduct active warnings)
  const handleUpdateStudentScore = (groupId: number, studentId: string, delta: number) => {
    const updatedGroups = groups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: g.members.map(m => {
            if (m.id === studentId) {
              const currentGScore = m.groupScore || 0;
              return { ...m, groupScore: currentGScore + delta };
            }
            return m;
          })
        };
      }
      return g;
    });

    setGroups(updatedGroups);
    saveGroupsState(updatedGroups);
  };

  // Export current groups and their points to styled Excel sheets
  const exportGroupsToExcel = () => {
    if (groups.length === 0) return;

    // Prepared group scores rows
    const rows: any[] = [];
    groups.forEach(g => {
      g.members.forEach(m => {
        const liveStudent = students.find(s => s.id === m.id);
        const groupScoreVal = m.groupScore || 0;
        const generalScoreVal = liveStudent ? liveStudent.score : (m.score || 0);
        rows.push({
          'ក្រុមរៀន': g.name,
          'ឈ្មោះសិស្ស': m.name,
          'ភេទ': m.gender || 'មិនស្គាល់',
          'តួនាទី': m.assignedRole || 'សមាជិក',
          'ពិន្ទុក្នុងក្រុម (ពិន្ទុក្រុម)': groupScoreVal,
          'ពិន្ទុក្នុងថ្នាក់រៀន (ក្ដារចុច/បង្វិល)': generalScoreVal
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set widths
    ws['!cols'] = [
      { wch: 15 }, // group
      { wch: 25 }, // name
      { wch: 10 }, // gender
      { wch: 15 }, // role
      { wch: 22 }, // group score
      { wch: 30 }  // general class score
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ពិន្ទុតាមក្រុម');

    // List of overall state
    const overallRecords = students.map(s => {
      // Find this student in existing groups to report their groupScore, or 0 if not assigned
      let groupAssigned = 'មិនទាន់បែងចែកក្រុម';
      let currentGroupScore = 0;
      for (const g of groups) {
        const member = g.members.find(m => m.id === s.id);
        if (member) {
          groupAssigned = g.name;
          currentGroupScore = member.groupScore || 0;
          break;
        }
      }

      return {
        'ឈ្មោះសិស្ស': s.name,
        'ភេទ': s.gender || 'មិនស្គាល់',
        'សាលា/ថ្នាក់': activeClassName,
        'ក្រុមដែលបានបែងចែក': groupAssigned,
        'ពិន្ទុក្នុងក្រុម (ពិន្ទុក្រុម)': currentGroupScore,
        'ពិន្ទុសរុបក្នុងថ្នាក់ (ក្ដារចុច/បង្វិល)': s.score
      };
    });

    const wsOverall = XLSX.utils.json_to_sheet(overallRecords);
    wsOverall['!cols'] = [
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 25 },
      { wch: 22 },
      { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOverall, 'បញ្ជីរួមគ្រប់សិស្ស');

    XLSX.writeFile(wb, `របាយការណ៍ពិន្ទុ_ថ្នាក់_${activeClassName}_${new Date().toLocaleDateString('kh-KH')}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Set Number of Teams Panel */}
      <div className={`p-6 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 border transition-all duration-300 ${
        isDarkMode ? 'bg-[#121829] border-slate-805 border-indigo-950/80 shadow-md' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-305 duration-300 ${
            isDarkMode ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-extrabold leading-tight transition-all duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>កំណត់ការបែងចែកក្រុមស្មើគ្នា</h2>
            <p className={`text-xs mt-1 font-semibold flex items-center gap-2 flex-wrap transition-all duration-300 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>ថ្នាក់៖ <span className={`font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{activeClassName}</span></span>
              <span>•</span>
              <span>សិស្សសរុប៖ <span className={`font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{students.length} នាក់</span></span>
            </p>
          </div>
        </div>

        {/* Adjusters & Buttons */}
        <div className="flex flex-wrap items-center gap-4 self-end lg:self-auto">
          {/* Quick View, Copy, Paste, & Edit All Students */}
          <button
            type="button"
            onClick={() => setShowQuickEditModal(true)}
            className={`px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 border transition-all cursor-pointer text-xs shadow-sm active:scale-95 ${
              isDarkMode 
                ? 'bg-purple-950/40 border-purple-900/50 text-purple-300 hover:bg-purple-900/60' 
                : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
            }`}
            title="មើល ចម្លង (Copy) បិទភ្ជាប់ (Paste) និងកែសម្រួលឈ្មោះសិស្សទាំងអស់"
          >
            <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>បញ្ជី & កែឈ្មោះសិស្ស</span>
          </button>

          {groups.length > 0 && (
            <button
              onClick={exportGroupsToExcel}
              className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-md shadow-green-500/10 cursor-pointer text-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ទាញយករបាយការណ៍ពិន្ទុ (Excel)</span>
            </button>
          )}

          <div className={`flex items-center rounded-2xl p-1 shadow-inner select-none border transition-all duration-300 ${
            isDarkMode ? 'bg-slate-950 border-slate-850 border-indigo-950/80' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={handleDecrement}
              disabled={numGroups <= 2}
              className={`w-10 h-10 flex items-center justify-center rounded-xl disabled:opacity-40 transition-all cursor-pointer border ${
                isDarkMode 
                  ? 'text-slate-400 bg-slate-905 bg-slate-900 border-slate-800 hover:bg-slate-800' 
                  : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className={`w-12 text-center text-lg font-black font-mono transition-all duration-300 ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>{numGroups}</span>
            <button
              onClick={handleIncrement}
              disabled={numGroups >= students.length}
              className={`w-10 h-10 flex items-center justify-center rounded-xl disabled:opacity-40 transition-all cursor-pointer border ${
                isDarkMode 
                  ? 'text-slate-400 bg-slate-905 bg-slate-900 border-slate-800 hover:bg-slate-800' 
                  : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={splitGroups}
            disabled={students.length === 0}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-95 transition-all text-xs"
          >
            <Shuffle className="w-4 h-4" />
            <span>បែងចែកក្រុមឥឡូវនេះ</span>
          </button>
        </div>
      </div>

      {shuffleStats && (
        <div className={`p-4 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4 duration-300 ${
          isDarkMode ? 'bg-indigo-950/20 border-indigo-505/20 border-indigo-500/10 text-slate-350' : 'bg-indigo-500/5 border-indigo-100/50 text-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xl shrink-0">✨</span>
            <div className="text-left">
              <p className="text-xs font-bold font-sans">
                វិភាគជម្រើសចម្លាស់៖ <span className="font-extrabold text-indigo-550 dark:text-indigo-400">{shuffleStats.combinationsTested.toLocaleString()} របៀប</span> • 
                ប្រភេទចម្លាស់ស្មើភាពខ្ពស់រកឃើញ៖ <span className="font-extrabold text-indigo-600 dark:text-indigo-300">{shuffleStats.fairPermutationsCount} ជម្រើសផ្សេងគ្នា</span>
              </p>
              <p className="text-[11px] mt-0.5 opacity-80 leading-relaxed font-semibold">
                ប្រព័ន្ធលាយឡំសិទ្ធសកម្ម/ខ្សោយ និងជម្រើសប្រុស-ស្រីឱ្យមានតុល្យភាពស្មើភាពគ្នាល្អបំផុត ដើម្បីលុបបំបាត់ភាពលម្អៀង។
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[10px] font-extrabold font-mono px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              ប្រុសក្នុងក្រុម៖ {shuffleStats.boysRange} នាក់
            </span>
            <span className="text-[10px] font-extrabold font-mono px-2.5 py-1 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              ស្រីក្នុងក្រុម៖ {shuffleStats.girlsRange} នាក់
            </span>
          </div>
        </div>
      )}

      {/* Divided Groups Content Grid */}
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col border ${
                isDarkMode ? 'bg-[#121829] border-indigo-950/80' : 'bg-white border-slate-200'
              }`}
            >
              {/* Group Title and Info */}
              <div className={`flex items-center justify-between border-b pb-3 mb-2 transition-all duration-300 ${
                isDarkMode ? 'border-slate-800/80 border-indigo-950/30' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-all duration-300 ${
                    isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {group.id}
                  </div>
                  <h3 className={`font-extrabold font-sans text-base transition-all duration-300 ${
                    isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`}>{group.name}</h3>
                </div>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase transition-all duration-300 ${
                  isDarkMode ? 'bg-indigo-950/40 text-indigo-300' : 'bg-indigo-50 text-indigo-650'
                }`}>
                  {group.members.length} នាក់
                </span>
              </div>

              {/* Group Metrics Bar (Genders Ratio) */}
              <div className="flex items-center justify-between mb-4 text-[11px] font-extrabold">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-800/40">
                  <span className="text-blue-500 flex items-center gap-0.5">♂ {group.members.filter(m => m.gender === 'ប្រុស').length} នាក់</span>
                  <span className="text-slate-300 dark:text-slate-800">|</span>
                  <span className="text-pink-500 flex items-center gap-0.5">♀ {group.members.filter(m => m.gender === 'ស្រី').length} នាក់</span>
                </div>
              </div>

              {/* Score Group Interface */}
              <div className={`p-3.5 rounded-2xl mb-4 space-y-2 border transition-all duration-300 ${
                isDarkMode ? 'bg-slate-950/50 border-slate-800/80' : 'bg-indigo-50/40 border-indigo-100/50'
              }`}>
                <span className={`block text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-700'
                }`}>
                  🎯 ដាក់ពិន្ទុឲ្យក្រុម
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAddGroupScore(group.id, 1)}
                    className="flex-1 py-1 px-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    title="បន្ថែម ១ ពិន្ទុគ្រប់គ្នា"
                  >
                    +១
                  </button>
                  <button
                    onClick={() => handleAddGroupScore(group.id, 5)}
                    className="flex-1 py-1 px-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    title="បន្ថែម ៥ ពិន្ទុគ្រប់គ្នា"
                  >
                    +៥
                  </button>
                  <button
                    onClick={() => handleAddGroupScore(group.id, -1)}
                    className="flex-1 py-1 px-1 bg-rose-500 hover:bg-rose-600 text-white font-extrabold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    title="ដក ១ ពិន្ទុគ្រប់គ្នា"
                  >
                    -១
                  </button>
                  <button
                    onClick={() => handleAddGroupScore(group.id, -5)}
                    className="flex-1 py-1 px-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    title="ដក ៥ ពិន្ទុគ្រប់គ្នា"
                  >
                    -៥
                  </button>

                  <div className={`w-[1.2px] h-6 mx-0.5 transition-all duration-300 ${
                    isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                  }`} />

                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      placeholder="ពិន្ទុ"
                      value={groupScoreInputs[group.id] || ''}
                      onChange={(e) => setGroupScoreInputs(prev => ({ ...prev, [group.id]: e.target.value }))}
                      className={`w-12 text-center text-xs font-black rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 border transition-all duration-300 ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                    <button
                      onClick={() => handleAddGroupScore(group.id)}
                      className="p-1 min-w-[28px] h-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      title="បញ្ចូលពិន្ទុពិសេស"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="flex-1 space-y-2">
                {group.members.map((member) => {
                  const liveStudent = students.find(s => s.id === member.id);
                  const liveGroupScore = member.groupScore || 0;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-2.5 rounded-2xl transition-all border ${
                        isDarkMode 
                          ? 'bg-slate-950/20 border-indigo-950/30 text-slate-300 hover:border-slate-800' 
                          : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base shrink-0 select-none">
                          {liveStudent?.emoji || member.emoji || (member.gender === 'ស្រី' ? '👧' : '👦')}
                        </span>
                        <div className="truncate text-left">
                          <div className="truncate text-sm font-bold flex items-center gap-1.5">
                            <span className={`truncate transition-all duration-300 ${
                              isDarkMode ? 'text-slate-200' : 'text-slate-800'
                            }`}>{member.name}</span>
                            <span className={`text-[11px] font-extrabold shrink-0 transition-all duration-300 ${
                              isDarkMode ? 'text-slate-400 text-indigo-300' : 'text-slate-500'
                            }`}>
                              ({member.assignedRole || 'សមាជិក'})
                            </span>
                            {member.gender && (
                              <span className={`text-[10px] font-black shrink-0 ${member.gender === 'ប្រុស' ? 'text-blue-500' : 'text-pink-500'}`} title={member.gender}>
                                {member.gender === 'ប្រុស' ? '♂' : '♀'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Score control actions for individual students */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Current Group Score */}
                        <div className="flex flex-col items-center">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black min-w-[42px] justify-center shadow-inner transition-all duration-300 ${
                            isDarkMode ? 'bg-emerald-950/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                          }`} title="ពិន្ទុក្នុងក្រុម">
                            <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{liveGroupScore}</span>
                          </div>
                        </div>

                        {/* Increment Student Group Score */}
                        <button
                          onClick={() => handleUpdateStudentScore(group.id, member.id, 1)}
                          className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer active:scale-90 ${
                            isDarkMode 
                              ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white'
                          }`}
                          title="បន្ថែម ១ ពិន្ទុក្រុម"
                        >
                          +
                        </button>

                        {/* Decrement Student Group Score */}
                        <button
                          onClick={() => handleUpdateStudentScore(group.id, member.id, -1)}
                          className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer active:scale-90 ${
                            isDarkMode 
                              ? 'bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white' 
                              : 'bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white'
                          }`}
                          title="ដក ១ ពិន្ទុក្រុម"
                        >
                          -
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-20 border border-dashed rounded-3xl transition-all duration-300 p-6 ${
          isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <Users className={`w-12 h-12 mx-auto mb-2 opacity-50 transition-all duration-300 ${
            isDarkMode ? 'text-slate-700' : 'text-slate-300'
          }`} />
          {students.length === 0 ? (
            <div>
              <p className={`text-sm font-bold mb-3 transition-all duration-300 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                មិនទាន់មានឈ្មោះសិស្សនៅក្នុងថ្នាក់នេះនៅឡើយទេ សូមបញ្ចូលឈ្មោះសិស្សដើម្បីចាប់ផ្ដើមបែងចែកក្រុម!
              </p>
              <button
                type="button"
                onClick={() => setShowQuickEditModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer mx-auto active:scale-95"
              >
                <ClipboardList className="w-4 h-4" />
                <span>បញ្ចូល ឬ បិទភ្ជាប់ឈ្មោះសិស្សទាំងអស់</span>
              </button>
            </div>
          ) : (
            <div>
              <p className={`text-sm font-bold mb-3 transition-all duration-300 ${
                isDarkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                សូមចុចប៊ូតុង «បែងចែកក្រុមឥឡូវនេះ» ដើម្បីកំណត់ក្រុមស្មើគ្នាដែលមានសិស្សចម្រុះគ្រប់ប្រភេទ!
              </p>
              <button
                type="button"
                onClick={() => setShowQuickEditModal(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>មើល/កែឈ្មោះសិស្ស ({students.length} នាក់)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick View, Edit, Copy & Paste Modal */}
      <StudentQuickEditModal
        isOpen={showQuickEditModal}
        onClose={() => setShowQuickEditModal(false)}
        students={students}
        className={activeClassName}
        isDarkMode={isDarkMode}
        onSave={async (names, mode) => {
          if (onBatchSyncStudents) {
            await onBatchSyncStudents(names, mode);
          }
        }}
      />
    </div>
  );
}
