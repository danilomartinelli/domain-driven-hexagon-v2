import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { SanitizeHtml, Trim } from "../decorators/sanitize.decorators";

class TestDto {
  @SanitizeHtml()
  name: string;

  @Trim()
  trimmed: string;

  @SanitizeHtml()
  @Trim()
  both: string;
}

describe("SanitizeHtml", () => {
  it("strips script tags", () => {
    const result = plainToInstance(TestDto, {
      name: 'hello<script>alert("xss")</script>',
      trimmed: "x",
      both: "x",
    });
    expect(result.name).toBe("hello");
  });

  it("strips all HTML tags", () => {
    const result = plainToInstance(TestDto, {
      name: "<b>bold</b> and <i>italic</i>",
      trimmed: "x",
      both: "x",
    });
    expect(result.name).toBe("bold and italic");
  });

  it("preserves clean strings", () => {
    const result = plainToInstance(TestDto, {
      name: "John Doe",
      trimmed: "x",
      both: "x",
    });
    expect(result.name).toBe("John Doe");
  });

  it("is a no-op for non-string values", () => {
    const result = plainToInstance(TestDto, {
      name: 42,
      trimmed: "x",
      both: "x",
    });
    expect(result.name).toBe(42);
  });
});

describe("Trim", () => {
  it("trims leading and trailing whitespace", () => {
    const result = plainToInstance(TestDto, {
      name: "x",
      trimmed: "  hello  ",
      both: "x",
    });
    expect(result.trimmed).toBe("hello");
  });

  it("is a no-op for non-string values", () => {
    const result = plainToInstance(TestDto, {
      name: "x",
      trimmed: 123,
      both: "x",
    });
    expect(result.trimmed).toBe(123);
  });
});

describe("SanitizeHtml + Trim combined", () => {
  it("sanitizes HTML and trims whitespace", () => {
    const result = plainToInstance(TestDto, {
      name: "x",
      trimmed: "x",
      both: "  <b>hello</b>  ",
    });
    expect(result.both).toBe("hello");
  });
});
