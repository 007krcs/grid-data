import type { FormFillConfig, FormFillPluginState, FormField } from './types';
import { detectFields, resetFieldCounter } from './field-detector';
import { mapDataToFields } from './field-mapper';
import { validateFieldValue, formatFieldValue } from './fill-engine';

interface PdfPlugin {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
  install(context: any): (() => void) | void;
}

export function createFormFillPlugin(config: FormFillConfig = {}): PdfPlugin {
  return {
    id: 'form-fill',
    name: 'Smart Form Fill',
    version: '0.1.0',
    dependencies: ['text'],

    install(context: any) {
      const unsubs: (() => void)[] = [];

      context.registerState('form-fill', {
        fields: [],
        fillData: {},
        validated: false,
        lastDetectionAt: null,
      } satisfies FormFillPluginState);

      // Command: form:detectFields
      unsubs.push(context.commandBus.registerHandler('form:detectFields', (payload: { pageIndex?: number }) => {
        const state = context.store.getState();
        resetFieldCounter();
        const allFields: FormField[] = [];

        const pages = payload.pageIndex !== undefined
          ? [state.pages[payload.pageIndex]].filter(Boolean)
          : state.pages;

        for (const page of pages) {
          if (!page?.textContent?.lines) continue;
          const lines = page.textContent.lines.map((l: any) => ({
            text: l.text,
            rect: l.rect as [number, number, number, number],
          }));
          const fields = detectFields(lines, page.index);
          allFields.push(...fields);
        }

        context.setState('form-fill', (prev: FormFillPluginState) => ({
          ...prev,
          fields: allFields,
          lastDetectionAt: Date.now(),
        }));

        context.eventBus.emit('form:fieldsDetected', {
          fields: allFields,
          count: allFields.length,
        });
      }));

      // Command: form:fill
      unsubs.push(context.commandBus.registerHandler('form:fill', (payload: { data: Record<string, string> }) => {
        const formState: FormFillPluginState = context.getState('form-fill');
        const results = mapDataToFields(formState.fields, payload.data);

        // Update fields with values
        const updatedFields = formState.fields.map((field: FormField) => {
          const result = results.find((r) => r.fieldId === field.id);
          if (result && result.filled) {
            return { ...field, value: formatFieldValue(result.value, field.type) };
          }
          return field;
        });

        context.setState('form-fill', (prev: FormFillPluginState) => ({
          ...prev,
          fields: updatedFields,
          fillData: payload.data,
        }));

        context.eventBus.emit('form:filled', {
          results,
          filledCount: results.filter((r) => r.filled).length,
          totalCount: results.length,
        });
      }));

      // Command: form:validate
      unsubs.push(context.commandBus.registerHandler('form:validate', () => {
        const formState: FormFillPluginState = context.getState('form-fill');
        const errors: Array<{ fieldId: string; error: string }> = [];

        for (const field of formState.fields) {
          if (field.required && !field.value) {
            errors.push({ fieldId: field.id, error: `${field.label} is required` });
            continue;
          }
          if (field.value) {
            const validation = validateFieldValue(field.value, field.type, config.validationRules);
            if (!validation.valid) {
              errors.push({ fieldId: field.id, error: validation.error || 'Invalid value' });
            }
          }
        }

        const validated = errors.length === 0;

        context.setState('form-fill', (prev: FormFillPluginState) => ({
          ...prev,
          validated,
        }));

        if (!validated) {
          context.eventBus.emit('form:validationFailed', { errors });
        }

        return { validated, errors };
      }));

      // Command: form:clear
      unsubs.push(context.commandBus.registerHandler('form:clear', () => {
        context.setState('form-fill', (prev: FormFillPluginState) => ({
          ...prev,
          fields: prev.fields.map((f: FormField) => ({ ...f, value: '' })),
          fillData: {},
          validated: false,
        }));
      }));

      // Auto-detect on text extraction
      if (config.autoDetect) {
        unsubs.push(context.eventBus.on('text:extracted', (e: any) => {
          context.commandBus.dispatch('form:detectFields', { pageIndex: e.pageIndex });
        }));
      }

      return () => unsubs.forEach((fn) => fn());
    },
  };
}
