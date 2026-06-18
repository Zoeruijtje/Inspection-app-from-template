import { generateAssets } from './assetGenerator.js';
import { buildBlockedSummary, checkSpikeArtifacts, measureDeploymentOnly, renderCoreFixtures } from './renderRunner.js';

const command = process.argv[2];

try {
  switch (command) {
    case 'generate:assets': {
      const assets = await generateAssets();
      console.log(`Generated ${Object.keys(assets).length} deterministic local image assets.`);
      break;
    }
    case 'render:core': {
      try {
        const { evidence, runMeasurements } = await renderCoreFixtures();
        console.log(`Rendered ${evidence.length} core fixture(s).`);
        console.log(`Chromium executable: ${runMeasurements.chromiumExecutablePath ?? 'unavailable'}`);
      } catch (error) {
        await buildBlockedSummary(error);
        throw error;
      }
      break;
    }
    case 'measure:deployment': {
      await measureDeploymentOnly();
      console.log('Wrote deployment measurements.');
      break;
    }
    case 'check': {
      await checkSpikeArtifacts();
      console.log('Spike artifact checks passed.');
      break;
    }
    default:
      throw new Error(`Unknown command "${command ?? ''}". Expected generate:assets, render:core, measure:deployment, or check.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
