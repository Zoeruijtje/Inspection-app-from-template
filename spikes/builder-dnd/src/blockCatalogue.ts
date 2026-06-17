// Phase 3A0-A — Block Catalogue Definition
import type { BlockTypeDef } from './types';

export const BLOCK_CATALOGUE: BlockTypeDef[] = [
  // Structure
  { id: 'section', label: 'Section', category: 'structure', icon: '📦', description: 'A top-level container for blocks' },
  { id: 'group', label: 'Group', category: 'structure', icon: '📁', description: 'Nested container to group related blocks' },
  { id: 'divider', label: 'Divider', category: 'structure', icon: '➖', description: 'Horizontal rule separating content' },
  { id: 'spacer', label: 'Spacer', category: 'structure', icon: '⬜', description: 'Vertical spacing between blocks' },

  // Display
  { id: 'heading', label: 'Heading', category: 'display', icon: '🔤', description: 'Section heading (h1-h4)' },
  { id: 'paragraph', label: 'Paragraph', category: 'display', icon: '📝', description: 'Rich text paragraph' },
  { id: 'instructions', label: 'Instructions', category: 'display', icon: '📋', description: 'Helper text for inspectors' },
  { id: 'static_image', label: 'Static Image', category: 'display', icon: '🖼️', description: 'Reference image or diagram' },

  // Basic Inputs
  { id: 'short_text', label: 'Short Text', category: 'basic_inputs', icon: '✏️', description: 'Single-line text input' },
  { id: 'long_text', label: 'Long Text', category: 'basic_inputs', icon: '📄', description: 'Multi-line text area' },
  { id: 'number', label: 'Number', category: 'basic_inputs', icon: '🔢', description: 'Numeric input with min/max' },
  { id: 'date', label: 'Date', category: 'basic_inputs', icon: '📅', description: 'Date picker input' },
  { id: 'email', label: 'Email', category: 'basic_inputs', icon: '📧', description: 'Email address input' },
  { id: 'phone', label: 'Phone', category: 'basic_inputs', icon: '📞', description: 'Phone number input' },
  { id: 'yes_no', label: 'Yes / No', category: 'basic_inputs', icon: '✅', description: 'Boolean toggle or radio' },

  // Choice Inputs
  { id: 'single_select', label: 'Single Select', category: 'choice_inputs', icon: '🔘', description: 'Dropdown or radio list' },
  { id: 'multi_select', label: 'Multi Select', category: 'choice_inputs', icon: '☑️', description: 'Checkbox list' },
  { id: 'checkbox', label: 'Checkbox', category: 'choice_inputs', icon: '✔️', description: 'Single checkbox' },
  { id: 'rating', label: 'Rating', category: 'choice_inputs', icon: '⭐', description: '1-5 star rating' },

  // Data / Calculation
  { id: 'calculated', label: 'Calculated Value', category: 'data_calculation', icon: '🧮', description: 'Auto-computed field' },
  { id: 'auto_number', label: 'Auto Number', category: 'data_calculation', icon: '🔢', description: 'Incremental reference number' },

  // Media
  { id: 'single_photo', label: 'Single Photo', category: 'media', icon: '📷', description: 'Single photo capture' },
  { id: 'multiple_photos', label: 'Multiple Photos', category: 'media', icon: '📸', description: 'Multi-photo gallery' },
  { id: 'signature', label: 'Signature', category: 'media', icon: '✍️', description: 'Digital signature capture' },

  // Inspection / Workflow
  { id: 'finding', label: 'Finding', category: 'inspection_workflow', icon: '🔍', description: 'Inspection finding with severity' },
  { id: 'recommendation', label: 'Recommendation', category: 'inspection_workflow', icon: '💡', description: 'Recommended action' },
  { id: 'approval', label: 'Approval', category: 'inspection_workflow', icon: '👍', description: 'Sign-off approval' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  structure: 'Structure',
  display: 'Display / Content',
  basic_inputs: 'Basic Inputs',
  choice_inputs: 'Choice Inputs',
  data_calculation: 'Data / Calculation',
  media: 'Media',
  inspection_workflow: 'Inspection / Workflow',
  advanced: 'Advanced',
};

export const CATEGORY_ORDER: string[] = [
  'structure',
  'display',
  'basic_inputs',
  'choice_inputs',
  'data_calculation',
  'media',
  'inspection_workflow',
  'advanced',
];
