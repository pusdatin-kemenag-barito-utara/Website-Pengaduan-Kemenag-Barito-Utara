"use server";

import { supabase, supabaseAdmin, Pengaduan, Layanan } from "@/lib/supabase";
import { getR2SignedUrl, isR2Path } from "@/lib/r2";
import crypto from "crypto";

// Rate Limiting & Anti Brute-Force In-Memory Protection
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}
const loginAttemptsMap = new Map<string, LoginAttempt>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 Menit Lockout
const WINDOW_DURATION_MS = 15 * 60 * 1000;

function checkRateLimit(key: string): {
  isLocked: boolean;
  remainingMinutes?: number;
} {
  const now = Date.now();
  const record = loginAttemptsMap.get(key);

  if (!record) return { isLocked: false };

  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingMs = record.lockedUntil - now;
    return { isLocked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
  }

  if (now - record.firstAttempt > WINDOW_DURATION_MS) {
    loginAttemptsMap.delete(key);
    return { isLocked: false };
  }

  return { isLocked: false };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const record = loginAttemptsMap.get(key) || { count: 0, firstAttempt: now };

  if (now - record.firstAttempt > WINDOW_DURATION_MS) {
    record.count = 1;
    record.firstAttempt = now;
    delete record.lockedUntil;
  } else {
    record.count += 1;
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  loginAttemptsMap.set(key, record);
}

function resetFailedAttempts(key: string) {
  loginAttemptsMap.delete(key);
}

// Anti SQL Injection & XSS Payload Validation
function isMaliciousPayload(input: string): boolean {
  const sqlInjectionRegex =
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|TRUNCATE|DECLARE|MERGE)\b)|('--|;|\/\*|\*\/|@@|char\s*\(|nchar\s*\(|alter\s*|begin\s*|cast\s*\(|cursor\s*\(|declare\s*|drop\s*|exec\s*\(|execute\s*\(|fetch\s*|insert\s*|kill\s*|open\s*|select\s*|sys\s*|sysobjects\s*|syscolumns\s*)/i;
  const scriptTagRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  return sqlInjectionRegex.test(input) || scriptTagRegex.test(input);
}

// Constant-Time String Comparison (Defense Against Timing Attacks)
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Artificial Constant Delay to prevent side-channel timing profiling
async function constantDelay(ms: number = 800) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Autentikasi Admin Pusdatin dengan Keamanan Berlapis Enterprise-Grade
export async function loginAdminPusdatinAction(
  emailInput: string,
  passwordInput: string,
  turnstileToken?: string,
) {
  try {
    // 1. Strict Input Validation & Length Caps
    if (!emailInput || !passwordInput) {
      return {
        success: false,
        message: "Email / Username dan Password wajib diisi!",
      };
    }

    if (emailInput.length > 100 || passwordInput.length > 100) {
      return {
        success: false,
        message: "Panjang karakter input melebihi batas aman.",
      };
    }

    const cleanInput = emailInput.trim().toLowerCase();

    // 2. Anti SQL Injection & XSS Payload Filter
    if (isMaliciousPayload(cleanInput) || isMaliciousPayload(passwordInput)) {
      await constantDelay(1000);
      return {
        success: false,
        message:
          "Input terdeteksi mengandung pola karakter berbahaya (Anti-Exploit Protection).",
      };
    }

    // 3. Anti Brute-Force Rate Limiting Lockout
    const rateCheck = checkRateLimit(cleanInput);
    if (rateCheck.isLocked) {
      return {
        success: false,
        message: `Akses dikunci sementara karena 5x percobaan gagal berturut-turut. Silakan coba lagi dalam ${rateCheck.remainingMinutes} menit.`,
      };
    }

    const envSuperAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();
    const envSuperAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!envSuperAdminEmail || !envSuperAdminPassword) {
      return {
        success: false,
        message: "Konfigurasi kredensial administrator server belum lengkap.",
      };
    }

    // 4. Strict Cloudflare Turnstile Bot Verification
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (
      turnstileSecret &&
      turnstileSecret !== "1x000000000000000000000000000000AA"
    ) {
      if (!turnstileToken) {
        return {
          success: false,
          message:
            "Harap selesaikan verifikasi keamanan Turnstile terlebih dahulu.",
        };
      }

      const verifyRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: turnstileSecret,
            response: turnstileToken,
          }),
        },
      );
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        recordFailedAttempt(cleanInput);
        return {
          success: false,
          message:
            "Verifikasi keamanan Turnstile gagal. Silakan centang ulang.",
        };
      }
    }

    // 5. Cek Kredensial Input (Constant-Time Safe Matching)
    const usernamePrefix = envSuperAdminEmail.split("@")[0];
    const isEmailMatched =
      safeCompare(cleanInput, envSuperAdminEmail) ||
      safeCompare(cleanInput, usernamePrefix);

    if (!isEmailMatched) {
      recordFailedAttempt(cleanInput);
      await constantDelay(600);
      return {
        success: false,
        message:
          "Username / Email administrator yang Anda masukkan salah atau tidak terdaftar.",
      };
    }

    // 6. Autentikasi via Supabase Auth (Parameterized API REST)
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: envSuperAdminEmail,
        password: passwordInput,
      });

    if (!authError && authData?.session) {
      resetFailedAttempts(cleanInput);
      return {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          role: "super_admin_pusdatin",
        },
        message: "Login Admin TIM Pengaduan Berhasil!",
      };
    }

    // 7. Dynamic Secure Match via Strict Constant-Time Server Env Verification
    if (safeCompare(passwordInput, envSuperAdminPassword)) {
      resetFailedAttempts(cleanInput);
      return {
        success: true,
        user: {
          id: "admin-pusdatin-secured",
          email: envSuperAdminEmail,
          role: "super_admin_pusdatin",
        },
        message: "Login Admin TIM Pengaduan Berhasil!",
      };
    }

    recordFailedAttempt(cleanInput);
    await constantDelay(600);
    return {
      success: false,
      message: "Password yang Anda masukkan salah.",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Terjadi kesalahan autentikasi.";
    return { success: false, message: errorMsg };
  }
}

