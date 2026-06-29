import * as z from 'zod';
import { createRegistry, type Registry } from './createRegistry';
import { stubComponents } from './stubComponents';
import type { BlockTypeDefinition, PaginationContract } from './types';

const SECTION_ONLY: readonly string[] = ['section'];

const noResponseSchema = z.undefined();

const headingConfigSchema = z
	.object({
		level: z.number().int().min(1).max(4),
		text: z.string().trim().min(1).max(500),
	})
	.strict();

const headingPagination: PaginationContract = {
	splittable: false,
	keepTogether: true,
	keepWithNext: true,
	pageBreakBefore: false,
	pageBreakAfter: false,
};

const headingBlock: BlockTypeDefinition = {
	typeId: 'heading',
	label: 'Heading',
	category: 'Display/Content',
	description: 'Section heading with configurable level (h1-h4) and text.',
	blockImplementationVersion: 1,
	configSchemaVersion: 1,
	configSchema: headingConfigSchema,
	responseSchema: noResponseSchema,
	optionCapability: { kind: 'none' },
	builderPreviewComponent: stubComponents.headingBuilder,
	runtimeComponent: stubComponents.headingRuntime,
	reportComponent: stubComponents.headingReport,
	pdfPaginationContract: headingPagination,
	configMigrationStrategy: null,
	allowedContainerTypes: SECTION_ONLY,
	repeatable: true,
	defaultConfig: { level: 1, text: 'Heading' },
};

const paragraphConfigSchema = z
	.object({
		text: z.string().trim().min(1).max(5000),
	})
	.strict();

const paragraphPagination: PaginationContract = {
	splittable: true,
	keepTogether: false,
	keepWithNext: false,
	pageBreakBefore: false,
	pageBreakAfter: false,
};

const paragraphBlock: BlockTypeDefinition = {
	typeId: 'paragraph',
	label: 'Paragraph',
	category: 'Display/Content',
	description: 'Static text block. Supports plain text; rich text deferred.',
	blockImplementationVersion: 1,
	configSchemaVersion: 1,
	configSchema: paragraphConfigSchema,
	responseSchema: noResponseSchema,
	optionCapability: { kind: 'none' },
	builderPreviewComponent: stubComponents.paragraphBuilder,
	runtimeComponent: stubComponents.paragraphRuntime,
	reportComponent: stubComponents.paragraphReport,
	pdfPaginationContract: paragraphPagination,
	configMigrationStrategy: null,
	allowedContainerTypes: SECTION_ONLY,
	repeatable: true,
	defaultConfig: { text: 'Paragraph' },
};

const shortTextConfigSchema = z
	.object({
		placeholder: z.string().max(200).optional(),
		defaultValue: z.string().optional(),
		maxLength: z.number().int().min(1).max(2000),
	})
	.strict()
	.refine(
		(cfg) =>
			cfg.defaultValue === undefined ||
			cfg.defaultValue.length <= cfg.maxLength,
		{
			message: 'defaultValue length must not exceed maxLength',
			path: ['defaultValue'],
		},
	);

const shortTextResponseSchema = z
	.object({
		value: z.string().max(2000),
	})
	.strict();

const inputPagination: PaginationContract = {
	splittable: false,
	keepTogether: true,
	keepWithNext: false,
	pageBreakBefore: false,
	pageBreakAfter: false,
};

const shortTextBlock: BlockTypeDefinition = {
	typeId: 'short_text',
	label: 'Short Text',
	category: 'Basic Inputs',
	description: 'Single-line text input.',
	blockImplementationVersion: 1,
	configSchemaVersion: 1,
	configSchema: shortTextConfigSchema,
	responseSchema: shortTextResponseSchema,
	optionCapability: { kind: 'none' },
	builderPreviewComponent: stubComponents.shortTextBuilder,
	runtimeComponent: stubComponents.shortTextRuntime,
	reportComponent: stubComponents.shortTextReport,
	pdfPaginationContract: inputPagination,
	configMigrationStrategy: null,
	allowedContainerTypes: SECTION_ONLY,
	repeatable: true,
	defaultConfig: { maxLength: 255 },
};

const singleSelectConfigSchema = z
	.object({
		defaultValue: z.string().max(120).optional(),
		allowOther: z.boolean(),
		otherLabel: z.string().max(200).optional(),
	})
	.strict()
	.refine(
		(cfg) =>
			!cfg.allowOther ||
			(cfg.otherLabel !== undefined && cfg.otherLabel.trim().length > 0),
		{
			message:
				'otherLabel is required and must be a non-empty string when allowOther is true',
			path: ['otherLabel'],
		},
	);

const singleSelectResponseSchema = z
	.object({
		value: z.string().min(1).max(120),
	})
	.strict();

const singleSelectBlock: BlockTypeDefinition = {
	typeId: 'single_select',
	label: 'Single Select',
	category: 'Choice Inputs',
	description: 'Dropdown with one selectable option.',
	blockImplementationVersion: 1,
	configSchemaVersion: 1,
	configSchema: singleSelectConfigSchema,
	responseSchema: singleSelectResponseSchema,
	optionCapability: {
		kind: 'options',
		selectionMode: 'single',
		defaultValueConfigKey: 'defaultValue',
		minimumOptions: 0,
		maximumOptions: null,
	},
	builderPreviewComponent: stubComponents.singleSelectBuilder,
	runtimeComponent: stubComponents.singleSelectRuntime,
	reportComponent: stubComponents.singleSelectReport,
	pdfPaginationContract: inputPagination,
	configMigrationStrategy: null,
	allowedContainerTypes: SECTION_ONLY,
	repeatable: true,
	defaultConfig: { allowOther: false },
};

const blockDefinitions: readonly BlockTypeDefinition[] = [
	headingBlock,
	paragraphBlock,
	shortTextBlock,
	singleSelectBlock,
];

export const blockRegistry: Registry<BlockTypeDefinition> =
	createRegistry<BlockTypeDefinition>(blockDefinitions);
