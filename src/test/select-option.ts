import { fireEvent, screen } from '@testing-library/react';

/** Exercise the visible Base UI picker instead of its hidden native form field. */
export async function selectOption(label: string | RegExp, option: string | RegExp) {
  const trigger = screen.getByRole('combobox', { name: label });
  fireEvent.mouseDown(trigger, { button: 0 });
  const item = await screen.findByRole('option', { name: option });
  fireEvent.pointerDown(item, { pointerType: 'mouse', button: 0 });
  fireEvent.click(item);
}
