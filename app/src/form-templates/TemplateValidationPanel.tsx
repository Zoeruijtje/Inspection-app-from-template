import { AlertCircle, CheckCircle2 } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../client/components/ui/alert";
import {
  formatWorkflowCounts,
  type WorkflowValidationResult,
} from "./templateWorkflowUi";

export function TemplateValidationPanel({
  validationResult,
}: {
  validationResult: WorkflowValidationResult | null;
}) {
  if (!validationResult) {
    return (
      <div className="text-muted-foreground rounded-sm border border-dashed p-4 text-sm">
        Run validation to check the current draft before publishing.
      </div>
    );
  }

  if (validationResult.valid) {
    return <ValidValidationResult validationResult={validationResult} />;
  }

  return <InvalidValidationResult validationResult={validationResult} />;
}

function ValidValidationResult({
  validationResult,
}: {
  validationResult: WorkflowValidationResult;
}) {
  return (
    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50">
      <CheckCircle2 className="size-4" />
      <AlertTitle>Ready to publish</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <p>
            The current draft passed validation and can be published from this
            page session.
          </p>
          <CountsList counts={validationResult.counts} />
          <p className="text-xs">
            Snapshot schema v{validationResult.snapshotSchemaVersion ?? 1}
          </p>
          {validationResult.snapshotHash && (
            <code className="bg-background/70 block max-w-full break-all rounded-sm px-2 py-1 font-mono text-xs">
              {validationResult.snapshotHash}
            </code>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function InvalidValidationResult({
  validationResult,
}: {
  validationResult: WorkflowValidationResult;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>
        Validation failed
        {validationResult.issues.length > 0
          ? ` (${validationResult.issues.length})`
          : ""}
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-4">
          <CountsList counts={validationResult.counts} />
          {validationResult.issues.length > 0 ? (
            <ul className="space-y-3">
              {validationResult.issues.map((issue, index) => (
                <li
                  key={`${issue.code}-${issue.path}-${index}`}
                  className="border-destructive/25 bg-background/60 min-w-0 rounded-sm border p-3"
                >
                  <p className="text-foreground break-words text-sm font-medium">
                    {issue.message}
                  </p>
                  <div className="text-muted-foreground mt-2 grid gap-1 text-xs sm:grid-cols-2">
                    <code className="bg-muted block max-w-full break-all rounded-sm px-2 py-1 font-mono">
                      {issue.code}
                    </code>
                    <code className="bg-muted block max-w-full break-all rounded-sm px-2 py-1 font-mono">
                      {issue.path}
                    </code>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No structured validation issues were returned.</p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function CountsList({
  counts,
}: {
  counts: WorkflowValidationResult["counts"];
}) {
  const countLabels = formatWorkflowCounts(counts);

  if (countLabels.length === 0) {
    return null;
  }

  return (
    <dl className="grid gap-2 text-xs sm:grid-cols-4">
      {countLabels.map((label) => {
        const [value, ...rest] = label.split(" ");
        return (
          <div key={label} className="bg-background/70 rounded-sm px-2 py-1">
            <dt className="text-muted-foreground">{rest.join(" ")}</dt>
            <dd className="text-foreground text-sm font-semibold">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
