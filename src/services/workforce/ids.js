export const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;

export const hashString = (value) => {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

export default { makeId, hashString };
