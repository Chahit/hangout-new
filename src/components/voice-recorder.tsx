import { useState, useRef } from "react";
import { Mic, Square, Send } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

export function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    try {
      onRecordingComplete(audioBlob);

      // Reset state
      setAudioBlob(null);
      chunksRef.current = [];
    } catch (error) {
      console.error("Error sending voice message:", error);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {!isRecording && !audioBlob && (
        <button
          onClick={startRecording}
          className="p-2 rounded-full hover:bg-primary/10 transition-colors"
        >
          <Mic className="w-6 h-6" />
        </button>
      )}

      {isRecording && (
        <button
          onClick={stopRecording}
          className="p-2 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors"
        >
          <Square className="w-6 h-6 text-destructive" />
        </button>
      )}

      {audioBlob && (
        <button
          onClick={handleSend}
          className="p-2 rounded-full bg-primary hover:bg-primary/90 transition-colors"
        >
          <Send className="w-6 h-6 text-primary-foreground" />
        </button>
      )}
    </div>
  );
}