import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  Input,
  output,
  OnDestroy,
  Optional,
  Self,
  inject,
  signal,
  computed,
  booleanAttribute
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  NgControl,
  FormControl,
  ReactiveFormsModule
} from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Subject } from 'rxjs';
import { FocusMonitor } from '@angular/cdk/a11y';
import { coerceBooleanProperty, BooleanInput } from '@angular/cdk/coercion';

// Get timezone offset string like "+05:30" or "-08:00"
function getOffsetString(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset'
  });
  const parts = formatter.formatToParts(new Date());
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  if (!tzPart) return '+00:00';

  // Parse "GMT+5:30" or "GMT-8" or "GMT" -> "+05:30" or "-08:00" or "+00:00"
  const match = tzPart.value.match(/GMT([+-])?(\d+)?(?::(\d+))?/);
  if (!match) return '+00:00';

  const sign = match[1] || '+';
  const hours = (match[2] || '0').padStart(2, '0');
  const minutes = (match[3] || '0').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

// Build timezone map grouped by offset
function buildTimezoneMap(): Record<string, string[]> {
  return Intl.supportedValuesOf('timeZone').reduce((res: Record<string, string[]>, zone: string) => {
    const offset = getOffsetString(zone);
    res[offset] = res[offset] || [];
    res[offset].push(zone);
    return res;
  }, { '+00:00': ['UTC'] });
}

