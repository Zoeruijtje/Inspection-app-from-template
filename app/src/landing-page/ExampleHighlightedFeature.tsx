import { HighlightedFeature } from "./components/HighlightedFeature";

export function AIReady() {
  return (
    <HighlightedFeature
      name="Van klant tot rapport — één flow"
      description="Beheer klanten, voer inspecties uit, leg bevindingen vast met foto's en genereer professionele rapporten — alles in één systeem, zonder gedoe met losse tools."
      highlightedComponent={<WorkflowSummary />}
      direction="row-reverse"
    />
  );
}

function WorkflowSummary() {
  const steps = [
    { step: 1, label: "Klant aanmaken" },
    { step: 2, label: "Object koppelen" },
    { step: 3, label: "Inspectie plannen" },
    { step: 4, label: "Bevindingen vastleggen" },
    { step: 5, label: "Rapport genereren" },
  ];

  return (
    <div className="w-full">
      <ol className="space-y-4">
        {steps.map((s) => (
          <li
            key={s.step}
            className="flex items-center gap-4 rounded-lg border border-border bg-background p-4"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {s.step}
            </span>
            <span className="text-foreground font-medium">{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
