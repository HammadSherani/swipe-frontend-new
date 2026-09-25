import { Suspense } from "react";
import ResetPasswordContent from "./ResetPasswordContent";


export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">Loading reset password page...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
