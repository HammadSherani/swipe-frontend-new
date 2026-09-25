"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { merchant } from "@/lib/apiClient";
import { compressImageToBase64 } from "@/helper/fileToBase64";

type Phase = "checking" | "invalid" | "ready" | "submitting" | "done" | "review";

// Public page opened from the QR code on the merchant's desktop wizard. It has
// no login — the unguessable token in the URL is the credential, and it only
// allows submitting the face-verification selfie for that one merchant.
export default function PhoneSelfiePage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>("checking");
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        await merchant.kyc.faceLink.check(token);
        setPhase("ready");
      } catch (e) {
        setError((e as { message?: string })?.message ?? "This link is not valid.");
        setPhase("invalid");
      }
    })();
  }, [token]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));
    setBase64(await compressImageToBase64(file));
  };

  const submit = async () => {
    if (!base64) return;
    setPhase("submitting");
    setError("");
    try {
      const res = await merchant.kyc.faceLink.submit(token, { selfieImage: base64 });
      const data = res.data?.data ?? res.data;
      setPhase(data?.faceMatchStatus === "VERIFIED" ? "done" : "review");
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Could not verify your selfie. Please try again.");
      setPhase("ready");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <div className="text-lg font-extrabold text-gray-900 mb-1">Swipe</div>
        <div className="text-xs text-gray-400 mb-6">Face verification</div>

        {phase === "checking" && <p className="text-sm text-gray-400 py-8">Checking your link...</p>}

        {phase === "invalid" && (
          <div className="py-4">
            <Icon icon="solar:close-circle-bold" width={48} className="text-rose-500 mx-auto mb-3" />
            <p className="text-sm text-gray-700">{error}</p>
          </div>
        )}

        {(phase === "ready" || phase === "submitting") && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Take a clear selfie in good light, facing the camera. Your face should fill most of the frame.
            </p>

            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your selfie" className="w-full rounded-xl border border-gray-100 mb-4" />
            ) : (
              <div className="w-full aspect-square rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                <Icon icon="solar:user-circle-bold" width={72} className="text-gray-300" />
              </div>
            )}

            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

            <label className="block w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 mb-3">
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={onPick} />
              {preview ? "Retake selfie" : "Open camera"}
            </label>

            <button
              type="button"
              onClick={submit}
              disabled={!base64 || phase === "submitting"}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {phase === "submitting" ? "Verifying..." : "Submit selfie"}
            </button>
          </>
        )}

        {phase === "done" && (
          <div className="py-4">
            <Icon icon="solar:check-circle-bold" width={52} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-900">Face verified</p>
            <p className="text-sm text-gray-500 mt-1">You can go back to your computer and continue.</p>
          </div>
        )}

        {phase === "review" && (
          <div className="py-4">
            <Icon icon="solar:clock-circle-bold" width={52} className="text-amber-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-900">Selfie submitted</p>
            <p className="text-sm text-gray-500 mt-1">It needs a manual check. You can go back to your computer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
