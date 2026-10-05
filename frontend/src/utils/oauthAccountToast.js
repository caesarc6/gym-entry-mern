/**
 * Signup OAuth should mention an existing account only when this sign-in
 * did not create it. A parallel provision (auth bootstrap or a second callback)
 * can return created:false after the account was just inserted.
 */
export const shouldToastExistingAccount = ({
  mode,
  created,
  createdRecently,
}) => mode === "signup" && created !== true && createdRecently !== true;
