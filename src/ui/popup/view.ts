import type { NavigationPolicy } from '../../domain/navigation-policy';
import type { RestartPolicy } from '../../domain/restart-policy';
import type { JobConfiguration, RefreshJob } from '../../domain/refresh-job';
import type { StopCondition } from '../../domain/stop-condition';
import type { ExtensionSettings } from '../../domain/settings';
import type { SelectableTab } from '../../shared/protocol';
import { EXTENSION_NAME } from '../../shared/constants';
import { intervalToMs, msToInterval } from '../../shared/time';
import type { IntervalUnit } from '../../shared/time';
import { CommandError } from '../shared/client';
import type { ExtensionClient } from '../shared/client';
import { clearChildren, element } from '../shared/dom';
import {
  formatCountdown,
  formatInterval,
  jobSummary,
  jobTitle,
  navigationLabel,
  restartLabel,
  statusLabel,
} from '../shared/format';

export interface PopupOptions {
  now?: () => number;
  countdownIntervalMs?: number;
}

export interface PopupController {
  destroy(): void;
  refresh(): Promise<void>;
}

type StopKind = StopCondition['type'];

const FINISHED_STATES = new Set(['completed', 'orphaned', 'error']);

function occupiesTab(job: RefreshJob): boolean {
  return job.state === 'active' || job.state === 'paused';
}

