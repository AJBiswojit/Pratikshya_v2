/**
 * PRATIKSHYA FASHON — Product editor sections: Basic Information and
 * Category & Attributes (Phase 13).
 */

import {
  AVAILABILITY_OPTIONS,
  COLLECTION_OPTIONS,
  COLOR_OPTIONS,
  DEPARTMENT_SELECT_OPTIONS,
  FABRIC_OPTIONS,
  GENDER_OPTIONS,
  MATERIAL_OPTIONS,
  OCCASION_OPTIONS,
  PATTERN_OPTIONS,
  PRODUCT_TYPES,
  SEASON_OPTIONS,
  SIZE_OPTIONS,
  TAG_SUGGESTIONS,
  WORK_OPTIONS,
  departmentCategoriesFor,
  departmentSubcategoriesFor,
  subcategoryOptionsFor,
} from "../../config/productCatalogConfig";
import catalogRepository from "../../services/catalogRepository";
import taxonomyRepository from "../../services/taxonomyRepository";
import {
  ChipGroup,
  ChipRadio,
  Field,
  Select,
  TagInput,
  TextArea,
  TextInput,
  hintClass,
} from "./editorFields";

/* ------------------------------------------------------------------ */
/* 1 · Basic information                                               */
/* ------------------------------------------------------------------ */

