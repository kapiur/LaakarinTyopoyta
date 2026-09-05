"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useI18n } from "../lib/useI18n";

const MAX_RECORDING_MS = 5 * 60 * 1000;
const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
];

const labels = {
  fi: {
    start: "Sanele",
    stop: "Lopeta",
    recording: "Tallennetaan",
    transcribing: "Tunnistetaan",
    unsupported: "Selain ei tue sanelua.",
    microphoneDenied: "Mikrofonia ei saatu käyttöön.",
    failed: "Puheentunnistus epäonnistui.",
    maxReached: "Sanelu pysäytettiin 5 minuutin kohdalla.",
  },
  ru: {
    start: "Диктовать",
    stop: "Стоп",
    recording: "Идет запись",
    transcribing: "Распознаю",
    unsupported: "Браузер не поддерживает диктовку.",
    microphoneDenied: "Не удалось получить доступ к микрофону.",
    failed: "Распознавание речи не удалось.",
    maxReached: "Диктовка остановлена на лимите 5 минут.",
  },
  en: {
    start: "Dictate",
    stop: "Stop",
    recording: "Recording",
    transcribing: "Transcribing",
    unsupported: "This browser does not support dictation.",
    microphoneDenied: "Could not access the microphone.",
    failed: "Speech recognition failed.",
    maxReached: "Dictation stopped at the 5 minute limit.",
  },
  de: {
    start: "Diktieren",
    stop: "Stopp",
    recording: "Aufnahme",
    transcribing: "Erkennung",
    unsupported: "Dieser Browser unterstuetzt kein Diktat.",
    microphoneDenied: "Mikrofonzugriff fehlgeschlagen.",
    failed: "Spracherkennung fehlgeschlagen.",
    maxReached: "Diktat wurde nach 5 Minuten gestoppt.",
  },
} as const;

type VoiceDictationButtonProps = {
  onTranscript: (text: string) => void;
  languageHint?: string;
  disabled?: boolean;
  className?: string;
};

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function appendText(current: string, transcript: string) {
  const cleanTranscript = transcript.trim();
  if (!current.trim()) return cleanTranscript;
  return `${current.replace(/\s+$/, "")}\n${cleanTranscript}`;
}

export function appendDictationTranscript(current: string, transcript: string) {
  return appendText(current, transcript);
}

export default function VoiceDictationButton({
  onTranscript,
  languageHint,
  disabled = false,
  className = "",
}: VoiceDictationButtonProps) {
  const { language } = useI18n();
  const l = labels[language as keyof typeof labels] || labels.fi;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [message, setMessage] = useState("");

  const label = useMemo(() => {
    if (state === "recording") return l.stop;
    if (state === "transcribing") return l.transcribing;
    return l.start;
  }, [l, state]);

  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function transcribeAudio(blob: Blob) {
    setState("transcribing");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("audio", blob, blob.type.includes("mp4") ? "dictation.mp4" : "dictation.webm");
      if (languageHint) formData.append("language", languageHint);

      const response = await fetch("/api/speech/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || typeof data.text !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : l.failed);
      }

      onTranscript(data.text);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : l.failed);
    } finally {
      setState("idle");
    }
  }

  async function startRecording() {
    if (disabled || state !== "idle") return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage(l.unsupported);
      return;
    }

    try {
      setMessage("");
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        if (blob.size > 0) void transcribeAudio(blob);
        else setState("idle");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setState("recording");
      timeoutRef.current = window.setTimeout(() => {
        setMessage(l.maxReached);
        stopRecording();
      }, MAX_RECORDING_MS);
    } catch (error) {
      setState("idle");
      setMessage(l.microphoneDenied);
    }
  }

  function stopRecording() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function handleClick() {
    if (state === "recording") {
      stopRecording();
      return;
    }
    void startRecording();
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === "transcribing"}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
          state === "recording"
            ? "border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
        }`}
        title={state === "recording" ? l.recording : l.start}
      >
        {state === "transcribing" ? <Loader2 size={14} className="animate-spin" /> : state === "recording" ? <Square size={14} /> : <Mic size={14} />}
        {label}
      </button>
      {state === "recording" ? <span className="text-xs font-semibold text-rose-600">{l.recording} · max 5 min</span> : null}
      {message ? <span className="text-xs font-semibold text-slate-500">{message}</span> : null}
    </div>
  );
}