// Convert offset string to minutes for sorting
function offsetToMinutes(offset: string): number {
  const match = offset.match(/([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
}

const TIMEZONE_MAP = buildTimezoneMap();
const SORTED_OFFSETS = Object.keys(TIMEZONE_MAP).sort((a, b) => offsetToMinutes(a) - offsetToMinutes(b));

let nextId = 0;

@Component({
  selector: 'timezone-select',
  imports: [
    ReactiveFormsModule,
    MatSelectModule
  ],
  template: `
    <div class="timezone-control">
      <mat-select
        [formControl]="selectControl"
        class="timezone-dropdown"
        hideSingleSelectionIndicator>
        @for (tz of filteredTimezones(); track tz) {
          <mat-option [value]="tz">
            @if (showDetectButton && tz === browserTimezone) {
              <svg class="browser-tz-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            }
            {{ tz }}
          </mat-option>
        }
      </mat-select>
      <div class="offset-nav" [class.disabled]="_disabled">
        <svg
          class="nav-icon"
          [class.disabled]="_disabled"
          (click)="previousOffset()"
          viewBox="0 0 24 24"
          fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
        <span class="offset-value">{{ currentOffset() }}</span>
        <svg
          class="nav-icon"
          [class.disabled]="_disabled"
          (click)="nextOffset()"
          viewBox="0 0 24 24"
          fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </div>
      @if (showDetectButton) {
        <div class="detect-btn-wrapper" [class.disabled]="_disabled || isBrowserTimezone()">
          <svg
            class="detect-btn"
            [class.disabled]="_disabled || isBrowserTimezone()"
            (click)="detectBrowserTimezone()"
            viewBox="0 0 24 24"
            fill="currentColor"
            title="Detect browser timezone">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
          </svg>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .timezone-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .offset-nav {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      background: var(--mat-sys-surface-container);
      border-radius: 4px;
      padding: 2px;

      &.disabled {
        opacity: 0.38;
      }
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.15s;

      &:hover:not(.disabled) {
        opacity: 1;
      }

      &.disabled {
        opacity: 0.3;
        cursor: default;
        pointer-events: none;
      }
    }

    .offset-value {
      font-family: monospace;
      font-size: 0.8125rem;
      min-width: 2.75rem;
      text-align: center;
    }

    .timezone-dropdown {
      flex: 1;
      min-width: 0;
    }

    .browser-tz-icon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
      vertical-align: middle;
      opacity: 0.7;
      color: var(--mat-sys-primary);
    }

    .detect-btn-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      border-radius: 4px;
      padding: 2px;

      &.disabled {
        opacity: 0.38;
      }
    }

    .detect-btn {
      width: 20px;
      height: 20px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.15s;

      &:hover:not(.disabled) {
        opacity: 1;
      }

      &.disabled {
        opacity: 0.3;
        cursor: default;
        pointer-events: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: MatFormFieldControl,
      useExisting: TimezoneSelectComponent
    }
  ],
  host: {
    '[id]': 'id',
    '[attr.aria-describedby]': 'describedBy'
  }
})
export class TimezoneSelectComponent
  implements ControlValueAccessor, MatFormFieldControl<string>, OnDestroy
{
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  // MatFormFieldControl properties
  stateChanges = new Subject<void>();
  focused = false;
  controlType = 'timezone-select';
  id = `timezone-select-${nextId++}`;
  describedBy = '';

  // Inputs - using @Input for MatFormFieldControl compatibility
  @Input() placeholder = '';
  @Input({ transform: booleanAttribute }) showDetectButton = false;

  private _required = false;
  @Input()
  get required(): boolean {
    return this._required;
  }
  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
    this.stateChanges.next();
  }

  // Output for value changes
  readonly valueChange = output<string | null>();

  selectControl = new FormControl<string | null>(null);
  private currentOffsetIndex = signal(SORTED_OFFSETS.indexOf('+00:00'));
  private currentValue = signal<string | null>(null);

  // Browser timezone detection
  readonly browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  currentOffset = computed(() => SORTED_OFFSETS[this.currentOffsetIndex()] ?? '+00:00');
  filteredTimezones = computed(() => TIMEZONE_MAP[this.currentOffset()] || []);
  isBrowserTimezone = computed(() => this.currentValue() === this.browserTimezone);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  _disabled = false;

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
    if (this._disabled) {
      this.selectControl.disable({ emitEvent: false });
    } else {
      this.selectControl.enable({ emitEvent: false });
    }
    this.stateChanges.next();
  }

  get value(): string | null {
    return this.selectControl.value;
  }

  get empty(): boolean {
    return !this.selectControl.value;
  }

  get shouldLabelFloat(): boolean {
    return this.focused || !this.empty;
  }

  get errorState(): boolean {
    return this.selectControl.invalid && this.selectControl.touched;
  }

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }

    this.focusMonitor.monitor(this.elementRef, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });

    this.selectControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.currentValue.set(value);
        this.onChange(value);
        this.onTouched();
        this.valueChange.emit(value);
        this.stateChanges.next();
      });
  }

  ngOnDestroy(): void {
    this.stateChanges.complete();
    this.focusMonitor.stopMonitoring(this.elementRef);
  }

  // ControlValueAccessor implementation
  writeValue(value: string | null): void {
    if (value) {
      const offset = getOffsetString(value);
      const idx = SORTED_OFFSETS.indexOf(offset);
      if (idx !== -1) {
        this.currentOffsetIndex.set(idx);
      }
      this.selectControl.setValue(value, { emitEvent: false });
    } else {
      this.selectControl.setValue(null, { emitEvent: false });
    }
    this.currentValue.set(value);
    this.stateChanges.next();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // MatFormFieldControl implementation
  setDescribedByIds(ids: string[]): void {
    this.describedBy = ids.join(' ');
  }

  onContainerClick(): void {
    this.onTouched();
  }

  // Component methods
  previousOffset(): void {
    if (this._disabled) return;
    const idx = this.currentOffsetIndex();
    // Loop infinitely: go to last offset if at first
    const newIdx = idx > 0 ? idx - 1 : SORTED_OFFSETS.length - 1;
    this.currentOffsetIndex.set(newIdx);
    this.clearSelectionIfNotInOffset();
  }

  nextOffset(): void {
    if (this._disabled) return;
    const idx = this.currentOffsetIndex();
    // Loop infinitely: go to first offset if at last
    const newIdx = idx < SORTED_OFFSETS.length - 1 ? idx + 1 : 0;
    this.currentOffsetIndex.set(newIdx);
    this.clearSelectionIfNotInOffset();
  }

  detectBrowserTimezone(): void {
    if (this._disabled) return;
    const browserTz = this.browserTimezone;
    if (browserTz) {
      // Find the offset for the browser timezone and navigate to it
      const offset = getOffsetString(browserTz);
      const idx = SORTED_OFFSETS.indexOf(offset);
      if (idx !== -1) {
        this.currentOffsetIndex.set(idx);
      }
      // Set the value
      this.selectControl.setValue(browserTz);
    }
  }

  private clearSelectionIfNotInOffset(): void {
    const current = this.selectControl.value;
    if (current) {
      const stillValid = this.filteredTimezones().includes(current);
      if (!stillValid) {
        this.selectControl.setValue(null, { emitEvent: false });
        this.currentValue.set(null);
        this.onChange(null);
        this.valueChange.emit(null);
        this.stateChanges.next();
      }
    }
  }
}
