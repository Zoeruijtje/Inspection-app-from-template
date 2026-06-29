import { afterAll, describe, expect, it } from 'vitest';
import { createRegistry, type RegistryEntry } from './createRegistry';
import { blockRegistry, containerRegistry } from './index';
import { blockTypeDefinitionKeys, containerTypeDefinitionKeys } from './types';

type StubEntry = {
	typeId: string;
	defaultConfig: RegistryEntry['defaultConfig'];
};

const BLOCK_IDS = ['heading', 'paragraph', 'short_text', 'single_select'];

function expectKeys(
	def: Record<string, unknown>,
	expected: readonly string[],
): void {
	expect(Object.keys(def).sort()).toEqual([...expected].sort());
}

describe('container registry baseline', () => {
	it('1. contains exactly one container type: section', () => {
		const ids = containerRegistry.list().map((d) => d.typeId);
		expect(ids).toEqual(['section']);
	});

	it('3. lookup by known id succeeds (section)', () => {
		expect(containerRegistry.has('section')).toBe(true);
		const def = containerRegistry.get('section');
		expect(def).toBeDefined();
		expect(def?.typeId).toBe('section');
		expect(containerRegistry.require('section').typeId).toBe('section');
	});

	it('4. strict lookup for unknown container id throws', () => {
		expect(() => containerRegistry.require('group')).toThrow();
	});
});

describe('block registry baseline', () => {
	it('2. contains exactly the four baseline block types', () => {
		const ids = blockRegistry
			.list()
			.map((d) => d.typeId)
			.sort();
		expect(ids).toEqual([...BLOCK_IDS].sort());
	});

	it('3b. lookup by known block ids succeeds', () => {
		for (const id of BLOCK_IDS) {
			expect(blockRegistry.has(id)).toBe(true);
			expect(blockRegistry.get(id)?.typeId).toBe(id);
			expect(blockRegistry.require(id).typeId).toBe(id);
		}
	});

	it('4b. strict lookup for unknown block id throws', () => {
		expect(() => blockRegistry.require('number')).toThrow();
	});
});

describe('registry factory', () => {
	it('5. rejects duplicate typeIds at construction', () => {
		const dup: StubEntry[] = [
			{ typeId: 'a', defaultConfig: {} },
			{ typeId: 'a', defaultConfig: {} },
		];
		expect(() => createRegistry<StubEntry>(dup)).toThrow();
	});

	it('5b. accepts a non-duplicate set', () => {
		const ok: StubEntry[] = [
			{ typeId: 'a', defaultConfig: {} },
			{ typeId: 'b', defaultConfig: {} },
		];
		const reg = createRegistry<StubEntry>(ok);
		expect(
			reg
				.list()
				.map((d) => d.typeId)
				.sort(),
		).toEqual(['a', 'b']);
	});
});

describe('contract completeness', () => {
	it('6. every container entry exposes all ContainerTypeDefinition fields', () => {
		for (const def of containerRegistry.list()) {
			expectKeys(
				def as unknown as Record<string, unknown>,
				containerTypeDefinitionKeys,
			);
		}
	});

	it('6b. every block entry exposes all BlockTypeDefinition fields', () => {
		for (const def of blockRegistry.list()) {
			expectKeys(
				def as unknown as Record<string, unknown>,
				blockTypeDefinitionKeys,
			);
		}
	});

	it('6c. section baseline metadata is correct', () => {
		const s = containerRegistry.require('section');
		expect(s.implementationVersion).toBe(1);
		expect(s.configSchemaVersion).toBe(1);
		expect(s.acceptsBlocks).toBe(true);
		expect(s.allowedParentTypes).toEqual([]);
		expect(s.allowedChildContainerTypes).toEqual([]);
		expect(s.migrationStrategy).toBeNull();
	});

	it('6d. block baseline metadata is correct', () => {
		for (const def of blockRegistry.list()) {
			expect(def.blockImplementationVersion).toBe(1);
			expect(def.configSchemaVersion).toBe(1);
			expect(def.configMigrationStrategy).toBeNull();
			expect(def.repeatable).toBe(true);
			expect(def.allowedContainerTypes).toEqual(['section']);
		}
	});

	it('6e. every block definition has optionCapability', () => {
		for (const def of blockRegistry.list()) {
			expect(
				def.optionCapability,
				`block "${def.typeId}" must declare optionCapability`,
			).toBeDefined();
			expect(
				typeof def.optionCapability.kind,
				`block "${def.typeId}" optionCapability.kind must be a string`,
			).toBe('string');
		}
	});

	it('6f. optionCapability is listed in blockTypeDefinitionKeys', () => {
		expect(blockTypeDefinitionKeys).toContain('optionCapability');
	});

	it('6g. heading, paragraph, and short_text are option-disabled', () => {
		for (const id of ['heading', 'paragraph', 'short_text'] as const) {
			const def = blockRegistry.require(id);
			expect(def.optionCapability.kind).toBe('none');
		}
	});

	it('6h. single_select is option-backed', () => {
		const def = blockRegistry.require('single_select');
		expect(def.optionCapability.kind).toBe('options');
		if (def.optionCapability.kind === 'options') {
			expect(def.optionCapability.selectionMode).toBe('single');
			expect(def.optionCapability.defaultValueConfigKey).toBe('defaultValue');
			expect(def.optionCapability.minimumOptions).toBe(0);
			expect(def.optionCapability.maximumOptions).toBeNull();
		}
	});
});

