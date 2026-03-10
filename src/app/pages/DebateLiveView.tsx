import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router";
import { Clock, Users, Flame, ThumbsUp, Heart, Zap, Sparkles, ChevronRight, Trophy, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as api from "../utils/api";
import * as kv from "../utils/kv";
import { Session, TranscriptChunk, Assessment, DebateRound } from "../types";
import { LoadSplash } from "../components/LoadSplash";

interface EventData {
  id: string;
  type: string;
  value?: string;
  studentName?: string;
  studentId?: string;
  timestamp: number;
}

// ─── Beep using Web Audio API ───
function playBeep(frequency = 880, duration = 150) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "square";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
    setTimeout(() => ctx.close(), duration + 100);
  } catch {}
}

// ─── Sound effects for reactions ───
function playReactionSound(type: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === "clap") {
      // Applause: quick burst of filtered noise
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 3000;
      filter.Q.value = 0.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(now);
      setTimeout(() => ctx.close(), 500);
    } else if (type === "heart") {
      // Heart: warm ascending chime
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        const t = now + i * 0.08;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
      });
      setTimeout(() => ctx.close(), 800);
    } else if (type === "zap") {
      // Thunder: low rumble + crack
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
      // Crack
      const bufSize = ctx.sampleRate * 0.08;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 8);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.4, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      src.connect(g2);
      g2.connect(ctx.destination);
      src.start(now);
      setTimeout(() => ctx.close(), 600);
    }
  } catch {}
}

// ─── Dramatic lead surge sounds (3 different sounds played in sequence) ───
function playLeadSurgeSounds() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Sound 1: Deep boom at t=0
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    osc1.type = "sawtooth";
    g1.gain.setValueAtTime(0.4, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Sound 2: Electric crackle at t=0.5
    const bufSize2 = ctx.sampleRate * 0.15;
    const buf2 = ctx.createBuffer(1, bufSize2, ctx.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < bufSize2; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize2, 6);
    const src2 = ctx.createBufferSource();
    src2.buffer = buf2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.5, now + 0.5);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    src2.connect(g2);
    g2.connect(ctx.destination);
    src2.start(now + 0.5);

    // Sound 3: Rising power chord at t=1.0
    [110, 165, 220, 330].forEach((freq) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, now + 1.0);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.6);
      osc.type = "square";
      g.gain.setValueAtTime(0, now + 1.0);
      g.gain.linearRampToValueAtTime(0.12, now + 1.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc.start(now + 1.0);
      osc.stop(now + 1.8);
    });

    setTimeout(() => ctx.close(), 2200);
  } catch {}
}

