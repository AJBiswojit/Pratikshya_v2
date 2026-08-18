/** Canonical Bride & Groom editorial selection tests. */

import test from "node:test";
import assert from "node:assert/strict";

import { products as authoredProducts } from "../src/data/catalog/products.js";
import { toStorefrontProduct, productHref } from "../src/data/products/index.js";
import {
  isBrideWeddingProduct,
  isGroomWeddingProduct,
  selectBrideGroomLooks,
} from "../src/services/media/mediaResolver.js";

const publishedCatalogue = authoredProducts.map((product, index) =>
  toStorefrontProduct({ ...product, status: "PUBLISHED", published: true }, index)
);

test("Bride & Groom eligibility follows canonical departments and publication", () => {
  const bride = publishedCatalogue.find((product) => product.department === "bridal" && product.category !== "finishing-touches");
  const groom = publishedCatalogue.find((product) => product.department === "men" && product.category === "groom");
  assert.ok(bride && groom);
  assert.equal(isBrideWeddingProduct(bride), true);
  assert.equal(isGroomWeddingProduct(groom), true);
  assert.equal(isBrideWeddingProduct(groom), false);
  assert.equal(isGroomWeddingProduct(bride), false);
  assert.equal(isBrideWeddingProduct({ ...bride, status: "DRAFT" }), false);
});

test("Bride & Groom resolves only owned canonical product media", () => {
  const looks = selectBrideGroomLooks(publishedCatalogue, { count: 4 });
  assert.ok(looks.bride.length > 0);
  assert.ok(looks.groom.length > 0);

  for (const look of [...looks.bride, ...looks.groom]) {
    assert.ok(look.product);
    assert.equal(look.productId, look.product.id);
    assert.equal(look.image.productId, look.product.id);
    assert.equal(look.image.src, look.product.image.src);
    assert.equal(productHref(look.product), `/product/${look.product.id}`);
  }
});

test("Bride & Groom selection is deterministic and does not duplicate Product IDs", () => {
  const first = selectBrideGroomLooks(publishedCatalogue, { count: 4 });
  const second = selectBrideGroomLooks(publishedCatalogue, { count: 4 });
  assert.deepEqual(
    [...first.bride, ...first.groom].map((look) => look.productId),
    [...second.bride, ...second.groom].map((look) => look.productId)
  );
  const ids = [...first.bride, ...first.groom].map((look) => look.productId);
  assert.equal(new Set(ids).size, ids.length);
});
