import { Component, inject, DestroyRef, signal, CUSTOM_ELEMENTS_SCHEMA, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimezoneSelectComponent } from '@softwarity/timezone-select';
import '@softwarity/interactive-code';

const PALETTES = [
  'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
  'orange', 'chartreuse', 'spring-green', 'azure', 'violet', 'rose'
] as const;

@Component({
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    TimezoneSelectComponent
  ],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PlaygroundComponent {
  private readonly destroyRef = inject(DestroyRef);

  protected isDarkMode = signal(document.body.classList.contains('dark-mode'));
  protected isDisabled = signal(false);
  protected showDetectButton = signal(true);

  protected timezoneControl = new FormControl<string | null>('Europe/Paris');
  protected selectedTimezone = signal<string | null>('Europe/Paris');
  protected selectedPalette = signal('violet');

  constructor() {
    effect(() => {
      const palette = this.selectedPalette();
      const html = document.documentElement;
      PALETTES.forEach(p => html.classList.remove(p));
      if (palette) {
        html.classList.add(palette);
      }
    });
    this.timezoneControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.selectedTimezone.set(value));
  }

  onDarkModeChange(value: string): void {
    const isDark = value === 'dark-mode';
    this.isDarkMode.set(isDark);
    document.body.classList.toggle('dark-mode', isDark);
  }

  onDisabledChange(value: boolean): void {
    this.isDisabled.set(value);
    if (value) {
      this.timezoneControl.disable();
    } else {
      this.timezoneControl.enable();
    }
  }

  resetToDefault(): void {
    this.timezoneControl.setValue('Europe/Paris');
  }

  clearValue(): void {
    this.timezoneControl.setValue(null);
  }
}
