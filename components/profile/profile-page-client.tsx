"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog";
import { validateAvatarFile } from "@/lib/avatar";
import {
  removeAvatar,
  updateAccountEmail,
  updateAccountPassword,
  updateProfileDisplayName,
  uploadAvatar,
} from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProfilePageClientProps = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  redirectTo?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  placeholder,
  autoComplete,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </label>
  );
}

export function ProfilePageClient({
  email,
  displayName: initialName,
  avatarUrl: initialAvatar,
  redirectTo,
}: ProfilePageClientProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [newEmail, setNewEmail] = useState(email);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const saveName = () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("Укажите имя");
      return;
    }
    startTransition(async () => {
      const result = await updateProfileDisplayName(trimmed);
      if (result.error) toast.error(result.error);
      else toast.success("Имя сохранено");
    });
  };

  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (validation) {
      toast.error(validation);
      e.target.value = "";
      return;
    }

    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  };

  const closeCrop = () => {
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const uploadCroppedFile = (file: File) => {
    const formData = new FormData();
    formData.set("avatar", file);

    startTransition(async () => {
      const result = await uploadAvatar(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.avatarUrl) setAvatarUrl(result.avatarUrl);
      closeCrop();
      toast.success("Фото обновлено");
    });
  };

  const onRemoveAvatar = () => {
    startTransition(async () => {
      const result = await removeAvatar();
      if (result.error) toast.error(result.error);
      else {
        setAvatarUrl(null);
        toast.success("Фото удалено");
      }
    });
  };

  const saveEmail = () => {
    startTransition(async () => {
      const result = await updateAccountEmail(newEmail);
      if (result.error) toast.error(result.error);
      else if (result.message) toast.success(result.message, { duration: 6000 });
    });
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowPassword(false);
    setShowConfirm(false);
    setPasswordFormOpen(false);
  };

  const savePassword = () => {
    if (!currentPassword.trim()) {
      toast.error("Введите текущий пароль");
      return;
    }
    if (password.length < 6) {
      toast.error("Новый пароль не короче 6 символов");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Новый пароль и подтверждение не совпадают");
      return;
    }
    if (currentPassword === password) {
      toast.error("Новый пароль должен отличаться от текущего");
      return;
    }

    startTransition(async () => {
      const result = await updateAccountPassword(
        currentPassword,
        password,
        confirmPassword
      );
      if (result.error) toast.error(result.error);
      else {
        resetPasswordForm();
        toast.success(result.message ?? "Пароль обновлён");
      }
    });
  };

  return (
    <div className="space-y-5">
      {cropSrc && (
        <AvatarCropDialog
          imageSrc={cropSrc}
          onClose={closeCrop}
          onSave={uploadCroppedFile}
          saving={pending}
        />
      )}

      <Card className="flex flex-col items-center gap-4 py-6">
        <div className="relative">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-700 bg-zinc-800",
              pending && "opacity-60"
            )}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-violet-300">
                {initials(displayName)}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
            className="absolute -right-1 -bottom-1 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-zinc-200 shadow-lg hover:bg-zinc-800 disabled:opacity-50"
            aria-label="Загрузить фото"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onAvatarPick}
          />
        </div>
        <p className="text-center text-xs text-zinc-500">
          JPEG, PNG, WebP или GIF, до 2 МБ
        </p>
        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-red-400"
            disabled={pending}
            onClick={onRemoveAvatar}
          >
            <Trash2 className="h-4 w-4" />
            Удалить фото
          </Button>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-medium text-zinc-300">Имя в рейтингах</h2>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Как вас показывать в лигах"
          maxLength={40}
          disabled={pending}
        />
        <p className="text-xs text-zinc-500">
          Подставляется при создании лиги и в таблицах побед.
        </p>
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={saveName}
        >
          Сохранить имя
        </Button>
        {redirectTo && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={() => {
              window.location.href = redirectTo;
            }}
          >
            Продолжить
          </Button>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-medium text-zinc-300">Email</h2>
        <p className="text-xs text-zinc-500">
          Текущий: <span className="text-zinc-300">{email}</span>
        </p>
        <Input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Новый email"
          autoComplete="email"
          disabled={pending}
        />
        <p className="text-xs text-zinc-500">
          После смены на новый адрес придёт письмо для подтверждения.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={saveEmail}
        >
          Изменить email
        </Button>
      </Card>

      <Card className="space-y-4 p-4">
        <h2 className="text-sm font-medium text-zinc-300">Пароль</h2>

        {!passwordFormOpen ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={() => setPasswordFormOpen(true)}
          >
            Изменить пароль
          </Button>
        ) : (
          <>
            <PasswordField
              label="Текущий пароль"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrentPassword}
              onToggleVisible={() => setShowCurrentPassword((v) => !v)}
              placeholder="Введите текущий пароль"
              autoComplete="current-password"
              disabled={pending}
            />
            <PasswordField
              label="Новый пароль"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
              placeholder="Не короче 6 символов"
              autoComplete="new-password"
              disabled={pending}
            />
            <PasswordField
              label="Повторите новый пароль"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirm}
              onToggleVisible={() => setShowConfirm((v) => !v)}
              placeholder="Ещё раз"
              autoComplete="new-password"
              disabled={pending}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={resetPasswordForm}
              >
                Отмена
              </Button>
              <Button
                type="button"
                className="w-full"
                disabled={
                  pending ||
                  !currentPassword.trim() ||
                  !password ||
                  !confirmPassword
                }
                onClick={savePassword}
              >
                Сохранить
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
