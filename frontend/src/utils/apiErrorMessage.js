const serverText = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

/** Prefer the API's message over Axios's "Request failed with status code …". */
export const messageFromApiError = (error) => {
  if (error?.response?.status === 413 || error?.photoTooLarge) {
    return "Photo is too large. Use a smaller photo.";
  }
  const data = error?.response?.data;
  if (data?.code === "DB_UNAVAILABLE") {
    return (
      serverText(data?.message) ||
      "Could not save. The server could not reach the database."
    );
  }
  return serverText(data?.message) || serverText(data?.error) || "";
};

export const isRejectedAuthToken = (error) => {
  const code = error?.response?.data?.code;
  return code === "TOKEN_EXPIRED" || code === "AUTH_FAILED";
};
