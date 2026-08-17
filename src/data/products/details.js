/**
 * Product-detail accessors.
 *
 * This module deliberately supplies no catalogue copy, specifications, or
 * commerce defaults. Those fields must be authored on the product record by
 * the product data source, so the UI never invents product information.
 */
export const getProductDescription = (product = {}) => product.description || "";
export const getProductDetails = (product = {}) => product.details || "";
export const getCareInstructions = (product = {}) => product.careInstructions || "";
export const getProductSpecifications = (product = {}) => product.specifications || {};
export const getDeliveryInfo = (product = {}) => product.deliveryInfo || "";
export const getReturnInfo = (product = {}) => product.returnInfo || "";
