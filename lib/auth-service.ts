import { getSupabase } from "@/lib/supabase";

type OtpRequest = {
  email: string;
  phone?: string;
  fullName?: string;
};

type OtpVerification = OtpRequest & {
  token: string;
};

export async function sendEmailOtp({ email, phone = "", fullName = "" }: OtpRequest) {
  return await getSupabase().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: {
        phone: phone.trim() || null,
        full_name: fullName.trim() || null,
      },
    },
  });
}

export async function verifyEmailOtp({ email, token, phone = "", fullName = "" }: OtpVerification) {
  const verifyResponse = await getSupabase().auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (verifyResponse.error || !verifyResponse.data?.user) {
    return verifyResponse;
  }

  const updates: { data?: { phone?: string; full_name?: string } } = {};

  if (phone.trim() || fullName.trim()) {
    updates.data = {};
    if (phone.trim()) updates.data.phone = phone.trim();
    if (fullName.trim()) updates.data.full_name = fullName.trim();
  }

  if (!Object.keys(updates).length) {
    return verifyResponse;
  }

  const updateResponse = await getSupabase().auth.updateUser(updates);

  if (updateResponse.error) {
    return {
      data: verifyResponse.data,
      error: updateResponse.error,
    };
  }

  return {
    data: {
      ...verifyResponse.data,
      user: updateResponse.data.user ?? verifyResponse.data.user,
    },
    error: null,
  };
}

export async function signOut() {
  return await getSupabase().auth.signOut();
}
