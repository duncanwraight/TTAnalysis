// The shortest password the sign-up and reset forms accept. Supabase checks
// its own minimum too (Authentication, then Policies, in the dashboard, and
// auth.minimum_password_length locally), which should match this.
export const MIN_PASSWORD_LENGTH = 8;
