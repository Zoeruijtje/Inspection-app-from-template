import { FormEvent, useEffect, useRef, useState } from "react";
import { createFormTemplate } from "wasp/client/operations";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Textarea } from "../client/components/ui/textarea";
import { toast } from "../client/hooks/use-toast";
import { getSafeErrorMessage, parseTemplateTags } from "./templateListUi";

type TemplateFormState = {
  name: string;
  description: string;
  category: string;
  tags: string;
};

const emptyTemplateFormState: TemplateFormState = {
  name: "",
  description: "",
  category: "",
  tags: "",
};

export function TemplateFormDialog({
  isOpen,
  onOpenChange,
  onCreated,
  submitLabel = "Create template",
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreated: () => Promise<void>;
  submitLabel?: string;
}) {
  const [formState, setFormState] = useState<TemplateFormState>(
    emptyTemplateFormState,
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState(emptyTemplateFormState);
    setNameError(null);
    setFormError(null);

    window.setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [isOpen]);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (isSubmitting && !nextIsOpen) {
      return;
    }

    if (!nextIsOpen) {
      setFormState(emptyTemplateFormState);
      setNameError(null);
      setFormError(null);
    }

    onOpenChange(nextIsOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const name = formState.name.trim();
    if (!name) {
      setNameError("Name is required.");
      setFormError(null);
      return;
    }

    setIsSubmitting(true);
    setNameError(null);
    setFormError(null);

    try {
      await createFormTemplate({
        name,
        description: normalizeOptionalText(formState.description),
        category: normalizeOptionalText(formState.category),
        tags: parseTemplateTags(formState.tags),
      });
    } catch (error) {
      const message = getSafeErrorMessage(error, "Unable to create template.");
      setFormError(message);
      toast({
        title: "Template not created",
        description: message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    setFormState(emptyTemplateFormState);
    setNameError(null);
    setFormError(null);
    onOpenChange(false);
    toast({ title: "Template created" });

    try {
      await onCreated();
    } catch (error) {
      const message = getSafeErrorMessage(
        error,
        "Template created, but the list could not refresh. Reload the page.",
      );
      toast({
        title: "Template created",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>
            Create reusable template metadata and start with an initial draft
            version.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-template-name">Name</Label>
            <Input
              id="new-template-name"
              ref={nameInputRef}
              value={formState.name}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  name: value,
                }));
                if (nameError) {
                  setNameError(null);
                }
              }}
              maxLength={200}
              required
              aria-invalid={!!nameError}
              aria-describedby={
                nameError ? "new-template-name-error" : undefined
              }
            />
            {nameError && (
              <p
                id="new-template-name-error"
                className="text-destructive text-sm"
              >
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-template-description">Description</Label>
            <Textarea
              id="new-template-description"
              value={formState.description}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  description: value,
                }));
              }}
              maxLength={2000}
              className="min-h-28"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-template-category">Category</Label>
            <Input
              id="new-template-category"
              value={formState.category}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  category: value,
                }));
              }}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-template-tags">Tags</Label>
            <Input
              id="new-template-tags"
              value={formState.tags}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  tags: value,
                }));
              }}
              placeholder="NEN 2767, woning, onderhoud"
            />
          </div>

          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Creating..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function normalizeOptionalText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
}
