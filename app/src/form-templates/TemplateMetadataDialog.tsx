import { FormEvent, useEffect, useRef, useState } from "react";
import { updateFormTemplate } from "wasp/client/operations";
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

type TemplateMetadata = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
};

type TemplateMetadataFormState = {
  name: string;
  description: string;
  category: string;
  tags: string;
};

export function TemplateMetadataDialog({
  template,
  isOpen,
  onOpenChange,
  onUpdated,
  onUpdateFailed,
  isReadOnly,
}: {
  template: TemplateMetadata;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdated: () => Promise<void>;
  onUpdateFailed: () => Promise<void>;
  isReadOnly: boolean;
}) {
  const [formState, setFormState] = useState<TemplateMetadataFormState>(() =>
    getFormStateFromTemplate(template),
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wasOpenRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!justOpened) {
      return;
    }

    setFormState(getFormStateFromTemplate(template));
    setNameError(null);
    setFormError(null);

    window.setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [isOpen, template]);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (isSubmitting && !nextIsOpen) {
      return;
    }

    if (!nextIsOpen) {
      setFormState(getFormStateFromTemplate(template));
      setNameError(null);
      setFormError(null);
    }

    onOpenChange(nextIsOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || isReadOnly) {
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
      await updateFormTemplate({
        templateId: template.id,
        name,
        description: normalizeOptionalText(formState.description),
        category: normalizeOptionalText(formState.category),
        tags: parseTemplateTags(formState.tags),
      });
    } catch (error) {
      const message = getSafeErrorMessage(error, "Unable to update template.");
      setFormError(message);
      toast({
        title: "Template not updated",
        description: message,
        variant: "destructive",
      });

      try {
        await onUpdateFailed();
      } catch {
        // The original update failure remains the useful user-facing error.
      }

      setIsSubmitting(false);
      return;
    }

    setFormState(getFormStateFromTemplate(template));
    setNameError(null);
    setFormError(null);
    onOpenChange(false);
    toast({ title: "Template updated" });

    try {
      await onUpdated();
    } catch (error) {
      const message = getSafeErrorMessage(
        error,
        "Template updated, but the page could not refresh. Reload the page.",
      );
      toast({
        title: "Refresh needed",
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
          <DialogTitle>Edit metadata</DialogTitle>
          <DialogDescription>
            Update the template name, description, category, and tags.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isReadOnly && (
            <Alert>
              <AlertDescription>
                This template is archived and cannot be edited.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-template-name">Name</Label>
            <Input
              id="edit-template-name"
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
              disabled={isReadOnly}
              aria-invalid={!!nameError}
              aria-describedby={
                nameError ? "edit-template-name-error" : undefined
              }
            />
            {nameError && (
              <p
                id="edit-template-name-error"
                className="text-destructive text-sm"
              >
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-template-description">Description</Label>
            <Textarea
              id="edit-template-description"
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
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-template-category">Category</Label>
            <Input
              id="edit-template-category"
              value={formState.category}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  category: value,
                }));
              }}
              maxLength={120}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-template-tags">Tags</Label>
            <Input
              id="edit-template-tags"
              value={formState.tags}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  tags: value,
                }));
              }}
              placeholder="NEN 2767, woning, onderhoud"
              disabled={isReadOnly}
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
            <Button type="submit" disabled={isSubmitting || isReadOnly}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getFormStateFromTemplate(
  template: TemplateMetadata,
): TemplateMetadataFormState {
  return {
    name: template.name,
    description: template.description ?? "",
    category: template.category ?? "",
    tags: template.tags.join(", "),
  };
}

function normalizeOptionalText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
}
