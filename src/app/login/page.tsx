import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <LoginForm />
      </div>
    </div>
  );
}