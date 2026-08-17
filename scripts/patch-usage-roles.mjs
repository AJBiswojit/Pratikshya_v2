import fs from "fs";
const manifestPath = "src/data/media/ingestedManifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

const ensureRole = (asset, role) => {
  if (!asset.usageRoles) asset.usageRoles = [];
  if (!asset.usageRoles.includes(role)) asset.usageRoles.push(role);
};

// Categorize assets by categoryId and groupKey
const byCategory = new Map();
manifest.assets.forEach((a) => {
  if (!a.categoryId) return;
  if (!byCategory.has(a.categoryId)) byCategory.set(a.categoryId, []);
  byCategory.get(a.categoryId).push(a);
});

// For each category, assign HERO/EDITORIAL to first few front views
for (const assets of byCategory.values()) {
  // sort by groupKey and viewScore
  const sorted = assets
    .filter((a) => a.optimizedPath?.startsWith("library/"))
    .sort((a, b) => {
      const g = (a.groupKey || "").localeCompare(b.groupKey || "");
      if (g !== 0) return g;
      return (a.viewScore || 99) - (b.viewScore || 99);
    });
  // pick front views (role COVER)
  const fronts = sorted.filter((a) => a.role === "COVER");
  // give first 3 per category HERO + EDITORIAL + LOOKBOOK
  fronts.slice(0, 3).forEach((a) => {
    ensureRole(a, "HERO");
    ensureRole(a, "EDITORIAL");
    ensureRole(a, "LOOKBOOK");
    ensureRole(a, "CATEGORY_COVER");
    ensureRole(a, "COLLECTION_COVER");
  });
  // give next 3 EDITORIAL + LOOKBOOK + CATEGORY_COVER
  fronts.slice(3, 6).forEach((a) => {
    ensureRole(a, "EDITORIAL");
    ensureRole(a, "LOOKBOOK");
    ensureRole(a, "CATEGORY_COVER");
  });
}

// Assign SALE and NEW_ARRIVAL based on product metadata from old report? Simplistic: assign SALE to 50% and NEW_ARRIVAL to some
manifest.assets.forEach((a) => {
  if (!a.productId) return;
  // if productId ends with odd number, assign SALE for demo
  const lastChar = a.productId.slice(-1);
  const num = parseInt(lastChar, 10);
  if (!isNaN(num) && num % 2 === 0) {
    ensureRole(a, "SALE");
  }
  // assign NEW_ARRIVAL to products with 5, etc
  if (a.productId === "pf-025" || a.productId === "pf-017" || a.productId === "pf-040") {
    ensureRole(a, "NEW_ARRIVAL");
  }
});

// Ensure AI_SHOPPING and AI_MIRROR for apparel
manifest.assets.forEach((a) => {
  if (["sarees", "lehengas", "bridal-couture", "menswear", "kurtis-and-suits", "kidswear"].includes(a.categoryId) && a.productId) {
    ensureRole(a, "AI_SHOPPING");
    ensureRole(a, "AI_MIRROR");
  }
});

// Ensure at least some SALE assets for lehengas category
const lehengas = manifest.assets.filter((a) => a.categoryId === "lehengas" && a.optimizedPath?.startsWith("library/"));
lehengas.slice(0, 5).forEach((a) => ensureRole(a, "SALE"));

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Patched usageRoles");
console.log("Hero count", manifest.assets.filter((a) => (a.usageRoles || []).includes("HERO")).length);
console.log("Sale count", manifest.assets.filter((a) => (a.usageRoles || []).includes("SALE")).length);
console.log("Editorial count", manifest.assets.filter((a) => (a.usageRoles || []).includes("EDITORIAL")).length);
