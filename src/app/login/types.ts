export type AuthFormState = {
  error: string | null;
  message: string | null;
};

export const initialAuthState: AuthFormState = { error: null, message: null };
