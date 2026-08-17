/**
 * PRATIKSHYA FASHON — Workflow command registry (Phase 2, Step D).
 *
 * Leaf module (NO imports) that late-binds the universal workflow command
 * layer, the universal publish validator and the media ownership service.
 *
 * Why late binding? `catalogRepository` (the product register) delegates its
 * workflow actions to the universal command service, and the command service
 * imports catalogRepository for persistence. A static import in both
 * directions would create an ESM evaluation-order hazard with existing
 * modules that execute top-level reads (e.g. the taxonomy data module reads
 * `slugify` from catalogRepository at import time). Keeping this registry
 * dependency-free means catalogRepository can import it without pulling the
 * command/validator/taxonomy graph into its own evaluation.
 *
 * The command service registers itself (and the validator) when loaded;
 * every production and test path that can mutate workflow imports the
 * command service first. If a repository workflow method is ever called
 * before registration, it fails loudly instead of bypassing the lifecycle.
 */

let commandsImpl = null;
let validatorImpl = null;
let ownershipImpl = null;

export const registerWorkflowCommands = (impl) => {
  commandsImpl = impl ?? null;
};

export const registerPublishValidator = (impl) => {
  validatorImpl = impl ?? null;
};

export const registerMediaOwnershipService = (impl) => {
  ownershipImpl = impl ?? null;
};

export const getWorkflowCommands = () => commandsImpl;

export const getPublishValidator = () => validatorImpl;

export const getMediaOwnershipService = () => ownershipImpl;

export const workflowRegistryLoaded = () => Boolean(commandsImpl && validatorImpl);

export default {
  registerWorkflowCommands,
  registerPublishValidator,
  registerMediaOwnershipService,
  getWorkflowCommands,
  getPublishValidator,
  getMediaOwnershipService,
  workflowRegistryLoaded,
};
