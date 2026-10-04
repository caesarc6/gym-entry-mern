export function isDataImage(value) {
  return (
    typeof value === "string" &&
    value.startsWith("data:") &&
    value.includes("base64,")
  );
}

export function dataUrlToFile(dataUrl, filename = "photo.jpg") {
  if (!isDataImage(dataUrl)) return null;
  const [header, data] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] || "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename || "photo.jpg", { type: mime });
}
