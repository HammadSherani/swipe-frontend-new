"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { merchant } from "@/lib/apiClient";
import handleError from "@/helper/handleError";
import { compressImageToBase64 } from "@/helper/fileToBase64";
import { Field, ImageDropInput, StepFooter } from "../ui";

type Mode = "camera" | "phone" | "upload";

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: "camera", label: "Use camera", icon: "solar:camera-bold" },
  { key: "phone", label: "Use phone", icon: "solar:smartphone-bold" },
  { key: "upload", label: "Upload photo", icon: "solar:gallery-bold" },
];

export default function FaceStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("camera");
  const [loading, setLoading] = useState(false);

  // shared: the selfie waiting to be submitted (camera capture or uploaded file)
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  // camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");

  // phone handoff
  const [link, setLink] = useState<{ url: string; qrDataUrl: string } | null>(null);
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "waiting">("idle");
  const [linkError, setLinkError] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Camera stream lives only while the camera tab is open and no photo is captured yet.
  useEffect(() => {
    if (mode !== "camera" || selfieBase64) {
      stopCamera();
      return;
    }
    let cancelled = false;
    setCameraError("");
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera-api");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setCameraError("No camera is available on this device (or access was blocked). Use your phone instead.");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [mode, selfieBase64, stopCamera]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, 1024 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelfiePreview(dataUrl);
    setSelfieBase64(dataUrl.split(",")[1]);
    setError("");
  };

  const retake = () => {
    setSelfieBase64(null);
    setSelfiePreview(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    retake();
  };

  const submitSelfie = async () => {
    if (!selfieBase64) {
      setError("A selfie photo is required");
      return;
    }
    setLoading(true);
    try {
      await merchant.kyc.face({ selfieImage: selfieBase64 });
      onNext();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // ── phone handoff ──
  const createLink = useCallback(async () => {
    setLinkError("");
    setLink(null);
    setPhoneStatus("idle");
    try {
      const res = await merchant.kyc.faceLink.create({ origin: window.location.origin });
      const data = res.data?.data ?? res.data;
      setLink({ url: data.url, qrDataUrl: data.qrDataUrl });
      setPhoneStatus("waiting");
    } catch (err) {
      setLinkError((err as { message?: string })?.message ?? "Could not create the link.");
    }
  }, []);

  useEffect(() => {
    if (mode === "phone" && !link && !linkError) createLink();
  }, [mode, link, linkError, createLink]);

  // While the QR is on screen, watch for the phone finishing the selfie.
  useEffect(() => {
    if (mode !== "phone" || phoneStatus !== "waiting") return;
    const timer = setInterval(async () => {
      try {
        const res = await merchant.kyc.status();
        const s = res.data?.data ?? res.data;
        if (s?.faceMatchStatus === "VERIFIED") {
          clearInterval(timer);
          toast.success("Face verified from your phone");
          onNext();
        } else if (s?.faceMatchStatus === "MANUAL_REVIEW") {
          // Goes to an admin for review; the merchant carries on with the next step.
          clearInterval(timer);
          toast.success("Selfie received. Our team will review it.");
          onNext();
        }
      } catch {
        /* keep polling; a transient error shouldn't kill the wait */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [mode, phoneStatus, onNext]);

  const onLocalhost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">
        We need a clear selfie to confirm you're the person named on the BVN you just submitted.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => switchMode(m.key)}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-colors ${
              mode === m.key ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Icon icon={m.icon} width={20} />
            {m.label}
          </button>
        ))}
      </div>

      {mode === "camera" && (
        <div className="flex flex-col items-center gap-3">
          {selfiePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selfiePreview} alt="Your selfie" className="w-full max-w-sm rounded-xl border border-gray-100 -scale-x-100" />
          ) : cameraError ? (
            <div className="w-full max-w-sm rounded-xl border border-dashed border-gray-200 py-10 px-4 text-center text-sm text-gray-500">
              {cameraError}
              <button type="button" onClick={() => switchMode("phone")} className="block mx-auto mt-3 text-violet-600 font-semibold">
                Use my phone
              </button>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-xl bg-gray-900 -scale-x-100" />
          )}
          {selfiePreview ? (
            <button type="button" onClick={retake} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
              Retake
            </button>
          ) : (
            !cameraError && (
              <button
                type="button"
                onClick={capture}
                className="px-6 py-2.5 rounded-full bg-violet-600 text-white text-sm font-semibold flex items-center gap-2"
              >
                <Icon icon="solar:camera-bold" width={16} /> Capture
              </button>
            )
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="w-full">
            <StepFooter onNext={submitSelfie} onBack={onBack} loading={loading} />
          </div>
        </div>
      )}

      {mode === "phone" && (
        <div className="flex flex-col items-center gap-3 text-center">
          {linkError ? (
            <div className="text-sm text-rose-600">
              {linkError}
              <button type="button" onClick={createLink} className="block mx-auto mt-2 text-violet-600 font-semibold">
                Try again
              </button>
            </div>
          ) : !link ? (
            <p className="text-sm text-gray-400 py-10">Creating your link...</p>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={link.qrDataUrl} alt="QR code to open the selfie page on your phone" className="w-52 h-52 rounded-xl border border-gray-100" />
              <p className="text-sm text-gray-600 max-w-xs">
                Scan this QR code with your phone camera, take a selfie, and this page will continue by itself.
              </p>
              <input
                readOnly
                value={link.url}
                onFocus={(e) => e.target.select()}
                className="w-full max-w-sm text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 text-center"
              />
              {onLocalhost && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-sm">
                  This link points to "localhost", which only opens on this computer. To test with a phone, set
                  FRONTEND_PUBLIC_URL in the backend .env to this computer's network address (for example
                  http://192.168.1.10:3000).
                </p>
              )}
              {phoneStatus === "waiting" && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Icon icon="line-md:loading-twotone-loop" width={14} /> Waiting for your selfie... (link valid for 10 minutes)
                </p>
              )}
              <button type="button" onClick={createLink} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                Generate a new link
              </button>
            </>
          )}
          <div className="w-full">
            <button type="button" onClick={onBack} className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 mt-2">
              Back
            </button>
          </div>
        </div>
      )}

      {mode === "upload" && (
        <>
          <Field label="Selfie Photo" error={error}>
            <ImageDropInput
              previewLabel="Click to upload a selfie"
              fileName={selfieBase64 ? "photo selected" : undefined}
              onFile={async (f) => {
                setError("");
                setSelfiePreview(URL.createObjectURL(f));
                setSelfieBase64(await compressImageToBase64(f));
              }}
            />
          </Field>
          <StepFooter onNext={submitSelfie} onBack={onBack} loading={loading} />
        </>
      )}
    </div>
  );
}
