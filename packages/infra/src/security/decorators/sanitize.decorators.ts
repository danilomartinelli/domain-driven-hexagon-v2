import { Transform } from "class-transformer";
import sanitize from "sanitize-html";

export function SanitizeHtml(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }
    return sanitize(value, { allowedTags: [], allowedAttributes: {} });
  });
}

export function Trim(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.trim();
  });
}
