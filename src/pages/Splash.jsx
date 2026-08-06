import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { safeReturnTo } from "@/lib/authReturnTo";
import { ArrowLeft, ShieldCheck, Mail, Lock, User } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Splash() {
  const [view, setView] = useState("authcheck");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", code: "" });
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const dest = useRef("/dashboard");
  const go = () => { setLeaving(true); setTimeout(() => { window.location.href = dest.current; }, 280); };

  useEffect(() => {
    const r = safeReturnTo();
    dest.current = r === "/dashboard" ? "/" : r;
    (async () => {
      try {
        const ok = await base44.auth.isAuthenticated();
        if (ok) {
          setView("authed");
          setTimeout(() => { go(); }, 1800);
        } else {
          setView("splash");
        }
      } catch {
        setView("splash");
      }
    })();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSignIn(e) {
    e?.preventDefault();
    setError("");
    if (!EMAIL_RE.test(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setView("loading");
    try {
      await base44.auth.loginViaEmailPassword(form.email, form.password);
      go();
    } catch (err) {
      setError(err?.message || "Invalid email or password.");
      setView("signin");
    }
  }

  async function handleSignUp(e) {
    e?.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Please enter your name.");
    if (!EMAIL_RE.test(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setView("loading");
    try {
      await base44.auth.register({ email: form.email, password: form.password });
      setView("otp");
    } catch (err) {
      setError(err?.message || "Registration failed.");
      setView("signup");
    }
  }

  async function handleVerify(e) {
    e?.preventDefault();
    setError("");
    if (form.code.length < 6) return setError("Enter the 6-digit code we sent you.");
    setView("loading");
    try {
      const res = await base44.auth.verifyOtp({ email: form.email, otpCode: form.code });
      if (res?.access_token) base44.auth.setToken(res.access_token);
      try { await base44.auth.updateMe({ full_name: form.name }); } catch {}
      go();
    } catch (err) {
      setError(err?.message || "Invalid verification code.");
      setView("otp");
    }
  }

  async function resendCode() {
    setError("");
    try { await base44.auth.resendOtp(form.email); } catch {}
  }

  async function handleProvider(provider) {
    setError("");
    setView("loading");
    try {
      await base44.auth.loginWithProvider(provider, dest.current);
    } catch (err) {
      setError(err?.message || "Sign-in was cancelled.");
      setView("splash");
    }
  }

  const shellStyle = { height: "100dvh", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" };

  return (
    <div className={`fixed inset-0 overflow-hidden bg-black transition-opacity duration-300 ${leaving ? "opacity-0" : "opacity-100"}`}       style={{ background: "radial-gradient(120% 120% at 50% 0%, #0c0c0e 0%, #000 55%)" }}>
      {/* drifting ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.07), transparent 70%)", animation: "splash-float 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.05), transparent 70%)", animation: "splash-float 12s ease-in-out infinite", animationDelay: "1.5s" }} />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%)", animation: "splash-float 11s ease-in-out infinite", animationDelay: "0.8s" }} />

      <div className="relative z-10 mx-auto flex w-full max-w-[480px] flex-col items-center justify-center px-6 text-center" style={shellStyle}>
        {view === "authcheck" && <Spinner label="Starting Haven…" />}

        {view === "authed" && (
          <div className="splash-fade-in flex flex-col items-center">
            <Logo />
            <div className="mt-8"><Spinner label="Loading your finances…" /></div>
          </div>
        )}

        {view === "loading" && (
          <div className="splash-fade-in flex flex-col items-center">
            <Logo />
            <div className="mt-8"><Spinner label="Securing your session…" /></div>
          </div>
        )}

        {view === "splash" && (
          <div className="flex flex-col items-center">
            <div className="splash-logo-in"><Logo /></div>
            <p className="splash-fade-up mt-6 text-lg font-medium text-white/90" style={{ animationDelay: "0.5s" }}>Your money. Under control.</p>
            <p className="splash-fade-up mt-2 text-sm text-white/40" style={{ animationDelay: "0.65s" }}>Smart debt payoff, cash flow, and net worth — in one place.</p>

            <div className="splash-fade-up mt-10 w-full space-y-3" style={{ animationDelay: "0.85s" }}>
              <SocialButton onClick={() => handleProvider("google")} icon={GoogleIcon} label="Continue with Google" />
              <SocialButton onClick={() => handleProvider("apple")} icon={AppleIcon} label="Continue with Apple" />
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] uppercase tracking-widest text-white/40">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <button onClick={() => { setError(""); setView("signup"); }}
                className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white border border-white/20 hover:bg-white/5 transition-colors"
                style={{ minHeight: 48 }}>
                Sign up with email
              </button>
              <p className="text-center text-xs text-white/60 pt-1">
                Already have an account?{" "}
                <button onClick={() => { setError(""); setView("signin"); }}
                  className="text-white font-semibold hover:text-white/80 transition-colors">
                  Sign in
                </button>
              </p>
            </div>
          </div>
        )}

        {(view === "signin" || view === "signup" || view === "otp") && (
          <div className="splash-slide-in w-full text-left">
            <button onClick={() => { setError(""); setView("splash"); }}
              className="mb-5 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>

            <div className="flex flex-col items-center mb-6">
              <Logo small />
            </div>

            {view === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <Heading title="Welcome back" subtitle="Sign in to open Haven." />
                {error && <ErrorBox>{error}</ErrorBox>}
                <Field icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={(v) => set("email", v)} autoFocus />
                <Field icon={Lock} type="password" placeholder="Password" value={form.password} onChange={(v) => set("password", v)} />
                <SubmitButton label="Sign In" />
              </form>
            )}

            {view === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <Heading title="Create your account" subtitle="Start managing your money today." />
                {error && <ErrorBox>{error}</ErrorBox>}
                <Field icon={User} placeholder="Full name" value={form.name} onChange={(v) => set("name", v)} autoFocus />
                <Field icon={Mail} type="email" placeholder="Email address" value={form.email} onChange={(v) => set("email", v)} />
                <Field icon={Lock} type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={(v) => set("password", v)} />
                <Field icon={Lock} type="password" placeholder="Confirm password" value={form.confirm} onChange={(v) => set("confirm", v)} />
                <SubmitButton label="Create Account" />
              </form>
            )}

            {view === "otp" && (
              <form onSubmit={handleVerify} className="space-y-3.5">
                <Heading title="Verify your email" subtitle={`We sent a 6-digit code to ${form.email}.`} />
                {error && <ErrorBox>{error}</ErrorBox>}
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="••••••"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-lg border border-white/10 bg-black px-3.5 py-3.5 text-center text-lg tracking-[0.5em] text-white outline-none focus:border-white/40"
                  style={{ fontSize: 16, minHeight: 48 }}
                />
                <SubmitButton label="Verify & Continue" disabled={form.code.length < 6} />
                <button type="button" onClick={resendCode} className="block mx-auto text-xs text-white/50 hover:text-white">Resend code</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Logo({ small }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center rounded-2xl border border-white/15 bg-white/5"
        style={{ height: small ? 44 : 60, width: small ? 44 : 60 }}>
        <ShieldCheck className="text-white/80" style={{ height: small ? 22 : 30, width: small ? 22 : 30 }} />
      </div>
      <span className="mt-3 font-semibold tracking-tight text-white" style={{ fontSize: small ? 22 : 30 }}>Haven</span>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-7 w-7 rounded-full border-2 border-white/15 border-t-white animate-spin" />
      <p className="text-xs text-white/50 font-mono">{label}</p>
    </div>
  );
}

function Heading({ title, subtitle }) {
  return (
    <div className="text-center">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
    </div>
  );
}

function ErrorBox({ children }) {
  return <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{children}</div>;
}

function Field({ icon: Icon, type = "text", placeholder, value, onChange, autoFocus }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full rounded-lg border border-white/10 bg-black px-3.5 py-3.5 pl-10 text-sm text-white outline-none focus:border-white/40"
        style={{ fontSize: 16, minHeight: 48 }}
      />
    </div>
  );
}

function SubmitButton({ label, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
      style={{ background: "linear-gradient(180deg,#2a2a2e,#161618)", minHeight: 48 }}
    >
      {label}
    </button>
  );
}

function SocialButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-white bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/30 active:bg-white/5 transition-colors"
      style={{ minHeight: 48 }}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}