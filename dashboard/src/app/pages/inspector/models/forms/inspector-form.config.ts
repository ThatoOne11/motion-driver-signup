import { WritableSignal } from '@angular/core';
import { FieldTree, form, required } from '@angular/forms/signals';

export type InspectorFormModel = {
  identifierId: string;
  searchTerm: string;
};

export function createInspectorForm(
  model: WritableSignal<InspectorFormModel>,
): FieldTree<InspectorFormModel> {
  return form(model, (path) => {
    required(path.identifierId, { message: 'Please select an identifier.' });
    required(path.searchTerm, { message: 'Please enter a search value.' });
  });
}
