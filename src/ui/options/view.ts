import type { NavigationPolicy } from '../../domain/navigation-policy';
import type { RestartPolicy } from '../../domain/restart-policy';
import type { StopCondition } from '../../domain/stop-condition';
import type { ExtensionSettings } from '../../domain/settings';
import { createDefaultSettings } from '../../domain/settings';
import { EXTENSION_NAME } from '../../shared/constants';
import { intervalToMs, msToInterval } from '../../shared/time';
import type { IntervalUnit } from '../../shared/time';
import { CommandError } from '../shared/client';
import type { ExtensionClient } from '../shared/client';
import { element } from '../shared/dom';
import { navigationLabel, restartLabel } from '../shared/format';

export interface OptionsOptions {
  version?: string;
}

export interface OptionsController {
  destroy(): void;
  refresh(): Promise<void>;
}

type StopKind = StopCondition['type'];

class PresentationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PresentationError';
  }
}

export function mountOptions(
  root: HTMLElement,
  client: ExtensionClient,
  options: OptionsOptions = {},
): OptionsController {
  root.replaceChildren();

  const header = element('header', 'ar-options__header');
  header.append(
    element('h1', 'ar-options__title', `${EXTENSION_NAME} Options`),
    element(
      'p',
      'ar-options__subtitle',
      'Set the defaults used when you create a new refresh schedule.',
    ),
  );

  const alert = element('div', 'ar-alert');
  alert.hidden = true;
  alert.setAttribute('role', 'status');

  const form = element('form', 'ar-options__section');

  const defaultsGrid = element('div', 'ar-options__grid');
  const intervalValue = numberInput('1');
  const intervalUnit = selectInput([
    ['seconds', 'Seconds'],
    ['minutes', 'Minutes'],
    ['hours', 'Hours'],
  ]);
  const stopKind = selectInput([
    ['never', 'Run until stopped'],
    ['duration', 'Stop after a duration'],
    ['count', 'Stop after a number of reloads'],
    ['deadline', 'Stop at a date and time'],
  ]);
  const durationValue = numberInput('1');
  const durationUnit = selectInput([
    ['minutes', 'Minutes'],
    ['hours', 'Hours'],
  ]);
  const durationField = field('Default duration', durationValue);
  const durationUnitField = field('Duration unit', durationUnit);
  const countValue = numberInput('1');
  const countField = field('Default reloads', countValue);
  const deadlineValue = element('input', 'ar-input');
  deadlineValue.type = 'datetime-local';
  const deadlineField = field('Default end time', deadlineValue);
  const navPolicy = selectInput([
    ['same-origin', navigationLabel('same-origin')],
    ['exact-url', navigationLabel('exact-url')],
    ['follow-tab', navigationLabel('follow-tab')],
  ]);
  const restartPolicy = selectInput([
    ['pause', restartLabel('pause')],
    ['resume-if-restored', restartLabel('resume-if-restored')],
  ]);
  defaultsGrid.append(
    field('Default interval', intervalValue),
    field('Interval unit', intervalUnit),
    field('Default stop condition', stopKind),
    durationField,
    durationUnitField,
    countField,
    deadlineField,
    field('Default navigation', navPolicy),
    field('Default restart', restartPolicy),
  );

  const limitsTitle = element('h2', 'ar-options__section-title', 'Limits and notifications');
  const limitsGrid = element('div', 'ar-options__grid');
  const maxActiveJobs = numberInput('1');
  const maxReloadsPerSecond = numberInput('1');
  const retentionDays = numberInput('0');
  const notify = element('input');
  notify.type = 'checkbox';
  const notifyLabel = element('label', 'ar-checkbox');
  notifyLabel.append(notify, document.createTextNode('Notify me when a schedule finishes'));
  limitsGrid.append(
    field('Maximum active jobs', maxActiveJobs),
    field('Maximum reloads per second', maxReloadsPerSecond),
    field('Keep finished jobs (days)', retentionDays),
  );

  const formError = element('p', 'ar-field__error');
  formError.hidden = true;
  formError.setAttribute('role', 'alert');

  const formActions = element('div', 'ar-options__actions');
  const save = element('button', 'ar-button ar-button--primary', 'Save settings');
  save.type = 'submit';
  const reset = element('button', 'ar-button ar-button--ghost', 'Reset to defaults');
  reset.type = 'button';
  formActions.append(save, reset);

  form.append(
    element('h2', 'ar-options__section-title', 'Schedule defaults'),
    defaultsGrid,
    limitsTitle,
    limitsGrid,
    notifyLabel,
    formError,
    formActions,
  );

  const maintenance = element('section', 'ar-options__section');
  maintenance.append(
    element('h2', 'ar-options__section-title', 'Maintenance'),
    element('p', undefined, 'Remove completed, orphaned, and error schedules from storage.'),
  );
  const clearActions = element('div', 'ar-options__actions');
  const clearButton = element('button', 'ar-button ar-button--danger', 'Clear finished jobs');
  clearButton.type = 'button';
  clearActions.append(clearButton);
  maintenance.append(clearActions);

  const info = element('section', 'ar-options__section');
  const infoList = element('dl', 'ar-options__info');
  infoList.append(
    infoRow(
      'Privacy',
      'Schedules and settings stay in this browser profile. Nothing is sent to any server.',
    ),
    infoRow(
      'Safety',
      'Automatic reloads can discard unsaved work, repeat form submissions, and trigger site rate limits.',
    ),
    infoRow('Version', options.version ?? 'unknown'),
  );
  info.append(element('h2', 'ar-options__section-title', 'About'), infoList);

  root.append(header, alert, form, maintenance, info);

  function showAlert(message: string, kind: 'error' | 'success'): void {
    alert.textContent = message;
    alert.className = `ar-alert ar-alert--${kind}`;
    alert.hidden = false;
  }

  function setFormError(message: string | null): void {
    if (message === null) {
      formError.hidden = true;
      formError.textContent = '';
      return;
    }
    formError.textContent = message;
    formError.hidden = false;
  }

  function updateStopFields(): void {
    const kind = stopKind.value as StopKind;
    durationField.hidden = kind !== 'duration';
    durationUnitField.hidden = kind !== 'duration';
    countField.hidden = kind !== 'count';
    deadlineField.hidden = kind !== 'deadline';
  }

  function applySettings(settings: ExtensionSettings): void {
    const interval = msToInterval(settings.defaultIntervalMs);
    intervalValue.value = String(interval.value);
    intervalUnit.value = interval.unit;
    stopKind.value = settings.defaultStopCondition.type;
    if (settings.defaultStopCondition.type === 'duration') {
      const duration = msToInterval(settings.defaultStopCondition.durationMs);
      durationValue.value = String(duration.value);
      durationUnit.value = duration.unit === 'seconds' ? 'minutes' : duration.unit;
    }
    if (settings.defaultStopCondition.type === 'count') {
      countValue.value = String(settings.defaultStopCondition.maxRuns);
    }
    navPolicy.value = settings.defaultNavigationPolicy;
    restartPolicy.value = settings.defaultRestartPolicy;
    maxActiveJobs.value = String(settings.maxActiveJobs);
    maxReloadsPerSecond.value = String(settings.maxReloadsPerSecond);
    retentionDays.value = String(settings.completedJobRetentionDays);
    notify.checked = settings.notifyOnCompletion;
    updateStopFields();
  }

  function readStopCondition(): StopCondition {
    const kind = stopKind.value as StopKind;
    if (kind === 'duration') {
      const value = Number(durationValue.value);
      if (!Number.isFinite(value) || value <= 0) {
        throw new PresentationError('Enter a duration greater than zero.');
      }
      return {
        type: 'duration',
        durationMs: intervalToMs(value, durationUnit.value as IntervalUnit),
      };
    }
    if (kind === 'count') {
      const value = Number(countValue.value);
      if (!Number.isInteger(value) || value <= 0) {
        throw new PresentationError('Enter a whole number of reloads.');
      }
      return { type: 'count', maxRuns: value };
    }
    if (kind === 'deadline') {
      const endsAt = Date.parse(deadlineValue.value);
      if (Number.isNaN(endsAt)) {
        throw new PresentationError('Choose a valid end date and time.');
      }
      return { type: 'deadline', endsAt };
    }
    return { type: 'never' };
  }

  function readSettings(): ExtensionSettings {
    const interval = Number(intervalValue.value);
    if (!Number.isFinite(interval) || interval <= 0) {
      throw new PresentationError('Enter a default interval greater than zero.');
    }
    return {
      defaultIntervalMs: intervalToMs(interval, intervalUnit.value as IntervalUnit),
      defaultStopCondition: readStopCondition(),
      defaultNavigationPolicy: navPolicy.value as NavigationPolicy,
      defaultRestartPolicy: restartPolicy.value as RestartPolicy,
      maxActiveJobs: Number(maxActiveJobs.value),
      maxReloadsPerSecond: Number(maxReloadsPerSecond.value),
      notifyOnCompletion: notify.checked,
      completedJobRetentionDays: Number(retentionDays.value),
    };
  }

  function reportError(error: unknown): void {
    if (error instanceof CommandError || error instanceof PresentationError) {
      showAlert(error.message, 'error');
      return;
    }
    showAlert('Something went wrong. Please try again.', 'error');
  }

  async function submitForm(): Promise<void> {
    setFormError(null);
    let next: ExtensionSettings;
    try {
      next = readSettings();
    } catch (error) {
      if (error instanceof PresentationError) {
        setFormError(error.message);
        return;
      }
      throw error;
    }
    try {
      const saved = await client.updateSettings(next);
      applySettings(saved);
      showAlert('Settings saved.', 'success');
    } catch (error) {
      reportError(error);
    }
  }

  async function resetSettings(): Promise<void> {
    try {
      const saved = await client.updateSettings(createDefaultSettings());
      applySettings(saved);
      showAlert('Settings reset to defaults.', 'success');
    } catch (error) {
      reportError(error);
    }
  }

  stopKind.addEventListener('change', updateStopFields);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitForm();
  });
  reset.addEventListener('click', () => {
    void resetSettings();
  });
  clearButton.addEventListener('click', () => {
    void (async () => {
      try {
        await client.clearCompleted();
        showAlert('Finished jobs cleared.', 'success');
      } catch (error) {
        reportError(error);
      }
    })();
  });

  async function refresh(): Promise<void> {
    try {
      const settings = await client.getSettings();
      applySettings(settings);
    } catch (error) {
      reportError(error);
    }
  }

  updateStopFields();
  void refresh();

  return {
    destroy(): void {},
    refresh,
  };
}

function field(label: string, control: HTMLElement): HTMLElement {
  const wrapper = element('label', 'ar-field');
  wrapper.append(element('span', 'ar-field__label', label), control);
  return wrapper;
}

function numberInput(min: string): HTMLInputElement {
  const input = element('input', 'ar-input');
  input.type = 'number';
  input.min = min;
  input.step = '1';
  return input;
}

function selectInput(entries: Array<[string, string]>): HTMLSelectElement {
  const select = element('select', 'ar-select');
  for (const [value, label] of entries) {
    const option = element('option', undefined, label);
    option.value = value;
    select.append(option);
  }
  return select;
}

function infoRow(term: string, detail: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.append(element('dt', undefined, term), element('dd', undefined, detail));
  return fragment;
}
