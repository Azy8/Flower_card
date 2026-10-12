"use client";

import { createClient } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  
async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
  
    try {
      const supabase = createClient();
  
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
  
      if (loginError) {
        setError("ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ ອີເມວຫຼືລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ");
        return;
      }
  
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("ເກີດຂໍ້ຜິດພາດກະລຸນາລອງໃໝ່");
    } finally {
      setLoading(false);
    }
  }
  

  return (
    <main className="min-h-screen flex items-center justify-center bg-blush-50 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-plum-800">
            🌸Nampherng Flower Card
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            เข้าสู่ระบบสำหรับผู้ดูแลร้าน
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            ອີເມວ
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-blush-200 p-3 outline-none focus:border-blush-400"
            placeholder="admin@example.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            ລະຫັດຜ່ານ
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-blush-200 p-3 outline-none focus:border-blush-400"
            placeholder="กรอกรหัสผ่าน"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blush-500 p-3 font-medium text-white disabled:opacity-60"
        >
          {loading ? "ກຳລັງເຂົ້າສູ່ລະບົບ..." : "ເຂົ້າສູ່ລະບົບ"}
        </button>
      </form>
    </main>
  );
}