// Fetch semua pengaduan untuk admin dashboard
export async function getAdminPengaduanListAction() {
  try {
    const { data, error } = await supabase
      .from("pengaduan")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      return {
        success: false,
        message:
          error.message || "Gagal mengambil data pengaduan dari database.",
      };
    }

    const items = await Promise.all(
      (data as Pengaduan[]).map(async (item) => {
        if (isR2Path(item.file_url)) {
          try {
            const signedUrl = await getR2SignedUrl(item.file_url!);
            return { ...item, file_url: signedUrl };
          } catch {
            return item;
          }
        }
        return item;
      })
    );

    return { success: true, data: items };
  } catch (err: unknown) {
    console.error("getAdminPengaduanListAction error:", err);
    return { success: false, message: "Gagal mengambil data pengaduan." };
  }
}

// Update status & respon admin dengan sanitasi input
export async function updatePengaduanStatusAction(
  id: string,
  status: Pengaduan["status"],
  admin_response: string,
) {
  try {
    if (!id || typeof id !== "string") {
      return { success: false, message: "ID Tiket tidak valid." };
    }

    const cleanResponse = (admin_response || "").trim();
    if (isMaliciousPayload(cleanResponse)) {
      return {
        success: false,
        message: "Tanggapan terdeteksi mengandung pola karakter berbahaya.",
      };
    }

    const { error } = await supabaseAdmin
      .from("pengaduan")
      .update({
        status,
        admin_response: cleanResponse,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Update error:", error);
      return { success: false, message: error.message || "Gagal memperbarui status di database." };
    }

    return {
      success: true,
      message: "Status dan tanggapan berhasil diperbarui!",
    };
  } catch (err: unknown) {
    console.error("updatePengaduanStatusAction error:", err);
    return { success: false, message: "Gagal memperbarui status pengaduan." };
  }
}

// Hapus pengaduan oleh super admin
export async function deletePengaduanAction(id: string) {
  try {
    if (!id || typeof id !== "string") {
      return { success: false, message: "ID Tiket tidak valid." };
    }

    const { error } = await supabaseAdmin.from("pengaduan").delete().eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      return {
        success: false,
        message: error.message || "Gagal menghapus tiket dari database.",
      };
    }

    return { success: true, message: "Tiket pengaduan berhasil dihapus!" };
  } catch (err: unknown) {
    console.error("deletePengaduanAction error:", err);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghapus data.",
    };
  }
}

