import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: [
			'src/form-templates/validation.test.ts',
			'src/form-templates/authorization.test.ts',
			'src/form-templates/lifecycle.test.ts',
			'src/form-templates/definitionValidation.test.ts',
			'src/form-templates/definitionAuthorization.test.ts',
			'src/form-templates/definitionOrdering.test.ts',
			'src/form-templates/definitionTree.test.ts',
			'src/form-templates/definitionOperations.test.ts',
			'src/form-templates/containerValidation.test.ts',
			'src/form-templates/containerCompatibility.test.ts',
			'src/form-templates/containerGraph.test.ts',
			'src/form-templates/containerOperations.test.ts',
			'src/form-templates/blockValidation.test.ts',
			'src/form-templates/blockCompatibility.test.ts',
			'src/form-templates/blockOptionCapability.test.ts',
			'src/form-templates/blockStableKey.test.ts',
			'src/form-templates/blockOperations.test.ts',
		],
		environment: 'node',
		reporters: ['default'],
	},
});