describe('config validation — valid samples pass', () => {
	it('7a. section valid configs pass', () => {
		const schema = containerRegistry.require('section').configSchema;
		expect(
			schema.safeParse({ collapsible: false, initiallyCollapsed: false })
				.success,
		).toBe(true);
		expect(
			schema.safeParse({ collapsible: true, initiallyCollapsed: false })
				.success,
		).toBe(true);
		expect(
			schema.safeParse({ collapsible: true, initiallyCollapsed: true }).success,
		).toBe(true);
		expect(
			schema.safeParse(containerRegistry.require('section').defaultConfig)
				.success,
		).toBe(true);
	});

	it('7b. heading valid configs pass', () => {
		const schema = blockRegistry.require('heading').configSchema;
		expect(schema.safeParse({ level: 1, text: 'Title' }).success).toBe(true);
		expect(schema.safeParse({ level: 4, text: 'x'.repeat(500) }).success).toBe(
			true,
		);
		expect(
			schema.safeParse(blockRegistry.require('heading').defaultConfig).success,
		).toBe(true);
	});

	it('7c. paragraph valid configs pass', () => {
		const schema = blockRegistry.require('paragraph').configSchema;
		expect(schema.safeParse({ text: 'Hello world' }).success).toBe(true);
		expect(schema.safeParse({ text: 'x'.repeat(5000) }).success).toBe(true);
		expect(
			schema.safeParse(blockRegistry.require('paragraph').defaultConfig)
				.success,
		).toBe(true);
	});

	it('7d. short_text valid configs pass', () => {
		const schema = blockRegistry.require('short_text').configSchema;
		expect(schema.safeParse({ maxLength: 100 }).success).toBe(true);
		expect(
			schema.safeParse({ maxLength: 100, placeholder: 'p', defaultValue: '' })
				.success,
		).toBe(true);
		expect(
			schema.safeParse({ maxLength: 2000, defaultValue: 'x'.repeat(2000) })
				.success,
		).toBe(true);
		expect(
			schema.safeParse(blockRegistry.require('short_text').defaultConfig)
				.success,
		).toBe(true);
	});

	it('7e. single_select valid configs pass', () => {
		const schema = blockRegistry.require('single_select').configSchema;
		expect(schema.safeParse({ allowOther: false }).success).toBe(true);
		expect(
			schema.safeParse({ allowOther: true, otherLabel: 'Other' }).success,
		).toBe(true);
		expect(
			schema.safeParse({
				allowOther: true,
				otherLabel: 'Please specify',
				defaultValue: 'a',
			}).success,
		).toBe(true);
		expect(
			schema.safeParse(blockRegistry.require('single_select').defaultConfig)
				.success,
		).toBe(true);
	});
});

