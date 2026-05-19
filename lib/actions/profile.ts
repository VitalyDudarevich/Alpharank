"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AVATAR_BUCKET,
  avatarObjectPath,
  validateAvatarFile,
} from "@/lib/avatar";

export async function createProfile(displayName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const trimmed = displayName.trim();
  if (!trimmed) return { error: "Укажите имя" };

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: trimmed,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  await supabase.auth.updateUser({
    data: { display_name: trimmed },
  });

  revalidatePath("/");
  revalidatePath("/profile");
  return { success: true };
}

export async function updateProfileDisplayName(displayName: string) {
  return createProfile(displayName);
}

export async function syncProfileFromAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const fromMeta = (user.user_metadata?.display_name as string | undefined)?.trim();
  if (!fromMeta) return;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from("profiles").insert({
    id: user.id,
    display_name: fromMeta,
  });
}

export async function updateProfileForm(formData: FormData) {
  const displayName = (formData.get("display_name") as string)?.trim();
  const redirectTo = (formData.get("redirect") as string)?.trim() || "/";

  const result = await updateProfileDisplayName(displayName);
  if (result.error) {
    redirect(`/profile?error=name&redirect=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo);
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "Выберите файл" };

  const validation = validateAvatarFile(file);
  if (validation) return { error: validation };

  const path = avatarObjectPath(user.id, file.type);

  const { data: existing } = await supabase.storage.from(AVATAR_BUCKET).list(user.id);
  if (existing?.length) {
    const toRemove = existing.map((o) => `${user.id}/${o.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(toRemove);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) return { error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  const url = `${publicUrl}?t=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true, avatarUrl: url };
}

export async function removeAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: existing } = await supabase.storage.from(AVATAR_BUCKET).list(user.id);
  if (existing?.length) {
    const toRemove = existing.map((o) => `${user.id}/${o.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(toRemove);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/");
  return { success: true };
}

export async function updateAccountEmail(newEmail: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const email = newEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Укажите корректный email" };
  }

  if (email === user.email?.toLowerCase()) {
    return { error: "Это уже ваш текущий email" };
  }

  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Этот email уже занят" };
    }
    return { error: error.message };
  }

  return {
    success: true,
    message:
      "На новый адрес отправлено письмо для подтверждения. После перехода по ссылке email обновится.",
  };
}

export async function updateAccountPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Не авторизован" };

  const current = currentPassword.trim();
  const next = newPassword.trim();
  const confirm = confirmPassword.trim();

  if (!current) {
    return { error: "Введите текущий пароль" };
  }

  if (next.length < 6) {
    return { error: "Новый пароль не короче 6 символов" };
  }

  if (next !== confirm) {
    return { error: "Новый пароль и подтверждение не совпадают" };
  }

  if (current === next) {
    return { error: "Новый пароль должен отличаться от текущего" };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });

  if (signInError) {
    return { error: "Неверный текущий пароль" };
  }

  const { error } = await supabase.auth.updateUser({ password: next });

  if (error) return { error: error.message };

  return { success: true, message: "Пароль обновлён" };
}
