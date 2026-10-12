"use client";

import { useState } from "react";

// ช่องเลือกวันที่ที่มองเห็นได้บน iPhone
// Safari บน iOS แสดง <input type="date"> ที่ยังว่างเป็นช่องขาวเปล่า (ไม่มี placeholder)
// และอาจยุบความสูง → ซ้อนข้อความ placeholder + ไอคอนปฏิทินไว้ด้านบน และกำหนดความสูงขั้นต่ำ
export default function DateInput({
  value,
  defaultValue,
  onChange,
  name,
  placeholder = "ເລືອກວັນທີ",
  className = "",
}: {
  value?: string; // ใช้แบบ controlled
  defaultValue?: string; // ใช้ในฟอร์ม GET (uncontrolled)
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;

  return (
    <div className="relative">
      <input
        type="date"
        name={name}
        value={current}
        onChange={(e) => {
          setInner(e.target.value);
          onChange?.(e.target.value);
        }}
        // คอมพิวเตอร์: กดตรงไหนของช่องก็เปิดปฏิทิน (ซ่อนไอคอนเดิมของเบราว์เซอร์ ใช้ 📅 แทน)
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            // บางเบราว์เซอร์ไม่อนุญาต → ใช้การเปิดปฏิทินแบบปกติ
          }
        }}
        className={`block min-h-11 w-full appearance-none bg-white pr-9 text-left [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-date-and-time-value]:text-left ${
          current ? "" : "text-transparent"
        } ${className}`}
      />
      {!current && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">
          {placeholder}
        </span>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
      >
        📅
      </span>
    </div>
  );
}
