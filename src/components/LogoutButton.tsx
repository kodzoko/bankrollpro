// src/components/LogoutButton.tsx

import { logout } from "@/app/actions/logout";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className }: LogoutButtonProps) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          className ??
          "px-4 py-2 rounded-xl border text-sm hover:bg-gray-100 transition"
        }
      >
        Logout
      </button>
    </form>
  );
}