export default function DebateLiveView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Debate config from assessment
  const [rounds, setRounds] = useState<DebateRound[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [roundRunning, setRoundRunning] = useState(false);
  const [debateFinished, setDebateFinished] = useState(false);
  const [debateTopic, setDebateTopic] = useState<string>("");

  // Team ready-up state (waiting for both teams to click Start)
  const [forReady, setForReady] = useState(false);
  const [againstReady, setAgainstReady] = useState(false);
  const [debateHasStarted, setDebateHasStarted] = useState(false);
  const countdownTriggeredRef = useRef(false);

  // Flash effect
  const [showFlash, setShowFlash] = useState(false);

  // Pre-debate countdown (15 seconds)
  const [preCountdown, setPreCountdown] = useState<number | null>(null);
  const preCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voting window between rounds (5 seconds)
  const [votingWindow, setVotingWindow] = useState(false);
  const [votingTimeLeft, setVotingTimeLeft] = useState(0);
  const votingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lead surge flash (triple flash when a team leads by 4+)
  const [leadFlashes, setLeadFlashes] = useState<{ id: number; color: "blue" | "red" }[]>([]);
  const lastLeadTeamRef = useRef<string | null>(null);

  // Vote tallies
  const [votesFor, setVotesFor] = useState(0);
  const [votesAgainst, setVotesAgainst] = useState(0);
  const [lastEvents, setLastEvents] = useState<EventData[]>([]);

  // Transcripts & AI
  const [transcripts, setTranscripts] = useState<TranscriptChunk[]>([]);
  const [aiComments, setAiComments] = useState<{ id: string; text: string; team: string }[]>([]);

  // Refs for timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBeepRef = useRef(-1);
  const roundRunningRef = useRef(false);
  const timeRemainingRef = useRef(0);

  // Refs for scrollable containers
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const reactionsScrollRef = useRef<HTMLDivElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // Track seen reaction IDs for sound effects
  const seenReactionIdsRef = useRef(new Set<string>());
  const initialLoadDoneRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { roundRunningRef.current = roundRunning; }, [roundRunning]);
  useEffect(() => { timeRemainingRef.current = timeRemaining; }, [timeRemaining]);

  const currentRound = rounds[currentRoundIndex] || null;

  // ─── Pre-debate 15-second countdown ───
  useEffect(() => {
    if (preCountdown === null || preCountdown <= 0) return;

    // Write "preparing" state to KV so other screens know
    const writePreState = (cd: number) => {
      if (session && rounds.length > 0) {
        kv.set(`CHATGPT_debate_state_${session.id}`, {
          currentRoundIndex: 0,
          roundName: rounds[0]?.name || "Debate",
          speakingTeam: rounds[0]?.speakingTeam || "both",
          timeRemaining: rounds[0]?.timeLimit || 0,
          totalRounds: rounds.length,
          running: false,
          finished: false,
          preCountdown: cd,
        }).catch(() => {});
      }
    };

    writePreState(preCountdown);

    preCountdownRef.current = setInterval(() => {
      setPreCountdown(prev => {
        if (prev === null) return null;
        const next = prev - 1;
        // Beep at 3, 2, 1
        if (next <= 3 && next > 0) {
          playBeep(next === 1 ? 1200 : 880, next === 1 ? 300 : 150);
        }
        if (next <= 0) {
          // Countdown done — play a start chime and begin the debate
          playBeep(1400, 400);
          if (preCountdownRef.current) clearInterval(preCountdownRef.current);
          preCountdownRef.current = null;
          setRoundRunning(true);
          return null;
        }
        // Write updated countdown to KV
        writePreState(next);
        return next;
      });
    }, 1000);

    return () => {
      if (preCountdownRef.current) clearInterval(preCountdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preCountdown !== null && preCountdown > 0]);

  // ─── Trigger lead surge: 3 staggered flashes + sounds ───
  const triggerLeadSurge = useCallback((color: "blue" | "red") => {
    playLeadSurgeSounds();
    // Fire 3 flashes at staggered intervals
    const flashIds = [Date.now(), Date.now() + 1, Date.now() + 2];
    // Flash 1 — immediate
    setLeadFlashes([{ id: flashIds[0], color }]);
    setTimeout(() => setLeadFlashes(prev => prev.filter(f => f.id !== flashIds[0])), 600);
    // Flash 2 — at 500ms
    setTimeout(() => {
      setLeadFlashes(prev => [...prev, { id: flashIds[1], color }]);
      setTimeout(() => setLeadFlashes(prev => prev.filter(f => f.id !== flashIds[1])), 600);
    }, 500);
    // Flash 3 — at 1000ms (biggest)
    setTimeout(() => {
      setLeadFlashes(prev => [...prev, { id: flashIds[2], color }]);
      setTimeout(() => setLeadFlashes(prev => prev.filter(f => f.id !== flashIds[2])), 800);
    }, 1000);
  }, []);

  // ─── Load session + assessment config ───
  useEffect(() => {
    if (!sessionId) return;
    const init = async () => {
      try {
        const s = await api.getSession(sessionId);
        setSession(s);

        // Load assessment to get debate config
        const assessment = (await kv.get(`CHATGPT_assessments_${s.assessmentId}`)) as Assessment | null;
        if (assessment?.debateConfig?.rounds && assessment.debateConfig.rounds.length > 0) {
          setRounds(assessment.debateConfig.rounds);
          setTimeRemaining(assessment.debateConfig.rounds[0].timeLimit);
          setCurrentRoundIndex(0);
          if (assessment.debateConfig.topic) setDebateTopic(assessment.debateConfig.topic);
          // Countdown starts only when both teams are ready — wait for them
        } else {
          // Fallback: single round, 5 min
          const fallback: DebateRound = { id: "default", name: "Debate", speakingTeam: "both", timeLimit: 300 };
          setRounds([fallback]);
          setTimeRemaining(300);
          // Countdown starts when both teams are ready
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    init();
  }, [sessionId]);

  // ─── Poll for team ready-up signals ───
  useEffect(() => {
    if (!session || countdownTriggeredRef.current) return;
    const pollReady = async () => {
      if (countdownTriggeredRef.current) return;
      try {
        const f = await kv.get(`CHATGPT_debate_ready_${session.id}_for`);
        const a = await kv.get(`CHATGPT_debate_ready_${session.id}_against`);
        const fR = !!f;
        const aR = !!a;
        setForReady(fR);
        setAgainstReady(aR);
        if (fR && aR && !countdownTriggeredRef.current) {
          countdownTriggeredRef.current = true;
          setDebateHasStarted(true);
          setPreCountdown(15);
        }
      } catch {}
    };
    pollReady();
    const interval = setInterval(pollReady, 2000);
    return () => clearInterval(interval);
  }, [session]);

  // ─── Write debate state to KV for team portals ───
  const writeDebateState = useCallback(async (
    rIndex: number,
    tRemaining: number,
    running: boolean,
    rds: DebateRound[],
    finished: boolean,
    isVotingWindow: boolean = false,
    voteTimeLeft: number = 0
  ) => {
    if (!session) return;
    const round = rds[rIndex];
    try {
      await kv.set(`CHATGPT_debate_state_${session.id}`, {
        currentRoundIndex: rIndex,
        roundName: round?.name || "Debate",
        speakingTeam: round?.speakingTeam || "both",
        timeRemaining: tRemaining,
        totalRounds: rds.length,
        running,
        finished,
        votingWindow: isVotingWindow,
        votingTimeRemaining: voteTimeLeft,
      });
    } catch (err) {
      console.error("[DebateLiveView] Failed to write debate state:", err);
    }
  }, [session]);

  // ─── Timer tick ───
  useEffect(() => {
    if (!roundRunning || rounds.length === 0) return;

    // Write initial state
    writeDebateState(currentRoundIndex, timeRemaining, true, rounds, false);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const next = Math.max(0, prev - 1);

        // Beep at 3, 2, 1
        if (next <= 3 && next > 0 && lastBeepRef.current !== next) {
          lastBeepRef.current = next;
          playBeep(next === 1 ? 1200 : 880, next === 1 ? 300 : 150);
        }

        // Round ended
        if (next === 0 && prev > 0) {
          lastBeepRef.current = -1;
          playBeep(1400, 500);
          handleRoundEnd();
        }

        return next;
      });
    }, 1000);

    // Write state periodically
    const stateInterval = setInterval(() => {
      if (roundRunningRef.current) {
        writeDebateState(currentRoundIndex, timeRemainingRef.current, true, rounds, false);
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(stateInterval);
    };
  }, [roundRunning, currentRoundIndex, rounds, writeDebateState]);

  // ─── Handle round end: flash + 5s voting window + advance ───
  const handleRoundEnd = useCallback(() => {
    setRoundRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 1200);

    // After flash settles, start the 5-second voting window
    setTimeout(() => {
      setVotingWindow(true);
      setVotingTimeLeft(5);
      writeDebateState(currentRoundIndex, 0, false, rounds, false, true, 5);

      // Play a distinctive "vote now" chime
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;
        [440, 554.37, 659.25].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "triangle";
          const t = now + i * 0.12;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.2, t + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc.start(t); osc.stop(t + 0.5);
        });
        setTimeout(() => ctx.close(), 1000);
      } catch {}

      let countdown = 5;
      votingTimerRef.current = setInterval(() => {
        countdown--;
        setVotingTimeLeft(countdown);

        if (countdown <= 0) {
          if (votingTimerRef.current) clearInterval(votingTimerRef.current);
          votingTimerRef.current = null;
          setVotingWindow(false);
          setVotingTimeLeft(0);

          // Now advance to next round or finish
          setCurrentRoundIndex(prev => {
            const nextIdx = prev + 1;
            if (nextIdx >= rounds.length) {
              setDebateFinished(true);
              writeDebateState(prev, 0, false, rounds, true);
              return prev;
            }
            const nextRound = rounds[nextIdx];
            setTimeRemaining(nextRound.timeLimit);
            setRoundRunning(true);
            lastBeepRef.current = -1;
            writeDebateState(nextIdx, nextRound.timeLimit, true, rounds, false);
            return nextIdx;
          });
        } else {
          writeDebateState(currentRoundIndex, 0, false, rounds, false, true, countdown);
        }
      }, 1000);
    }, 1500); // Short pause after flash before voting begins
  }, [rounds, writeDebateState, currentRoundIndex]);

  // ─── Poll events (Votes, Cheers) ───
  useEffect(() => {
    if (!session) return;

    const pollEvents = async () => {
      try {
        const evs = await kv.getByPrefix(`CHATGPT_debate_event_${session.id}_`);
        const newReactionEvents: EventData[] = [];
        const latestVoteByStudent: Record<string, string> = {};
        let vFor = 0, vAgainst = 0;

        evs.forEach((e: any) => {
          if (e.type === "vote") {
            if (e.studentId) {
              latestVoteByStudent[e.studentId] = e.value;
            }
          } else {
            newReactionEvents.push(e);
            // Play sound for genuinely new reactions (not on initial load)
            if (initialLoadDoneRef.current && !seenReactionIdsRef.current.has(e.id)) {
              playReactionSound(e.type);
            }
            seenReactionIdsRef.current.add(e.id);
          }
        });

        Object.values(latestVoteByStudent).forEach(v => {
          if (v === "for") vFor++;
          if (v === "against") vAgainst++;
        });

        setVotesFor(vFor);
        setVotesAgainst(vAgainst);

        // ─── Lead surge detection: triple flash when a team leads by 4+ ───
        const diff = vFor - vAgainst;
        if (initialLoadDoneRef.current) {
          if (diff >= 4 && lastLeadTeamRef.current !== "for") {
            lastLeadTeamRef.current = "for";
            triggerLeadSurge("blue");
          } else if (diff <= -4 && lastLeadTeamRef.current !== "against") {
            lastLeadTeamRef.current = "against";
            triggerLeadSurge("red");
          } else if (Math.abs(diff) < 4) {
            lastLeadTeamRef.current = null;
          }
        } else {
          // Set initial lead state without triggering flash
          if (diff >= 4) lastLeadTeamRef.current = "for";
          else if (diff <= -4) lastLeadTeamRef.current = "against";
          else lastLeadTeamRef.current = null;
        }

        // Sort by timestamp descending (newest first)
        newReactionEvents.sort((a, b) => b.timestamp - a.timestamp);
        setLastEvents(newReactionEvents.slice(0, 20));

        if (!initialLoadDoneRef.current) {
          initialLoadDoneRef.current = true;
        }
      } catch {}
    };

    pollEvents();
    const interval = setInterval(pollEvents, 2000);
    return () => clearInterval(interval);
  }, [session, triggerLeadSurge]);

  // ─── Poll transcripts + AI comments ───
  useEffect(() => {
    if (!session) return;
    let lastLength = 0;

    const pollTranscripts = async () => {
      try {
        const data = await api.getTranscripts(session.id);
        const finals = data.filter((t: any) => t.isFinal);
        setTranscripts(finals);

        if (finals.length > lastLength) {
          const newChunks = finals.slice(lastLength);
          lastLength = finals.length;

          newChunks.forEach(chunk => {
            if (chunk.text.length > 20 && Math.random() > 0.5) {
              const compliments = [
                "Strong logical point!",
                "Excellent evidence provided.",
                "Great rhetorical question.",
                "Clear and concise argument.",
                "Fantastic rebuttal.",
                "Compelling use of data.",
                "Well-structured reasoning.",
              ];
              const text = compliments[Math.floor(Math.random() * compliments.length)];
              setAiComments(prev => [{
                id: crypto.randomUUID(),
                text: `${chunk.studentName}: ${text}`,
                team: chunk.groupId || "Unknown"
              }, ...prev].slice(0, 10));
            }
          });
        }
      } catch {}
    };

    pollTranscripts();
    const interval = setInterval(pollTranscripts, 3000);
    return () => clearInterval(interval);
  }, [session]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center"><LoadSplash /></div>;
  if (!session) return <div className="p-10 text-center">Session not found.</div>;

  const totalVotes = votesFor + votesAgainst;
  const forPercent = totalVotes === 0 ? 50 : Math.round((votesFor / totalVotes) * 100);
  const againstPercent = totalVotes === 0 ? 50 : 100 - forPercent;

  const timerUrgent = timeRemaining <= 3 && timeRemaining > 0;

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden font-sans relative">

      {/* ═══ LIGHTNING FLASH OVERLAY ═══ */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3, 0.9, 0] }}
            transition={{ duration: 1.2, times: [0, 0.05, 0.15, 0.2, 1] }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(180,200,255,0.6) 40%, rgba(100,140,255,0.2) 70%, transparent 100%)",
              mixBlendMode: "screen",
            }}
          />
        )}
      </AnimatePresence>

      {/* ═══ LEAD SURGE TRIPLE FLASH OVERLAY ═══ */}
      <AnimatePresence>
        {leadFlashes.map((flash) => (
          <motion.div
            key={`lead-flash-${flash.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.2, 0.7, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, times: [0, 0.1, 0.3, 0.5, 1] }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{
              background: flash.color === "blue"
                ? "radial-gradient(ellipse at center, rgba(59,130,246,0.8) 0%, rgba(59,130,246,0.4) 30%, rgba(30,64,175,0.2) 60%, transparent 100%)"
                : "radial-gradient(ellipse at center, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0.4) 30%, rgba(153,27,27,0.2) 60%, transparent 100%)",
              mixBlendMode: "screen",
            }}
          />
        ))}
      </AnimatePresence>

      {/* ═══ WAITING FOR TEAMS OVERLAY ═══ */}
      <AnimatePresence>
        {!debateHasStarted && !loading && (
          <motion.div
            key="waiting-for-teams"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="fixed inset-0 z-40 flex items-center justify-center px-6"
            style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.96) 100%)" }}
          >
            <div className="text-center space-y-8 max-w-sm w-full">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mb-3">Waiting for teams</p>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">Ready to<br/>Debate?</h2>
                <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                  At least one member from each team must tap <strong className="text-white">Start</strong> to begin the countdown.
                </p>
              </div>

              {/* Team status cards */}
              <div className="flex items-stretch justify-center gap-4">
                {/* Team FOR */}
                <motion.div
                  animate={forReady ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`flex-1 flex flex-col items-center gap-2.5 px-5 py-5 rounded-2xl border-2 transition-all duration-500 ${
                    forReady
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                    forReady ? "bg-blue-500" : "bg-white/10"
                  }`}>
                    {forReady
                      ? <CheckCircle2 className="h-6 w-6 text-white" />
                      : <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }}>
                          <Clock className="h-6 w-6 text-gray-500" />
                        </motion.div>
                    }
                  </div>
                  <p className={`font-black text-sm tracking-wide ${forReady ? "text-blue-300" : "text-gray-600"}`}>
                    TEAM FOR
                  </p>
                  <p className={`text-xs font-semibold ${forReady ? "text-blue-400" : "text-gray-600"}`}>
                    {forReady ? "Ready!" : "Waiting..."}
                  </p>
                </motion.div>

                <div className="flex items-center text-gray-700 font-black text-lg">VS</div>

                {/* Team AGAINST */}
                <motion.div
                  animate={againstReady ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`flex-1 flex flex-col items-center gap-2.5 px-5 py-5 rounded-2xl border-2 transition-all duration-500 ${
                    againstReady
                      ? "border-red-500 bg-red-500/20"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                    againstReady ? "bg-red-500" : "bg-white/10"
                  }`}>
                    {againstReady
                      ? <CheckCircle2 className="h-6 w-6 text-white" />
                      : <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}>
                          <Clock className="h-6 w-6 text-gray-500" />
                        </motion.div>
                    }
                  </div>
                  <p className={`font-black text-sm tracking-wide ${againstReady ? "text-red-300" : "text-gray-600"}`}>
                    TEAM AGAINST
                  </p>
                  <p className={`text-xs font-semibold ${againstReady ? "text-red-400" : "text-gray-600"}`}>
                    {againstReady ? "Ready!" : "Waiting..."}
                  </p>
                </motion.div>
              </div>

              {/* Both ready hint */}
              {forReady && againstReady && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-green-400 font-bold text-sm animate-pulse"
                >
                  Both teams ready — starting countdown!
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HEADER ═══ */}
      <header className="px-4 md:px-8 py-3 md:py-4 border-b border-white/10 bg-black/50 backdrop-blur-md z-10 relative shrink-0">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-2xl font-black tracking-tight truncate">{debateTopic || session.assessmentTitle}</h1>
            <p className="text-gray-400 font-medium tracking-wide text-[10px] md:text-sm">LIVE DEBATE SESSION</p>
          </div>
          <div className="flex items-center gap-3 md:gap-8 shrink-0">
            {/* Round indicator — desktop */}
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                Round {currentRoundIndex + 1} of {rounds.length}
              </p>
              <p className="text-lg font-bold text-white mt-0.5">{currentRound?.name || "Debate"}</p>
              {currentRound && currentRound.speakingTeam !== "both" && (
                <p className={`text-xs font-bold mt-0.5 ${currentRound.speakingTeam === "for" ? "text-blue-400" : "text-red-400"}`}>
                  Team {currentRound.speakingTeam.toUpperCase()} speaking
                </p>
              )}
            </div>
            {/* Round indicator — mobile compact */}
            <div className="md:hidden text-right">
              <p className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">
                R{currentRoundIndex + 1}/{rounds.length}
              </p>
              <p className="text-[11px] font-bold text-white truncate max-w-[80px]">{currentRound?.name || "Debate"}</p>
            </div>
            {/* Timer */}
            <div className="text-right">
              <p className="text-[9px] md:text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                {votingWindow ? "Voting" : "Time"}
              </p>
              <div className={`text-2xl md:text-4xl font-mono font-light tracking-tighter transition-colors ${
                votingWindow ? "text-amber-400" :
                timerUrgent ? "text-red-500 animate-pulse" : debateFinished ? "text-gray-500" : "text-white"
              }`}>
                {debateFinished ? "DONE" : votingWindow ? `0:0${votingTimeLeft}` : formatTime(timeRemaining)}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Round progress bar ─── */}
        <div className="flex gap-1 md:gap-1.5 mt-2 md:mt-3">
          {rounds.map((r, i) => (
            <div key={r.id} className="flex-1 flex flex-col gap-0.5">
              <div className={`h-1 rounded-full transition-all duration-500 ${
                i < currentRoundIndex ? "bg-green-500" :
                i === currentRoundIndex ? (roundRunning ? "bg-white" : "bg-amber-500") :
                "bg-white/10"
              }`} />
              <p className={`text-[7px] md:text-[8px] font-bold uppercase tracking-wider text-center truncate ${
                i === currentRoundIndex ? "text-white" : "text-gray-600"
              }`}>{r.name}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ═══ VOTE NOW BANNER (during voting window) ═══ */}
      <AnimatePresence>
        {votingWindow && (
          <motion.div
            key="vote-banner"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 overflow-hidden shrink-0"
          >
            <div className="bg-gradient-to-r from-amber-600/90 via-amber-500/90 to-amber-600/90 px-4 md:px-8 py-2 md:py-3 flex items-center justify-center gap-3 md:gap-6">
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-2 md:gap-3"
              >
                <Trophy className="h-4 w-4 md:h-6 md:w-6 text-white" />
                <span className="text-white font-black text-sm md:text-lg tracking-wide uppercase">Vote Now!</span>
              </motion.div>
              <div className="bg-white/20 rounded-full px-3 md:px-4 py-0.5 md:py-1">
                <span className="text-white font-mono font-bold text-lg md:text-xl tabular-nums">{votingTimeLeft}s</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PRE-DEBATE COUNTDOWN OVERLAY ═══ */}
      <AnimatePresence>
        {preCountdown !== null && preCountdown > 0 && (
          <motion.div
            key="pre-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 flex items-center justify-center px-6"
            style={{
              background: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)",
            }}
          >
            <div className="text-center space-y-4 md:space-y-6">
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gray-400 text-sm md:text-lg font-bold uppercase tracking-[0.2em] md:tracking-[0.3em]"
              >
                Debate Begins In
              </motion.p>
              <motion.div
                key={preCountdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative"
              >
                {/* Glow ring behind number */}
                <div className={`absolute inset-0 flex items-center justify-center ${
                  preCountdown <= 3 ? "animate-pulse" : ""
                }`}>
                  <div className={`h-32 w-32 md:h-48 md:w-48 rounded-full blur-2xl ${
                    preCountdown <= 3 ? "bg-red-500/30" :
                    preCountdown <= 5 ? "bg-amber-500/20" :
                    "bg-blue-500/15"
                  }`} />
                </div>
                <p className={`relative text-[7rem] md:text-[10rem] font-black tabular-nums leading-none tracking-tighter ${
                  preCountdown <= 3 ? "text-red-500" :
                  preCountdown <= 5 ? "text-amber-400" :
                  "text-white"
                }`}>
                  {preCountdown}
                </p>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-500 text-xs md:text-sm font-medium"
              >
                Teams & audience — get ready!
              </motion.p>

              {/* Visual progress arc */}
              <div className="flex items-center justify-center gap-1 md:gap-1.5 mt-4">
                {Array.from({ length: 15 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-1 md:h-1.5 w-2.5 md:w-4 rounded-full transition-colors duration-300 ${
                      i < (15 - preCountdown) ? "bg-white" :
                      i === (15 - preCountdown) ? (preCountdown <= 3 ? "bg-red-500" : "bg-amber-400") :
                      "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MAIN CONTENT — desktop: fixed 12-col grid; mobile: scrollable vertical stack ═══ */}
      <main className="flex-1 p-3 md:p-6 relative z-10 min-h-0 overflow-y-auto md:overflow-hidden">
        <div className="h-full flex flex-col gap-3 md:grid md:grid-cols-12 md:gap-6">

          {/* ═══ LEFT COLUMN (desktop) / Top sections (mobile) ═══ */}
          <div className="md:col-span-8 flex flex-col gap-3 md:gap-5 md:min-h-0 md:overflow-hidden">

            {/* Teams Header */}
            <div className="flex gap-2 md:gap-5 shrink-0">
              <div className={`flex-1 bg-gradient-to-br from-blue-900/40 to-blue-900/10 border rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col items-center justify-center relative overflow-hidden ${
                currentRound?.speakingTeam === "for" ? "border-blue-400/60 ring-1 ring-blue-400/30" : "border-blue-500/30"
              }`}>
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
                <h2 className="text-sm md:text-2xl font-black text-blue-400 tracking-tighter mb-0.5 md:mb-1">TEAM FOR</h2>
                <div className="text-2xl md:text-4xl font-bold text-white tracking-tighter">{votesFor}</div>
                <span className="text-[10px] md:text-lg text-blue-300 font-medium">Votes</span>
                {currentRound?.speakingTeam === "for" && (
                  <span className="mt-1 md:mt-1.5 px-2 md:px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[8px] md:text-[10px] font-bold uppercase tracking-wider animate-pulse">Speaking</span>
                )}
              </div>

              <div className="flex items-center justify-center shrink-0">
                <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-white/10 flex items-center justify-center text-[10px] md:text-sm font-black italic text-gray-500">
                  VS
                </div>
              </div>

              <div className={`flex-1 bg-gradient-to-br from-red-900/40 to-red-900/10 border rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col items-center justify-center relative overflow-hidden ${
                currentRound?.speakingTeam === "against" ? "border-red-400/60 ring-1 ring-red-400/30" : "border-red-500/30"
              }`}>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-red-500/20 blur-3xl rounded-full" />
                <h2 className="text-sm md:text-2xl font-black text-red-400 tracking-tighter mb-0.5 md:mb-1">TEAM AGAINST</h2>
                <div className="text-2xl md:text-4xl font-bold text-white tracking-tighter">{votesAgainst}</div>
                <span className="text-[10px] md:text-lg text-red-300 font-medium">Votes</span>
                {currentRound?.speakingTeam === "against" && (
                  <span className="mt-1 md:mt-1.5 px-2 md:px-3 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[8px] md:text-[10px] font-bold uppercase tracking-wider animate-pulse">Speaking</span>
                )}
              </div>
            </div>

            {/* Tug of War Bar */}
            <div className="bg-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/10 shrink-0">
              <h3 className="text-[8px] md:text-[9px] text-gray-400 font-bold tracking-widest uppercase mb-1.5 md:mb-2 text-center">Audience Support</h3>
              <div className="h-4 md:h-5 w-full bg-gray-800 rounded-full overflow-hidden flex relative">
                <motion.div className="h-full bg-blue-500" initial={{ width: "50%" }} animate={{ width: `${forPercent}%` }} transition={{ type: "spring", stiffness: 50 }} />
                <motion.div className="h-full bg-red-500" initial={{ width: "50%" }} animate={{ width: `${againstPercent}%` }} transition={{ type: "spring", stiffness: 50 }} />
                <div className="absolute inset-0 flex items-center justify-between px-2.5 md:px-3 font-bold text-[10px] md:text-xs text-white drop-shadow-md">
                  <span>{forPercent}%</span>
                  <span>{againstPercent}%</span>
                </div>
              </div>
            </div>

            {/* ═══ LIVE TRANSCRIPT ═══ */}
            <div className="md:flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col min-h-[160px] md:min-h-0 md:overflow-hidden relative">
              <h3 className="text-[10px] md:text-xs text-gray-400 font-bold tracking-widest uppercase mb-2 md:mb-3 shrink-0">Live Transcript</h3>
              <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-1 md:pr-2 min-h-0 max-h-[220px] md:max-h-none">
                {transcripts.length === 0 ? (
                  <p className="text-gray-500 italic text-center text-xs md:text-sm mt-4 md:mt-8">No speeches yet...</p>
                ) : (
                  [...transcripts].reverse().map(t => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-0.5 md:space-y-1"
                    >
                      <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${
                        t.groupId === "for" ? "text-blue-400" :
                        t.groupId === "against" ? "text-red-400" : "text-gray-400"
                      }`}>
                        {t.studentName} ({t.groupId?.toUpperCase()})
                      </p>
                      <p className="text-gray-200 text-xs md:text-sm leading-relaxed">{t.text}</p>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-8 md:h-12 bg-gradient-to-t from-[#0d0d0d] to-transparent pointer-events-none rounded-b-xl md:rounded-b-2xl" />
            </div>
          </div>

          {/* ═══ RIGHT COLUMN (desktop) / Bottom sections (mobile) ═══ */}
          <div className="md:col-span-4 flex flex-col gap-3 md:gap-5 md:min-h-0 md:overflow-hidden">

            {/* AI Analysis */}
            <div className="md:flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col min-h-[120px] md:min-h-0 md:overflow-hidden">
              <h3 className="text-[10px] md:text-xs text-purple-400 font-bold tracking-widest uppercase mb-1.5 md:mb-2 flex items-center gap-1.5 md:gap-2 shrink-0">
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" /> Live AI Analysis
              </h3>
              <div ref={aiScrollRef} className="flex-1 space-y-1.5 md:space-y-2 overflow-y-auto min-h-0 pr-1 max-h-[180px] md:max-h-none">
                <AnimatePresence>
                  {aiComments.length === 0 ? (
                    <p className="text-gray-500 italic text-center mt-4 md:mt-6 text-[10px] md:text-xs">Waiting for speakers...</p>
                  ) : (
                    aiComments.map(comment => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-2 md:p-2.5 rounded-lg md:rounded-xl border text-[10px] md:text-xs ${
                          comment.team === "for" ? "bg-blue-900/20 border-blue-500/20" :
                          comment.team === "against" ? "bg-red-900/20 border-red-500/20" :
                          "bg-gray-800 border-gray-700"
                        }`}
                      >
                        <p className="text-white">{comment.text}</p>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Audience Reactions */}
            <div className="md:flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 flex flex-col min-h-[120px] md:min-h-0 md:overflow-hidden relative">
              <h3 className="text-[10px] md:text-xs text-gray-400 font-bold tracking-widest uppercase mb-1.5 md:mb-2 shrink-0">Audience Reactions</h3>
              <div ref={reactionsScrollRef} className="flex-1 space-y-1.5 md:space-y-2 overflow-y-auto min-h-0 pr-1 max-h-[180px] md:max-h-none">
                <AnimatePresence>
                  {lastEvents.length === 0 ? (
                    <p className="text-gray-500 italic text-center mt-4 md:mt-6 text-[10px] md:text-xs">No reactions yet...</p>
                  ) : (
                    lastEvents.map(ev => {
                      let Icon = ThumbsUp;
                      let color = "text-green-400";
                      let label = "applauded";
                      if (ev.type === "heart") { Icon = Heart; color = "text-pink-400"; label = "sent love"; }
                      if (ev.type === "zap") { Icon = Zap; color = "text-amber-400"; label = "sent thunder"; }
                      const name = ev.studentName || "Someone";
                      return (
                        <motion.div
                          key={ev.id}
                          initial={{ opacity: 0, scale: 0.8, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 md:gap-2.5 bg-white/5 p-1.5 md:p-2 rounded-lg md:rounded-xl"
                        >
                          <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${color} fill-current shrink-0`} />
                          <span className="text-gray-300 text-[10px] md:text-xs truncate">
                            <strong className="text-white">{name}</strong> {label}!
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-8 md:h-10 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none rounded-b-xl md:rounded-b-2xl" />
            </div>
          </div>
        </div>
      </main>

      {/* ═══ DEBATE FINISHED OVERLAY ═══ */}
      <AnimatePresence>
        {debateFinished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="text-center space-y-3 md:space-y-4"
            >
              <h2 className="text-3xl md:text-6xl font-black tracking-tighter text-white">DEBATE COMPLETE</h2>
              <p className="text-base md:text-2xl text-gray-400 font-medium">
                {votesFor > votesAgainst ? "Team FOR leads the audience vote!" :
                 votesAgainst > votesFor ? "Team AGAINST leads the audience vote!" :
                 "It's a tie!"}
              </p>
              <div className="flex items-center justify-center gap-6 md:gap-8 mt-4 md:mt-6">
                <div className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-blue-400">{votesFor}</p>
                  <p className="text-xs md:text-sm text-gray-500 font-bold">FOR</p>
                </div>
                <div className="text-2xl md:text-3xl text-gray-600 font-black">—</div>
                <div className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-red-400">{votesAgainst}</p>
                  <p className="text-xs md:text-sm text-gray-500 font-bold">AGAINST</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}