// ==========================================
// KELOLA TERKAIT LAYANAN (DYNAMIC SERVICES CRUD)
// ==========================================

export async function getLayananListAction() {
  try {
    const { data, error } = await supabase
      .from("layanan")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getLayananListAction error:", error);
      return { success: false, message: error.message, data: [] };
    }

    return { success: true, data: (data || []) as Layanan[] };
  } catch (err: unknown) {
    console.error("getLayananListAction catch:", err);
    return { success: false, data: [] };
  }
}

export async function createLayananAction(name: string, description?: string) {
  try {
    if (!name || typeof name !== "string") {
      return { success: false, message: "Nama layanan wajib diisi!" };
    }

    const cleanName = name.trim();
    if (
      isMaliciousPayload(cleanName) ||
      isMaliciousPayload(description || "")
    ) {
      return {
        success: false,
        message: "Input terdeteksi mengandung pola karakter berbahaya.",
      };
    }

    // Query max order_index to place new item at the absolute bottom
    const { data: maxData } = await supabase
      .from("layanan")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1);

    const maxOrderIndex = typeof maxData?.[0]?.order_index === 'number' ? maxData[0].order_index : 0;
    const nextOrderIndex = maxOrderIndex + 1;

    const { data, error } = await supabase
      .from("layanan")
      .insert([
        {
          name: cleanName,
          description: (description || "").trim(),
          is_active: true,
          order_index: nextOrderIndex,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("createLayananAction DB error:", error);
      return {
        success: false,
        message: "Gagal menambah layanan baru ke database: " + error.message,
      };
    }

    return {
      success: true,
      message: "Layanan baru berhasil ditambahkan!",
      data: data?.[0],
    };
  } catch (err: unknown) {
    console.error("createLayananAction catch error:", err);
    return {
      success: false,
      message: "Terjadi kesalahan sistem saat menambah layanan.",
    };
  }
}

export async function updateLayananAction(
  id: string,
  name: string,
  description?: string,
  is_active: boolean = true,
) {
  try {
    if (!id || !name) {
      return { success: false, message: "ID dan Nama Layanan wajib diisi!" };
    }

    const cleanName = name.trim();
    if (
      isMaliciousPayload(cleanName) ||
      isMaliciousPayload(description || "")
    ) {
      return {
        success: false,
        message: "Input terdeteksi mengandung pola karakter berbahaya.",
      };
    }

    const { error } = await supabase
      .from("layanan")
      .update({
        name: cleanName,
        description: (description || "").trim(),
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("updateLayananAction DB error:", error);
      return { success: false, message: "Gagal memperbarui data layanan." };
    }

    return { success: true, message: "Data layanan berhasil diperbarui!" };
  } catch (err: unknown) {
    console.error("updateLayananAction catch error:", err);
    return {
      success: false,
      message: "Terjadi kesalahan saat memperbarui layanan.",
    };
  }
}

export async function deleteLayananAction(id: string) {
  try {
    if (!id) {
      return { success: false, message: "ID Layanan tidak valid." };
    }

    const { error } = await supabase.from("layanan").delete().eq("id", id);

    if (error) {
      console.error("deleteLayananAction DB error:", error);
      return {
        success: false,
        message: "Gagal menghapus layanan dari database.",
      };
    }

    return { success: true, message: "Layanan berhasil dihapus!" };
  } catch (err: unknown) {
    console.error("deleteLayananAction catch error:", err);
    return {
      success: false,
      message: "Terjadi kesalahan saat menghapus layanan.",
    };
  }
}

export async function reorderLayananAction(items: { id: string; order_index: number }[]) {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, message: "Data urutan tidak valid." };
    }

    for (const item of items) {
      if (item.id && typeof item.order_index === "number") {
        await supabase
          .from("layanan")
          .update({ order_index: item.order_index, updated_at: new Date().toISOString() })
          .eq("id", item.id);
      }
    }

    return { success: true, message: "Urutan posisi layanan berhasil disimpan ke database!" };
  } catch (err: unknown) {
    console.error("reorderLayananAction error:", err);
    return { success: false, message: "Gagal memperbarui urutan posisi layanan." };
  }
}
