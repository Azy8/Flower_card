"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CardMusic = {
  src: string;
  title: string;
  start: number; // วินาที
  end: number | null; // null = เล่นจนจบเพลง
};

// เล่นเพลงเฉพาะท่อน start → end แล้ววนกลับไปที่ start
// ไม่ต้องตัดไฟล์: เบราว์เซอร์ใช้ HTTP Range โหลดเฉพาะช่วงที่ต้องเล่น
export function useSegmentAudio(music: CardMusic | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!music) return;
    const audio = new Audio();
    audio.src = music.src;
    audio.preload = "metadata"; // ยังไม่โหลดทั้งเพลงจนกว่าจะกดเปิด
    audioRef.current = audio;

    const seekToStart = () => {
      audio.currentTime = music.start;
    };
    const onTime = () => {
      if (music.end !== null && audio.currentTime >= music.end) seekToStart();
    };
    const onEnded = () => {
      seekToStart();
      void audio.play();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    // พักเพลงเมื่อสลับแอป/ปิดจอ
    const onHidden = () => document.hidden && audio.pause();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", onHidden);
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      audioRef.current = null;
    };
  }, [music]);

  // ต้องเรียกจาก event ที่ผู้ใช้แตะเท่านั้น (นโยบาย autoplay ของมือถือ)
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !music) return;

    const outside =
      audio.currentTime < music.start ||
      (music.end !== null && audio.currentTime >= music.end);
    if (outside) {
      // iOS ไม่ยอม seek ก่อนโหลด metadata → รอ loadedmetadata ก่อน
      if (audio.readyState >= 1) audio.currentTime = music.start;
      else
        audio.addEventListener(
          "loadedmetadata",
          () => {
            audio.currentTime = music.start;
          },
          { once: true }
        );
    }

    // ค่อยๆ เพิ่มเสียง (fade-in) — iOS ไม่รองรับการปรับ volume จะเล่นเสียงเต็มทันที
    audio.volume = 0;
    void audio.play().catch(() => setPlaying(false));
    const startedAt = performance.now();
    const step = (now: number) => {
      const v = Math.min(1, (now - startedAt) / 1500);
      audio.volume = v;
      if (v < 1) fadeRef.current = requestAnimationFrame(step);
    };
    fadeRef.current = requestAnimationFrame(step);
  }, [music]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) play();
    else audio.pause();
  }, [play]);

  return { playing, play, toggle };
}