describe('config validation — invalid configs fail', () => {
	it('8a. section rejects initiallyCollapsed:true when collapsible:false', () => {
		const schema = containerRegistry.require('section').configSchema;
		expect(
			schema.safeParse({ collapsible: false, initiallyCollapsed: true })
				.success,
		).toBe(false);
	});

	it('8b. heading rejects invalid level/empty/oversized text', () => {
		const schema = blockRegistry.require('heading').configSchema;
		expect(schema.safeParse({ level: 5, text: 'x' }).success).toBe(false);
		expect(schema.safeParse({ level: 0, text: 'x' }).success).toBe(false);
		expect(schema.safeParse({ level: 1, text: '' }).success).toBe(false);
		expect(schema.safeParse({ level: 1, text: 'x'.repeat(501) }).success).toBe(
			false,
		);
		expect(schema.safeParse({ level: 1 }).success).toBe(false);
	});

	it('8b-addendum. heading rejects fractional level such as 1.5', () => {
		const schema = blockRegistry.require('heading').configSchema;
		expect(schema.safeParse({ level: 1.5, text: 'x' }).success).toBe(false);
		expect(schema.safeParse({ level: 2.9, text: 'x' }).success).toBe(false);
		expect(schema.safeParse({ level: 1.0, text: 'x' }).success).toBe(true);
	});

	it('8c. paragraph rejects empty/oversized/missing text', () => {
		const schema = blockRegistry.require('paragraph').configSchema;
		expect(schema.safeParse({ text: '' }).success).toBe(false);
		expect(schema.safeParse({ text: 'x'.repeat(5001) }).success).toBe(false);
		expect(schema.safeParse({}).success).toBe(false);
	});

	it('8d. short_text rejects bad maxLength/placeholder types and bounds', () => {
		const schema = blockRegistry.require('short_text').configSchema;
		expect(schema.safeParse({ maxLength: 0 }).success).toBe(false);
		expect(schema.safeParse({ maxLength: 2001 }).success).toBe(false);
		expect(schema.safeParse({ maxLength: '5' }).success).toBe(false);
		expect(
			schema.safeParse({ maxLength: 10, placeholder: 'x'.repeat(201) }).success,
		).toBe(false);
	});

	it('8e. single_select rejects bad types and oversized defaultValue', () => {
		const schema = blockRegistry.require('single_select').configSchema;
		expect(schema.safeParse({ allowOther: 'yes' }).success).toBe(false);
		expect(schema.safeParse({ defaultValue: 'x'.repeat(121) }).success).toBe(
			false,
		);
		expect(
			schema.safeParse({ allowOther: true, otherLabel: 'x'.repeat(201) })
				.success,
		).toBe(false);
	});

	it('11. short_text rejects a default value longer than maxLength', () => {
		const schema = blockRegistry.require('short_text').configSchema;
		expect(
			schema.safeParse({ maxLength: 3, defaultValue: 'abcd' }).success,
		).toBe(false);
	});

	it('12. single_select rejects allowOther:true without a valid otherLabel', () => {
		const schema = blockRegistry.require('single_select').configSchema;
		expect(schema.safeParse({ allowOther: true }).success).toBe(false);
		expect(
			schema.safeParse({ allowOther: true, otherLabel: '   ' }).success,
		).toBe(false);
		expect(schema.safeParse({ allowOther: true, otherLabel: '' }).success).toBe(
			false,
		);
	});
});

describe('strict schemas reject unknown properties', () => {
	it('section config rejects unknown properties', () => {
		const schema = containerRegistry.require('section').configSchema;
		expect(
			schema.safeParse({
				collapsible: false,
				initiallyCollapsed: false,
				surprise: 1,
			}).success,
		).toBe(false);
	});

	it('heading config rejects unknown properties', () => {
		const schema = blockRegistry.require('heading').configSchema;
		expect(schema.safeParse({ level: 1, text: 'x', surprise: 1 }).success).toBe(
			false,
		);
	});

	it('short_text config rejects unknown properties', () => {
		const schema = blockRegistry.require('short_text').configSchema;
		expect(schema.safeParse({ maxLength: 100, surprise: 1 }).success).toBe(
			false,
		);
	});

	it('single_select config rejects unknown properties', () => {
		const schema = blockRegistry.require('single_select').configSchema;
		expect(schema.safeParse({ allowOther: false, surprise: 1 }).success).toBe(
			false,
		);
	});

	it('short_text response rejects unknown properties', () => {
		const schema = blockRegistry.require('short_text').responseSchema;
		expect(schema.safeParse({ value: 'x', surprise: 1 }).success).toBe(false);
	});

	it('single_select response rejects unknown properties', () => {
		const schema = blockRegistry.require('single_select').responseSchema;
		expect(schema.safeParse({ value: 'x', surprise: 1 }).success).toBe(false);
	});
});

describe('response schemas', () => {
	it('9. display-block response schemas accept undefined and reject null, strings, and objects', () => {
		for (const id of ['heading', 'paragraph'] as const) {
			const schema = blockRegistry.require(id).responseSchema;
			expect(schema.safeParse(undefined).success).toBe(true);
			expect(schema.safeParse(null).success).toBe(false);
			expect(schema.safeParse('x').success).toBe(false);
			expect(schema.safeParse({ value: 'x' }).success).toBe(false);
		}
	});

	it('10. input-block response schemas accept valid responses and reject malformed ones', () => {
		const shortText = blockRegistry.require('short_text').responseSchema;
		expect(shortText.safeParse({ value: 'hello' }).success).toBe(true);
		expect(shortText.safeParse({ value: '' }).success).toBe(true);
		expect(shortText.safeParse({ value: 123 }).success).toBe(false);
		expect(shortText.safeParse({}).success).toBe(false);
		expect(shortText.safeParse({ value: 'x'.repeat(2001) }).success).toBe(
			false,
		);

		const singleSelect = blockRegistry.require('single_select').responseSchema;
		expect(singleSelect.safeParse({ value: 'opt1' }).success).toBe(true);
		expect(singleSelect.safeParse({ value: '' }).success).toBe(false);
		expect(singleSelect.safeParse({ value: 123 }).success).toBe(false);
		expect(singleSelect.safeParse({}).success).toBe(false);
		expect(singleSelect.safeParse({ value: 'x'.repeat(121) }).success).toBe(
			false,
		);
	});
});

