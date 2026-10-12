"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// Toast + กล่องยืนยัน แบบเบาๆ ไม่ต้องใช้ library: store ระดับ module + <Toaster /> วางไว้ใน layout
// เรียกได้จากทุก client component:
//   toast.success("...") / toast.error("...")
//   if (await confirmDialog({ title: "..." })) { ... }
// ข้อความแสดงผ่าน React (escape อัตโนมัติ) จึงไม่เสี่ยง XSS

type ToastItem = {
  id: number;
  type: "success" | "error";
  message: string;
  leaving?: boolean; // กำลังเล่นแอนิเมชันออก
};

const ENTER_MS = 4500; // เวลาที่แสดงก่อนเริ่มลอยออก (รวมช่วงลอยเข้า 1.4s)
const LEAVE_MS = 1000; // ต้องตรงกับ .animate-toast-out ใน globals.css

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & { resolve: (ok: boolean) => void };

type State = { toasts: ToastItem[]; confirm: ConfirmState | null };

let state: State = { toasts: [], confirm: null };
let nextId = 1;
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

// เล่นแอนิเมชันลอยออกก่อน แล้วค่อยลบออกจาก state
function dismiss(id: number) {
  const target = state.toasts.find((t) => t.id === id);
  if (!target || target.leaving) return;
  setState({
    toasts: state.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
  });
  setTimeout(() => {
    setState({ toasts: state.toasts.filter((t) => t.id !== id) });
  }, LEAVE_MS);
}

function push(type: ToastItem["type"], message: string) {
  const id = nextId++;
  // แสดงพร้อมกันสูงสุด 3 อัน
  setState({ toasts: [...state.toasts, { id, type, message }].slice(-3) });
  setTimeout(() => dismiss(id), ENTER_MS);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  // ถ้ามีกล่องค้างอยู่ ถือว่ายกเลิกอันเก่า
  state.confirm?.resolve(false);
  return new Promise((resolve) => setState({ confirm: { ...options, resolve } }));
}

function closeConfirm(ok: boolean) {
  state.confirm?.resolve(ok);
  setState({ confirm: null });
}

const SERVER_STATE: State = { toasts: [], confirm: null };

export function Toaster() {
  const { toasts, confirm } = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER_STATE
  );

  return (
    <>
      <div
        aria-live="polite"
        className="pointer-events-none fixed left-1/2 top-3 z-50 flex w-[min(92vw,360px)] -translate-x-1/2 flex-col items-center"
      >
        {toasts.map((t) => (
          // ชั้นนอก: ยุบความสูงลงอย่างนุ่มนวลตอนลอยออก อันอื่นจึงเลื่อนขึ้นตามแบบไม่กระตุก
          <div
            key={t.id}
            className={`grid w-full transition-[grid-template-rows,padding] delay-700 duration-300 ease-in-out ${
              t.leaving ? "grid-rows-[0fr] pb-0" : "grid-rows-[1fr] pb-2"
            }`}
          >
            <div className="min-h-0 overflow-visible">
              <div
                role="status"
                className={`${
                  t.leaving ? "animate-toast-out" : "animate-toast-in"
                } pointer-events-auto flex w-full items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
                  t.type === "success"
                    ? "text-emerald-700 ring-emerald-100"
                    : "text-red-600 ring-red-100"
                }`}
              >
                <span aria-hidden>{t.type === "success" ? "✅" : "⚠️"}</span>
                <span className="flex-1">{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="ປິດ"
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirm && <ConfirmBox {...confirm} />}
    </>
  );
}

function ConfirmBox({
  title,
  message,
  confirmText = "ຢືນຢັນ",
  cancelText = "ຍົກເລີກ",
  danger,
}: ConfirmState) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // โฟกัสปุ่มยกเลิกก่อน (กันกดยืนยันโดยไม่ตั้งใจ) + กด Esc เพื่อปิด
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeConfirm(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex justify-center bg-black/30 px-4 pt-6"
      onClick={() => closeConfirm(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-down-in h-fit w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id="confirm-title" className="font-semibold text-plum-800">
          {title}
        </h2>
        {message && <p className="text-sm text-gray-500">{message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => closeConfirm(false)}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => closeConfirm(true)}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
              danger ? "bg-red-500 hover:bg-red-600" : "bg-blush-500 hover:bg-blush-600"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