export function mountPopup(
  root: HTMLElement,
  client: ExtensionClient,
  options: PopupOptions = {},
): PopupController {
  const now = options.now ?? (() => Date.now());
  const countdownIntervalMs = options.countdownIntervalMs ?? 1000;

  let tabs: SelectableTab[] = [];
  let jobs: RefreshJob[] = [];
  let settings: ExtensionSettings | null = null;
  const selected = new Set<number>();
  let editingJobId: string | null = null;
  let editingRevision = 0;

  const countdownNodes = new Map<string, HTMLElement>();

  clearChildren(root);

  const header = element('header', 'ar-popup__header');
  const title = element('h1', 'ar-popup__title', EXTENSION_NAME);
  const meta = element('p', 'ar-popup__meta');
  const count = element('span', 'ar-popup__count', '0 active');
  meta.append(count);
  header.append(title, meta);

  const alert = element('div', 'ar-alert');
  alert.hidden = true;
  alert.setAttribute('role', 'status');

  const tabsSection = element('section', 'ar-section');
  const tabsHeading = element('h2', 'ar-section__heading', 'Select tabs');
  const selectedCount = element('span', 'ar-selected-count', '0 selected');
  selectedCount.setAttribute('aria-live', 'polite');
  const selectAllLabel = element('label', 'ar-checkbox');
  const selectAll = element('input');
  selectAll.type = 'checkbox';
  selectAllLabel.append(selectAll, document.createTextNode('Select all eligible tabs'));
  const tabsList = element('div', 'ar-tabs-list');
  tabsList.setAttribute('role', 'group');
  tabsList.setAttribute('aria-label', 'Eligible tabs');
  tabsSection.append(tabsHeading, selectedCount, selectAllLabel, tabsList);

  const form = element('form', 'ar-section');
  const formHeading = element('h2', 'ar-section__heading', 'Schedule');
  const grid = element('div', 'ar-form-grid');

  const intervalValue = element('input', 'ar-input');
  intervalValue.type = 'number';
  intervalValue.min = '1';
  intervalValue.step = '1';
  intervalValue.id = 'ar-interval-value';
  const intervalUnit = element('select', 'ar-select');
  intervalUnit.id = 'ar-interval-unit';
  appendOptions(intervalUnit, [
    ['seconds', 'Seconds'],
    ['minutes', 'Minutes'],
    ['hours', 'Hours'],
  ]);
  grid.append(field('Interval', intervalValue), field('Unit', intervalUnit));

  const stopKind = element('select', 'ar-select');
  stopKind.id = 'ar-stop-kind';
  appendOptions(stopKind, [
    ['never', 'Run until stopped'],
    ['duration', 'Stop after a duration'],
    ['count', 'Stop after a number of reloads'],
    ['deadline', 'Stop at a date and time'],
  ]);
  grid.append(field('Stop condition', stopKind));

  const durationValue = element('input', 'ar-input');
  durationValue.type = 'number';
  durationValue.min = '1';
  durationValue.step = '1';
  const durationUnit = element('select', 'ar-select');
  appendOptions(durationUnit, [
    ['minutes', 'Minutes'],
    ['hours', 'Hours'],
  ]);
  const durationField = field('Duration', durationValue);
  const durationUnitField = field('Duration unit', durationUnit);

  const countValue = element('input', 'ar-input');
  countValue.type = 'number';
  countValue.min = '1';
  countValue.step = '1';
  const countField = field('Reloads', countValue);

  const deadlineValue = element('input', 'ar-input');
  deadlineValue.type = 'datetime-local';
  const deadlineField = field('Ends at', deadlineValue);

  grid.append(durationField, durationUnitField, countField, deadlineField);

  const navPolicy = element('select', 'ar-select');
  appendOptions(navPolicy, [
    ['same-origin', navigationLabel('same-origin')],
    ['exact-url', navigationLabel('exact-url')],
    ['follow-tab', navigationLabel('follow-tab')],
  ]);
  const restartPolicy = element('select', 'ar-select');
  appendOptions(restartPolicy, [
    ['pause', restartLabel('pause')],
    ['resume-if-restored', restartLabel('resume-if-restored')],
  ]);
  grid.append(field('Navigation', navPolicy), field('On restart', restartPolicy));

  const bypassLabel = element('label', 'ar-checkbox');
  const bypass = element('input');
  bypass.type = 'checkbox';
  bypassLabel.append(bypass, document.createTextNode('Bypass cache on reload'));

  const formError = element('p', 'ar-field__error');
  formError.hidden = true;
  formError.setAttribute('role', 'alert');

  const actions = element('div', 'ar-job-card__actions');
  const submit = element('button', 'ar-button ar-button--primary', 'Start refresh');
  submit.type = 'submit';
  const cancelEdit = element('button', 'ar-button ar-button--ghost', 'Cancel edit');
  cancelEdit.type = 'button';
  cancelEdit.hidden = true;
  actions.append(submit, cancelEdit);

  form.append(formHeading, grid, bypassLabel, formError, actions);

  const warning = element(
    'p',
    'ar-warning',
    'Automatic reloads can discard unsaved changes, repeat form submissions, and trigger site rate limits.',
  );

  const jobsSection = element('section', 'ar-section');
  const jobsHeading = element('h2', 'ar-section__heading', 'Schedules');
  const jobsList = element('div', 'ar-job-list');
  jobsSection.append(jobsHeading, jobsList);

  const footer = element('footer', 'ar-footer');
  const clearCompleted = element('button', 'ar-button ar-button--ghost', 'Clear finished');
  clearCompleted.type = 'button';
  footer.append(clearCompleted);

  root.append(header, alert, tabsSection, form, warning, jobsSection, footer);

  function showAlert(message: string, kind: 'error' | 'success'): void {
    alert.textContent = message;
    alert.className = `ar-alert ar-alert--${kind}`;
    alert.hidden = false;
  }

  function clearAlert(): void {
    alert.hidden = true;
    alert.textContent = '';
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

  function occupiedTabIds(): Set<number> {
    const ids = new Set<number>();
    for (const job of jobs) {
      if (occupiesTab(job) && job.tabId !== null) {
        ids.add(job.tabId);
      }
    }
    return ids;
  }

  function renderTabs(): void {
    clearChildren(tabsList);
    const occupied = occupiedTabIds();
    if (tabs.length === 0) {
      const empty = element('div', 'ar-empty-state');
      empty.append(element('p', 'ar-empty-state__title', 'No eligible tabs in this window.'));
      tabsList.append(empty);
      return;
    }
    for (const tab of tabs) {
      const taken = occupied.has(tab.tabId);
      const optionLabel = element('label', 'ar-tab-option');
      const checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected.has(tab.tabId);
      checkbox.disabled = taken;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selected.add(tab.tabId);
        } else {
          selected.delete(tab.tabId);
        }
        syncSelectAll();
      });
      const text = element('span', 'ar-tab-option__text');
      const titleText = taken ? `${tab.title} (already scheduled)` : tab.title;
      text.append(
        element('span', 'ar-tab-option__title', titleText),
        element('span', 'ar-tab-option__url', tab.url),
      );
      optionLabel.append(checkbox, text);
      tabsList.append(optionLabel);
    }
    syncSelectAll();
  }

  function selectableTabIds(): number[] {
    const occupied = occupiedTabIds();
    return tabs.filter((tab) => !occupied.has(tab.tabId)).map((tab) => tab.tabId);
  }

  function syncSelectAll(): void {
    const selectable = selectableTabIds();
    selectAll.disabled = selectable.length === 0;
    selectAll.checked = selectable.length > 0 && selectable.every((id) => selected.has(id));
    selectedCount.textContent = `${selected.size} selected`;
  }

  function activeCount(): number {
    return jobs.filter((job) => job.state === 'active').length;
  }

  function hasFinishedJobs(): boolean {
    return jobs.some((job) => FINISHED_STATES.has(job.state));
  }

  function renderJobs(): void {
    clearChildren(jobsList);
    countdownNodes.clear();
    count.textContent = `${activeCount()} active`;
    clearCompleted.hidden = !hasFinishedJobs();
    if (jobs.length === 0) {
      const empty = element('div', 'ar-empty-state');
      empty.append(
        element('p', 'ar-empty-state__title', 'No schedules yet.'),
        element('p', undefined, 'Select tabs and start a refresh schedule.'),
      );
      jobsList.append(empty);
      return;
    }
    for (const job of jobs) {
      jobsList.append(renderJobCard(job));
    }
    updateCountdowns();
  }

  function renderJobCard(job: RefreshJob): HTMLElement {
    const card = element('article', 'ar-job-card');
    const cardHeader = element('div', 'ar-job-card__header');
    const heading = element('h3', 'ar-job-card__title', jobTitle(job));
    const badge = element(
      'span',
      `ar-status-badge ar-status-badge--${job.state}`,
      statusLabel(job.state),
    );
    cardHeader.append(heading, badge);

    const metaRow = element('div', 'ar-job-card__meta');
    const countdown = element('span', undefined, formatCountdown(job.nextRunAt, now()));
    countdownNodes.set(job.id, countdown);
    metaRow.append(
      countdown,
      element('span', undefined, formatInterval(job.intervalMs)),
      element('span', undefined, jobSummary(job)),
      element('span', undefined, `${job.runsCompleted} done`),
    );
    if (job.lastError !== null) {
      metaRow.append(element('span', undefined, `Last error: ${job.lastError.message}`));
    }

    const cardActions = element('div', 'ar-job-card__actions');
    for (const action of jobActions(job)) {
      cardActions.append(action);
    }

    card.append(cardHeader, metaRow, cardActions);
    return card;
  }

  function jobActions(job: RefreshJob): HTMLButtonElement[] {
    const buttons: HTMLButtonElement[] = [];
    if (job.state === 'active') {
      buttons.push(
        actionButton('Pause', 'ghost', () => run(() => client.pauseJob(job.id, job.revision))),
        actionButton('Edit', 'ghost', () => beginEdit(job)),
        actionButton('Stop', 'ghost', () => run(() => client.stopJob(job.id, job.revision))),
      );
    } else if (job.state === 'paused') {
      buttons.push(
        actionButton('Resume', 'primary', () => run(() => client.resumeJob(job.id, job.revision))),
        actionButton('Edit', 'ghost', () => beginEdit(job)),
        actionButton('Stop', 'ghost', () => run(() => client.stopJob(job.id, job.revision))),
        actionButton('Remove', 'danger', () => run(() => client.removeJob(job.id, job.revision))),
      );
    } else {
      buttons.push(
        actionButton('Remove', 'danger', () => run(() => client.removeJob(job.id, job.revision))),
      );
    }
    return buttons;
  }

  function actionButton(
    label: string,
    variant: 'primary' | 'danger' | 'ghost',
    handler: () => void,
  ): HTMLButtonElement {
    const button = element('button', `ar-button ar-button--${variant}`, label);
    button.type = 'button';
    button.addEventListener('click', handler);
    return button;
  }

  function updateCountdowns(): void {
    const current = now();
    for (const job of jobs) {
      const node = countdownNodes.get(job.id);
      if (node !== undefined) {
        node.textContent = formatCountdown(job.nextRunAt, current);
      }
    }
  }

  function readConfiguration(): JobConfiguration {
    const value = Number(intervalValue.value);
    if (!Number.isFinite(value) || value <= 0) {
      throw new PresentationError('Enter an interval greater than zero.');
    }
    const intervalMs = intervalToMs(value, intervalUnit.value as IntervalUnit);
    return {
      intervalMs,
      stopCondition: readStopCondition(),
      navigationPolicy: navPolicy.value as NavigationPolicy,
      restartPolicy: restartPolicy.value as RestartPolicy,
      reloadOptions: { bypassCache: bypass.checked },
    };
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

  function applyConfiguration(configuration: JobConfiguration): void {
    const interval = msToInterval(configuration.intervalMs);
    intervalValue.value = String(interval.value);
    intervalUnit.value = interval.unit;
    const condition = configuration.stopCondition;
    stopKind.value = condition.type;
    if (condition.type === 'duration') {
      const duration = msToInterval(condition.durationMs);
      durationValue.value = String(duration.value);
      durationUnit.value = duration.unit === 'seconds' ? 'minutes' : duration.unit;
    }
    if (condition.type === 'count') {
      countValue.value = String(condition.maxRuns);
    }
    navPolicy.value = configuration.navigationPolicy;
    restartPolicy.value = configuration.restartPolicy;
    bypass.checked = configuration.reloadOptions.bypassCache;
    updateStopFields();
  }

  function beginEdit(job: RefreshJob): void {
    editingJobId = job.id;
    editingRevision = job.revision;
    applyConfiguration({
      intervalMs: job.intervalMs,
      stopCondition: job.stopCondition,
      navigationPolicy: job.navigationPolicy,
      restartPolicy: job.restartPolicy,
      reloadOptions: { bypassCache: job.reloadOptions.bypassCache },
    });
    submit.textContent = 'Save changes';
    cancelEdit.hidden = false;
    tabsSection.hidden = true;
    setFormError(null);
    formHeading.textContent = `Editing ${jobTitle(job)}`;
  }

  function endEdit(): void {
    editingJobId = null;
    editingRevision = 0;
    submit.textContent = 'Start refresh';
    cancelEdit.hidden = true;
    tabsSection.hidden = false;
    formHeading.textContent = 'Schedule';
  }

  async function run(operation: () => Promise<{ jobs: RefreshJob[] }>): Promise<void> {
    try {
      const snapshot = await operation();
      jobs = snapshot.jobs;
      clearAlert();
      renderTabs();
      renderJobs();
    } catch (error) {
      reportError(error);
    }
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
    let configuration: JobConfiguration;
    try {
      configuration = readConfiguration();
    } catch (error) {
      if (error instanceof PresentationError) {
        setFormError(error.message);
        return;
      }
      throw error;
    }

    if (editingJobId !== null) {
      const jobId = editingJobId;
      const revision = editingRevision;
      await run(async () => {
        const snapshot = await client.editJob(jobId, revision, {
          intervalMs: configuration.intervalMs,
          stopCondition: configuration.stopCondition,
          navigationPolicy: configuration.navigationPolicy,
          restartPolicy: configuration.restartPolicy,
          reloadOptions: configuration.reloadOptions,
        });
        endEdit();
        showAlert('Schedule updated.', 'success');
        return snapshot;
      });
      return;
    }

    const tabIds = [...selected];
    if (tabIds.length === 0) {
      setFormError('Select at least one tab to refresh.');
      return;
    }
    await run(async () => {
      const snapshot = await client.createJobs(tabIds, configuration);
      selected.clear();
      showAlert('Schedule started.', 'success');
      return snapshot;
    });
  }

  stopKind.addEventListener('change', updateStopFields);
  selectAll.addEventListener('change', () => {
    const selectable = selectableTabIds();
    if (selectAll.checked) {
      for (const id of selectable) {
        selected.add(id);
      }
    } else {
      for (const id of selectable) {
        selected.delete(id);
      }
    }
    renderTabs();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submitForm();
  });
  cancelEdit.addEventListener('click', () => {
    endEdit();
    if (settings !== null) {
      applyConfiguration(defaultConfiguration(settings));
    }
    clearAlert();
  });
  clearCompleted.addEventListener('click', () => {
    void run(() => client.clearCompleted());
  });

  const unsubscribe = client.subscribe((event) => {
    if (event.type === 'jobs.updated') {
      jobs = event.snapshot.jobs;
      renderTabs();
      renderJobs();
    }
  });

  const timer = setInterval(updateCountdowns, countdownIntervalMs);

  async function refresh(): Promise<void> {
    try {
      const [tabList, snapshot, loadedSettings] = await Promise.all([
        client.listSelectableTabs(),
        client.listJobs(),
        client.getSettings(),
      ]);
      tabs = tabList;
      jobs = snapshot.jobs;
      settings = loadedSettings;
      applyConfiguration(defaultConfiguration(loadedSettings));
      renderTabs();
      renderJobs();
    } catch (error) {
      reportError(error);
    }
  }

  updateStopFields();
  void refresh();

  return {
    destroy(): void {
      clearInterval(timer);
      unsubscribe();
    },
    refresh,
  };
}

class PresentationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PresentationError';
  }
}

function defaultConfiguration(settings: ExtensionSettings): JobConfiguration {
  return {
    intervalMs: settings.defaultIntervalMs,
    stopCondition: settings.defaultStopCondition,
    navigationPolicy: settings.defaultNavigationPolicy,
    restartPolicy: settings.defaultRestartPolicy,
    reloadOptions: { bypassCache: false },
  };
}

function field(label: string, control: HTMLElement): HTMLElement {
  const wrapper = element('label', 'ar-field');
  wrapper.append(element('span', 'ar-field__label', label), control);
  return wrapper;
}

function appendOptions(select: HTMLSelectElement, entries: Array<[string, string]>): void {
  for (const [value, label] of entries) {
    const option = element('option', undefined, label);
    option.value = value;
    select.append(option);
  }
}
