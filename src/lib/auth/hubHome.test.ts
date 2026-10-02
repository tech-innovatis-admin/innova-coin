import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_HUB_HOME_URL, hubHomeUrl } from "@/lib/auth/hubHome";

const savedHubHome = process.env.HUB_HOME_URL;

afterEach(() => {
  if (savedHubHome === undefined) {
    delete process.env.HUB_HOME_URL;
  } else {
    process.env.HUB_HOME_URL = savedHubHome;
  }
});

describe("hubHomeUrl", () => {
  it("sem HUB_HOME_URL usa o padrão público do Hub", () => {
    delete process.env.HUB_HOME_URL;
    expect(hubHomeUrl()).toBe(DEFAULT_HUB_HOME_URL);
    expect(DEFAULT_HUB_HOME_URL).toBe("https://hub.innovatismc.com/");
  });

  it("aceita https absoluto", () => {
    process.env.HUB_HOME_URL = "https://hub.example.test/home";
    expect(hubHomeUrl()).toBe("https://hub.example.test/home");
  });

  it("aceita http em localhost", () => {
    process.env.HUB_HOME_URL = "http://localhost:3000/";
    expect(hubHomeUrl()).toBe("http://localhost:3000/");
  });

  it("aceita http em 127.0.0.1", () => {
    process.env.HUB_HOME_URL = "http://127.0.0.1:8080";
    expect(hubHomeUrl()).toBe("http://127.0.0.1:8080/");
  });

  it("HUB_HOME_URL inválido cai no padrão", () => {
    process.env.HUB_HOME_URL = "nao-e-url";
    expect(hubHomeUrl()).toBe(DEFAULT_HUB_HOME_URL);
  });

  it("esquema não http(s) cai no padrão", () => {
    process.env.HUB_HOME_URL = "javascript:alert(1)";
    expect(hubHomeUrl()).toBe(DEFAULT_HUB_HOME_URL);
  });

  it("http em host público cai no padrão", () => {
    process.env.HUB_HOME_URL = "http://hub.example.test/";
    expect(hubHomeUrl()).toBe(DEFAULT_HUB_HOME_URL);
  });
});