describe('registry immutability', () => {
	it('13. returned values are frozen and cannot mutate internal registry state', () => {
		const blockSnapshot = blockRegistry
			.list()
			.map((d) => d.typeId)
			.sort();

		const blockDef = blockRegistry.require('short_text');

		expect(Object.isFrozen(blockDef)).toBe(true);
		expect(Object.isFrozen(blockDef.defaultConfig)).toBe(true);
		expect(Object.isFrozen(blockDef.allowedContainerTypes)).toBe(true);
		expect(Object.isFrozen(blockDef.pdfPaginationContract)).toBe(true);

		expect(() => {
			(blockDef as unknown as Record<string, unknown>).typeId = 'mutated';
		}).toThrow();
		expect(() => {
			(blockDef.defaultConfig as Record<string, unknown>).injected = true;
		}).toThrow();
		expect(() => {
			(blockDef.allowedContainerTypes as string[]).push('page');
		}).toThrow();
		expect(() => {
			(
				blockDef.pdfPaginationContract as unknown as Record<string, unknown>
			).splittable = true;
		}).toThrow();

		const blockList = blockRegistry.list();
		expect(Object.isFrozen(blockList)).toBe(true);
		expect(() => {
			(blockList as unknown as Array<(typeof blockList)[number]>).push(
				blockList[0],
			);
		}).toThrow();

		expect(
			blockRegistry
				.list()
				.map((d) => d.typeId)
				.sort(),
		).toEqual(blockSnapshot);
		const freshBlock = blockRegistry.require('short_text');
		expect(freshBlock.typeId).toBe('short_text');
		expect(freshBlock.allowedContainerTypes).toEqual(['section']);
		expect(
			(freshBlock.defaultConfig as Record<string, unknown>).injected,
		).toBeUndefined();

		const containerSnapshot = containerRegistry
			.list()
			.map((d) => d.typeId)
			.sort();
		const sectionDef = containerRegistry.require('section');

		expect(Object.isFrozen(sectionDef)).toBe(true);
		expect(Object.isFrozen(sectionDef.defaultConfig)).toBe(true);
		expect(Object.isFrozen(sectionDef.reportLayoutContract)).toBe(true);
		expect(Object.isFrozen(sectionDef.allowedParentTypes)).toBe(true);
		expect(Object.isFrozen(sectionDef.allowedChildContainerTypes)).toBe(true);

		expect(() => {
			(sectionDef as unknown as Record<string, unknown>).typeId = 'mutated';
		}).toThrow();
		expect(() => {
			(sectionDef.defaultConfig as Record<string, unknown>).injected = true;
		}).toThrow();
		expect(() => {
			(
				sectionDef.reportLayoutContract as unknown as Record<string, unknown>
			).splittable = false;
		}).toThrow();
		expect(() => {
			(sectionDef.allowedParentTypes as string[]).push('page');
		}).toThrow();

		const containerList = containerRegistry.list();
		expect(Object.isFrozen(containerList)).toBe(true);
		expect(() => {
			(containerList as unknown as Array<(typeof containerList)[number]>).push(
				containerList[0],
			);
		}).toThrow();

		expect(
			containerRegistry
				.list()
				.map((d) => d.typeId)
				.sort(),
		).toEqual(containerSnapshot);
		const freshSection = containerRegistry.require('section');
		expect(freshSection.typeId).toBe('section');
		expect(
			(freshSection.defaultConfig as Record<string, unknown>).injected,
		).toBeUndefined();
	});
});

afterAll(() => {
	const cIds = containerRegistry.list().map((d) => d.typeId);
	const bIds = blockRegistry
		.list()
		.map((d) => d.typeId)
		.sort();
	console.log(
		`\nRegistry inventory — containers: ${cIds.length} [${cIds.join(
			', ',
		)}] | blocks: ${bIds.length} [${bIds.join(', ')}]`,
	);
});
