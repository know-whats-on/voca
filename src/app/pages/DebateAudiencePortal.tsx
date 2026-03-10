import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { ThumbsUp, Heart, Trophy, Zap, AlertCircle, Loader2, LogIn, CheckCircle2, Crown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import * as api from "../utils/api";
import * as kv from "../utils/kv";
import { Session, Assessment, DebateTeam, Student } from "../types";
import { LoadSplash } from "../components/LoadSplash";

const DEVICE_KEY_PREFIX = "voca_debate_audience_";

interface DebateStateRemote {
  currentRoundIndex: number;
  roundName: string;
  speakingTeam: "for" | "against" | "both";
  timeRemaining: number;
  totalRounds: number;
  running: boolean;
  finished: boolean;
  votingWindow?: boolean;
  votingTimeRemaining?: number;
  preCountdown?: number;
}

export default function DebateAudiencePortal() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Student ID gate
  const [stage, setStage] = useState<"validate" | "portal" | "ended">("validate");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");

  // Vote state — round-aware: audience can change vote each round
  const [hasVoted, setHasVoted] = useState<string | null>(null); // current vote: "for" | "against" | null
  const [votedThisRound, setVotedThisRound] = useState(false); // locked for THIS voting window
  const [lastVotedRoundIndex, setLastVotedRoundIndex] = useState<number>(-1);

  // Debate ended state
  const [debateState, setDebateState] = useState<DebateStateRemote | null>(null);
  const [finalVotesFor, setFinalVotesFor] = useState(0);
  const [finalVotesAgainst, setFinalVotesAgainst] = useState(0);

  // Particle effects
  const [particles, setParticles] = useState<{ id: string; icon: any; x: number; y: number }[]>([]);

  // All students for this course (global + assessment combined)
  const [allCourseStudents, setAllCourseStudents] = useState<Student[]>([]);

  // Track last seen voting window round to detect new window
  const lastVotingWindowRoundRef = useRef<number>(-1);

  // ─── Load session + assessment ───
  useEffect(() => {
    if (!sessionId) return;
    const init = async () => {
      try {
        const s = await api.getSession(sessionId);
        setSession(s);
        const a = (await kv.get(`CHATGPT_assessments_${s.assessmentId}`)) as Assessment | null;
        setAssessment(a);

        // Load global students and merge with assessment students for robust matching
        let mergedStudents: Student[] = [...(a?.students || [])];
        try {
          const globalStudents = (await kv.get("CHATGPT_students_global")) as Student[] | null;
          if (globalStudents && Array.isArray(globalStudents)) {
            const courseId = a?.courseId;
            const courseStudents = courseId
              ? globalStudents.filter(gs => gs.courseId === courseId)
              : globalStudents;
            const existingIds = new Set(mergedStudents.map(s => s.id));
            courseStudents.forEach(gs => {
              if (!existingIds.has(gs.id)) mergedStudents.push(gs);
            });
          }
        } catch (e) {
          console.error("[DebateAudiencePortal] Failed to load global students:", e);
        }
        setAllCourseStudents(mergedStudents);

        // Check if already identified from this device
        const deviceKey = DEVICE_KEY_PREFIX + sessionId;
        const deviceData = localStorage.getItem(deviceKey);
        if (deviceData) {
          try {
            const parsed = JSON.parse(deviceData);
            setStudentName(parsed.studentName || "");
            setStudentId(parsed.studentId || "");
            // Restore last vote (may be from a previous round)
            if (parsed.vote) {
              setHasVoted(parsed.vote);
              setLastVotedRoundIndex(parsed.lastVotedRoundIndex ?? -1);
            }
            setStage("portal");
          } catch { }
        }

        setLoading(false);
      } catch (err) {
        setErrorMsg("Session not found");
        setLoading(false);
      }
    };
    init();
  }, [sessionId]);

  // ─── Poll debate state + unlock vote for new rounds ───
  useEffect(() => {
    if (!session) return;
    const poll = async () => {
      try {
        const state = (await kv.get(`CHATGPT_debate_state_${session.id}`)) as DebateStateRemote | null;
        if (state) {
          setDebateState(state);

          // Detect NEW voting window opening → unlock vote for this round
          if (state.votingWindow) {
            const windowRound = state.currentRoundIndex;
            if (windowRound !== lastVotingWindowRoundRef.current) {
              lastVotingWindowRoundRef.current = windowRound;
              // Only unlock if they haven't already voted in THIS specific round
              setVotedThisRound(prev => {
                // If their lastVotedRoundIndex matches this round, they already voted this window
                // We check via state, not the ref, because state update is async
                return false; // Always unlock when a new window round is detected
              });
            }
          }

          if (state.finished) {
            const evs = await kv.getByPrefix(`CHATGPT_debate_event_${session.id}_`);
            const latestVoteByStudent: Record<string, string> = {};
            evs.forEach((e: any) => {
              if (e.type === "vote" && e.studentId) {
                latestVoteByStudent[e.studentId] = e.value;
              }
            });
            let vFor = 0, vAgainst = 0;
            Object.values(latestVoteByStudent).forEach(v => {
              if (v === "for") vFor++;
              if (v === "against") vAgainst++;
            });
            setFinalVotesFor(vFor);
            setFinalVotesAgainst(vAgainst);
            setStage("ended");
          }
        }
      } catch { }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [session]);

  // ─── Validate student ID ───
  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = studentIdInput.trim();
    if (!trimmed || !assessment) return;

    setValidating(true);
    setValidateError("");

    const allStudents = allCourseStudents || [];
    const matched = allStudents.find(
      (s) => s.studentNumber.toLowerCase() === trimmed.toLowerCase() || s.id.toLowerCase() === trimmed.toLowerCase()
    );

    if (!matched) {
      setValidateError("Student ID not found in this course. Please check and try again.");
      setValidating(false);
      return;
    }

    // Check student is NOT on either debate team
    const teams: DebateTeam[] = assessment.debateConfig?.teams || [];
    const forTeam = teams.find(t => t.name === "for");
    const againstTeam = teams.find(t => t.name === "against");
    const forIds = new Set((forTeam?.studentIds || []).map(id => id.toLowerCase()));
    const againstIds = new Set((againstTeam?.studentIds || []).map(id => id.toLowerCase()));

    if (forIds.has(matched.id.toLowerCase()) || againstIds.has(matched.id.toLowerCase())) {
      setValidateError("Team members cannot vote as audience. Please use your team portal instead.");
      setValidating(false);
      return;
    }

    // Check if this student ID already has a vote (KV check) — restore but don't permanently lock
    try {
      const existingVote = await kv.get(`CHATGPT_debate_audience_vote_${session!.id}_${matched.id}`) as any;
      if (existingVote) {
        setHasVoted(existingVote.vote);
        setLastVotedRoundIndex(existingVote.roundIndex ?? -1);
        setStudentName(`${matched.firstName} ${matched.lastName}`);
        setStudentId(matched.id);
        localStorage.setItem(DEVICE_KEY_PREFIX + sessionId, JSON.stringify({
          studentId: matched.id,
          studentName: `${matched.firstName} ${matched.lastName}`,
          vote: existingVote.vote,
          lastVotedRoundIndex: existingVote.roundIndex ?? -1,
        }));
        setStage("portal");
        setValidating(false);
        toast.success(`Welcome back, ${matched.firstName}! Your current vote: Team ${existingVote.vote.toUpperCase()}`);
        return;
      }
    } catch { }

    // Student is valid audience member
    setStudentName(`${matched.firstName} ${matched.lastName}`);
    setStudentId(matched.id);
    localStorage.setItem(DEVICE_KEY_PREFIX + sessionId, JSON.stringify({
      studentId: matched.id,
      studentName: `${matched.firstName} ${matched.lastName}`,
    }));
    setStage("portal");
    setValidating(false);
    toast.success(`Welcome, ${matched.firstName}!`);
  };

  // ─── Send event ───
  const sendEvent = async (type: string, value?: string, x?: number, y?: number) => {
    if (!session) return;

    const currentRoundIdx = debateState?.currentRoundIndex ?? 0;

    // For votes: check if already voted in THIS round's window
    if (type === "vote") {
      if (votedThisRound && lastVotedRoundIndex === currentRoundIdx) {
        toast.error("You've already voted this round!");
        return;
      }
    }

    const eventId = crypto.randomUUID();
    const event = {
      id: eventId,
      sessionId: session.id,
      studentId,
      studentName,
      type,
      value,
      roundIndex: currentRoundIdx,
      timestamp: Date.now(),
    };

    // Visual particle
    if (x && y && type !== "vote") {
      let icon = ThumbsUp;
      if (type === "heart") icon = Heart;
      if (type === "zap") icon = Zap;
      const newParticle = { id: eventId, icon, x, y };
      setParticles((p) => [...p, newParticle]);
      setTimeout(() => setParticles((p) => p.filter((pp) => pp.id !== eventId)), 2000);
    }

    try {
      await kv.set(`CHATGPT_debate_event_${session.id}_${eventId}`, event);
      if (type === "vote") {
        const isChange = hasVoted !== null && hasVoted !== value;
        setHasVoted(value as string);
        setVotedThisRound(true);
        setLastVotedRoundIndex(currentRoundIdx);
        // Persist vote to KV by student ID (overwrite = latest vote wins)
        await kv.set(`CHATGPT_debate_audience_vote_${session.id}_${studentId}`, {
          vote: value,
          studentName,
          studentId,
          roundIndex: currentRoundIdx,
          timestamp: Date.now(),
        });
        // Persist to device localStorage
        localStorage.setItem(DEVICE_KEY_PREFIX + sessionId, JSON.stringify({
          studentId,
          studentName,
          vote: value,
          lastVotedRoundIndex: currentRoundIdx,
        }));
        toast.success(isChange
          ? `Vote changed to Team ${(value as string).toUpperCase()}!`
          : `Voted for Team ${(value as string).toUpperCase()}!`
        );
      }
    } catch (e) {
      console.error("Failed to send event", e);
    }
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center"><LoadSplash /></div>;
  if (errorMsg || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="text-gray-500 text-center">{errorMsg}</p>
      </div>
    );
  }

  // ═══ DEBATE ENDED VIEW ═══
  if (stage === "ended") {
    const totalVotes = finalVotesFor + finalVotesAgainst;
    const forPct = totalVotes === 0 ? 50 : Math.round((finalVotesFor / totalVotes) * 100);
    const againstPct = totalVotes === 0 ? 50 : 100 - forPct;
    const winner = finalVotesFor > finalVotesAgainst ? "for" : finalVotesAgainst > finalVotesFor ? "against" : "tie";

    return (
      <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[60vw] h-[60vw] rounded-full bg-blue-600/20 blur-[100px] -top-[20%] -left-[10%]" />
          <div className="absolute w-[60vw] h-[60vw] rounded-full bg-red-600/20 blur-[100px] -bottom-[20%] -right-[10%]" />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <Crown className="h-16 w-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-4xl font-black tracking-tighter mb-2">Debate Complete</h1>
            <p className="text-gray-400 text-lg font-medium mb-8">{session.assessmentTitle}</p>

            {/* Winner banner */}
            <div className={`inline-block px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-8 ${winner === "for" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
              winner === "against" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}>
              {winner === "tie" ? "It's a Tie!" : `Team ${winner.toUpperCase()} Wins!`}
            </div>

            {/* Score cards */}
            <div className="flex items-center gap-6 justify-center mb-8">
              <div className={`rounded-3xl p-6 border ${winner === "for" ? "bg-blue-500/10 border-blue-500/40" : "bg-white/5 border-white/10"}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Team FOR</p>
                <p className="text-5xl font-black text-white">{finalVotesFor}</p>
                <p className="text-sm text-gray-400">{forPct}%</p>
              </div>
              <div className="text-2xl font-black text-gray-600">VS</div>
              <div className={`rounded-3xl p-6 border ${winner === "against" ? "bg-red-500/10 border-red-500/40" : "bg-white/5 border-white/10"}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">Team AGAINST</p>
                <p className="text-5xl font-black text-white">{finalVotesAgainst}</p>
                <p className="text-sm text-gray-400">{againstPct}%</p>
              </div>
            </div>

            {/* Vote bar */}
            <div className="w-full max-w-sm mx-auto">
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
                <motion.div className="h-full bg-blue-500" initial={{ width: "50%" }} animate={{ width: `${forPct}%` }} transition={{ type: "spring", stiffness: 50 }} />
                <motion.div className="h-full bg-red-500" initial={{ width: "50%" }} animate={{ width: `${againstPct}%` }} transition={{ type: "spring", stiffness: 50 }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500 font-bold">
                <span>FOR {forPct}%</span>
                <span>{totalVotes} total votes</span>
                <span>AGAINST {againstPct}%</span>
              </div>
            </div>

            {hasVoted && (
              <p className="mt-6 text-sm text-gray-500">
                <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-400" />
                Your final vote: Team {hasVoted.toUpperCase()}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══ STUDENT ID VALIDATION GATE ═══
  if (stage === "validate") {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f7f8] relative overflow-hidden">
        <div className="pt-12 pb-6 px-6 bg-white shadow-sm z-10">
          <h1 className="text-xl font-bold text-center">Audience Portal</h1>
          <p className="text-sm text-gray-500 text-center">{session.assessmentTitle}</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-purple-100 flex items-center justify-center">
                  <LogIn className="h-7 w-7 text-purple-500" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-center mb-1">Enter your Student ID</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                Audience members must verify their identity to participate. Team members should use their team portal.
              </p>
              <form onSubmit={handleValidate}>
                <input
                  type="text"
                  placeholder="Student ID or Number"
                  value={studentIdInput}
                  onChange={(e) => { setStudentIdInput(e.target.value); setValidateError(""); }}
                  autoFocus
                  className="w-full h-[48px] px-4 bg-gray-50 rounded-xl border-2 border-gray-200 text-[16px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all"
                />
                <AnimatePresence>
                  {validateError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-red-500 mt-2 font-medium"
                    >
                      {validateError}
                    </motion.p>
                  )}
                </AnimatePresence>
                <button
                  type="submit"
                  disabled={validating || !studentIdInput.trim()}
                  className="mt-4 w-full h-[48px] rounded-xl bg-gray-900 text-white text-[15px] font-semibold active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {validating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><LogIn className="h-4 w-4" /> Join as Audience</>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ═══ MAIN AUDIENCE PORTAL ═══
  const isVotingNow = debateState?.votingWindow === true;
  const currentRoundIdx = debateState?.currentRoundIndex ?? 0;
  // Can vote if: voting window is open AND haven't voted in THIS round yet
  const canVote = isVotingNow && !votedThisRound;
  // Show the "already voted" state for this round
  const showVotedState = votedThisRound && hasVoted;
  // Between rounds (not in voting window) but has a standing vote
  const showStandingVote = !isVotingNow && hasVoted;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f8] relative overflow-hidden">
      <div className="pt-12 pb-4 px-6 bg-white shadow-sm z-10 relative">
        <h1 className="text-xl font-bold text-center">Audience Portal</h1>
        <p className="text-sm text-gray-500 text-center">{session.assessmentTitle}</p>
        <p className="text-xs text-purple-600 text-center mt-1 font-medium">
          <CheckCircle2 className="h-3 w-3 inline mr-1" />
          Signed in as {studentName}
        </p>
      </div>

      {/* ─── Round Info Bar (synced with class screen) ─── */}
      {debateState && (
        <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Round {debateState.currentRoundIndex + 1}/{debateState.totalRounds}
            </p>
            <p className="text-sm font-bold text-gray-800 truncate">{debateState.roundName}</p>
          </div>
          <div className={`text-xl font-mono font-bold tabular-nums ${
            debateState.finished ? "text-gray-400" :
            debateState.preCountdown && debateState.preCountdown > 0 ? "text-indigo-600" :
            debateState.timeRemaining <= 3 && debateState.timeRemaining > 0 ? "text-red-500" :
            "text-gray-700"
          }`}>
            {debateState.finished ? "DONE" :
             debateState.preCountdown && debateState.preCountdown > 0 ? `0:${String(debateState.preCountdown).padStart(2, "0")}` :
             formatTime(debateState.timeRemaining)}
          </div>
        </div>
      )}

      {/* ─── Pre-debate countdown banner ─── */}
      <AnimatePresence>
        {debateState?.preCountdown && debateState.preCountdown > 0 && !debateState.running && !debateState.finished && (
          <motion.div
            key="pre-countdown-audience"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-10 overflow-hidden"
          >
            <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-3 text-center">
              <p className="text-lg font-black text-indigo-700 tabular-nums">
                Debate starts in {debateState.preCountdown}s
              </p>
              <p className="text-xs text-indigo-400 mt-0.5">Get ready to watch & vote!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── VOTE NOW banner during voting window ─── */}
      <AnimatePresence>
        {isVotingNow && (
          <motion.div
            key="vote-now-audience"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-10 overflow-hidden"
          >
            <motion.div
              animate={{ backgroundColor: ["rgba(245,158,11,0.1)", "rgba(245,158,11,0.2)", "rgba(245,158,11,0.1)"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="px-4 py-3 flex items-center justify-center gap-3 border-b border-amber-200"
            >
              <Trophy className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">
                {canVote ? (hasVoted ? "Change your vote!" : "Vote Now!") : "Vote recorded!"}
              </span>
              <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums">
                {debateState?.votingTimeRemaining || 0}s
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 p-6 flex flex-col justify-center space-y-8 z-10 relative">
        {/* Vote Section */}
        <motion.div
          animate={canVote ? {
            boxShadow: ["0 0 0 0 rgba(245,158,11,0)", "0 0 0 6px rgba(245,158,11,0.15)", "0 0 0 0 rgba(245,158,11,0)"]
          } : {}}
          transition={canVote ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
          className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-colors ${
            canVote ? "border-amber-300" : "border-gray-100"
          }`}
        >
          <h2 className="text-lg font-bold text-center mb-1">Vote for the Best Team</h2>

          {/* Status messages */}
          {isVotingNow && canVote && hasVoted && (
            <p className="text-center text-xs text-amber-600 font-medium mb-3 flex items-center justify-center gap-1">
              <RefreshCw className="h-3 w-3" /> You can change your vote — current: Team {hasVoted.toUpperCase()}
            </p>
          )}
          {isVotingNow && showVotedState && (
            <p className="text-center text-xs text-green-600 font-medium mb-3 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Voted Team {hasVoted.toUpperCase()} this round!
            </p>
          )}
          {!isVotingNow && showStandingVote && (
            <p className="text-center text-xs text-gray-500 font-medium mb-3 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Current vote: Team {hasVoted.toUpperCase()} — you can change after next round
            </p>
          )}
          {!isVotingNow && !hasVoted && (
            <p className="text-center text-xs text-gray-400 mb-3">
              Voting opens after each round ends
            </p>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => sendEvent("vote", "for")}
              disabled={!canVote}
              className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${hasVoted === "for"
                ? "border-blue-500 bg-blue-50"
                : !canVote
                  ? "border-gray-100 opacity-50 cursor-not-allowed"
                  : "border-gray-100 hover:border-blue-200 active:scale-95"
                }`}
            >
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Trophy className={`h-6 w-6 ${hasVoted === "for" ? "text-blue-500" : "text-blue-300"}`} />
              </div>
              <span className={`font-bold ${hasVoted === "for" ? "text-blue-700" : "text-gray-600"}`}>
                Team FOR
              </span>
            </button>
            <button
              onClick={() => sendEvent("vote", "against")}
              disabled={!canVote}
              className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${hasVoted === "against"
                ? "border-red-500 bg-red-50"
                : !canVote
                  ? "border-gray-100 opacity-50 cursor-not-allowed"
                  : "border-gray-100 hover:border-red-200 active:scale-95"
                }`}
            >
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trophy className={`h-6 w-6 ${hasVoted === "against" ? "text-red-500" : "text-red-300"}`} />
              </div>
              <span className={`font-bold ${hasVoted === "against" ? "text-red-700" : "text-gray-600"}`}>
                Team AGAINST
              </span>
            </button>
          </div>

          {canVote && !hasVoted && (
            <p className="text-center text-xs text-amber-500 mt-4 font-medium">
              Cast your vote now — you can change it after the next round!
            </p>
          )}
        </motion.div>

        {/* Reaction Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center">
          <h2 className="text-lg font-bold mb-6">Send Reactions</h2>
          <div className="flex justify-center gap-6">
            {[
              { id: "clap", icon: ThumbsUp, color: "text-green-500", bg: "bg-green-100", label: "Applause" },
              { id: "heart", icon: Heart, color: "text-pink-500", bg: "bg-pink-100", label: "Love" },
              { id: "zap", icon: Zap, color: "text-amber-500", bg: "bg-amber-100", label: "Thunder" },
            ].map((reaction) => (
              <button
                key={reaction.id}
                onClick={(e) => sendEvent(reaction.id, undefined, e.clientX, e.clientY)}
                className={`flex flex-col items-center gap-2`}
              >
                <div className={`h-16 w-16 rounded-full ${reaction.bg} flex items-center justify-center hover:scale-110 active:scale-90 transition-transform shadow-sm`}>
                  <reaction.icon className={`h-8 w-8 ${reaction.color} fill-current`} />
                </div>
                <span className="text-[11px] text-gray-500 font-medium">{reaction.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Particles */}
      <AnimatePresence>
        {particles.map((p) => {
          const Icon = p.icon;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, x: p.x - 20, y: p.y - 20, scale: 0.5 }}
              animate={{ opacity: 0, y: p.y - 150, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="fixed pointer-events-none z-50 text-orange-500"
            >
              <Icon className="h-8 w-8 fill-current" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