export function SectionBasics({ draft, patch, errors, isNew }) {
  const slugPreview = draft.slug || catalogRepository.suggestSlug(draft.name, draft.id);

  /** Reset child taxonomy fields whenever their canonical parent changes. */
  const handleDepartmentChange = (departmentId) => {
    patch({ department: departmentId, category: "", subcategory: "" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Field
        label="Department"
        required
        hint={
          isNew
            ? "All departments use the same product-management system. Selecting a department narrows the available categories and subcategories."
            : "Department is locked after the canonical Product ID is allocated."
        }
        htmlFor="pf-department"
        className="lg:col-span-2"
      >
        <Select
          id="pf-department"
          value={draft.department}
          onChange={(event) => handleDepartmentChange(event.target.value)}
          placeholder="Choose a department"
          disabled={!isNew}
          options={DEPARTMENT_SELECT_OPTIONS.map((dept) => ({
            value: dept.id,
            label: dept.label,
          }))}
        />
      </Field>

      <Field label="Product name" required error={errors.name} htmlFor="pf-name" className="lg:col-span-2">
        <TextInput
          id="pf-name"
          value={draft.name}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder="Product name"
          autoComplete="off"
        />
      </Field>

      <Field
        label="SKU"
        required
        error={errors.sku}
        hint="Unique across products and variants. Never reused."
        htmlFor="pf-sku"
      >
        <TextInput
          id="pf-sku"
          value={draft.sku}
          onChange={(event) => patch({ sku: event.target.value.toUpperCase() })}
          placeholder="PF-SARE-001"
          autoComplete="off"
        />
      </Field>

      <Field label="Brand" htmlFor="pf-brand">
        <TextInput
          id="pf-brand"
          value={draft.brand}
          onChange={(event) => patch({ brand: event.target.value })}
        />
      </Field>

      <Field label="Product type" hint="Used for merchandising and future AI classification." htmlFor="pf-type">
        <Select
          id="pf-type"
          value={draft.productType}
          onChange={(event) => patch({ productType: event.target.value })}
          options={PRODUCT_TYPES.map((type) => ({ value: type.id, label: type.label }))}
        />
      </Field>

      <Field label="Gender" htmlFor="pf-gender">
        <Select
          id="pf-gender"
          value={draft.gender}
          onChange={(event) => patch({ gender: event.target.value })}
          options={GENDER_OPTIONS.map((gender) => ({ value: gender, label: gender }))}
        />
      </Field>

      <Field label="Product code" htmlFor="pf-code">
        <TextInput
          id="pf-code"
          value={draft.productCode}
          onChange={(event) => patch({ productCode: event.target.value })}
          placeholder="Optional style code"
        />
      </Field>

      <Field label="Barcode" htmlFor="pf-barcode">
        <TextInput
          id="pf-barcode"
          value={draft.barcode}
          onChange={(event) => patch({ barcode: event.target.value })}
          placeholder="EAN / UPC"
        />
      </Field>

      <Field label="Internal reference" htmlFor="pf-ref">
        <TextInput
          id="pf-ref"
          value={draft.internalReference}
          onChange={(event) => patch({ internalReference: event.target.value })}
          placeholder="Supplier or loom reference"
        />
      </Field>

      <Field
        label="Cover image / Catalogue plate"
        hint="Manifest plate key (e.g. saree-banarasi) or direct image URL."
        htmlFor="pf-cover-plate"
        className="lg:col-span-2"
      >
        <TextInput
          id="pf-cover-plate"
          value={draft.image || ""}
          onChange={(event) => patch({ image: event.target.value })}
          placeholder="saree-banarasi or https://images.pratikshya.com/..."
        />
      </Field>

      <Field
        label="Short description"
        hint="One considered line for cards and previews."
        htmlFor="pf-short"
        className="lg:col-span-2"
      >
        <TextArea
          id="pf-short"
          rows={2}
          value={draft.shortDescription}
          onChange={(event) => patch({ shortDescription: event.target.value })}
        />
      </Field>

      <Field
        label="Full description"
        required
        error={errors.description}
        hint="The story told on the product page."
        htmlFor="pf-description"
        className="lg:col-span-2"
      >
        <TextArea
          id="pf-description"
          rows={5}
          value={draft.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>

      <Field
        label="Product tags"
        hint="Searchable across the storefront."
        className="lg:col-span-2"
        htmlFor="pf-tags"
      >
        <TagInput
          value={draft.tags}
          onChange={(tags) => patch({ tags })}
          suggestions={TAG_SUGGESTIONS}
        />
      </Field>

      {isNew ? (
        <p className={hintClass + " lg:col-span-2"}>
          URL slug will be created from the name: <span className="text-ink">/{slugPreview}</span>
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · Category & attributes                                           */
/* ------------------------------------------------------------------ */

export function SectionAttributes({ draft, patch, errors, isNew }) {
  const allSubcategoryOptions = subcategoryOptionsFor(draft.category);
  const departmentSubcategories = draft.department
    ? departmentSubcategoriesFor(draft.department, draft.category)
    : [];
  const subcategoryOptions = departmentSubcategories.length
    ? departmentSubcategories.map((sub) => sub.id)
    : allSubcategoryOptions;

  const allCategoryOptions = taxonomyRepository.categoryOptions();
  const departmentCategories = draft.department
    ? departmentCategoriesFor(draft.department)
    : [];
  const categoryOptions = departmentCategories.length
    ? departmentCategories
    : allCategoryOptions;
  const collectionOptions = taxonomyRepository.collectionOptions().map((entry) => entry.label);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Field label="Category" required error={errors.category} htmlFor="pf-category">
          <Select
            id="pf-category"
            value={draft.category}
            onChange={(event) => patch({ category: event.target.value, subcategory: "" })}
            placeholder={draft.department ? "Choose a category" : "Choose a department first"}
            disabled={!isNew}
            options={categoryOptions.map((category) => ({ value: category.id, label: category.label }))}
          />
        </Field>

        <Field label="Subcategory" htmlFor="pf-subcategory">
          <Select
            id="pf-subcategory"
            value={draft.subcategory}
            onChange={(event) => patch({ subcategory: event.target.value })}
            placeholder={draft.category ? "Choose a style" : "Choose a category first"}
            disabled={!isNew}
            options={subcategoryOptions.map((entry) => ({ value: entry, label: entry }))}
            allowCustom
          />
        </Field>

        <Field label="Fabric" hint="Available to every category, not only sarees." htmlFor="pf-fabric">
          <Select
            id="pf-fabric"
            value={draft.fabric}
            onChange={(event) => patch({ fabric: event.target.value })}
            placeholder="Choose fabric"
            options={FABRIC_OPTIONS.map((entry) => ({ value: entry, label: entry }))}
            allowCustom
          />
        </Field>

        <Field label="Material" htmlFor="pf-material">
          <Select
            id="pf-material"
            value={draft.material}
            onChange={(event) => patch({ material: event.target.value })}
            placeholder="Choose material"
            options={MATERIAL_OPTIONS.map((entry) => ({ value: entry, label: entry }))}
            allowCustom
          />
        </Field>

        <Field label="Season" htmlFor="pf-season">
          <Select
            id="pf-season"
            value={draft.season}
            onChange={(event) => patch({ season: event.target.value })}
            placeholder="Choose season"
            options={SEASON_OPTIONS.map((entry) => ({ value: entry, label: entry }))}
          />
        </Field>

        <Field label="Fit" htmlFor="pf-fit">
          <TextInput
            id="pf-fit"
            value={draft.fit}
            onChange={(event) => patch({ fit: event.target.value })}
            placeholder="Regular, tailored, Relaxed…"
          />
        </Field>

        <Field label="Length" htmlFor="pf-length">
          <TextInput
            id="pf-length"
            value={draft.length}
            onChange={(event) => patch({ length: event.target.value })}
            placeholder="5.5 metres, ankle length…"
          />
        </Field>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Field label="Primary colour" htmlFor="pf-color-primary">
          <ChipRadio
            ariaLabel="Primary colour"
            options={COLOR_OPTIONS}
            value={draft.primaryColor}
            onChange={(value) => {
              const colors = [...new Set([value, draft.secondaryColor, ...draft.colors].filter(Boolean))];
              patch({ primaryColor: value, colors });
            }}
            allowCustom
          />
        </Field>

        <Field label="Secondary colour" htmlFor="pf-color-secondary">
          <ChipRadio
            ariaLabel="Secondary colour"
            options={COLOR_OPTIONS}
            value={draft.secondaryColor}
            onChange={(value) => {
              const colors = [...new Set([draft.primaryColor, value, ...draft.colors].filter(Boolean))];
              patch({ secondaryColor: value, colors });
            }}
            allowCustom
          />
        </Field>
      </div>

      <Field label="All stocked colours" hint="Customers pick from these on the product page.">
        <ChipGroup
          ariaLabel="Stocked colours"
          options={[...new Set([...COLOR_OPTIONS, ...draft.colors])]}
          value={draft.colors}
          onToggle={(colors) => patch({ colors })}
          allowCustom
        />
      </Field>

      <Field label="Sizes" hint="Free Size suits sarees and most ethnic drapes. Custom sizes allowed.">
        <ChipGroup
          ariaLabel="Sizes"
          options={[...new Set([...SIZE_OPTIONS, ...draft.sizes])]}
          value={draft.sizes}
          onToggle={(sizes) => patch({ sizes })}
          allowCustom
        />
      </Field>

      <Field label="Pattern">
        <ChipGroup
          ariaLabel="Pattern"
          options={[...new Set([...PATTERN_OPTIONS, ...draft.patterns])]}
          value={draft.patterns}
          onToggle={(patterns) => patch({ patterns })}
          allowCustom
        />
      </Field>

      <Field label="Work / embellishment" hint="Multiple selections allowed.">
        <ChipGroup
          ariaLabel="Work and embellishment"
          options={[...new Set([...WORK_OPTIONS, ...draft.work])]}
          value={draft.work}
          onToggle={(work) => patch({ work })}
          allowCustom
        />
      </Field>

      <Field label="Occasions" hint="Every occasion this piece suits.">
        <ChipGroup
          ariaLabel="Occasions"
          options={[...new Set([...OCCASION_OPTIONS, ...draft.occasion])]}
          value={draft.occasion}
          onToggle={(occasion) => patch({ occasion })}
          allowCustom
        />
      </Field>

      <Field
        label="Collections"
        hint="The first collection becomes the primary one for the storefront facet."
      >
        <ChipGroup
          ariaLabel="Collections"
          options={[...new Set([...collectionOptions, ...COLLECTION_OPTIONS, ...draft.collections])]}
          value={draft.collections}
          onToggle={(collections) =>
            patch({ collections, collection: collections[0] ?? "" })
          }
          allowCustom
        />
      </Field>

      <Field label="Availability" htmlFor="pf-availability">
        <Select
          id="pf-availability"
          value={draft.availability}
          onChange={(event) => patch({ availability: event.target.value })}
          options={AVAILABILITY_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
        />
      </Field>
    </div>
  );
}
