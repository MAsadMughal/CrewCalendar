"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
  value?: string;
}

function getPasswordStrength(password: string, t: (key: string) => string): { score: number; label: string; color: string } {
  let score = 0;
  
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 1) return { score: 1, label: t("weak"), color: "bg-red-500" };
  if (score <= 2) return { score: 2, label: t("fair"), color: "bg-orange-500" };
  if (score <= 3) return { score: 3, label: t("good"), color: "bg-yellow-500" };
  if (score <= 4) return { score: 4, label: t("strong"), color: "bg-green-500" };
  return { score: 5, label: t("veryStrong"), color: "bg-emerald-500" };
}

export function PasswordInput({ 
  showStrength = false, 
  value = "", 
  className,
  ...props 
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const t = useTranslations("passwordStrength");
  const strength = getPasswordStrength(value, t);
  
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          value={value}
          className={cn("pr-10", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-gray-400" />
          ) : (
            <Eye className="h-4 w-4 text-gray-400" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>
      </div>
      
      {showStrength && value.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= strength.score ? strength.color : "bg-gray-200"
                )}
              />
            ))}
          </div>
          <p className={cn(
            "text-xs",
            strength.score <= 2 ? "text-red-600" : 
            strength.score <= 3 ? "text-yellow-600" : "text-green-600"
          )}>
            {t("label")}: {strength.label}
          </p>
        </div>
      )}
    </div>
  );
}
