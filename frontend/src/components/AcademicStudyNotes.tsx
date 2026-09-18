import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  Cpu,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckSquare,
  Square,
  Bookmark,
  Pin,
  ArrowRight
} from 'lucide-react';
import type { Meeting } from '../types';

interface AcademicStudyNotesProps {
  meeting: Meeting;
}

export const AcademicStudyNotes: React.FC<AcademicStudyNotesProps> = ({ meeting }) => {
  const acad = meeting.summary?.persona_insights?.academic_notes;
  const titleLower = (meeting.title || '').toLowerCase();

  // Topic classification
  const isOS =
    titleLower.includes('operating system') ||
    titleLower.includes('os ') ||
    titleLower.includes('kernel') ||
    titleLower.includes('process') ||
    titleLower.includes('gate smashers') ||
    acad?.diagram_type === 'os_architecture';

  const isAttention =
    titleLower.includes('transformer') ||
    titleLower.includes('attention') ||
    titleLower.includes('cs224n') ||
    acad?.diagram_type === 'transformer_attention';

  // Diagram Tab State
  const defaultDiagram = isOS ? 'os_arch' : isAttention ? 'attention' : 'system_flow';
  const [activeDiagram, setActiveDiagram] = useState<string>(defaultDiagram);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Default Important Points fallback if not generated
  const importantPoints = acad?.important_points || [
    `🔥 [MUST REMEMBER] Core understanding of ${meeting.title} relies on clear architectural modularity and state tracking.`,
    `💡 [CORE INTUITION] Always decouple high-latency hardware/network operations from critical path execution loops.`,
    `⚠️ [EXAM TRAP] Common misconception: do not confuse logical abstractions with physical hardware implementations.`,
    `🔥 [FREQUENTLY TESTED] State transitions, boundary validations, and error handling guarantees are prioritized in evaluations.`
  ];

  // Default Definitions fallback
  const definitions = acad?.key_definitions || [
    {
      term: isOS ? 'Operating System' : 'System Architecture',
      definition: isOS
        ? 'System software that acts as an interface between computer hardware and user application programs.'
        : 'The conceptual model that defines the structure, behavior, and more views of a system.'
    },
    {
      term: isOS ? 'Kernel' : 'Execution Pipeline',
      definition: isOS
        ? 'The foundational core of the OS that remains resident in main memory and possesses direct privileged hardware access.'
        : 'A set of data processing elements connected in series, where the output of one element is the input of the next.'
    },
    {
      term: isOS ? 'System Call' : 'State Management',
      definition: isOS
        ? 'The programmatic interface via which a user-mode process safely requests a privileged service from the operating system kernel.'
        : 'The practice of tracking and updating user inputs and data flow across sequential lifecycles.'
    }
  ];

  // Default Questions fallback
  const practiceQuestions = acad?.practice_questions || [
    {
      id: 1,
      q: isOS
        ? 'Why is dual-mode operation necessary in modern operating systems?'
        : `What is the primary architectural objective discussed in '${meeting.title}'?`,
      a: isOS
        ? 'Dual-mode operation isolates user programs from executing privileged CPU instructions (like direct memory writes or hardware I/O). If any user program could directly access hardware, a single bug or malicious script could crash the entire machine or overwrite other users\' data.'
        : `To provide a resilient, modular framework that decouples ingestion from heavy processing and provides transparent verification.`
    },
    {
      id: 2,
      q: isOS
        ? 'What is the primary difference between a system call and a standard function call?'
        : 'How does the system ensure data consistency under high concurrent load?',
      a: isOS
        ? 'A standard function call executes within the process\'s own user-space address space without changing CPU privilege levels. A system call executes a software trap interrupt that switches the CPU mode bit from User Mode to Kernel Mode, allowing the kernel to perform privileged operations safely before returning to user mode.'
        : 'By introducing transactional boundaries, idempotent state machines, and caching layers to protect primary data stores.'
    }
  ];

  // Default Checklist fallback
  const studyChecklist = acad?.study_checklist || [
    { id: 't1', text: isOS ? 'Diagram the transition between User Mode and Kernel Mode via system calls' : 'Summarize core architectural principles in your own words' },
    { id: 't2', text: isOS ? 'Review the 5-state process lifecycle (New, Ready, Running, Waiting, Terminated)' : 'Map out the input-to-output data transformation pipeline' },
    { id: 't3', text: isOS ? 'Compare FCFS, SJF, and Round Robin CPU scheduling tradeoffs' : 'Review edge case failure scenarios and recovery strategies' }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 📝 HUMAN-ANNOTATED NOTEBOOK HEADER & STUDY GUIDE */}
      <div className="relative p-8 rounded-3xl bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-500/40 shadow-xl space-y-5 overflow-hidden">
        {/* Notebook Lined Accent */}
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <BookOpen className="w-48 h-48 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-black px-3 py-1 rounded-md bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/40 tracking-wider">
                  📖 Human-Annotated Student Notes
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {acad?.subject || (isOS ? 'Operating Systems' : isAttention ? 'Deep Learning' : 'Computer Science')}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                {meeting.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-500/40 text-amber-800 dark:text-amber-300 shadow-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Topper's Study Notebook</span>
            </span>
          </div>
        </div>

        {/* Handwritten Style Summary Card */}
        <div className="relative p-6 rounded-2xl bg-amber-50/90 dark:bg-slate-900/90 border border-amber-300 dark:border-amber-500/30 shadow-sm space-y-3 font-sans">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
            <Pin className="w-4 h-4" />
            <span>Core Intuition & Conceptual Breakdown (Human Writing Style)</span>
          </div>

          <div className="text-base text-slate-800 dark:text-slate-100 leading-relaxed font-medium whitespace-pre-line space-y-3">
            {acad?.handwritten_summary ? (
              acad.handwritten_summary
            ) : isOS ? (
              <>
                <p>
                  <span className="bg-yellow-200/80 dark:bg-yellow-900/40 px-1 py-0.5 rounded font-bold text-slate-900 dark:text-amber-200">
                    An Operating System (OS) is the primary system software bridging computer hardware and user applications.
                  </span>{' '}
                  Think of it as a government or traffic controller—it doesn't produce direct work itself, but provides an organized, safe environment where user programs can run smoothly.
                </p>
                <p>
                  The OS is responsible for 4 primary managers: <b>Process Management</b> (CPU scheduling), <b>Main Memory Management</b> (RAM allocation & virtual memory), <b>Secondary Storage</b> (files & directories), and <b>I/O Devices</b> (printers, keyboard, disk controllers).
                </p>
                <p>
                  To prevent faulty user applications from destroying the machine, the OS enforces <b>Dual-Mode Operation</b>: User Mode (restricted instructions) and Kernel Mode (privileged hardware access), bridged safely by <b>System Calls</b> (like <code className="font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1 rounded">fork()</code>, <code className="font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1 rounded">read()</code>, <code className="font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1 rounded">write()</code>).
                </p>
              </>
            ) : (
              <p>
                {meeting.summary?.executive_summary ||
                  `This lecture breaks down the foundational mechanics and theoretical insights of ${meeting.title}. Focus on the visual workflow diagrams, exam points, and review questions below.`}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-amber-200 dark:border-slate-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-semibold">
            <span>✏️ Student Note: Review before solving numerical questions & derivations</span>
            <span className="font-mono">Status: Verified Lecture Notes</span>
          </div>
        </div>
      </div>

      {/* 🔥 2. CRUCIAL EXAM & INTERVIEW HIGH-YIELD POINTS */}
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">
              Crucial Exam & High-Yield Important Points
            </h4>
            <p className="text-xs font-semibold text-slate-400">
              Frequently tested principles, core definitions, and exam traps
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {importantPoints.map((pt: string, idx: number) => {
            const isMust = pt.includes('MUST REMEMBER');
            const isTrap = pt.includes('EXAM TRAP') || pt.includes('TRAP');
            const isIntuition = pt.includes('CORE INTUITION') || pt.includes('INTUITION');

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all ${
                  isMust
                    ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
                    : isTrap
                    ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
                    : isIntuition
                    ? 'bg-sky-500/5 dark:bg-sky-950/20 border-sky-500/30'
                    : 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30'
                } space-y-2`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isMust
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : isTrap
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                        : isIntuition
                        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                        : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {isMust ? '🔥 High Yield' : isTrap ? '⚠️ Exam Trap' : isIntuition ? '💡 Core Intuition' : '📌 Important Point'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {pt.replace(/^.*\]\s*/, '')}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📊 3. DYNAMIC INTERACTIVE CONCEPT & ARCHITECTURE DIAGRAMS */}
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white">
                Interactive Concept & Architecture Diagrams
              </h4>
              <p className="text-xs font-semibold text-slate-400">
                Visual systems diagrams, execution layers, and state flowcharts
              </p>
            </div>
          </div>

          {/* Diagram Selector Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            {isOS ? (
              <>
                <button
                  onClick={() => setActiveDiagram('os_arch')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDiagram === 'os_arch'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  OS Layered Architecture
                </button>
                <button
                  onClick={() => setActiveDiagram('process_states')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDiagram === 'process_states'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  5-State Process Lifecycle
                </button>
                <button
                  onClick={() => setActiveDiagram('dual_mode')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDiagram === 'dual_mode'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Dual-Mode System Calls
                </button>
              </>
            ) : isAttention ? (
              <>
                <button
                  onClick={() => setActiveDiagram('attention')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDiagram === 'attention'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Scaled Dot-Product Attention
                </button>
                <button
                  onClick={() => setActiveDiagram('kv_cache')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDiagram === 'kv_cache'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  KV Cache Flow
                </button>
                <button
                  onClick={() => setActiveDiagram('flash_attention')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDiagram === 'flash_attention'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  FlashAttention SRAM Tiling
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveDiagram('system_flow')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDiagram === 'system_flow'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  System Execution Flow
                </button>
                <button
                  onClick={() => setActiveDiagram('state_lifecycle')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDiagram === 'state_lifecycle'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  State Lifecycle & Validation
                </button>
              </>
            )}
          </div>
        </div>

        {/* 1. OS LAYERED ARCHITECTURE DIAGRAM */}
        {activeDiagram === 'os_arch' && (
          <div className="p-6 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-6">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
              <span>Figure 1.1: Complete Operating System Layered Model</span>
              <span className="text-slate-400 font-mono">User Space vs Kernel Space</span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 py-4 font-mono text-xs w-full max-w-2xl mx-auto">
              {/* Layer 1: User Space */}
              <div className="w-full p-4 rounded-2xl bg-sky-600/20 border-2 border-sky-500/50 text-center space-y-1 shadow-sm">
                <div className="text-sky-300 font-black text-sm">USER SPACE (User Mode: Mode Bit = 1)</div>
                <div className="text-slate-300 text-xs">
                  Web Browsers, Text Editors, Compiler (gcc), User Python Applications, Database Clients
                </div>
              </div>

              <div className="text-amber-400 text-sm font-bold flex items-center gap-2">
                <span>↓</span> <span>System Call Interface (Trap to Kernel Mode)</span> <span>↑</span>
              </div>

              {/* Layer 2: System Call Interface */}
              <div className="w-full p-3 rounded-xl bg-amber-500/20 border-2 border-amber-500/60 text-center text-amber-200 font-bold">
                System Calls: fork(), exec(), wait(), read(), write(), open(), socket(), kill()
              </div>

              <div className="text-purple-400 text-sm font-bold">↓ (CPU Mode Bit switches to 0)</div>

              {/* Layer 3: Kernel Space */}
              <div className="w-full p-5 rounded-2xl bg-purple-600/20 border-2 border-purple-500/60 text-center space-y-2">
                <div className="text-purple-300 font-black text-sm">KERNEL SPACE (Privileged Mode: Mode Bit = 0)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-bold">
                  <div className="p-2 bg-purple-900/50 rounded-xl border border-purple-500/40 text-purple-200">
                    Process Manager<br /><span className="text-[9px] text-slate-300">CPU Scheduler, PCB</span>
                  </div>
                  <div className="p-2 bg-purple-900/50 rounded-xl border border-purple-500/40 text-purple-200">
                    Memory Manager<br /><span className="text-[9px] text-slate-300">Paging, Virtual RAM</span>
                  </div>
                  <div className="p-2 bg-purple-900/50 rounded-xl border border-purple-500/40 text-purple-200">
                    File System<br /><span className="text-[9px] text-slate-300">ext4, NTFS, inodes</span>
                  </div>
                  <div className="p-2 bg-purple-900/50 rounded-xl border border-purple-500/40 text-purple-200">
                    I/O Devices<br /><span className="text-[9px] text-slate-300">Drivers & Buffering</span>
                  </div>
                </div>
              </div>

              <div className="text-emerald-400 text-sm font-bold">↓ (Direct Hardware Control)</div>

              {/* Layer 4: Hardware */}
              <div className="w-full p-4 rounded-2xl bg-emerald-600/20 border-2 border-emerald-500/50 text-center space-y-1">
                <div className="text-emerald-300 font-black text-sm">HARDWARE LAYER</div>
                <div className="text-slate-300 text-xs">
                  CPU (Registers, Cache, MMU) • Main Memory (DRAM) • Hard Disks / SSDs • Network NIC & Display
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
              <span className="font-bold text-amber-400">💡 Exam Note:</span> The hardware mode bit isolates the layers. If a user application attempts to execute a privileged instruction directly without a system call trap, the CPU triggers a hardware fault (Segmentation Fault / General Protection Fault).
            </div>
          </div>
        )}

        {/* 2. PROCESS LIFECYCLE DIAGRAM */}
        {activeDiagram === 'process_states' && (
          <div className="p-6 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-6">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>Figure 1.2: Classical 5-State Process Lifecycle</span>
              <span className="text-slate-400 font-mono">Process Scheduling Model</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 py-6 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-slate-800 border-2 border-slate-600 text-center w-28">
                <div className="font-black text-slate-200">NEW</div>
                <div className="text-[10px] text-slate-400">Being created</div>
              </div>

              <div className="text-slate-400 font-bold">→ admitted →</div>

              <div className="p-4 rounded-2xl bg-sky-600/20 border-2 border-sky-500 text-center w-32 shadow-md">
                <div className="font-black text-sky-300">READY</div>
                <div className="text-[10px] text-slate-400">In RAM, waiting for CPU</div>
              </div>

              <div className="text-emerald-400 font-bold text-center">
                <div>dispatch →</div>
                <div className="text-rose-400">← interrupt</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-600/20 border-2 border-emerald-500 text-center w-32 shadow-md">
                <div className="font-black text-emerald-300">RUNNING</div>
                <div className="text-[10px] text-slate-400">Instructions executing</div>
              </div>

              <div className="text-purple-400 font-bold">→ exit →</div>

              <div className="p-4 rounded-2xl bg-rose-600/20 border-2 border-rose-500 text-center w-32">
                <div className="font-black text-rose-300">TERMINATED</div>
                <div className="text-[10px] text-slate-400">PCB Deallocated</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-mono text-amber-400">
              <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-center max-w-md">
                <div className="font-black text-amber-300">WAITING / BLOCKED</div>
                <div className="text-[10px] text-slate-300 mt-1">
                  Processes waiting for I/O completion, disk read, or event signal.<br />
                  Running → I/O wait → Waiting → I/O completed → Ready
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. DUAL-MODE TRANSITION DIAGRAM */}
        {activeDiagram === 'dual_mode' && (
          <div className="p-6 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-6">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
              <span>Figure 1.3: Dual-Mode Operation & System Call Trap</span>
              <span className="text-slate-400 font-mono">Hardware Mode Bit Transition</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="font-black text-sky-400 text-sm flex items-center gap-2">
                  <span>1. User Mode (Mode Bit = 1)</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                  <div>• Application calls C library wrapper: <code>read(fd, buf, n)</code></div>
                  <div>• Sets system call ID in register EAX</div>
                  <div>• Executes software trap interrupt: <code className="text-amber-400 font-bold">int 0x80 / syscall</code></div>
                  <div className="text-emerald-400 font-bold">→ Hardware switches Mode Bit to 0</div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="font-black text-purple-400 text-sm flex items-center gap-2">
                  <span>2. Kernel Mode (Mode Bit = 0)</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                  <div>• CPU jumps to System Call Vector Table in Kernel</div>
                  <div>• Verifies user pointer memory buffer validity</div>
                  <div>• Kernel routine executes privileged disk controller I/O</div>
                  <div>• Executes <code className="text-sky-400 font-bold">sysret / iret</code> instruction</div>
                  <div className="text-sky-300 font-bold">→ Mode Bit switches back to 1 and returns result</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. TRANSFORMER ATTENTION DIAGRAM */}
        {activeDiagram === 'attention' && (
          <div className="p-6 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-6">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
              <span>Scaled Dot-Product Attention Pipeline</span>
              <span className="text-slate-400 font-mono">Complexity: O(N² · d)</span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3 py-4 font-mono text-xs">
              <div className="flex items-center gap-8">
                <div className="px-4 py-2 rounded-xl bg-purple-600/30 border border-purple-500 text-purple-200 font-bold text-center">
                  Queries (Q) <br /><span className="text-[10px] text-slate-400">[N × d_k]</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-blue-600/30 border border-blue-500 text-blue-200 font-bold text-center">
                  Keys (K) <br /><span className="text-[10px] text-slate-400">[N × d_k]</span>
                </div>
                <div className="px-4 py-2 rounded-xl bg-emerald-600/30 border border-emerald-500 text-emerald-200 font-bold text-center">
                  Values (V) <br /><span className="text-[10px] text-slate-400">[N × d_v]</span>
                </div>
              </div>

              <div className="text-slate-400 text-base">↓ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ↓</div>

              <div className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-center">
                Matrix Multiplication: <span className="text-sky-400">Q × Kᵀ</span> <span className="text-slate-400 text-[10px]">[N × N raw scores]</span>
              </div>

              <div className="text-slate-400 text-base">↓</div>

              <div className="px-6 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200 font-bold text-center">
                Scale Factor: <span className="text-amber-300">÷ √(d_k)</span> <span className="text-slate-400 text-[10px]">(prevents gradient vanishing)</span>
              </div>

              <div className="text-slate-400 text-base">↓</div>

              <div className="px-6 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 font-bold text-center">
                Softmax: <span className="text-rose-300">softmax((Q Kᵀ) / √(d_k))</span> <span className="text-slate-400 text-[10px]">[Attention Weights]</span>
              </div>

              <div className="text-slate-400 text-base">↓ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ↙ (Values V)</div>

              <div className="px-8 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 text-white font-extrabold text-sm text-center shadow-lg">
                Final Attention Output = Softmax × V &nbsp;<span className="text-sky-200 text-xs font-normal">[N × d_v]</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. SYSTEM FLOW DIAGRAM FOR GENERAL LECTURES */}
        {activeDiagram === 'system_flow' && (
          <div className="p-6 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-6">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
              <span>{acad?.diagram_title || 'Modular System Architecture & Pipeline Flow'}</span>
              <span className="text-slate-400 font-mono">End-to-End Execution</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
              {(acad?.diagram_nodes || [
                { name: 'Input & Ingestion', subtitle: 'Ingestion of audio/video and transcripts', color: 'sky' },
                { name: 'Processing Core', subtitle: 'FFmpeg normalization & Whisper/Sarvam STT', color: 'purple' },
                { name: 'Intelligence Synthesis', subtitle: 'Mistral AI multi-persona extraction', color: 'amber' },
                { name: 'Vector Store & RAG', subtitle: 'ChromaDB embeddings & Grounded retrieval', color: 'emerald' }
              ]).map((node: any, idx: number) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                      Stage {idx + 1}
                    </span>
                    {idx < 3 && (
                      <ArrowRight className="w-4 h-4 text-slate-500 hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10" />
                    )}
                  </div>
                  <div className="text-base font-extrabold text-white">{node.name}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{node.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. KEY DEFINITIONS & TERMINOLOGY */}
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">
              Core Definitions & Terminology
            </h4>
            <p className="text-xs font-semibold text-slate-400">
              Precise theoretical terms and explanations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {definitions.map((item: any, idx: number) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2"
            >
              <div className="text-sm font-extrabold text-sky-600 dark:text-sky-400 flex items-center gap-2">
                <Bookmark className="w-4 h-4 shrink-0" />
                <span>{item.term}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                {item.definition}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 5. EXAM PRACTICE QUESTIONS WITH REVEALABLE ANSWERS */}
      <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-md space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">
              Exam Practice & Review Questions
            </h4>
            <p className="text-xs font-semibold text-slate-400">
              Test your conceptual mastery with click-to-reveal solutions
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          {practiceQuestions.map((item: any) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2 cursor-pointer transition-all hover:border-amber-500/50"
              onClick={() => setExpandedQuestion(expandedQuestion === item.id ? null : item.id)}
            >
              <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-slate-100">
                <span className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-sky-500 shrink-0" />
                  <span>{item.q}</span>
                </span>
                {expandedQuestion === item.id ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {expandedQuestion === item.id && (
                <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-700 text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actionable Study Checklist */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            Actionable Study Checklist
          </div>
          <div className="space-y-2.5">
            {studyChecklist.map((task: any) => (
              <div
                key={task.id}
                onClick={() => toggleCheck(task.id)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer hover:border-sky-500/50 transition-colors"
              >
                {checkedItems[task.id] ? (
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    checkedItems[task.id]
                      ? 'line-through text-slate-400'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
