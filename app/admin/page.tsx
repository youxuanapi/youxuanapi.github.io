'use client';

import { useState, useCallback } from 'react';

export default function AdminDecryptPage() {
  const [inputKey, setInputKey] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [plaintext, setPlaintext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleDecrypt = useCallback(async () => {
    if (!inputKey.trim()) {
      setErrorMsg('请输入管理员密钥');
      return;
    }
    if (!encryptedText.trim()) {
      setErrorMsg('请输入加密密文');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setPlaintext('');
    setCopied(false);

    try {
      const res = await fetch('/api/admin/decrypt-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedText: encryptedText.trim(),
          inputKey: inputKey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setErrorMsg('密钥错误，访问被拒绝');
        } else {
          setErrorMsg(data.error || '解密失败');
        }
        return;
      }

      setPlaintext(data.plaintext);
    } catch {
      setErrorMsg('网络请求失败，请检查连接');
    } finally {
      setIsLoading(false);
    }
  }, [inputKey, encryptedText]);

  const handleCopy = useCallback(async () => {
    if (!plaintext) return;
    try {
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plaintext;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [plaintext]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-emerald-400 font-mono">
              SYSTEM ONLINE
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            词元共振 <span className="text-emerald-400">·</span> 核心资产解密中枢
          </h1>
          <p className="text-xs text-gray-400 mt-2 font-mono">
            AUTHORIZED PERSONNEL ONLY
          </p>
        </div>

        {/* Main Panel */}
        <div className="rounded-2xl border border-gray-800 bg-gray-950 p-8 space-y-6">
          {/* Key Input */}
          <div>
            <label className="block text-sm font-mono text-gray-300 mb-2 tracking-wider uppercase">
              管理员密钥
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="输入 64 位 HEX 密钥..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* Encrypted Text */}
          <div>
            <label className="block text-sm font-mono text-gray-300 mb-2 tracking-wider uppercase">
              加密密文
            </label>
            <textarea
              value={encryptedText}
              onChange={(e) => setEncryptedText(e.target.value)}
              placeholder="粘贴 Base64 编码的加密密文..."
              rows={5}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
              spellCheck={false}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleDecrypt}
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                正在解密...
              </>
            ) : (
              <>
                <span className="text-base">⚡</span>
                立即解密并提取核心逻辑
              </>
            )}
          </button>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-300 font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Plaintext Output */}
          {plaintext && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-mono text-emerald-400 tracking-wider uppercase">
                  解密结果 · 明文
                </label>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-gray-300 hover:text-emerald-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-all"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      已复制
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      一键复制
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={plaintext}
                readOnly
                rows={14}
                className="w-full px-4 py-3 bg-gray-900 border border-emerald-500/30 rounded-xl text-sm text-white font-mono leading-relaxed resize-none focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-gray-500 font-mono tracking-wider">
            AES-256-GCM · SCRYPT KEY DERIVATION · ZERO KNOWLEDGE ARCHITECTURE
          </p>
        </div>
      </div>
    </div>
  );
}
