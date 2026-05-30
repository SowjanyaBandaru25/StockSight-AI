/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Shield, Lock, Mail, User, Info, ArrowRight, Activity, TrendingUp, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { SecureSandboxAuth, SecurityUser } from "../lib/firebase";

interface LoginScreenProps {
  onLoginSuccess: (user: SecurityUser) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    if (!email || !password || (isSignUp && !name)) {
      setErrorMsg("All requested data must be provided.");
      setLoading(false);
      return;
    }

    try {
      // Small simulated delay for realistic server responses
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (isSignUp) {
        const newUser = SecureSandboxAuth.signUp(email, password, name);
        setSuccessMsg(`Welcome, ${newUser.displayName}! Security keys synchronized.`);
        setTimeout(() => {
          onLoginSuccess(newUser);
        }, 1000);
      } else {
        const loggedUser = SecureSandboxAuth.signIn(email, password);
        setSuccessMsg(`Access Granted! Decrypting timeseries matrices...`);
        setTimeout(() => {
          onLoginSuccess(loggedUser);
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Credential authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    setErrorMsg("");
    setSuccessMsg("Authorized using sandboxed credentials...");
    setLoading(true);
    setTimeout(() => {
      try {
        const demoUser = SecureSandboxAuth.signUp("demo@stockvision.ai", "demopass123", "Catherine V.");
        onLoginSuccess(demoUser);
      } catch (err) {
        // Already signed up, so just sign in
        const demoUser = SecureSandboxAuth.signIn("demo@stockvision.ai", "demopass123");
        onLoginSuccess(demoUser);
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div id="login_screen_container" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Decorative Elegant Soft Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.05),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.05),transparent_50%)] pointer-events-none" />

      {/* Elegant Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-serif text-lg font-bold shadow-md shadow-indigo-500/10">
            S
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 font-sans">
              Stock<span className="text-indigo-600 font-serif italic font-medium">Vision</span>
            </span>
            <span className="block text-[10px] text-slate-500 tracking-wider font-medium uppercase mt-0.5">
              Financial Intelligence Platform
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-505 bg-emerald-500" />
          Production Environment
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-slate-250 bg-white p-8 shadow-xl shadow-slate-200/50 relative"
          >
            {/* Top Indicator */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-indigo-150 bg-indigo-50/50 px-4 py-1 text-[10px] font-bold text-indigo-700 uppercase tracking-widest shadow-xs">
              <Shield className="h-3 w-3 inline mr-1 -mt-0.5 text-indigo-600" />
              Private Portal Access
            </div>

            <div className="text-center mt-4 mb-6">
              <h2 className="text-2xl font-serif text-slate-900 tracking-tight font-medium flex items-center justify-center gap-2">
                {isSignUp ? "Create Investor Account" : "Welcome Back"}
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                {isSignUp 
                  ? "Register your credentials to configure highly-customized, real-time asset model analytics."
                  : "Sign in to access advanced machine learning forecasts, technical indicators, and news sentiment trackers."
                }
              </p>
            </div>

            {/* Error & Success Prompts */}
            {errorMsg && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-5 rounded-lg bg-rose-50 border border-rose-150 p-3 flex items-start gap-2 text-xs text-rose-800"
              >
                <span className="font-semibold block shrink-0 mt-0.5">Note:</span>
                <span className="leading-relaxed text-rose-950">{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-5 rounded-lg bg-emerald-50 border border-emerald-150 p-3 flex items-start gap-2 text-xs text-emerald-800"
              >
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed text-emerald-950">{successMsg}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-650 mb-1.5">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Catherine V."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-655 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="investor@stockvision.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-655 mb-1.5">
                  Security Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden group rounded-lg bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md focus:outline-none flex items-center justify-center gap-1.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Verifying..." : isSignUp ? "Create Workspace" : "Access Platform"}
                <ArrowRight className="h-3.5 w-3.5 inline group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between text-2xs text-slate-550 border-t border-slate-100 pt-4 font-medium">
              <span>
                {isSignUp ? "Already registered?" : "Don't have an account yet?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className="text-indigo-600 font-bold hover:text-indigo-500 hover:underline transition-all cursor-pointer"
              >
                {isSignUp ? "Sign In Instead" : "Create Account"}
              </button>
            </div>

            {/* Quick Demo Access System */}
            <div className="mt-4">
              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <span className="relative z-10 px-3 text-[10px] text-slate-400 bg-white uppercase tracking-wider font-semibold">
                  Or bypass credentials
                </span>
              </div>

              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={loading}
                className="w-full rounded-lg border border-indigo-200 hover:border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 py-2.5 font-sans text-xs font-bold text-indigo-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                Explore with Guest Access
              </button>
            </div>
          </motion.div>

          <footer className="mt-8 text-center text-[10px] text-slate-400 font-medium tracking-wide leading-relaxed">
            StockVision © 2026. Hand-crafted using professional React standards.
            <br />
            Securely sandboxed for financial intelligence visualization.
          </footer>
        </div>
      </main>
    </div>
  );
}
