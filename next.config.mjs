import nextConfig from "./next.config.js";

const charsetHeader = { key: "Content-Type", value: "text/html; charset=utf-8" };

const originalHeaders =
  typeof nextConfig.headers === "function" ? nextConfig.headers : async () => [];

nextConfig.headers = async () => {
  const headerResults = await originalHeaders();

  if (!Array.isArray(headerResults) || headerResults.length === 0) {
    return [
      {
        source: "/:path*",
        headers: [charsetHeader],
      },
    ];
  }

  return headerResults.map((entry) => {
    const filtered =
      Array.isArray(entry.headers) && entry.headers.length > 0
        ? entry.headers.filter(
            (header) => header.key?.toLowerCase() !== "content-type",
          )
        : [];
    return {
      ...entry,
      headers: [...filtered, charsetHeader],
    };
  });
};

export default nextConfig;
