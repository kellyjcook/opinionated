import { Button } from '../ui/Button';

interface ConfirmScreenProps {
  email: string;
  onBack: () => void;
}

export function ConfirmScreen({ email, onBack }: ConfirmScreenProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-[#f8f9fa]">
      <div className="w-full max-w-[400px] bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] p-8 text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-2xl font-bold text-[#202124] mb-3">Check Your Email</h2>
        <p className="text-[#5f6368] mb-2">
          We sent a confirmation link to:
        </p>
        <p className="text-[#1a73e8] font-semibold mb-6">{email}</p>
        <p className="text-[#5f6368] text-sm mb-6">
          Click the link in the email to activate your account, then come back here to sign in.
        </p>
        <Button variant="secondary" onClick={onBack} className="w-full">
          Back to Sign In
        </Button>
      </div>
    </div>
  );
}
